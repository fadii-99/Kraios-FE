# FloorPlan3D experiment — frontend

The client half of the `floorplan3d` Django app. Upload a 2D plan, watch it
become a structured building, and edit it in a real 3D scene.

Backend: `backend/floorplan3d/` (its README covers the pipeline, the API and the
architecture decision).

**Off by default.** The routes only exist when `VITE_FLOORPLAN3D_ENABLED=true`,
and the backend answers 404 unless `FLOORPLAN3D_ENABLED=True` there. It is
deliberately **not** in the dashboard sidebar; reach it at
`/dashboard/experiments/floorplan-3d`.

---

## Where the files are

| Path | What it is |
|---|---|
| `pages/experiments/floorplan3d/Floorplan3DExperimentPage.jsx` | The landing page: upload, and recent conversions |
| `pages/experiments/floorplan3d/Floorplan3DEditorPage.jsx` | `/…/:conversionId` — the editor |
| `lib/api/floorplan3d.js` | Every `/experiments/floorplan-3d/` call |
| `lib/floorplan3d/semanticModel.js` | Reading and editing the document. **Start here** |
| `lib/floorplan3d/buildScene.js` | Document → Three.js meshes. The ONE coordinate conversion |
| `lib/floorplan3d/furniture.js` | Furniture from the shared catalogue's part specs |
| `lib/floorplan3d/outlines.js` | Dark architectural edges, with `EdgesGeometry` |
| `lib/floorplan3d/SemanticScene.js` | All Three.js: renderer, cameras, picking, gizmo, section, measure. **No React** |
| `lib/floorplan3d/editCommands.js` | Every edit, as a command; the undo/redo stack |
| `lib/floorplan3d/assistCommands.js` | A planned edit → those same commands. **The only new engine file** |
| `lib/floorplan3d/adapters.js` | API envelope → view models |
| `lib/floorplan3d/useChunkedUpload.js` | Resumable ~3 MB upload with SHA-256 verification |
| `lib/floorplan3d/useConversionPolling.js` | Follow a conversion, with backoff and a ceiling |
| `components/floorplan3d/SceneViewport.jsx` | A thin React shell over `SemanticScene` |
| `components/floorplan3d/ViewportToolbar.jsx` | Cameras, floors, measure, quality |
| `components/floorplan3d/ElementTree.jsx` | Every element, by level and category. **Unmounted** — see below |
| `components/floorplan3d/PropertyInspector.jsx` | What is selected, and how to change it |
| `components/floorplan3d/ReviewPanel.jsx` | The three review lists, and the scale caveat |
| `components/floorplan3d/AssistPanel.jsx` | Editing by typing: the conversation, and the proposal |
| `components/floorplan3d/VersionsDrawer.jsx` | Every saved version, and the way back to any of them |
| `components/floorplan3d/DownloadMenu.jsx` | Artifacts, and whether they are stale |
| `components/floorplan3d/ScaleCalibrationModal.jsx` | Pick one of the drawing's own scales, or measure two points |
| `components/floorplan3d/PlanUploader.jsx` | The drop zone |
| `components/floorplan3d/ConversionProgress.jsx` | The named stage rail |
| `components/floorplan3d/PlanOverlay.jsx` | The original drawing, beside or over the model |
| `lib/floorplan3d/checks/` | Node-based checks for the pure engine logic |

---

## The 3D model is built from the SEMANTIC JSON, not from the GLB

The GLB is a derived artifact a Blender worker produces minutes later. The editor
has to open as soon as validation succeeds, and it has to rebuild instantly when
a wall moves — both need the document, not a mesh.

`buildScene.js` reads the document directly: walls become boxes, openings are cut
by **splitting** the wall into the runs that survive them (before, after, under a
sill, over a lintel) rather than by boolean subtraction, slabs and room finishes
are extruded from polygons, and furniture comes from the backend's shared
catalogue. Every element becomes one `THREE.Group` carrying `userData.element`,
so one click resolves to one row of the document.

**`wallSolidRuns` is a reimplementation of the Blender engine's `solid_runs`.**
If the two disagree, the viewer and the downloaded `.blend` show different
buildings. That function is the most-tested thing in `checks/engine.test.mjs` for
exactly that reason.

**The furniture catalogue is FETCHED, not bundled.** The part specs live in
`backend/floorplan3d/assets/catalog.json` and are read by both geometry engines.
A copy in this bundle is a copy that drifts.

---

## Three.js lives in a plain class

`lib/floorplan3d/SemanticScene.js` owns the renderer, the two cameras, the
animation loop, picking and the transform gizmo. `SceneViewport.jsx` mounts a
div, constructs it once, forwards declarative props into method calls, and
disposes on unmount.

**React is never told about pointer movement.** Hover highlighting, orbiting and
gizmo dragging happen entirely inside the class; only a *completed* interaction
reaches React. A `setState` per mousemove is a re-render per mousemove.

The same shape `lib/bim/ModelScene.js` arrived at, and for the same reason: a
scene, a renderer and an animation loop are long-lived mutable objects, and
keeping them out of React is what lets the component satisfy
`react-hooks/immutability` instead of fighting it.

---

## Editing is semantic

Every edit is a command in `editCommands.js` that takes a document and returns a
**new** document. The scene rebuilds from it. Nothing touches a mesh.

Undo is a **stack of documents**, not of inverse operations: a command's real
inverse is hard to write correctly (deleting a wall also deletes its openings),
and getting it subtly wrong corrupts the document. Documents are immutable and
structurally shared, so a step costs a handful of objects.

The commands keep the document *internally consistent* — no dangling host, no
reference to a deleted room — because the server's contract rejects those
outright. They do **not** enforce the geometric rules; the server re-runs its own
deterministic repair on save and reports what it adjusted. **The returned
document is adopted**, or the editor and the database diverge.

---

## Editing by typing

The **Assist** tab sends a sentence to `POST assist/` and gets back a list of
operations — no document. `assistCommands.js` runs them through the SAME
`editCommands` module the number fields use, against a copy, and the result is a
**draft**:

* the viewport renders the draft rather than the saved document, with the
  changed elements painted green and anything being removed painted orange;
* the panel lists every change as *before → after*;
* **Keep** pushes the draft onto the ordinary command history — so Ctrl+Z undoes
  a prompt edit exactly as it undoes a dragged wall — and **Discard** drops one
  object and costs nothing.

Only `Save revision` ever writes, exactly as before.

**`assistCommands.js` does no geometry, and that is the whole design.** It
translates argument names — the plan speaks the document's `snake_case`, the
commands take camelCase — and nothing else. A second implementation of "move a
wall" here would be the trap `wallSolidRuns` is a warning about.

**`ASSIST_CAPABILITIES` is sent with every request.** The server builds the
planner's response schema from the intersection with its own vocabulary, so a
tab running older code loses an operation rather than receiving one it would
have to throw away. Adding an operation means adding it in both places; nothing
silently half-works.

**The diff is of the whole document, not of the targets.** Shortening a wall
slides the doors it hosts — `keepOpeningsInsideWall` already does that, and
comparing whole documents is what makes it visible in the preview instead of in
a toast afterwards.

**A new document is not the same as a change.** Most commands stamp provenance
whenever they run, so asking for a value an element already holds produces a
different object with identical geometry. That is reported as *skipped*, not as
a change — a proposal claiming "1 change" with nothing highlighted is the
fastest way to teach somebody to stop reading the preview.

---

## Two layers of going back, and users must feel the difference

**Undo** (Ctrl/Cmd+Z) walks back through unsaved edits in this tab: instant,
twenty deep, gone when the tab closes. A **version** is on the server, numbered
and permanent, and the Versions drawer is only ever about those.

Restoring branches. `POST revisions/{id}/restore/` writes a NEW revision holding
the old one's content, with the old one as its parent — the ten revisions after
it stay exactly where they are. The drawer says so above the buttons, because a
user who believes Restore destroys their afternoon will never press it, which
costs them the feature.

---

## Notes

- **The editor is two regions, not three, and the toolbar is short on purpose.**
  A left-hand `ElementTree` listing every wall, door and window used to take a
  quarter of the frame, and the toolbar carried layer visibility, a section cut,
  a grid toggle and Move / Rotate / Scale gizmos. All of it is unmounted. The
  reader of a floor plan is looking at their own building: the model *is* the
  list, clicking a wall reaches it faster than finding its row, and every value
  a gizmo approximated is a numeric field in the Properties panel that is exact.
  What is left is what someone looks at their building with — four camera
  presets, Fit / Reset / Ortho, floors on a multi-storey plan, Measure, a
  screenshot and fullscreen.

  `ElementTree.jsx` is still in the tree, unreferenced, because the panel is a
  plausible thing to want back. `SemanticScene` still implements the section
  plane, the grid, per-element hiding and the transform gizmo — nothing was cut
  from the scene, only from the chrome — so restoring any of them is re-wiring a
  prop, not rebuilding a feature.
- **Polling, not WebSockets.** The dashboard uses Channels for `projects` job
  progress, but this experiment owns no consumer and adding one would tie it to
  `projects`' socket routing — the exact coupling that makes a feature hard to
  remove. See `useConversionPolling.js`.
- **No new runtime dependency.** It uses the `three` already present for the BIM
  viewer, at the version already installed. Moving Three into a chunk shared by
  both features made the main bundle *smaller*.
- **Not re-exported through `src/lib/api.js`.** Callers import
  `@/lib/api/floorplan3d` directly, so removal touches no shared module.
- **The route gate is tree-shakeable.** `router.jsx` compares
  `import.meta.env.VITE_FLOORPLAN3D_ENABLED === 'true'` **exactly**, and the
  `lazy()` calls are inside that branch — so a flag-off production build emits no
  experiment chunk and does not even contain the route string. Written as a
  runtime comparison it shipped a 148 kB editor chunk for a feature the build
  could not reach. The cost is that the flag is case-sensitive.

---

## Checks

Pure logic — the wall-splitting algorithm, plan geometry, snapping, the edit
commands, undo/redo, the catalogue — is covered by Node's **built-in** test
runner. No new dependency, no config, no change to `package.json`:

```bash
node --import ./src/lib/floorplan3d/checks/register.mjs \
     --test src/lib/floorplan3d/checks/engine.test.mjs
```

```bash
node --import ./src/lib/floorplan3d/checks/register.mjs \
     --test src/lib/floorplan3d/checks/assist.test.mjs
```

43 + 19 checks. `.mjs` in a `checks/` directory so ESLint (which lints
`**/*.{js,jsx}`) does not see it and Vite never bundles it.

The assist checks defend three things and deliberately not a fourth: that
arguments are translated (a mistranslation is silent — the command reads
`undefined` as "leave this alone" and the preview reports a change that did not
happen), that an operation which changed nothing is not reported as applied, and
that knock-on effects are reported. Whether the MODEL gives good answers is not
a property code can assert; what the backend suite asserts instead is that a bad
answer cannot do any harm.

### Manual smoke test

Anything needing a real browser is listed here rather than faked, because a jsdom
canvas does not exercise a renderer.

**Setup**

```bash
# backend
python manage.py migrate && python manage.py seed_floorplan3d_assets
FLOORPLAN3D_ENABLED=True python manage.py runserver
FLOORPLAN3D_ENABLED=True celery -A config worker -Q floorplan3d --concurrency=1

# frontend
VITE_FLOORPLAN3D_ENABLED=true npm run dev
```

**The walk** — `/dashboard/experiments/floorplan-3d`

1. **Flag off.** With `VITE_FLOORPLAN3D_ENABLED` unset, the route renders the
   404 page. With the backend flag off, every request 404s.
2. **Upload.** Drop a plan. The bar shows *Checksumming → Uploading →
   Verifying*, and the stage rail names each stage as it runs. Cancel mid-upload
   and confirm it stops.
3. **Editor opens** on the high isometric view: sky-blue background, grey
   architecture, dark edges, coloured furniture, roofless.
4. **Navigate.** Orbit (drag), pan (right-drag / two-finger), zoom (wheel /
   pinch). *Fit*, *Reset*, every camera preset, and the Ortho/Perspective toggle.
5. **Select.** Click a wall in the 3D view → it highlights and the inspector
   fills. Clicking empty space clears the selection, as does `Escape`.
6. **Edit.** Change a wall's thickness and a room's name; both update
   immediately. Move, turn and resize furniture from the inspector's numeric
   fields — there is no drag gizmo.
7. **Undo/redo.** `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`, including after a
   deletion. Typing in an inspector field must **not** trigger undo.
8. **Visibility.** Isolate a floor on a multi-page PDF.
9. **Review.** Confirm a flagged element — it stops being flagged and the finding
   resolves. On a plan whose scale is unsettled, *Confirm the size* lists every
   scale the pipeline considered as the overall size the building becomes under
   it; pick one and watch every dimension change. Two-point measuring is the
   fallback beneath it, and the only thing offered when the drawing suggested
   nothing.
10. **Edit by typing.** Open *Assist*. Ask for something specific —
    *"make the front door 1 m wide"*. The proposal lists the change as
    before → after, the element turns green in the viewport, and the bar over
    the model offers Keep / Discard. **Discard** must restore the saved model
    exactly. **Keep** must leave the change unsaved, and Ctrl+Z must undo it.
    Then ask for something ambiguous — *"make the windows bigger"* — and
    confirm it asks a question with clickable answers rather than editing
    eleven windows. Finally ask for something it cannot do — *"export this as
    IFC"* — and confirm it says so instead of approximating.
11. **Assist off.** With `FLOORPLAN3D_ASSIST_ENABLED=False`, the tab is still
    there and the composer explains that the feature is off — it does not let
    somebody type a sentence and then refuse it.
12. **Versions.** Open the drawer from the `r…` button. Every saved revision is
    listed with its summary and score. *Compare* shows the elements that differ.
    *Restore* an older one: the model changes, a new revision appears at the
    TOP, and **nothing between is deleted** — that is the assertion that
    matters.
13. **Save.** *Save revision* → the revision number increments and any
    server-side adjustment is reported as a toast.
14. **Download.** After an edit the menu warns the Blender files are from an
    earlier revision. Rebuild, and confirm all four beats: the Download button
    itself says *Rebuilding…*, the menu explains the wait, a toast announces the
    result, and the warning clears. A rebuild is watched by `stage`, never by
    `status` — see `handleRegenerate`.
15. **Screenshot** and **fullscreen** (which collapses the right panel — it must
    not cover the sidebar).
16. **WebGL failure.** In a browser with WebGL disabled, the viewport shows the
    fallback message and the rest of the page still works.
17. **Cleanup.** Navigate away mid-conversion and back: polling stops and
    resumes, and the browser console shows no "setState on an unmounted
    component" warning.

---

## Removing it

1. Delete `src/pages/experiments/floorplan3d/`,
   `src/components/floorplan3d/`, `src/lib/floorplan3d/` and
   `src/lib/api/floorplan3d.js`. The Assist tab, the versions drawer and
   `assistCommands.js` are all inside those four paths.
2. In `src/router/router.jsx`: delete the `FLOORPLAN3D_ENABLED` constant, the
   `floorplan3dRoutes()` function, and the `...floorplan3dRoutes(),` line.
3. Delete `VITE_FLOORPLAN3D_ENABLED` from `.env.example`.

Nothing else in the app imports any of it. `dashboardNavigation.js` was never
touched.

# Floor Plan 3D Lab — frontend

The client half of the `floorplan3d` Django app. Upload a 2D floor plan, watch
it become a structured building model, then **edit it** — in 3D, in the plan,
in the inspector, or in ordinary words.

Backend: `backend/floorplan3d/` (its README covers the pipeline, the schema,
the API, the export providers and the removal steps).

**Routes** — authenticated, inside `DashboardLayout`, reachable by direct URL
only:

```
/dashboard/experiments/floorplan-3d              the library and the uploader
/dashboard/experiments/floorplan-3d/:sourceId    the workspace
```

Deliberately **not** in `DASHBOARD_NAV_ITEMS`. It is an experiment, and the
landing page says so at the top rather than pretending to be a finished feature.

---

## Where the files are

| Path | What it is |
|---|---|
| `src/pages/experiments/floorplan3d/Floorplan3dLab.jsx` | The front door: upload, and the plan library |
| `src/pages/experiments/floorplan3d/Floorplan3dWorkspace.jsx` | The workspace. Owns the model, the edits and the layout |
| `src/components/experiments/floorplan3d/Fp3dToolbar.jsx` | Save state, view mode, cameras, undo/redo, export |
| `src/components/experiments/floorplan3d/Fp3dLeftPanel.jsx` | Source drawing, levels, layers, element tree |
| `src/components/experiments/floorplan3d/Fp3dViewport.jsx` | Thin React shell over `Scene3D` |
| `src/components/experiments/floorplan3d/Fp3dPlan2D.jsx` | The SVG plan, and where wall corners are dragged |
| `src/components/experiments/floorplan3d/Fp3dInspector.jsx` | Every number that can be changed, with its provenance |
| `src/components/experiments/floorplan3d/Fp3dActivityPanel.jsx` | Chat, findings, assumptions, revision history |
| `src/components/experiments/floorplan3d/Fp3dCompare.jsx` | The drawing beside the model, and scale calibration |
| `src/components/experiments/floorplan3d/Fp3dConversionProgress.jsx` | What the conversion is doing, while it does it |
| `src/components/experiments/floorplan3d/Fp3dUploader.jsx` | Drag-and-drop, with chunked upload progress |
| `src/lib/experiments/floorplan3d/Scene3D.js` | All Three.js: scene, two cameras, picking, gizmo, framing. **No React** |
| `src/lib/experiments/floorplan3d/buildScene.js` | Model → meshes, the element catalogue, the furniture library |
| `src/lib/experiments/floorplan3d/plan2d.js` | Model → plan geometry: wall bodies, door swings, stair treads |
| `src/lib/experiments/floorplan3d/model.js` | The one module that reads inside the document |
| `src/lib/experiments/floorplan3d/commands.js` | Edit commands and the undo/redo stack |
| `src/lib/experiments/floorplan3d/exporters.js` | Browser JSON and GLB, and authenticated artifact downloads |
| `src/lib/experiments/floorplan3d/adapters.js` | API envelope → view models |
| `src/lib/experiments/floorplan3d/useConversionPolling.js` | Start a conversion, follow it, stop cleanly |
| `src/lib/api/floorplan3d.js` | Every `/experiments/floorplan-3d/` call |

---

## The model is the server's

Every edit — a number typed in the inspector, a furniture item dragged in 3D, a
wall corner dragged in the plan, a sentence typed into the chat — becomes the
**same edit command**, is applied and re-validated on the server, and what
comes back replaces what is on screen. Nothing here holds a second copy that
could disagree with it.

That is slower than mutating a local object, and it is the right trade: the
validator is what stops a wall being dragged through a door, and running it in
two places would mean maintaining it in two places.

The browser owns three things and no more: **which element is selected**, **what
is visible**, and **the undo stack**.

### Undo sends the inverse, not a snapshot

Every command declares its inverse at the moment it is created, from the state
*before* it ran — the only moment that information exists. Two reasons: a
snapshot restore would put the whole model on the wire for every step, and an
inverse command is itself a revision, so the history reads as what happened
("moved the door back") rather than as a hole.

A command with **no** inverse — an `add` or a `delete` whose ids the server
mints — still applies; it ends the undo run, and the toolbar's label says
`Cannot undo: …` rather than offering an undo that would do something else.

---

## The 3D scene

`Scene3D.js` is a **plain class**, not a component. A scene, a renderer, two
cameras, a gizmo and an animation loop are long-lived mutable objects; React's
job is to say *what* should be shown, not to own them. Keeping them out of
React is also what lets `Fp3dViewport` satisfy `react-hooks/immutability`
instead of fighting it.

**SketchUp-style presentation, and why.** Light neutral faces, strong dark
edges, a pale ground. That is not a look borrowed from another product — it is
what makes an untextured massing model *readable*. Flat-shaded boxes of similar
tone are nearly impossible to tell apart at a distance; the edge outline is
what turns them back into a building. Everything visual follows from that:
`EdgesGeometry` at a threshold that keeps a box's real corners and drops the
triangulation inside its faces, flat Lambert materials, and a hemisphere light
plus one sun so faces at different angles separate without anything going black.

**Two cameras.** Perspective is how a building is walked through; orthographic
is how it is measured, and a plan or an elevation read in perspective is
neither. Switching keeps the target, so the model does not jump.

**Openings are cut by splitting, not by boolean subtraction.** A wall with a
door in it is several boxes — before, after, under a sill, over a lintel.
Boolean CSG in the browser is slow, fragile on coplanar faces and needs a
library; splitting is *exact* for rectangular openings, which is every opening
this schema can express. The rule lives in `model.wallRuns` and the backend
applies the same one, so what is on screen and what is exported are the same
building.

**Framing is derived from the frustum** — every corner of the bounding box is
asked how far back the camera must be. Fitting the bounding *sphere* is a line
shorter and always too far back: a 20 × 20 m plan has a 28 m diagonal, so a top
view framed to the sphere shows 28 m of empty floor around a 20 m building.

### A gizmo drag is not an architectural edit

`TransformControls` moves a Three.js object, and a moved object is not a changed
building — the model is. So the gizmo is allowed on **furniture and fixtures
only**, its drag is constrained to the ground plane, and what it emits on
release is a *semantic* position in model coordinates.

Walls, openings and structure are deliberately not draggable in 3D: moving a
wall means moving the corners it shares, the rooms whose polygons use them and
the openings it hosts, and a gizmo cannot express that. **The 2D plan does it**,
where a corner is a corner.

---

## The 2D plan

SVG, not a second canvas. This is where a corner is dragged and a door is
clicked, and every element has to be a real hit-testable target — in SVG the
browser already does that; on a canvas each one would be a manual pick against
a list of shapes.

Wall bodies are drawn as their two faces rather than as a stroked line, because
a stroke width is only correct at one zoom level. Door swings are drawn because
a door with no swing is indistinguishable from a hole, and which way a door
opens is a real decision a person makes on a plan.

---

## Confidence is shown beside the value

The inspector puts a provenance chip next to each number: **From a printed
dimension** · **Measured from the drawing** · **Detected** · **Assumed** ·
**Set by you**, with a confidence percentage where one exists.

That placement is the point. "Assumed" next to a wall height is the difference
between a number a user trusts and one they check, and the moment it moves
somewhere they have to go looking for it, it stops working.

Elements below 0.5 confidence, and elements carrying an unresolved finding, are
tinted in both views and marked in the element tree.

The activity panel splits the rest into three lists, because they answer
different questions:

* **Needs your attention** — the engine could not decide; a person must.
* **Assumed, not measured** — values invented because the drawing did not state
  them. The most commercially important list here: a wall height nobody chose
  still ends up in a bill of quantities.
* **Fixed automatically** — a disclosure, not a to-do. The model was changed
  before the user saw it, and not saying so means their quantities differ from
  their drawing for reasons they were never told.

---

## Compare, and calibration

The uploaded drawing sits at the top of the left rail and opens into a Compare
view — side by side, or the plan overlaid on the drawing at an adjustable
opacity.

**The only way to tell a good conversion from a confident wrong one is to look
at both.** A quality score says how internally consistent the model is; it
cannot say "this is not my building". A person looking at the two together can,
in about two seconds.

Scale calibration lives there and nowhere else, because it is a measurement
taken *on the drawing*: click two points, type the real distance, and the model
is rescaled — every coordinate, thickness, height and footprint together, and
recorded as a user correction.

---

## Notes

* **Polling, not WebSockets.** The deployed Vercel proxy does not forward the
  existing socket flow reliably, and this feature owns no consumer — adding one
  would couple it to `projects`' socket routing, the exact coupling that makes
  a feature hard to remove. `useConversionPolling.js` backs off, pauses while
  the tab is hidden, resumes with an immediate poll, and gives up with an
  answer rather than spinning forever.
* **Chunked uploads.** Vercel's request body limit is well under the
  application's 25 MB ceiling, so a large PDF cannot cross as one request. The
  **server** decides the chunk size — the limit it is sized against is the
  proxy's, not anything the browser can see.
* **Route inside `dashboard`.** It inherits the authenticated boundary, the
  sidebar and the page surface from `DashboardLayout` instead of rebuilding
  them. "Separate workspace", not "second application shell".
* **Lazy-loaded.** It carries Three.js, `GLTFExporter` and `TransformControls`;
  none of that may reach the bundle of a user who never opens it. Verified:
  `dist/assets/index-*.js` contains no `WebGLRenderer`, and the Three chunk is
  shared with the BIM engine rather than duplicated.
* **Not re-exported through `@/lib/api`.** Callers import
  `@/lib/api/floorplan3d` directly — already the majority pattern for
  `projects`, `jobs`, `files` and `bim` — so removal touches no shared module.
* **The document stays `snake_case`.** `adapters.js` translates the API
  *envelope* to camelCase per CLAUDE.md §14 and passes the *model* through
  untouched: its field names are the contract the backend authors, the viewer
  renders, the exporters consume and this app sends back with edits.
  `model.js` is the only module that reads inside it.
* **No new dependency.** Three.js was already here for the BIM engine; nothing
  else was added.

## Known limitations

* The left panel and the inspector are hidden below `lg` and `xl` respectively.
  The 3D view, the plan, the toolbar and the chat work at every width, but a
  phone is not where this is used.
* Undo is cleared by a natural-language edit — those commands are the server's,
  and their inverses were never captured here. The revision history undoes them.
* Fixtures cannot be dragged; they are part of the building. The chat moves one.
* "Save" reloads rather than flushing: every edit is already committed as its
  own revision, and a button that pretended otherwise would be a lie.

---

## Removing it

1. Delete `src/pages/experiments/floorplan3d/`,
   `src/components/experiments/floorplan3d/`,
   `src/lib/experiments/floorplan3d/` and `src/lib/api/floorplan3d.js`.
   (`src/pages/experiments/`, `src/components/experiments/` and
   `src/lib/experiments/` then hold nothing and can go too.)
2. In `src/router/router.jsx`: delete the two `lazy()` imports
   (`Floorplan3dLab`, `Floorplan3dWorkspace`) and the two
   `experiments/floorplan-3d` route entries.

Nothing else in the app imports any of it. There is no navigation entry, no
`@/lib/api` re-export, no context, no shared component and no new dependency to
remove.

The backend half removes the same way — see `backend/floorplan3d/README.md`.

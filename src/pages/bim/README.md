# BIM engine — frontend

The client half of the `bim` Django app. Upload a 2D floor plan, watch it become
a structured building model, and see what the engine understood.

Backend: `backend/bim/` (its README covers the pipeline, the grader and the API).

---

## Where the files are

| Path | What it is |
|---|---|
| `src/pages/bim/BimWorkspace.jsx` | `/dashboard/bim` — upload, and the plan library |
| `src/pages/bim/BimPlanPage.jsx` | `/dashboard/bim/:sourceId` — one plan, its model, the verdict |
| `src/components/bim/BimUploader.jsx` | Drag-and-drop upload |
| `src/components/bim/BimModelWorkspace.jsx` | Element tree + toolbar + the 3D model |
| `src/components/bim/BimModelViewer.jsx` | Thin React shell over `ModelScene` |
| `src/lib/bim/ModelScene.js` | All Three.js: scene, camera, picking, framing. No React |
| `src/lib/bim/buildModel.js` | Plan JSON → Three.js meshes, and the element catalogue |
| `src/components/bim/BimDrawingPanel.jsx` | The uploaded drawing, with the shared lightbox |
| `src/components/bim/BimDetailsPanel.jsx` | The bottom section: Summary / Findings / Assumed / JSON |
| `src/components/bim/BimJsonView.jsx` | Highlighted plan JSON, copy and download |
| `src/components/bim/BimPlanFacts.jsx` | Scale caveat, then the numbers |
| `src/components/bim/BimQualityPanel.jsx` | Findings, assumptions, auto-repairs |
| `src/lib/bim/planGeometry.js` | Flagged-element ids and the two formatters |
| `src/lib/bim/useExtractionPolling.js` | Start an extraction, follow it, and load a finished one |
| `src/lib/api/bim.js` | Every `/api/v1/bim/` call |

## The 3D model

Built straight from the plan JSON — no IFC in the path. `buildModel.js` turns
walls into boxes, cuts openings by **splitting** the wall into the runs that
survive them (before, after, under a sill, over a lintel) rather than by boolean
subtraction, extrudes slabs and room finishes from polygons, and attaches an
element to every mesh so one click resolves to one row of the plan.

Furniture is drawn from a small parametric library in `buildModel.js`
(`fixtureParts`): a desk is a top and two side panels, a chair is a seat, a
pedestal and a back, a WC is a bowl and a cistern. Three or four boxes each,
because an open-plan floor carries a hundred workstations and twelve boxes apiece
would not render. Anything the library does not recognise falls back to a single
box — never to nothing.

`ModelScene.js` owns the camera. Framing is derived from the frustum — every
corner of the bounding box is asked how far back the camera must be — because a
fixed multiple of the bounding radius fits at one aspect ratio and clips at
every other.

## The layout

**The page does not scroll.** It is two regions dividing the content area: the
drawing and the model on top, the details below, each scrolling internally. A
scrolling page put the model — the subject, and the only thing here that needs
room — wherever the reader happened to have scrolled to.

**Expanding the model hides its siblings; it does not go `fixed`.** A fixed
overlay escaped the dashboard shell and covered the sidebar, which is not what
"full screen" means inside an application. Hiding the drawing and the details
lets the model fill the content area exactly, with the navigation still there.

**The drawing stays on screen beside the model**, because the only way to tell a
good extraction from a confident wrong one is to look at both. It opens in the
app's shared `FloorPlanFullscreenModal` rather than shipping a second viewer.

There used to be a third panel — the plan redrawn as SVG — between the two. The
3D model does that job better, so it is gone (`BimPlanPreview`, and most of
`planGeometry.js` with it).

The details section is tabbed, and the three lists are split on purpose:

- **Needs your attention** — the engine could not decide; a person must.
- **Assumed, not measured** — values invented because the drawing did not state
  them. The most commercially important list on the page: a wall height nobody
  chose still ends up in a bill of quantities.
- **Fixed automatically** — a disclosure, not a to-do. The model was changed
  before the user saw it, and not saying so means their quantities differ from
  their drawing for reasons they were never told.

## Notes

- **Polling, not WebSockets.** The rest of the dashboard uses Channels for job
  progress, but this feature owns no consumer, and adding one would couple it to
  `projects`' socket routing — the exact coupling that makes a feature hard to
  remove. See `useExtractionPolling.js`.
- **Route inside `dashboard`.** It inherits the authenticated boundary, the
  sidebar and the page surface from `DashboardLayout` instead of rebuilding
  them. "Separate workspace", not "second application shell".
- **Lazy-loaded.** A user who never opens the 3D Engine pays nothing for it in
  the main bundle — which matters more once the 3D viewer lands here.

## Removing it

1. Delete `src/pages/bim/`, `src/components/bim/`, `src/lib/bim/` and
   `src/lib/api/bim.js`.
2. In `src/router/router.jsx`: delete the two `lazy()` imports (`BimWorkspace`,
   `BimPlanPage`) and the two `bim` route entries.
3. In `src/lib/dashboard/dashboardNavigation.js`: delete the `id: 'bim'` item.
4. In `src/components/dashboard/DashboardNavItem.jsx`: delete `Cube` from the
   import and from `ICON_MAP`. (Optional — the map already falls back.)

Nothing else in the app imports any of it.

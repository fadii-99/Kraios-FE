KRAIOS — CLAUDE.md

Permanent project rules for KRAIOS.

Read this file before changing the application. Then read PROGRESS.md for the current implementation state, known issues, mock/backend limitations, and latest validation status.

1. Source of truth

When instructions or documents disagree, use this priority:

The user's explicit instruction for the current task.

This CLAUDE.md for durable KRAIOS product, design, architecture, and engineering rules.

The actual current source code for implementation details.

PROGRESS.md for current completion state, mock behavior, known issues, and validation status.

Do not preserve stale documentation just because it already exists.

Do not guess routes, filenames, component names, state ownership, backend capability, or supported features. Inspect the current code first.

2. Product

Brand: KRAIOS

KRAIOS is a self-serve SaaS application for architectural / fit-out workflows.

The current project workflow has exactly four stages:

Upload

3D Rendering

BoQ

Output

The user works inside the application. KRAIOS is not an agency hand-off service.

Do not use agency copy such as:

“send us your plans”

“share your files with us”

“our team will build it for you”

“contact us to process your project”

Do not invent:

customer counts

fake testimonials

fake project metrics

fake pricing

fake processing accuracy

fake backend persistence

fake AI analysis

fake file-generation claims

Frontend/demo data is allowed while backend services are unavailable, but it must remain identifiable as mock/demo behavior in code and documentation.

3. Current stack

Current project stack from package.json:

Vite 8

React 19

JavaScript / JSX only

React Router DOM 7 using createBrowserRouter

Tailwind CSS v4

GSAP

@gsap/react

Phosphor Icons

React Markdown

remark-gfm

React Hot Toast

Inter Variable

Do not introduce:

TypeScript

a second router

Redux / Zustand / another state library

another icon library

another UI kit

another form framework

another toast library

unless the user explicitly requests it or there is a clear architectural reason.

The React Hot Toast migration is DONE. React-Toastify is uninstalled and no Toastify import, container, CSS class or helper remains. Do not reintroduce it, and do not add a second notification library alongside React Hot Toast.

4. Design system — critical

When creating or modifying KRAIOS UI, reuse the existing KRAIOS system first.

Preserve and reuse:

current KRAIOS colors

CSS design tokens

KRAIOS blue

current typography

current spacing rhythm

current border language

current subtle radius system

existing Button component

existing FormInput

existing Modal

existing full-screen floor-plan viewer

current dropdown family

existing toast styling

Phosphor Icons

dashboard page surface

architectural grid/detail language

current motion language

Do not introduce a visually separate mini-design-system inside one feature.

New UI must feel native to the current KRAIOS product.

Useful shared components/patterns to inspect before creating equivalents:

src/components/ui/PrimaryButton.jsx

src/components/ui/FormInput.jsx

src/components/ui/Modal.jsx

src/components/ui/PageLoader.jsx

src/components/ui/KraiosToaster.jsx

src/components/ui/Logo.jsx

src/components/dashboard/DashboardPageHeader.jsx

src/components/dashboard/DashboardPageSurface.jsx

src/components/dashboard/TechnicalIconFrame.jsx

src/components/dashboard/projects/workflow/shared/FloorPlanFullscreenModal.jsx

src/components/dashboard/projects/workflow/shared/FloorPlanWorkArea.jsx

src/styles/index.css

src/styles/toast.css

Do not recreate these concepts per page.

5. Color / typography rules

The live visual source of truth is the current CSS in src/styles/index.css.

Current brand direction includes:

navy / deep navy

KRAIOS blue

white / light application surfaces

restrained neutral borders

semantic success / warning / danger colors

The runtime font is Inter Variable.

Do not add another font unless explicitly requested.

6. Shape language

KRAIOS uses a restrained, lightly-rounded architectural shape language.

The application is no longer zero-radius.

Current radius scale:

--radius-xs: 3px

--radius-sm: 4px

--radius-md: 6px

--radius-lg: 8px

Use the current token system rather than inventing arbitrary radii.

Typical use:

tiny chips / marks: xs

buttons / inputs / compact controls: sm

cards / panels / dropdown surfaces / image frames: md

large modal / major framed surface: lg

Do not introduce generic SaaS rounding such as large 12–24px card radii.

Intentional circles remain circles:

status dots

avatars

spinners

workflow nodes

circular controls

decorative radial marks

Structural layout wrappers do not need radius merely because they are <div> elements.

7. Public site

Public/auth routes live under AppLayout.

Current public routes:

/

/login

/forgot-password

/signup

Public landing navigation:

Home

About

How It Works

Why Kraios

Team

FAQ

Contact

Landing section ids:

home

about

process

why

team

faq

contact

Do not casually rename section ids because navigation and scroll behavior depend on them.

Public content primarily comes from src/lib/content.js.

Auth is currently frontend/mock-oriented. Do not describe it as production authentication unless a real auth backend is connected.

8. Dashboard shell

Authenticated routes use one shared DashboardLayout.

The dashboard shell owns:

Sidebar / mobile dashboard navigation

shared page surface

dashboard providers

right-side application workspace

Do not create another dashboard shell inside workflow features.

Do not hide/recreate the Sidebar for Design Assistant or BoQ Assistant.

“Full-screen assistant” means the full available right-side dashboard workspace, not replacing the dashboard shell.

Global dashboard navigation source:

src/lib/dashboard/dashboardNavigation.js

Current navigation:

Overview

Projects

Subscription

Profile

Log out

Project workflow stages do not belong in the global Sidebar.

9. Current dashboard routes

Current router includes:

/dashboard
/dashboard/projects
/dashboard/profile
/dashboard/subscription

/dashboard/projects/:projectId
/dashboard/projects/:projectId/upload
/dashboard/projects/:projectId/rendering
/dashboard/projects/:projectId/rendering/assistant
/dashboard/projects/:projectId/boq
/dashboard/projects/:projectId/boq/assistant
/dashboard/projects/:projectId/output

The four workflow stages are sibling routes under one selected project.

Design Assistant and BoQ Assistant are sibling focused workspaces inside DashboardLayout.

They intentionally sit outside ProjectWorkspace, so they do not inherit the workflow stepper / Previous-Next bar.

Do not create a second router.

Use the existing path builders in src/lib/dashboard/workflow/projectWorkflow.js.

10. Dashboard pages

Current dashboard UI exists for:

Overview

Projects

Projects empty state

Project cards

Create Project modal

Delete Project confirmation

Subscription

Profile

complete four-stage project workflow UI

These screens should not be described as placeholders.

Maintenance/optimization tasks must not visually redesign them unless the user explicitly requests a redesign.

11. Project state

ProjectsProvider is mounted in the dashboard shell and currently coordinates:

project list

per-project Step 1 floor-plan source

per-project Step 2 Design Assistant state

per-project Step 3 BoQ Assistant state

Current state is session-memory frontend state.

There is no project API/database/localStorage persistence.

Refresh loses the project session.

has3DRender is derived from whether Step 2 has an approved Design Assistant result.

hasBoQ is derived from whether Step 3 has an approved BoQ result.

Do not independently write duplicate status truth into ProjectCard or another store.

Do not add Redux/Zustand merely to restructure the current provider.

If high-frequency assistant updates become a performance issue, first consider narrower contexts/providers or selector-style boundaries.

12. Feature ownership

The project workflow is already feature-scoped.

Current UI ownership:

src/components/dashboard/projects/
├── library/
│   ├── CreateProjectModal.jsx
│   ├── ProjectCard.jsx
│   └── ProjectGrid.jsx
│
└── workflow/
    ├── shared/
    │   ├── DiscardProjectModal.jsx
    │   ├── FloorPlanFullscreenModal.jsx
    │   ├── FloorPlanWorkArea.jsx
    │   ├── ProjectStepNavigation.jsx
    │   ├── ProjectWorkflowNav.jsx
    │   └── StepPlaceholder.jsx
    │
    ├── step-1/
    ├── step-2/
    │   ├── assistant/
    │   └── canvas/
    ├── step-3/
    │   └── assistant/
    └── step-4/

Project routes are guarded once, not per stage:
src/pages/dashboard/projects/RequireProject.jsx wraps the workspace and both
assistant routes and redirects an unknown :projectId to /dashboard/projects.
Do not add per-stage `if (!project)` checks; extend the guard instead.

Current domain ownership:

src/lib/dashboard/
├── toast helpers live in src/lib/toast.js (NOT in the toast component module)
├── projects/
└── workflow/
    ├── projectWorkflow.js
    ├── step-1/
    ├── step-2/
    ├── step-3/
    │   ├── boqDemoData.js     # the ONE BoQ fixture, read by Step 3 and Step 4
    │   └── boqDocuments.js    # supporting-document record + blob-URL release
    └── step-4/

All four workflow stage folders already contain real UI/domain code.

Do not create documentation saying Step 3 or Step 4 are future placeholders.

Do not perform another broad folder restructure unless there is a real ownership problem.

13. Shared vs feature-specific code

Share only genuinely generic primitives.

Good future shared-assistant candidates:

assistant workspace header shell

dropdown shell

composer shell

message/timestamp metadata

approval-control shell

conversation frame

Keep feature behavior separate.

Step 2 owns:

render-style behavior

view-angle behavior

3D result

image editing / canvas

3D approval

Step 3 owns:

document type

uploaded-document context

BoQ result

BoQ table

BoQ approval/finalization

Do not create one giant conditional component such as:

<Assistant type="design" />
<Assistant type="boq" />

with large if/else branches for feature-specific behavior.

14. Workflow source of truth

Workflow source:

src/lib/dashboard/workflow/projectWorkflow.js

Current stages:

Upload

3D Rendering

BoQ

Output

BoQ is currently declared optional.

That means the user may reach Output without completing BoQ.

If this product rule changes, change the workflow deliberately and update both code and documentation together.

Do not create a fifth stage for Design Assistant or BoQ Assistant.

They are focused workspaces belonging to Steps 2 and 3.

15. ProjectWorkspace structure

ProjectWorkspace owns the normal four-stage shell.

Conceptual layout:

TOP
Project workflow stepper

MIDDLE
Active stage content

BOTTOM
Previous / Next navigation

Preserve this architecture.

Do not move the bottom workflow navigation inside a large nested stage scroller.

Do not replace it with brittle fixed/absolute hacks.

16. Step 1 — Upload / Generate

UI implemented.

Step 1 is the active 2D floor-plan source stage.

Current UI/components include:

FloorPlanInputStage

FloorPlanModeToggle

FloorPlanBrief

FloorPlanSourcePreview

UploadFloorPlanPanel

GenerateFloorPlanPanel

Current behavior:

Upload mode

Generate mode

one active source per project

upload and generated source are mutually exclusive

source preview

source removal/replacement

image/PDF handling

object URL cleanup

Shared full-screen/work-area primitives live under workflow/shared/.

Backend reality:

local file selection/preview is frontend-real

AI floor-plan generation backend is not connected

generation service currently uses an unavailable contract rather than pretending a real backend exists

Step 1 UI is approved unless the task explicitly targets it.

17. Step 2 — 3D Rendering gateway

UI implemented.

Route:

/dashboard/projects/:projectId/rendering

Normal Step 2 is a gateway/status screen, not the full assistant.

Current Step 2 UI includes:

Rendering stage composition

Design Assistant gateway

reference source strip

approval status

approved-design presentation

current state/status copy

transition into Design Assistant

Do not embed the full long chat inside the gateway.

18. Design Assistant

UI and frontend state workflow implemented.

Route:

/dashboard/projects/:projectId/rendering/assistant

Current workspace includes:

dashboard Sidebar retained

dedicated assistant header

Back to 3D Rendering

Render Style dropdown

approval status

conversation area

assistant/user messages

message timestamps

prompt composer

quick prompts

loading / failure / retry states

generated 3D result blocks

result selection

View Angle menu

result approval

Expand result

Edit/refine path

Kraios Design Canvas

optional DWG action only when a real URL exists

Current render styles:

SketchUp

Photo Realistic

Current view angles:

Isometric 45°

Bird’s Eye 45°

Current 3D generation backend:

real model-generation backend is not connected

frontend mock generation is enabled

the mock result uses a local asset

A newly generated result clears previous approval.

Only an explicitly approved result should represent Step 2 completion.

View Angle rule:

Selecting a view angle is a generation request, not a display setting. It moves the header to the chosen angle and then runs the SAME generation path a typed instruction runs, producing a new, unapproved result. Do not add a second generation implementation for it, and do not fake a viewpoint by transforming an existing image.

19. Kraios Design Canvas

The Design Assistant currently contains a dedicated canvas editing UI.

It is a Step 2 feature, not a separate workflow stage.

Do not move canvas-specific logic into global dashboard UI.

Performance rule:

Canvas history must not grow without practical bounds. It is capped at MAX_HISTORY full-canvas snapshots; when the cap is exceeded the oldest is dropped and the index is clamped to the newest slot.

Honesty rule:

The toolbar's advertised shortcuts (L / P / H / E, Ctrl+Z, Ctrl+Y) are wired. The Lasso / Cutout tool currently draws a freehand stroke like the pen — it is not a selection or cutout tool. Do not describe it as one until a real path/composite implementation exists.

The current implementation stores full canvas snapshots; future optimization should cap/optimize this without redesigning the canvas.

Do not advertise keyboard shortcuts or lasso behavior as functional unless those interactions are implemented.

20. Step 3 — BoQ gateway

UI implemented.

Route:

/dashboard/projects/:projectId/boq

Current Step 3 is a gateway/status experience for BoQ Assistant.

Current UI includes:

KRAIOS BoQ Assistant gateway

approved 3D context

2D plan context

current BoQ approval state

what-you-build / BoQ information

entry into BoQ Assistant

current optional Skip-to-Output product path

shared full-screen floor-plan preview where used

Do not describe Step 3 as StepPlaceholder only.

The route page uses StepPlaceholder as a shell wrapper, but the actual content is BoQStage / BoQAssistantGateway.

21. BoQ Assistant

UI and frontend/mock state workflow implemented.

Route:

/dashboard/projects/:projectId/boq/assistant

Current workspace includes:

same dashboard shell family as Design Assistant

BoQ Assistant header

Back to BoQ

Document Type dropdown

Uploaded Documents dropdown

approval status

conversation

user / assistant messages

timestamps

prompt composer

dummy/mock generation

structured light BoQ result table

Approve / revoke approval

Add row

Delete row

retry / loading state

Current document types in code:

General Document

MEP Drawing

HVAC Drawing

Door and Window Schedule

Current BoQ generation is frontend/mock.

Do not claim the dummy table was actually calculated from the user’s floor plan, approved 3D geometry, uploaded files, or live market prices.

Document record contract:

A supporting document is built by createBoqDocument in workflow/step-3/boqDocuments.js and carries { id, name, size, mime, extension, kind, typeId, typeLabel, file, previewUrl, ownsPreviewUrl, addedAt } — the shape Step 4 needs to list, preview, download and package it. The reducer takes a finished record and stays pure; ProjectsProvider revokes previewUrl when a document leaves the list, when the project is deleted, and on unmount. Mirror step-1/floorPlanSource.js rather than inventing a second file-record shape.

Known implementation gap:

the reducer has uploadDocument and the header has uploaded-document UI, but the composer exposes NO attachment control, so nothing dispatches it — supporting-document upload is not reachable end to end

Adding that control means adding a new element to an approved interface, which is a design decision, not a cleanup. Do not document document upload as functional until it is wired, and do not write UI copy directing users to an upload action that does not exist.

22. BoQ approval rules

Approval belongs to one specific BoQ version/result.

Generating a new BoQ result invalidates the previous approval.

Any material change to an approved BoQ also invalidates approval. Add Row and Delete Row both clear `approvedResultId` when they touch the approved result — every table mutation goes through one write helper so a future edit action cannot keep an approval it invalidated. `approvedResultId` is the single approval flag; do not add a component-local `isApproved`.

Examples:

adding a row

deleting a row

changing approved table content

Current code still needs this behavior fixed for row modifications.

Do not consider the issue complete until the reducer actually clears approval on those mutations.

23. Step 4 — Output / Deliverables

UI implemented.

Route:

/dashboard/projects/:projectId/output

Step 4 is the final project deliverables workspace.

It is not an assistant/editor.

Current Step 4 UI includes:

Output header

Download Project ZIP action

Plans & Renders section

Original 2D Floor Plan card

Approved 3D Design card

shared full-screen floor-plan viewer

individual 2D/3D download actions

Final BoQ section

structured read-only BoQ table

BoQ CSV export

Uploaded Documents section

document empty state

project package ZIP generation

Current Step 4 feature components include:

OutputStage

OutputHeader

OutputPlanCard

PlansAndRendersSection

FinalBoQSection

FinalBoQTable

UploadedDocumentsSection

Current domain modules include:

outputConfig.js

outputDownloads.js

Step 4 should remain primarily:

View

Review

Download

Do not add upstream editing behavior to Output.

24. Step 4 data truth

Step 4 reads:

Step 1 current 2D source

Step 2 explicitly approved 3D result

Step 3 explicitly approved/finalized BoQ — and NOTHING else

Step 3 uploaded documents

Final BoQ rule:

The final BoQ is `approvedBoqResult(boqState)`. There is no fallback to the latest result: an unapproved draft is not a deliverable, must not appear under an approved badge, must not be exportable as the project CSV, and must not be written into the deliverables ZIP. Because BoQ is optional and skippable, "no finalized BoQ" is a normal state, shown with Output's existing dashed empty presentation; the rest of the page works without it.

Demo fixtures:

Output still uses demo 2D/3D assets when upstream real state is missing, and the BoQ fixture in workflow/step-3/boqDemoData.js remains available for UI work. Keep fixtures isolated from finalized-state truth: a fixture may stand in for a picture, never for an approval.

25. Downloads

Current Output supports client-side download behavior including:

2D asset download

3D asset download

BoQ CSV generation/download

client-side project ZIP package generation

Download rules:

verify `response.ok` before packaging any fetched asset; a failed fetch is unavailable, never a file

normalize every user-supplied name with `safeFileName` before it becomes a ZIP path (no `/`, `\`, `..`, or empty names)

use real available data when possible

do not hardcode fake external URLs

sanitize user-controlled filenames

verify fetched assets succeeded before packaging

do not package an HTTP error response as a project file

Large real architectural packages may eventually require backend packaging rather than holding all data in browser memory.

26. Notifications

The notification system is React Hot Toast. There is no second notification
library and no second notification API.

One global host:

src/components/ui/KraiosToaster.jsx renders the single `<Toaster>`, mounted once
in src/main.jsx beside the RouterProvider. It therefore serves public, auth,
dashboard, workflow, assistant and modal surfaces alike. Never render a second
Toaster inside a page, layout or feature.

Module split (the reason it is split — do not undo it):

src/components/ui/KraiosToaster.jsx exports ONLY components. Mixing helpers into
a component module broke React Fast Refresh for every consumer.

src/lib/toast.js is the plain-JS API every caller uses:

showSuccessToast / showErrorToast / showInfoToast / showLoadingToast /
dismissToast, plus TOAST_DURATION and toastKind.

No file outside those two imports `react-hot-toast` directly. Do not add a third
call style.

Presentation — light KRAIOS theme:

top-right, inset from the viewport; below 1024 the stack clears the 56px mobile
navigation bar

white surface, hairline border, --radius-md geometry, restrained shadow, product
body type at 0.75rem, width capped so long copy wraps

semantic meaning is carried by a small icon badge and a 2px remaining-time rule
— success green, error red, info/loading KRAIOS blue. The surface is never
filled with the semantic colour.

Styling lives in src/styles/toast.css (`.kraios-toaster` / `.kraios-toast`) and
in the component. Nothing else reads those classes.

Durations: success 3000ms, info 3500ms, error 4500ms, loading until resolved or
dismissed. They live in TOAST_DURATION; do not pass ad-hoc timings per call
site.

Duplicate prevention:

Pass a stable `{ id }` for anything a user can fire repeatedly — a workflow
gate, a rejected file, a blocked action, a retried generation. React Hot Toast
replaces the toast holding that id instead of stacking copies.

ONE user-facing toast per event, decided by the UI/action layer. A service or
helper returns or throws a structured failure; it does not raise a toast, and a
page must not toast the same failure a component already toasted.

Form validation:

Transient validation copy is a toast, never an inline red line. On submit:
validate, prevent the submit, keep the invalid field styling, focus the first
invalid field, and raise ONE toast for the first/highest-priority error. The
next issue surfaces on the next submit.

Never toast while the user types. Internal validation state may still update on
change and blur; it just stays silent.

Field-level state is NOT optional. `aria-invalid`, required semantics, the
invalid border and the message carried in a screen-reader-only node that
`aria-describedby` points at all remain — the toast says what is wrong, the
field says where. Never leave a dangling `aria-describedby` id.

Honest feedback:

Never announce success before the action succeeded. A download reports success
only when the file was actually produced (`downloadAssetUrl` returns whether it
was). Never surface a raw thrown `message`, Axios/fetch string or backend field
name to a user.

No success toast for small UI interactions — opening a dropdown or a modal,
selecting a render style or a document type, focusing a field.

Transient event feedback belongs in toast notifications.

Persistent product states remain visible in page UI.

Examples of persistent state:

DESIGN APPROVED

BOQ READY

NO DOCUMENTS UPLOADED

NO PROJECTS YET

27. Custom dropdown rules

Custom KRAIOS dropdowns must:

visually match the current control family

select exactly once per user action

close correctly

be keyboard/focus accessible

not claim keyboard behavior that does not exist

Selection is bound to onClick and to nothing else. Binding it to onMouseDown as well ran it twice for one mouse press; if a duplicate ever reappears, remove the second binding rather than suppressing the second call with a flag or a timer.

Current keyboard reality, stated plainly so no comment overstates it: the trigger is a real button (focusable, Enter/Space to open), Escape closes the menu and returns focus to the trigger, and choosing an option also returns focus there. Arrow-key roving focus over the option rows is NOT implemented in any of the three menus. Implement it properly or say it does not exist — do not document it as present, and do not add a third-party dropdown library.

28. Route integrity

Workflow state should belong to a real project.

A direct URL with an invalid projectId should not silently create a usable fake workflow session.

Preferred architecture:

validate project existence once at the project workflow/assistant route boundary

redirect to Projects or show a safe project-not-found state

Do not duplicate this check in every child component.

Implemented as src/pages/dashboard/projects/RequireProject.jsx, wrapping the ProjectWorkspace route and both assistant routes. An unknown :projectId redirects (replace) to /dashboard/projects. The per-project state hooks still return a shared frozen default for a project that exists but is untouched — that is the fallback's only job, and the guard is what stops it being reached with an id that does not exist.

29. Responsiveness

Use one responsive implementation per component.

Do not create:

DesktopDashboard

TabletDashboard

MobileDashboard

Use the existing CSS/Tailwind responsive system.

Important viewport classes to preserve/test when a responsive QA task is requested:

1920

1440

1366

1280

1024

834

768

430

390

375

360

Do not claim those widths are visually verified unless they were actually tested.

30. Scroll ownership

Avoid unnecessary nested scrollbars.

Valid internal scroll examples:

Design Assistant conversation

BoQ Assistant conversation

responsive BoQ table horizontal overflow

Normal gateway pages and standard forms should use natural page/workspace layout rather than nested scrolling caused by bad height constraints.

31. Motion

Use existing GSAP patterns and usePrefersReducedMotion.

Clean up:

timers

event listeners

GSAP timelines

object URLs

transient resources

Do not add heavy motion during maintenance work.

32. React performance

Do not blindly add:

React.memo

useMemo

useCallback

Optimize real bottlenecks.

Prefer:

correct state ownership

narrower high-frequency subscriptions

bounded histories

effect cleanup

route-level code splitting

avoiding duplicate expensive work

avoiding unnecessary artificial waits

Current page-level route lazy loading should be preserved.

33. Known performance targets

Current areas worth future optimization:

ProjectsProvider is broad and receives high-frequency assistant state updates.

Kraios Design Canvas history stores full snapshot data and is currently unbounded.

Several UI/demo flows contain artificial delays.

Client-side ZIP packaging keeps project files in browser memory.

Do not redesign the UI while optimizing these.

34. Dead / unused code cleanup

Do not keep unused source indefinitely.

Current audit found files with no current importer, including:

src/hooks/useSectionReveal.js

src/components/ui/Figure.jsx

src/components/dashboard/projects/workflow/step-2/StageIntro.jsx

src/components/dashboard/projects/workflow/step-2/assistant/AssistantGeometryBackdrop.jsx

src/components/dashboard/projects/workflow/step-2/assistant/ExpandResultModal.jsx

src/components/dashboard/projects/workflow/step-2/assistant/ComposerContextStrip.jsx

Verify once before deleting because dynamic usage/import patterns can exist.

Unused-code cleanup must not change visible UI.

35. Maintenance tasks must preserve UI

When the task is:

bug fixing

lint cleanup

performance optimization

state correction

architecture cleanup

dead-code removal

dependency migration

notification migration

do not redesign the application unless the user explicitly asks for visual changes.

Preserve:

layout

spacing

typography

colors

button appearance

icon appearance

radius

page composition

existing responsive intent

existing motion

A maintenance refactor should ideally be visually indistinguishable from the previous UI.

36. Lint / validation

Never write “lint passes” unless lint was actually run and passed on the current source.

The current source is lint-clean (0 errors, 0 warnings). Keep it that way: fix the stale code a rule points at rather than silencing the rule. Do not add eslint-disable, dummy references, `void unused`, or blanket `_` renames to get a green run.

After relevant cleanup, run:

npm run lint

or the equivalent ESLint command in the actual development environment.

Do not claim production readiness solely from static source inspection.

37. Documentation

CLAUDE.md contains durable rules.

PROGRESS.md contains current implementation status.

Do not turn either file into append-only history.

After a meaningful change:

inspect final code

update the relevant current section

remove stale/contradictory statements

record only real validation results

Most important current rule:

All four workflow stage UIs are implemented in the current source. Step 3 and Step 4 are not placeholders.
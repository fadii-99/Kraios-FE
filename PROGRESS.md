KRAIOS — PROGRESS.md

Current implementation snapshot for the supplied KRAIOS frontend.

This file describes what exists now, what is mock/frontend-only, what is known to be incomplete, and what currently needs cleanup.

Do not use this as an append-only development diary.

1. Overall status

The current frontend contains UI for the complete KRAIOS application flow:

public marketing website

authentication pages

authenticated dashboard

Projects

Profile

Subscription

Step 1 — Upload

Step 2 — 3D Rendering

Design Assistant

Step 3 — BoQ

BoQ Assistant

Step 4 — Output / Project Deliverables

Important correction from older documentation:

Step 3 and Step 4 are fully designed/implemented as frontend UI in the current source. They are not empty placeholders.

Their route files still use the shared StepPlaceholder wrapper, but the actual stage content is implemented inside BoQStage and OutputStage.

2. Stack

Current package stack:

React 19.2.8

React DOM 19.2.8

Vite 8.2.1

React Router DOM 7.18.2

Tailwind CSS 4.3.3

GSAP 3.15.0

@gsap/react 2.1.2

Phosphor Icons

React Markdown

remark-gfm

React Hot Toast 2.6.0

Inter Variable

Current scripts:

npm run dev
npm run build
npm run preview
npm run lint

No automated test script is configured in package.json.

3. Public website

Implemented frontend:

Navbar

Hero

About

How It Works

Why Kraios

Team

FAQ

Contact

Footer

mobile navigation

Public content uses the current KRAIOS design language.

4. Authentication

Implemented frontend UI:

Login

Signup

Forgot Password

Current auth behavior remains frontend/mock-oriented.

No production auth backend is documented as connected. Because there is no
credential check, no "email or password is incorrect" or sign-in failure
feedback exists — inventing one would claim an authentication that never ran.

Login carries a "Demo Access" note above the form stating that any dummy email
and password will open the dashboard UI and that credentials are not checked.
It exists so the page does not imply an account it never verifies; remove it
when a real auth backend is connected.

Validation feedback is React Hot Toast (see section 19): one error toast per
invalid submit, no inline red error line, field invalid styling and aria
preserved.

5. Dashboard shell

Implemented:

DashboardLayout

desktop Sidebar

mobile dashboard navigation

shared Dashboard page surface

dashboard provider layer

route-level lazy loading

Sidebar navigation:

Overview

Projects

Subscription

Profile

Log out

6. Dashboard pages

Overview

Implemented.

Includes the current welcome/dashboard composition and project entry flow.

Projects

Implemented.

Includes:

real empty state

create project

project cards

project grid

open project workflow

delete project

project 3D/BoQ status derived from current session state

Profile

Implemented frontend.

Form/data remains local/frontend-oriented — Save Changes writes to component
state for the session and nothing else.

No production profile backend persistence is documented.

Name and email are validated on submit (email via the shared isEmail). Feedback
is a toast; the inline "Changes saved" line was removed. Layout, fields and
actions are unchanged.

Subscription

Implemented frontend/mock.

Plan/current-plan UI exists.

No billing/payment backend is documented as connected.

7. Project state

ProjectsProvider currently coordinates:

projects

Step 1 floor-plan source

Step 2 Design Assistant state

Step 3 BoQ Assistant state

Project data is session-memory only.

Refresh loses the dashboard project state.

Derived status:

has3DRender = Step 2 approved result exists

hasBoQ = Step 3 approved BoQ result exists

No separate persistent backend project store is currently connected.

8. Workflow

Current source of truth:

src/lib/dashboard/workflow/projectWorkflow.js

Stages:

Upload

3D Rendering

BoQ

Output

BoQ is currently marked optional.

Current routes:

/dashboard/projects/:projectId/upload
/dashboard/projects/:projectId/rendering
/dashboard/projects/:projectId/rendering/assistant
/dashboard/projects/:projectId/boq
/dashboard/projects/:projectId/boq/assistant
/dashboard/projects/:projectId/output

Normal four-stage pages use ProjectWorkspace.

Design Assistant and BoQ Assistant are focused sibling routes inside the same dashboard shell.

9. Step 1 — Upload

Status: UI IMPLEMENTED

Current UI includes:

Upload / Generate mode

2D source selection

image/PDF handling

floor-plan preview

source replacement/removal

generated-source UI contract

shared full-screen preview/work-area patterns

Current real behavior:

local file selection/preview works in frontend

object URL cleanup exists

Current mock/backend limitation:

AI floor-plan generation backend is not connected

Step 1 UI should not be described as placeholder.

10. Step 2 — 3D Rendering gateway

Status: UI IMPLEMENTED

Current Step 2 normal route includes:

RenderingStage

Design Assistant gateway

reference/source state

approval status

approved-design presentation

current 3D status

transition into Design Assistant

Step 2 normal page is intentionally a gateway/status page.

11. Design Assistant

Status: UI + FRONTEND STATE IMPLEMENTED

Route:

/dashboard/projects/:projectId/rendering/assistant

Current UI/functionality includes:

same DashboardLayout / Sidebar

assistant header

Back to 3D Rendering

Render Style dropdown

SketchUp option

Photo Realistic option

approval status

user/assistant conversation

timestamps

prompt composer

quick prompts

generation pending/error/retry UI

generated 3D result

selectable result context

View Angle UI

Isometric 45°

Bird’s Eye 45°

result approval

Expand

Edit/refine path

Kraios Design Canvas

DWG action only when a real URL exists

Current generation status:

real 3D backend not connected

frontend mock generation is enabled

mock uses a local result asset

Approval behavior:

generating a new result clears previous approval

approved result drives project has3DRender

View Angle flow — FIXED

Selecting a view angle now sets the angle and then runs the SAME generation path a typed prompt runs (runGeneration in DesignAssistantPage), using the angle's declared prompt from designAssistantConfig and a "Generating <angle> view…" pending line.

The new result is not auto-approved, the previous turns stay in the transcript, and approval remains explicit. No second generation implementation was added, and the existing frontend mock is still what answers the request.

12. Kraios Design Canvas

Status: UI IMPLEMENTED

Current Design Assistant includes a full canvas editing workspace.

History — FIXED

History still stores full canvas snapshots (approach unchanged) but is now capped at MAX_HISTORY = 30. Past the cap the oldest snapshot is dropped and historyIndex is clamped to the newest slot, so Undo/Redo cannot walk off a trimmed stack. Toolbar, drawing behaviour, canvas sizing and button states are unchanged.

Keyboard shortcuts — FIXED

L / P / H / E and Ctrl+Z / Ctrl+Y (plus Ctrl+Shift+Z) are now bound by a window keydown handler that steps aside for editable targets. The toolbar tooltips advertising them were accurate as displayed, they simply had nothing listening. Nothing visible changed.

Lasso / Cutout — STILL NOT A REAL TOOL

It draws a freehand stroke exactly like the pen: no path closing, no selection, no cutout. The visible tool was deliberately left in place, and the code now says this plainly instead of implying a selection tool exists. Implementing it is a feature, not cleanup.

13. Step 3 — BoQ gateway

Status: UI IMPLEMENTED

Route:

/dashboard/projects/:projectId/boq

Current UI includes:

BoQStage

BoQAssistantGateway

KRAIOS BoQ Assistant entry

project/floor-plan context

approved 3D context

BoQ approval state

“what you’ll build”/BoQ information

full-screen plan preview

route into BoQ Assistant

optional Skip to Output path

Older documentation saying Step 3 is only StepPlaceholder is obsolete.

The page wrapper uses StepPlaceholder, but the real Step 3 UI is implemented inside it.

14. BoQ Assistant

Status: UI + FRONTEND/MOCK STATE IMPLEMENTED

Route:

/dashboard/projects/:projectId/boq/assistant

Current UI/functionality includes:

same dashboard shell family as Design Assistant

BoQ Assistant header

Back to BoQ

Document Type dropdown

Uploaded Documents dropdown

approval state

conversation

timestamps

prompt composer

mock BoQ generation

light structured BoQ result table

approve / revoke approval

Add row

Delete row

retry/loading state

Current document types:

General Document

MEP Drawing

HVAC Drawing

Door and Window Schedule

Current generation status:

BoQ generation is frontend/mock

dummy BoQ tables are used for UI demonstration

no real quantity-analysis/costing backend is connected

Document data contract — FIXED (upload path still missing)

Documents are now built by createBoqDocument in lib/dashboard/workflow/step-3/boqDocuments.js, mirroring step-1/floorPlanSource.js:

{ id, name, size, mime, extension, kind, typeId, typeLabel, file, previewUrl, ownsPreviewUrl, addedAt }

That is the contract Step 4 needs to list, preview, download and package a document. The reducer stays pure and takes a finished record; ProjectsProvider revokes previewUrl when a document leaves the list, when the project is deleted, and when the provider unmounts.

Still NOT functional end to end:

the BoQ composer exposes no attachment control, so nothing dispatches uploadDocument

no visible upload control exists anywhere in Step 3, and adding one would mean putting a new element into the approved interface — deliberately out of scope for an engineering-only pass

Because the flow does not exist, the Uploaded Documents empty copy no longer instructs the user to upload documents from the BoQ Assistant composer; it now states that none have been added. Supporting-document upload remains a real feature gap.

BoQ approval invalidation — FIXED

Generating a new BoQ clears approval (as before), and Add Row / Delete Row now clear approvedResultId when they touch the approved result. Both go through one write helper inside the reducer, so a future edit action cannot keep an approval it invalidated. There is still exactly one approval flag; no component-local isApproved was introduced, and no approval styling changed.

15. Step 4 — Output / Project Deliverables

Status: UI IMPLEMENTED

Route:

/dashboard/projects/:projectId/output

Current Step 4 is a full deliverables workspace.

Current UI includes:

Output header

PROJECT OUTPUT

YOUR PROJECT DELIVERABLES

package information

DOWNLOAD PROJECT ZIP

Plans & Renders

Original 2D Floor Plan

Approved 3D Design

View

Download

shared FloorPlanFullscreenModal

Final BoQ

full structured light BoQ table

item count

approved/ready presentation

DOWNLOAD BOQ

client-side CSV generation

Uploaded Documents

supporting-document list UI

document type metadata

preview path for supported files

download actions

no-documents empty state

Project package

client-side ZIP generation

package intended to include 2D, 3D, BoQ CSV, and supporting documents

Older documentation saying Step 4 is only StepPlaceholder is obsolete.

The page wrapper uses StepPlaceholder, but OutputStage is a real implemented feature.

16. Step 4 current demo behavior

Current Step 4 contains frontend demo fallbacks:

demo 2D floor-plan asset

demo 3D render asset

demo BoQ rows

These make the UI testable even when previous stages have no real data.

Final BoQ selection — FIXED

Output now reads approvedBoqResult(boqState) and nothing else. The `|| latestBoqResult(...)` fallback is gone, so an unapproved draft is never treated as the finalized BoQ.

With no approved BoQ:

the Final BoQ section shows a not-finalized state using Output's existing dashed empty presentation (the same pattern the no-documents state already used) — no new visual language was introduced

the "BOQ APPROVED · N Items" badge and the Download BoQ CSV action are not rendered

the header stat chip and the ZIP caption report what the package actually contains

the ZIP omits the BoQ CSV entirely

BoQ is optional, so this is a normal state: Skip to Output still works, and 2D / 3D / documents / ZIP are unaffected. Output gating was NOT added and Skip to Output was NOT removed.

Demo 2D/3D assets are unchanged and still stand in when upstream data is missing — deliberate UI-demonstration behaviour, not an approval claim. The BoQ fixture is no longer among them.

17. Output download status

Current frontend download features include:

individual 2D download

individual 3D download

BoQ CSV download

client-side ZIP package generation

Current BoQ CSV is client-generated.

No backend PDF/XLSX export is documented as connected.

Hardening — DONE

response.ok is checked for every fetched package asset; a failed fetch is treated as unavailable rather than packaged, so an HTML 404 body can no longer land in the ZIP as the user's floor plan

every user-supplied name passes through safeFileName before becoming a ZIP path — path separators, .., and illegal characters are neutralized and an empty name falls back

projectSlug is one shared helper now, instead of an inline copy in FinalBoQSection

document preview/download reads the Step 3 record's previewUrl / file

Still outstanding:

large production packages may be better generated on the backend

18. BoQ product rule

Current workflow code marks BoQ as optional.

Therefore current product behavior allows:

Step 2
→ Step 3
→ Skip BoQ
→ Output

This creates an important rule:

Output must not require a fabricated BoQ when the user intentionally skipped Step 3.

If the product later decides BoQ is mandatory:

remove/disable skip behavior

gate Output

update workflow config

update Step 3

update Step 4

update CLAUDE.md / PROGRESS.md

Do not leave optional and mandatory rules mixed.

19. Current notification system

MIGRATED. React-Toastify is removed; React Hot Toast 2.6.0 is the notification
system.

Package

react-toastify uninstalled and gone from package.json / package-lock.json
react-hot-toast ^2.6.0 installed

Repository search returns zero results for react-toastify, ToastContainer,
Toastify__ and the Toastify stylesheet import.

Global host

src/components/ui/KraiosToaster.jsx — ONE `<Toaster>`, mounted once in
src/main.jsx next to the RouterProvider. Public, auth, dashboard, workflow,
assistant and modal surfaces all use it. No page renders its own Toaster.
The old src/components/ui/KraiosToastContainer.jsx was deleted, not wrapped.

Position: top-right, 18px inset. Below 1024 the stack drops to top 64px so it
clears the 56px mobile navigation bar; at 480 and below the inset narrows to
12px, and the toast is width-capped at 360px, so it wraps rather than
overflowing at 430 / 390 / 375 / 360.

Theme: light KRAIOS. White surface, hairline border, --radius-md geometry,
restrained shadow, product body type at 0.75rem/600, compact 46px row. Semantics
are a small icon badge plus a 2px remaining-time rule — success green, error
red, info and loading KRAIOS blue. The surface is never filled with the
semantic colour. The toast row is rendered by hand through the Toaster's
children render prop rather than through the library's `ToastBar`, whose own
surface, radius and shadow would have to be unpicked inline.

Toasts pause while the pointer is inside the toast container — that is the
library's own behaviour, and the container's `onMouseEnter` / `onMouseLeave`
drive it. Two things had to respect it, and both were fixed after the first
pass reported toasts that never disappeared:

pointer-events is granted only while the toast is visible (`.kraios-toast--enter`),
not for its whole life. It was unconditional, so a toast removed from under the
cursor never fired `mouseleave`, the pause stayed set, and the library's
auto-dismiss effect — which returns early for as long as `pausedAt` is set —
stopped dismissing ANY toast for the rest of the session. This now matches what
the library's own ToastBar does.

the 2px remaining-time rule pauses with the timers
(`.kraios-toaster:hover .kraios-toast__progress { animation-play-state: paused }`).
It used to keep running while the toast was frozen, so the rule emptied and the
toast read as finished while it sat there.

removeDelay is 300ms rather than the default 1000ms: the exit animation is
220ms, so a dismissed toast has no reason to stay mounted and inert for the
remainder of a second.

Styling: src/styles/toast.css was rewritten for React Hot Toast
(`.kraios-toaster` / `.kraios-toast` / `.kraios-toast__progress`). No
`.Toastify__` rule survives, and no unrelated style in that file was touched.
The enter/exit keyframes and the reduced-motion guard are the Kraios ones.

Centralized API

src/lib/toast.js is the only module that imports react-hot-toast:

showSuccessToast / showErrorToast / showInfoToast / showLoadingToast /
dismissToast, plus TOAST_DURATION and toastKind.

Durations: success 3000ms, info 3500ms, error 4500ms, loading until resolved or
dismissed. No call site passes its own timing.

WARNING was dropped. The application raised exactly one warning toast (Step 1's
empty prompt), which is a validation error and is now an error toast, so a
fourth semantic state had nothing left to describe.

The component/helper split is preserved for the same reason as before:
KraiosToaster.jsx exports only components, so Fast Refresh keeps working.

The two competing call styles are gone. Every call site now uses the
@/lib/toast helpers; nothing imports the library directly.

Duplicate prevention

Stable ids on everything a user can fire repeatedly: workflow-stage-gate,
locked-mode-notice, multiple-files, unsupported-file, upload-success,
empty-prompt, floor-plan-generation-notice, model-generation-notice,
boq-generation-notice, login-validation, signup-validation,
forgot-password-validation, profile-validation, profile-saved,
create-project-validation, project-created, project-deleted,
output-download-2d / -3d / -zip, output-export-boq, output-doc-download,
output-doc-preview.

One user-facing toast per event, raised by the page or component that owns the
action. No service or helper raises a toast, so no event can be reported twice.

No loading toast is currently in use: every async flow in the product already
owns a visible loading state (the modal PageLoader, the assistant pending turn,
the button's loading label), and stacking a loading toast on top of those would
duplicate them. showLoadingToast + dismissToast exist for a real backend call
that has no such state.

Call sites migrated

Auth — Login, Signup, Forgot Password. Validation copy moved out of the page
and into one error toast per invalid submit, chosen by field order (Login:
email then password; Signup: name, firm, email, country, then date and time).
The first invalid field is still focused, the pickers still scroll into view,
and the existing rules were preserved exactly — no password or format rule was
invented. Copy was tightened to the product voice ("Enter a valid email
address."). The mock 900ms delays and the Signup / Forgot Password confirmation
modals are unchanged, and nothing claims an authentication or an email that did
not happen.

Dashboard — Create Project (empty-name validation, and "Project created." only
once the project is in the store), Delete Project (confirmation stays a modal;
"Project deleted." is the receipt afterwards), Profile.

Profile also gained the validation the toast needed something to say: name
required, email required and well-formed, using the shared isEmail. One toast
per submit, first invalid field focused. The transient inline "Changes saved"
line and its 3s timer were removed in favour of a "Profile updated." toast; the
form, its fields and the Save Changes / Discard changes row are untouched.

Subscription raises no toast: its two mock notices are Modals by design, and
inventing payment or plan-change feedback would claim a backend that is not
connected.

Workflow —

Step 1: locked-mode notice, multiple-files notice, unsupported file, upload
success, empty prompt, generation success, and the "generation backend not
connected" notice (kept as info — it is a statement about the product, not a
user error).

Step 2 / workflow gating: the Previous-Next gate message. It is raised in
ProjectStepNavigation only, which stays domain-agnostic — the message still
comes from each stage's selector.

Design Assistant: generation success, generation/retry failure, canvas-edit
handoff, approval granted and revoked.

Step 3 / BoQ gateway: no toast of its own — its states (no approved 3D design,
BoQ not generated) are persistent page UI and stayed that way.

BoQ Assistant: generation success, document removed, approval granted and
revoked, row added, row removed, and a generation failure toast that did not
exist before. A thrown error's own message no longer reaches the transcript or
the user; both now read one controlled line.

Step 4 / Output: ZIP success and failure, BoQ CSV export success and failure,
2D and 3D download success and failure, document download, and the previously
silent "no file behind this record" case.

Output downloads are honest now. downloadAssetUrl returns whether the asset was
actually fetched and saved; the Step 4 handlers used to announce a successful
download unconditionally, including for an asset that never arrived. The
best-effort direct-link fallback is unchanged, but because its outcome cannot be
observed it is reported as a failure rather than a success.

Inline transient messages removed

FormInput no longer prints a red error line. The message is now carried in a
screen-reader-only node that aria-describedby points at, and the field keeps its
red border and aria-invalid. Same treatment for Signup's date/time errors (which
also gained the aria-describedby wiring they lacked) and Step 1's generate-prompt
textarea.

Nothing else changed visually. Field validation, focus behaviour, required
semantics and disabled/loading button states are as they were, and no toast
fires on keystroke — validation still runs on change and blur, silently.

Persistent state deliberately left in the page: NO PROJECTS YET, DESIGN
APPROVED / NOT APPROVED, BOQ READY / not finalized, NO DOCUMENTS UPLOADED, the
Output empty states, the assistant transcripts' failed turns with Retry, and
the Subscription and confirmation modals.

20. Responsiveness

Responsive implementation exists across:

dashboard shell

Sidebar/mobile nav

Projects

Profile

Subscription

workflow

Step 1

Step 2

Design Assistant

Step 3

BoQ Assistant

Step 4

This audit is based on source inspection.

It does not claim a fresh manual browser QA pass at every viewport.

Do not write “fully responsive and verified” without actual browser/device inspection.

21. Architecture status

Current workflow structure is already sensibly feature-scoped.

Current structure:

projects/
├── library/
└── workflow/
    ├── shared/
    ├── step-1/
    ├── step-2/
    │   ├── assistant/
    │   └── canvas/
    ├── step-3/
    │   └── assistant/
    └── step-4/

All four stage folders are in active use.

Modules added during the engineering cleanup pass (no folder restructure was performed):

src/lib/toast.js
    the centralized React Hot Toast API, so KraiosToaster.jsx exports only
    components

src/components/ui/KraiosToaster.jsx
    the ONE global <Toaster>, replacing the deleted KraiosToastContainer.jsx

src/lib/dashboard/workflow/step-3/boqDemoData.js
    the single BoQ demonstration fixture, read by Step 3's mock generation and
    available to Step 4; replaces the byte-identical copies that were declared
    separately in boqAssistantConfig.js and outputConfig.js

src/lib/dashboard/workflow/step-3/boqDocuments.js
    the supporting-document record (createBoqDocument), its blob-URL release
    helpers, and canPreviewDocument — mirroring step-1/floorPlanSource.js

src/pages/dashboard/projects/RequireProject.jsx
    the one project-existence guard, used by the workspace route and both
    assistant routes

No broad folder rewrite is currently recommended.

22. Duplication / maintainability targets

Design Assistant and BoQ Assistant intentionally share visual patterns.

Current duplicated families include:

Assistant header / BoQ Assistant header

Render Style dropdown / Document Type dropdown

Design composer / BoQ composer

result header controls

message/timestamp structure

Reviewed during the cleanup pass — NOTHING EXTRACTED, deliberately.

The genuinely shared pieces are already shared: formatMessageTimestamp / toISOTimestamp in lib/date.js are used by both AssistantMessage and BoQMessage, and both composers/conversations already reuse ASSISTANT_GRID / ASSISTANT_GUTTER from step-2/assistant/assistantGrid.js.

What is left duplicated (the two headers, the two dropdown shells, the two composers, the two result-header controls) differs in real ways: the Step 2 composer has a cancel action and a paper-plane/sparkle affordance, the Step 3 one has a ruler affordance and no cancel; the two result-header controls differ by an Edit button. A shared shell would need a prop and a conditional for each of those. Per the rule above, some duplication is better than a generic component with a switchboard of feature props.

Keep:

Step 2 3D behavior separate

Step 3 BoQ behavior separate

Do not build one giant assistant component with feature conditionals.

23. ProjectsProvider performance target

Current provider value includes:

project list

Step 1 state

Step 2 assistant state

Step 3 assistant state

Long assistant conversations can cause broad context updates.

Reviewed during the cleanup pass and DEFERRED. Splitting the provider means changing what every hook in projectsContext.js subscribes to, which touches every stage and both assistants — real risk of behaviour or route-persistence changes, against a benefit nobody has measured. Correctness work was prioritized instead. The provider grew one small addition in this pass: a boqStatesRef mirror, so supporting-document object URLs can be released on delete and unmount without adding dependencies to those callbacks.

This remains a future performance optimization target.

Do not introduce Redux/Zustand automatically.

Preferred first direction:

narrower providers

narrower feature subscriptions

preserve current external behavior

24. Artificial delays

Reviewed and classified during the cleanup pass.

REDUCED:

Step 1 local floor-plan upload: 3500ms to 400ms. Nothing is uploaded — the browser already holds the picked file and createUploadSource only wraps it — so the wait was slowing the fastest action in the product for no reason. A short beat is kept because the panel has a real uploading state and flashing through it reads as a glitch. When a real endpoint exists, the wait becomes the request.

KEPT, deliberately, as mock-backend / loading-state demonstrations:

auth demo delays (900ms, Login / Signup / ForgotPassword)

project creation (700ms, behind the brand PageLoader)

BoQ mock generation (1400ms — it stands in for a backend call, and the pending/cancel states must stay observable)

Design Canvas opening (2200ms, behind the brand PageLoader)

25. Dead / unused source candidates

REMOVED after verification (each re-checked for any remaining reference, including dynamic use, before deletion):

src/hooks/useSectionReveal.js
src/components/ui/Figure.jsx
src/components/dashboard/projects/workflow/step-2/StageIntro.jsx
src/components/dashboard/projects/workflow/step-2/assistant/AssistantGeometryBackdrop.jsx
src/components/dashboard/projects/workflow/step-2/assistant/ExpandResultModal.jsx
src/components/dashboard/projects/workflow/step-2/assistant/ComposerContextStrip.jsx

Unused public assets REMOVED:

public/assets/hero-poster.svg — content.js references only hero-poster-768.jpg / hero-poster-1600.jpg
public/assets/plan-2d-detail.svg — no reference anywhere
public/assets/plan-3d-primary.svg — no reference anywhere
public/assets/team-placeholder-02.svg — content.js builds these paths dynamically via teamPlaceholder(slot), and the only slots used are 01, 03 and 04

Assets deliberately KEPT because they are live demo fixtures: plan-2d-primary.svg and plan-3d-light.svg (Step 4 demo assets and the Step 2 mock model result), plan-2d-light.svg, and team-placeholder-01/03/04.svg.

26. Import / dependency graph audit

Re-run after the cleanup pass, over 139 source files:

0 unresolved local imports (the only non-JS specifier is main.jsx's stylesheet import)

0 circular JS/JSX module dependencies

No obvious unused runtime npm dependency was identified.

Dependency change in the notification migration: react-toastify removed,
react-hot-toast ^2.6.0 added. Nothing else was added or removed.

27. Lint status

Current source IS lint-clean.

Verified by running:

npm run lint

Result: 0 errors, 0 warnings (exit 0). The previous 22 errors / 5 warnings were all fixed at the source — no eslint-disable, no dummy references, no blanket underscore renames:

AssistantComposer.jsx — dropped baseResult / isExplicitSelection / onClearEditing, left over from the removed ComposerContextStrip, and the props they were passed with

AssistantConversation.jsx — dropped the unused onViewAngleSelect prop

AssistantResult.jsx — dropped onEdit (the message header owns Edit) and its call site

ResultHeaderControls.jsx / BoQResultHeaderControls.jsx — dropped the unused result prop; also removed a dead PrimaryButton import

BoQMessage.jsx — react-markdown passes the mdast node to custom components, so it is stripped once by a small domProps helper instead of being destructured away ten times

BoQResult.jsx — dropped the unused approved prop

OutputStage.jsx — removed the unused summaryText

UploadedDocumentsSection.jsx / CurrentPlanCard.jsx — removed unused cn imports

boqGeneration.js — dropped the documentTypeId parameter and its plumbing; the mock does not analyse documents and accepting it implied an influence it does not have

KraiosToastContainer.jsx — the five Fast Refresh warnings were gone once the helpers moved to src/lib/toast.js. That file has since been replaced by KraiosToaster.jsx, which keeps the same component-only rule

Re-verified after the React Hot Toast migration:

npm run lint — 0 errors, 0 warnings (exit 0), confirmed with
`npx eslint . --max-warnings=0`.

Note: lint parses every source file, so a clean run is also a syntax check.
No production build was run and there is still no automated test suite. The
migrated modules were additionally smoke-checked by serving them through the
Vite dev server (main.jsx, KraiosToaster.jsx, lib/toast.js, the migrated pages
and the rewritten stylesheet all transform and resolve), which is a module
resolution check — NOT a browser QA pass of the toast at every breakpoint.

28. Dropdown interaction issue

Double-fire — FIXED

Render Style, View Angle and Document Type each ran selection from BOTH onMouseDown and onClick, so one mouse press could select twice. Selection is now bound to onClick only. No flag, timer or duplicate-suppression hack was used — the second binding was removed. This mattered most for View Angle, which now starts a generation.

Focus behaviour — IMPROVED

Escape closes the menu and returns focus to the trigger, and choosing an option returns focus there too (also applied to the Uploaded Documents dropdown). Nothing visible changed.

Keyboard navigation — STILL NOT IMPLEMENTED, and no longer claimed

The triggers are real buttons and are fully keyboard operable. The option rows are plain list items: there is no arrow-key roving focus and no Enter/Space activation on an option, in any of the three menus. Comments in RenderStyleDropdown and ViewAngleMenu that advertised "keyboard navigation" were corrected to say what the controls actually do. Adding roving focus needs an active-option highlight, which is a visual decision and was out of scope for a UI-freeze pass; it remains a real accessibility gap.

29. Invalid project route issue

FIXED. src/pages/dashboard/projects/RequireProject.jsx is one shared guard at the route boundary, wrapping the ProjectWorkspace route and both assistant routes. An unknown :projectId redirects (replace) to /dashboard/projects, so a typed or stale URL can no longer enter workflow UI and write state against a project that does not exist.

No per-stage `if (!project)` checks were added and no new error page was designed. The per-project hooks still return a shared frozen default for a project that exists but is untouched — that remains their only job.

Consequence worth stating: because projects are session-memory, refreshing the browser while inside a project workspace now lands on the empty Projects library rather than an orphaned workspace. That is the honest result of having no persistence, and it becomes moot when a backend exists.

30. Current top engineering priorities

Completed in the engineering cleanup pass (details in the sections above):

View Angle generation wiring

dropdown double-fire

BoQ approval invalidation after row edits

Output consumes approved BoQ only

optional-BoQ Output behaviour normalized (BoQ stays optional; Output represents "no finalized BoQ")

misleading document-upload copy corrected

Step 3 document data contract aligned with Step 4, with object-URL release

invalid-project route guard

lint: 0 errors, 0 warnings

verified dead code and unused assets removed

canvas history capped, advertised shortcuts wired

React Hot Toast migration: React-Toastify removed, one global Toaster, one
centralized helper API, inline transient form errors converted to toasts

ZIP fetch/response.ok and filename hardening

BoQ demo fixture deduplicated into one module

Remaining, in rough priority order:

Wire supporting-document upload end to end. Needs a visible attachment control in the BoQ composer, which is a design decision.

Arrow-key navigation for the three custom dropdowns. Needs an active-option highlight, which is a design decision.

Reduce broad ProjectsProvider rerenders, if profiling justifies it.

Implement Lasso / Cutout as a real selection tool, or retire the tool.

Connect real backends: 2D generation, 3D generation, BoQ calculation, document analysis, auth, billing, persistence.

Real browser/device QA at the documented breakpoints.

31. What is intentionally NOT claimed

The current archive is not documented as:

backend complete

persistent across refresh

production auth ready

production billing ready

real 2D AI generation connected

real 3D generation connected

real BoQ calculation connected

real document analysis connected

live market pricing connected

backend PDF/XLSX export connected

fully browser-tested at every breakpoint

covered by an automated test suite

verified by a production build or runtime smoke test in the most recent cleanup pass (source-level work plus lint only)

32. Documentation state

Section 19 and CLAUDE.md section 26 now describe React Hot Toast as the
notification system. Every statement saying React-Toastify is current has been
removed rather than annotated.

This replacement PROGRESS.md removes the old contradictions that said:

Step 3 was not implemented

Step 4 was not implemented

hasBoQ always remained false

lint passed with 0 errors/warnings

Current truth:

Step 1 UI implemented

Step 2 UI implemented

Design Assistant UI implemented

Step 3 UI implemented

BoQ Assistant UI implemented

Step 4 UI implemented

backend-dependent functionality is still mock/pending in multiple areas

lint is clean (0 errors, 0 warnings) as of the engineering cleanup pass

The cleanup pass was engineering-only: no colors, type, spacing, radius, sizing, icons, composition, responsive behaviour or motion were changed. The only user-visible differences are ones correctness demanded — Output's not-finalized BoQ state, the honest BoQ chip and ZIP caption in the Output header, the corrected Uploaded Documents empty copy, and a view-angle choice now producing a render.
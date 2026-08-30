# KRAIOS — PROGRESS.md

Current implementation status, verified against the source in the working tree.

This file records **what exists right now**: which UI is built, which behaviour
is a frontend mock, which APIs are really integrated, what is missing, and which
issues are still open. CLAUDE.md holds the durable rules; this file holds the
state.

Last synchronized by full source inspection of `src/`, `api/`, `public/`,
`package.json`, `vite.config.js`, `vercel.json` and `eslint.config.js`.

---

## 1. Headline status

| Area | UI | Frontend mock | Real backend |
|---|---|---|---|
| Public site (landing, nav, sections) | ✅ complete | content from `src/lib/content.js` | n/a |
| Login | ✅ complete | ⚠️ dummy fallback active | `POST /auth/login/` wired |
| Signup (request a session) | ✅ complete | — | `POST /auth/signup-request/` wired |
| Forgot Password | ✅ complete | ⚠️ no request is made | none (no endpoint in contract) |
| Reset Password | ✅ complete | — | `POST /auth/reset-password/` wired |
| Session bootstrap | ✅ complete | ⚠️ dummy fallback active | `GET /auth/me/` wired |
| Dashboard shell / navigation | ✅ complete | — | n/a |
| Overview | ✅ complete | — | no API |
| Projects library | ✅ complete | session-memory store | ❌ no project API |
| Subscription | ✅ complete | all data mock | ❌ no billing API |
| Profile | ✅ complete | ⚠️ save falls back locally | `GET`/`PATCH /profile/` + 4 OTP endpoints wired |
| Step 1 Upload / Generate | ✅ complete | local file handling is real | ❌ no upload API |
| 2D Floor Plan Assistant | ✅ complete | generation mocked | ❌ not connected |
| Step 2 3D Rendering gateway | ✅ complete | — | n/a |
| Design Assistant | ✅ complete | generation mocked | ❌ not connected |
| Kraios Design Canvas | ✅ complete | — | n/a |
| Step 3 BoQ gateway | ✅ complete | — | n/a |
| BoQ Assistant | ✅ complete | generation mocked | ❌ not connected |
| Step 4 Output / Deliverables | ✅ complete | ⚠️ heavy sample-data fallbacks | ❌ no packaging service |
| Notifications | ✅ complete | — | n/a |

`✅` = implemented in source. `⚠️` = implemented but currently behaves in a way
that overstates reality; see §11 Known issues.

---

## 2. ⚠️ Temporary authentication bypass — CURRENTLY PRESENT

**A temporary frontend authentication bypass is currently present for UI
development and must be removed before production authentication enforcement.**

It lives entirely in `src/contexts/AuthContext.jsx` (plus a relaxed validation
rule on the Login page). Three separate paths make the dashboard reachable
without a real authenticated session:

1. **`DUMMY_USER`** — an exported hardcoded identity ("Shayan Delta", Studio
   Kraios Architecture, `user@kraios.ai`, Albania, "Architect Account").

2. **`verifySession()` never fails.** `GET /auth/me/` is still issued with
   `skipRefresh: true`, but its `.catch()` sets `DUMMY_USER` (or keeps the
   previous user), clears `sessionExpired` and sets the status to
   `authenticated`. A rejected or unreachable backend therefore still resolves to
   a signed-in dashboard, and `verifySession` always resolves `true`.

3. **`login()` has two dummy paths.**
   - If **both** email and password are blank, it signs in as `DUMMY_USER`
     immediately without calling the API at all.
   - If `loginUser()` throws (bad credentials, network, CORS, 500 — anything),
     the `catch` builds a fallback user from `DUMMY_USER` + the typed email and
     signs in anyway. `login()` therefore never rejects and never surfaces an
     authentication failure.

4. **Login page validation was relaxed to match.** `src/pages/Login.jsx`
   `validate()` only checks email *format*, and only when an email was typed.
   Neither field is required, so submitting the empty form passes validation and
   reaches the blank-credentials dummy path.

**Observable consequence:** `/dashboard` and every dashboard route are reachable
by anyone, with or without a backend, and the caution modal path
(`sessionStatus === 'anonymous'`) is effectively only reachable after an explicit
Log out or an expired-session event.

**Not production-ready authentication.** The real cookie/CSRF/refresh plumbing
underneath is intact and unchanged; only these fallbacks bypass it. Removing them
is a separate, deliberate task (see §12 Follow-ups). This documentation pass did
NOT modify any of it.

---

## 3. Stack and configuration

Dependencies (`package.json`, name `floor`):

```
react 19 · react-dom 19 · react-router-dom 7
vite 8 · @vitejs/plugin-react 6 · tailwindcss 4 · @tailwindcss/vite 4
gsap 3 · @gsap/react 2
@phosphor-icons/react 2
react-hot-toast 2
react-markdown 10 · remark-gfm 4
@fontsource-variable/inter 5
eslint 10 · @eslint/js · eslint-plugin-react-hooks 7 · eslint-plugin-react-refresh · globals
```

No HTTP client dependency; no state library; no UI kit; no second toast library.
React-Toastify is fully removed — no import, container, class or helper remains.

- `vite.config.js` — `@` → `./src`; dev proxy `/api` → the ngrok backend host
  with `ngrok-skip-browser-warning`.
- `vercel.json` — `/api/(.*)` → `/api/proxy?path=$1`; everything else (except
  `api/` and `assets/`) → `/index.html`.
- `api/proxy.js` — serverless forwarder; passes method, body and the
  `content-type` / `cookie` / `origin` / `referer` / `x-csrftoken` headers, and
  returns `set-cookie` (including multi-cookie via `getSetCookie()`).
- `.env` / `.env.example` — `VITE_API_BASE_URL=/api/v1`.
- `FRONTEND_PROFILE_API_GUIDE.md` sits at the repository root (currently
  untracked) and is the backend contract `src/lib/api/profile.js` implements.
- `eslint.config.js` — flat config, `**/*.{js,jsx}`, browser **and** Node
  globals, `js.configs.recommended`, `react-hooks` recommended,
  `no-unused-vars` with `varsIgnorePattern: '^[A-Z_]'`,
  `react-refresh/only-export-components` as a warning with
  `allowConstantExport`.

---

## 4. Routing — verified against `src/router/router.jsx`

Public (`AppLayout`): `/`, `/login`, `/forgot-password`, `/reset-password`,
`/signup`.

Dashboard (`DashboardLayout`):

```
/dashboard                                        DashboardHome
/dashboard/projects                               Projects
/dashboard/profile                                Profile
/dashboard/subscription                           Subscription

/dashboard/projects/:projectId                    RequireProject → ProjectWorkspace
  index                                           → <Navigate to="upload" replace />
  …/upload                                        UploadStep      (Step 1, upload mode)
  …/generate                                      GenerateStep    (Step 1, generate mode)
  …/rendering                                     RenderingStep   (Step 2 gateway)
  …/boq                                           BoQStep         (Step 3 gateway)
  …/output                                        OutputStep      (Step 4)

/dashboard/projects/:projectId/upload/assistant    RequireProject → FloorPlanAssistantPage
/dashboard/projects/:projectId/generate/assistant  RequireProject → FloorPlanAssistantPage
/dashboard/projects/:projectId/rendering/assistant RequireProject → DesignAssistantPage
/dashboard/projects/:projectId/boq/assistant       RequireProject → BoQAssistantPage

*                                                  NotFoundPage
```

- Lazy: all page components except `RequireProject` and `NotFoundPage`.
- `/generate` and `/generate/assistant` are current, real routes — Step 1 has two
  addressable modes.
- No route list is duplicated in `DashboardLayout`; precedence lives only in the
  route table.
- Invalid dashboard addresses (`/dashboard/banana`,
  `/dashboard/projects/1/banana`) fall through to `*` and get the blue
  `NotFoundModal`, never a login wall.
- A valid route shape with an unknown project id redirects to
  `/dashboard/projects` via `RequireProject`.

---

## 5. API integration status

Single client: `src/lib/api/client.js`, surfaced through `src/lib/api.js`.
Implemented: `credentials: 'include'`, CSRF fetch + `X-CSRFToken` on mutating
methods, one-shot 401 refresh (excluded for login/refresh/csrf/signup-request and
when `skipRefresh`), `kraios:auth-expired` dispatch, `parseApiError`
normalization, network-error wrapping.

| Endpoint | Service | Caller | Fires when | Status |
|---|---|---|---|---|
| `GET /auth/csrf/` | `ensureCsrfToken` / `fetchCsrfToken` | client + `loginUser` | before mutating calls / before login | integrated |
| `POST /auth/login/` | `loginUser` | Login page via `AuthContext.login` | valid submit | integrated, ⚠️ dummy fallback on failure |
| `POST /auth/signup-request/` | `submitSignupRequest` | Signup page | valid submit | integrated |
| `POST /auth/logout/` | `logoutUser` | Sidebar / mobile nav Log out | click | integrated (swallows transport failure) |
| `POST /auth/refresh/` | internal | client on 401 | automatic, once | integrated |
| `GET /auth/me/` | `getCurrentUser` | `DashboardLayout` boundary | status `unknown` | integrated, ⚠️ dummy fallback on failure |
| `POST /auth/reset-password/` | `apiRequest` + `AUTH_ENDPOINTS` | ResetPassword page | valid submit | integrated |
| `GET /profile/` | `fetchProfile` | Profile page mount | on entry | integrated |
| `PATCH /profile/` | `updateProfile` | EditProfileModal | save | integrated, ⚠️ local fallback on failure |
| `POST /profile/password-change/request/` | `requestPasswordChange` | ResetPasswordModal | step A | integrated |
| `POST /profile/password-change/confirm/` | `confirmPasswordChange` | ResetPasswordModal | step B → `clearSession()` → `/login` | integrated |
| `POST /profile/delete-account/request/` | `requestAccountDeletion` | DeleteAccountModal | step A | integrated |
| `POST /profile/delete-account/confirm/` | `confirmAccountDeletion` | DeleteAccountModal | step B → `clearSession()` → `/` | integrated |

**No API exists for:** projects, floor-plan upload, 2D generation, 3D
generation, BoQ generation, document upload, deliverables packaging, or billing.

**Calling-boundary compliance (verified):**

- Public routes fire no authenticated request. `AuthProvider` performs no
  bootstrap on mount; only the dashboard boundary calls `verifySession`.
- No dashboard page calls `/auth/me/` a second time. Overview → Projects →
  Subscription costs zero requests; Profile costs exactly one `GET /profile/`.
- Forgot Password calls nothing (see §11 for the honesty issue this creates).
- `verifySession` is de-duplicated through a promise ref, so StrictMode's double
  effect cannot produce two `/auth/me/` requests.

---

## 6. State architecture

**`AuthContext`** — `user`, `sessionStatus` (`unknown` / `verifying` /
`authenticated` / `anonymous`), `sessionExpired`, `isLoading`, `error`;
`verifySession`, `login`, `signup`, `logout`, `clearSession`, `setUser`.
`isAuthenticated` is derived from the status. `token` is always `null`. Legacy
aliases `useLogin` / `LoginProvider` / `LoginContext` are still exported.

**`ProfileContext`** — `profile` (draft), `savedProfile`, `isDirty`,
`isLoading`, `isSaving`, `error`; `fetchProfile`, `updateProfile`,
`resetProfile`, `setField`, `setProfile`. Seeds from the auth user using the
render-time `prevUser` adjustment pattern; `mergeUserData` reconciles backend
field names with the UI's. Note that `DEFAULT_PROFILE` supplies placeholder
values ("Shayan Delta", Studio Kraios Architecture, Albania) when a field is
absent.

**`ProjectsProvider`** (inside `DashboardLayout`) — session memory only:

```
projects[]                     { id, name, createdAt, has3DRender, hasBoQ }
floorPlanSources{}             per project — Step 1 active source
floorPlanAssistantStates{}     per project — Step 1 assistant reducer state
designAssistantStates{}        per project — Step 2 assistant reducer state
boqAssistantStates{}           per project — Step 3 assistant reducer state
```

- Ids from a monotonic counter (`project-001`, `project-002`, …).
- `has3DRender` / `hasBoQ` are **derived** from the two `approvedResultId`s in
  `projectsWithStageState` — never written into the project record.
- Blob URLs are released on source replacement, document removal, project
  deletion and provider unmount.
- Hooks: `useProjects`, `useFloorPlanSource`, `useFloorPlanAssistant`,
  `useDesignAssistant`, `useBoqAssistant`; each per-project hook falls back to a
  frozen shared default state.

**Persistence: none.** No localStorage, no sessionStorage (except the OTP
`verification_id`), no API. A refresh loses every project, source, conversation
and approval. Refreshing while inside a project workspace lands on
`RequireProject`, which redirects to an empty library.

---

## 7. Dashboard shell and pages

**`DashboardLayout`** resolves three states in order: (1) session unverified →
full-surface `PageLoader`; (2) no session → `AuthRequiredModal` with the
attempted address; (3) verified → `ProjectsProvider` + sidebar + mobile nav +
page surface + `Outlet`. It also owns `useScrollToTop`, the `RouteReady`
opacity crossfade, and the `DiscardProjectModal` guard that intercepts nav clicks
while inside `/dashboard/projects/<id>…`.

Sidebar retained on **every** dashboard route, including all three assistants.

Global nav (`dashboardNavigation.js`): Overview · Projects · Subscription ·
Profile, plus `DASHBOARD_SIGN_OUT` (Log out) exported separately and wired to
`AuthContext.logout` in both the sidebar and the mobile nav.

**Overview (`/dashboard`)** — `DashboardHome` renders `WelcomeWorkflowCanvas`
plus `CreateProjectModal`. The canvas is a centred welcome composition: an
"ARCHITECTURAL AI ENGINE · 2D TO 3D & BoQ" status badge, the brand mark between
two hairlines, a personalized "Welcome, &lt;name&gt;" headline (name resolved
from `ProfileContext` then `AuthContext`), one line of product copy, and two
CTAs — "Create New Project" (opens the modal) and "View Projects" (link to
`/dashboard/projects`). There are no stage cards, no API calls and no fabricated
metrics on this page.

Note: `WORKFLOW_STAGES[].description` and `.summary` are declared but no longer
rendered anywhere; the stepper and Previous/Next bar read `number`, `label` and
`segment` only.

**Projects (`/dashboard/projects`)** — `DashboardPageHeader` + "Create New
Project" CTA; empty state ("NO PROJECTS YET") when the list is empty, otherwise
`ProjectGrid` → `ProjectCard`. Card shows the project id chip, creation date,
name, a delete action, and an "Open Workspace" link. `ProjectGrid` owns the
delete confirmation modal and toasts "Project deleted."; `CreateProjectModal`
validates the name (one toast), creates the project, navigates to
`/dashboard/projects` and toasts "Project created."
A commented-out `StageStatusTile` block remains in `ProjectCard.jsx`.

**Subscription (`/dashboard/subscription`)** — `CurrentPlanCard` +
three `PricingPlanCard`s from `src/lib/dashboard/subscriptionPlans.js`. The
module states plainly that all of it is mock: no billing backend, no checkout, no
feature enforcement. "Manage" opens a modal saying billing is not connected yet.

**Profile (`/dashboard/profile`)** — `ProfileIdentityPanel` plus three modals:
`EditProfileModal` (full name / firm / country / job title / phone; email
read-only), `ResetPasswordModal` (current + new + confirm → OTP → `clearSession`
→ `/login`), `DeleteAccountModal` (type DELETE + password → OTP →
`clearSession` → `/`). `fetchProfile()` runs once on mount.

---

## 8. Project workflow — current implementation

### Step 1 — Upload / Generate (`/upload`, `/generate`)

`FloorPlanInputStage` renders the mode toggle, `FloorPlanBrief` and one of two
panels.

- **Upload** — real local file handling: hidden file input + drag & drop with
  refcounted drag depth, one file only (extra files → info toast), PNG/JPG/JPEG/
  PDF validated by mime and extension, object URL minted for images. On success
  the source is stored and the stage shows a full-area
  "GOING TO 3D RENDERING STEP…" loader, then navigates to `/rendering` after
  **1400 ms**.
- **Generate** — a gateway card ("GENERATE NOW") into the 2D Floor Plan
  Assistant, with a bottom status strip that is green when a source exists and
  red otherwise.
- Mode toggle navigates between `/upload` and `/generate`; the mode locked by an
  existing source raises one info toast instead of switching.
- Next is gated by `floorPlanGateMessage` until a source exists.

**Not present any more:** an in-stage source preview / remove / regenerate card.
`FloorPlanSourcePreview.jsx` still exists in the tree but nothing imports it
(see §10 Dead code). Once a file is uploaded the stage moves straight on to Step
2; returning to Step 1 shows the upload dropzone again (with the mode lock
applied), not a preview of the stored file.

### 2D Floor Plan Assistant (`/upload/assistant`, `/generate/assistant`)

**UI implemented; generation currently frontend mock.**

- Header: Back (to whichever Step 1 address the user came from), brand block,
  `ApprovalStatus` indicator. There is no "Approve Now" button in the header —
  approval is per result, in the result's header row.
- Conversation: empty state with four `FLOOR_PLAN_QUICK_PROMPTS`, user/assistant
  messages, pending block, failure notice with Retry, result blocks with
  `ResultHeaderControls` (Edit + Approve) and a "Full View" overlay rail.
- Composer: Step 2's `AssistantComposer` with a 2D-specific placeholder.
- Generation: `FLOOR_PLAN_GENERATION_ENABLED = false`,
  `FLOOR_PLAN_GENERATION_MOCK_ENABLED = true` → returns
  `/assets/plan-2d-primary.svg` immediately, every time, with no artificial
  delay and no invented metadata.
- Approve writes a `generated` source into Step 1 (`createGeneratedSource`) and
  navigates back. Toggling approval off clears the Step 1 source.
- A new generation clears the previous approval and the editing pointer.
- Edit opens `KraiosDesignCanvas` after a **1800 ms** transition loader; the
  canvas "Proceed" runs the same generation path with a composite snapshot and
  produces a new, unapproved result.

### Step 2 — 3D Rendering gateway (`/rendering`)

`RenderingStage` renders exactly one thing: `DesignAssistantGateway` — a
branded, animated entry card with the capability hint, the "Open Design
Assistant" CTA and an approved/unapproved state. `renderingStatusNote` derives
the contextual line from real state.

Next is gated by `renderingGateMessage` until a render is approved.

### Design Assistant (`/rendering/assistant`)

**UI implemented; generation currently frontend mock.**

- Header: Back to 3D Rendering, brand block, `FloorPlansDropdown` (attached 2D
  plans, with a full-screen preview), `ApprovalStatus`.
- Conversation: `AssistantEmptyState` + four `QUICK_PROMPTS`, timestamped
  messages, pending / failure / retry blocks, result blocks.
- Result header controls: Edit, Approve (toggle, with tooltip), View Angle menu.
- Result rail: Full View always; DWG only when the result actually carries a
  `dwgUrl` (the mock never does, so no DWG button is shown).
- Composer: single-line input, Enter to send, `RenderStyleDropdown` inline. The
  Cancel control is gated on `MODEL_GENERATION_SUPPORTS_CANCEL`, which evaluates
  to `false`, so no cancel button is rendered.
- **Render styles: SketchUp, Photo Realistic.**
- **View angles: Isometric 45° only.** `DEFAULT_VIEW_ANGLE_ID` is `null`, so a
  result generated from a typed prompt carries `viewAngleId: null`.
- Generation: `MODEL_GENERATION_ENABLED = false`,
  `MODEL_GENERATION_MOCK_ENABLED = true` → returns `/assets/plan-3d-light.svg`
  immediately, no delay, no invented processing metadata. Style and angle are
  recorded on the result as metadata only.
- Selecting a view angle runs the same `runGeneration` path a typed instruction
  runs — a real generation request, producing a new unapproved result. No CSS
  transform stands in for a viewpoint.
- A new result clears the previous approval; approving navigates back to
  `/rendering`.
- Edit opens the canvas after a **2200 ms** transition loader.

### Kraios Design Canvas

**Fully implemented, shared by the Step 1 and Step 2 assistants.**

- Two tools: **Markup Pen** (`P`) and **Marker / highlighter** (`M` or `H`).
  There is no lasso / selection / cutout tool in the current source.
- Ten colour swatches, five brush widths, zoom in / out / reset, clear.
- Undo / redo wired to `Ctrl+Z`, `Ctrl+Y` and `Ctrl+Shift+Z`, ignored while an
  input/textarea/contenteditable has focus.
- `MAX_HISTORY = 30` full-canvas `toDataURL()` snapshots; the oldest is dropped
  past the cap and the index clamped.
- The right-side prompt panel opens automatically once the user draws.
- "Proceed" composites base image + annotation layer into a PNG data URL and
  hands it to `onRegenerate`, which starts a normal generation.

Every advertised shortcut in the toolbar is implemented.

### Step 3 — BoQ gateway (`/boq`)

`BoQStage` renders `BoQAssistantGateway`: BoQ identity tile, four capability
chips, "Open BoQ Assistant", approved/unapproved state, a full-screen preview
modal, and the bottom strip that lets the user skip straight to Output.

BoQ is optional: `boqGateMessage()` returns `null`, so Next is never blocked
here.

The gateway also carries a local **"Upload 3D Plan"** file input with
component-local state — see §11, it is not wired to project state and leaks
object URLs.

### BoQ Assistant (`/boq/assistant`)

**UI implemented; generation currently frontend mock.**

- Header: Back to BoQ, brand block, `FloorPlansDropdown` (2D),
  `FloorPlans3DDropdown` (approved render), `UploadedDocumentsDropdown`,
  `ApprovalStatus`.
- Conversation: empty state, user/assistant messages, assistant text rendered as
  Markdown (`react-markdown` + `remark-gfm` — the only place either is used),
  pending / failure / retry blocks, `BoQResult` → `BoQTable`.
- Table: Add Row (header and footer) and per-row Delete, both of which clear the
  approval when they touch the approved result (`withRowEdit`).
- Approve / revoke per result; approving navigates back to `/boq`.
- Composer: single-line input + `DocumentTypeDropdown` + send. **No attachment
  control.**
- Document types: **General Document · MEP Drawing · HVAC Drawing · Door and
  Window Schedule**.
- Generation: `requestBoqGeneration` waits a deliberate **1400 ms** (abortable),
  then picks one of five declared fixtures by keyword (`wall`/`finish`/`paint`,
  `floor`/`tile`, `cost`/`rate`/`price`/`schedule`, `breakdown`/`material`/
  `quantity`, else the default requirements analysis) from `boqDemoData.js` and
  an inline set. It deliberately ignores the selected document type. Rates and
  amounts in the returned rows are `—` placeholders.

### Step 4 — Output / Deliverables (`/output`)

**UI implemented (recently redesigned); no packaging backend; heavy demo-data
fallbacks — see §11.**

Current composition (`OutputStage`):

```
OutputHeader              hero, "DELIVERABLES READY" badge, four stat chips,
                          Quick Downloads card:
                            Download All (ZIP) · Latest 3D · 3D Images · 2D Plans
OutputDeliverablesTabs    All Deliverables · 3D Renders · 2D Floor Plans · BOQ · Documents
Output3DRendersSection    approved render + version gallery, preview + download
Output2DPlansSection      2D plan + versions, preview + download
OutputBoQSection          BoQ preview table, CSV export, open full modal,
                          "Edit BoQ" → /boq/assistant
OutputDocumentsSection    documents grid + downloads
OutputBoQModal            full-screen BoQ inspection
FloorPlanFullscreenModal  shared lightbox
```

Real behaviour that works:

- Reads Step 1's source, Step 2's `approvedResult`, Step 3's
  `approvedBoqResult` (approved only — no fallback to the latest draft at the
  stage level) and Step 3's uploaded documents.
- `generateBoqCsv` produces RFC 4180 CSV.
- `downloadAssetUrl` fetches, checks `response.ok`, and returns whether the file
  was actually produced.
- `downloadProjectPackageZip` builds a real PKZIP 2.0 store-mode archive with no
  zip dependency, normalizes every user-supplied name through `safeFileName`,
  uses `projectSlug` for folder naming, and omits any asset whose fetch failed
  rather than packaging an error body. The BoQ CSV is written only when rows were
  passed in.

---

## 9. Notifications, modals, shared UI

**Notifications** — React Hot Toast only. One `<Toaster>` in `KraiosToaster.jsx`,
mounted once in `main.jsx`. The helper API is `src/lib/toast.js`
(`showSuccessToast` / `showErrorToast` / `showInfoToast` / `showLoadingToast` /
`dismissToast`, `TOAST_DURATION`, `toastKind`); no file outside those two imports
`react-hot-toast`. Light KRAIOS surface, icon badge + 2px remaining-time rule,
styling in `src/styles/toast.css`. Stable ids are used for repeatable events
(`login-validation`, `signup-error`, `unsupported-file`, `multiple-files`,
`locked-mode-notice`, `workflow-stage-gate`, `project-created`,
`project-deleted`, `profile-saved`, …).

**Modals** — one shared `Modal` primitive, used for: signup confirmation, forgot-
password confirmation, reset-password confirmation, create project, delete
project, discard project, auth required (`AuthRequiredModal`), route not found
(`NotFoundModal`), subscription "not connected" notice, edit profile, reset
password, delete account, and the Output BoQ modal. The floor-plan/render
lightbox (`FloorPlanFullscreenModal`) is a separate portal component shared by
Steps 1–4.

**Buttons** — `PrimaryButton` is the only CTA component; `loading` gives
`aria-busy`, a size-stable invisible label and an overlaid spinner. Variants
`solid` / `outline`; sizes `default` / `compact` / `sm` / `xs`.

**Country dropdown** — 196 canonical countries, 74 alias keys, diacritic-
insensitive normalization, tiered ranking, match highlight, clear control, and
real ArrowUp / ArrowDown / Enter / Escape keyboard navigation.

**Assistant dropdowns** — `RenderStyleDropdown`, `ViewAngleMenu`,
`DocumentTypeDropdown`, `UploadedDocumentsDropdown`, `FloorPlansDropdown`,
`FloorPlans3DDropdown`. All bind selection to `onClick` only (no duplicate
`onMouseDown` firing), close on outside pointerdown and Escape, and return focus
to the trigger. **None of them implement arrow-key roving focus over the option
rows.**

**Design tokens** — verified in `src/styles/index.css`: navy `#071426` /
`#0b1c32`, brand `#1677ff`, brand-deep `#0b5ed7`, light `#f4f6f8`, success
`#0a6c48`, danger `#b42318`, warning `#b54708`; radius 3 / 4 / 6 / 8px with
Tailwind's xl–4xl radii disabled; Inter Variable for both `--font-display` and
`--font-body`.

---

## 10. Dead / unused source (verified — not removed)

These files exist in the tree but nothing imports them. They are the remains of
the previous Step 4 composition, the previous Step 2 sheet composition and the
previous Step 1 preview. **Nothing here was deleted in this pass.**

```
src/components/dashboard/projects/workflow/step-1/FloorPlanSourcePreview.jsx
src/components/dashboard/projects/workflow/step-2/ApprovedDesignSheet.jsx     (imported by RenderingStage but never rendered)
src/components/dashboard/projects/workflow/step-2/SheetTitleBlock.jsx
src/components/dashboard/projects/workflow/step-2/ReferenceSourceStrip.jsx
src/components/dashboard/projects/workflow/step-4/PlansAndRendersSection.jsx
src/components/dashboard/projects/workflow/step-4/OutputPlanCard.jsx          (only referenced by PlansAndRendersSection)
src/components/dashboard/projects/workflow/step-4/FinalBoQSection.jsx
src/components/dashboard/projects/workflow/step-4/FinalBoQTable.jsx           (only referenced by FinalBoQSection)
src/components/dashboard/projects/workflow/step-4/UploadedDocumentsSection.jsx
src/lib/dashboard/currentUser.js                                              (reads tokenStorage.getUser(), which always returns null)
```

Also unused in place:

- `RenderingStage.jsx` defines a local `StageNote` component and imports
  `RENDERING_COPY` / `ApprovedDesignSheet` that the rendered JSX no longer uses.
- `UploadFloorPlanPanel` accepts a `source` prop it never reads;
  `GenerateFloorPlanPanel` accepts `onSourceChange` it never calls.

None of this is reported by ESLint, because `no-unused-vars` is configured with
`varsIgnorePattern: '^[A-Z_]'` — PascalCase component imports are exempt. A green
lint run is therefore **not** evidence that a component is reachable.

---

## 11. Known issues — verified in the current source

Ordered roughly by impact. None of these were fixed in this pass.

### Auth / honesty

1. **Temporary auth bypass** (§2). Dashboard is reachable without a real session;
   `login()` never rejects; blank credentials sign in as `DUMMY_USER`.
2. **Profile save can report success for a failed request.**
   `ProfileContext.updateProfile` wraps the `PATCH /profile/` call in an inner
   `try/catch` that, on ANY failure, synthesizes a `responseData` object from the
   submitted form and continues down the success path. `EditProfileModal`
   therefore toasts "Profile updated successfully." and clears the dirty state
   even when the backend rejected or was unreachable. This contradicts the
   honest-feedback rule in CLAUDE.md §28.
3. **Forgot Password claims an email was sent.** `src/pages/ForgotPassword.jsx`
   makes no request at all (correctly — there is no endpoint), but on submit it
   opens a modal titled **"Email Sent"**. Nothing was sent.

### Step 4 fabricated data

4. **Hardcoded deliverable counts.** `OutputStage` builds
   `counts = { all: 45, renders: 18, plans: 2, boq: 1, documents: uploadedDocs.length || 24 }`
   and passes them to `OutputHeader` and `OutputDeliverablesTabs`. `OutputHeader`
   additionally defaults `renderCount = 18`, `planCount = 2`,
   `docCount = uploadedDocs.length || 24`, `boqCount = boqRows.length || 1`, and
   `OutputDeliverablesTabs` has the same numbers as its own default prop. These
   are invented project metrics shown as fact.
5. **"DELIVERABLES READY" badge is unconditional** in `OutputHeader`, regardless
   of whether anything is approved.
6. **Sample BoQ rows are substituted for a real deliverable.**
   `OutputBoQSection` falls back to a local `SAMPLE_BOQ_ROWS` constant — complete
   with fabricated rates and amounts ("6,200.00", "1,06,250.00") — when no
   approved BoQ exists, and the CSV export downloads whatever `rows` currently
   holds. A user with no approved BoQ can therefore export a priced CSV of
   invented figures. This contradicts CLAUDE.md §26.
7. **Sample documents are substituted for real ones.**
   `OutputDocumentsSection` falls back to `SAMPLE_PROJECT_DOCS` ("Project
   Brief.pdf", "Structural Drawings.zip", …) and, when such a row has no file or
   URL, its download handler generates a Blob containing
   `Sample document content for <name>` and saves it under the real-looking
   filename.
8. **Sample version histories.** `Output3DRendersSection` (`DEFAULT_3D_VERSIONS`
   — v6/v7/v8 with fixed 2026 dates) and `Output2DPlansSection`
   (`DEFAULT_2D_VERSIONS`) present render/plan history that the application never
   produced.
9. **"3D Images" quick download is mislabelled.** `handleDownloadAll3DZip` in
   `OutputHeader` simply calls the full project ZIP handler; "2D Plans (All plans
   ZIP)" downloads a single asset, not a ZIP.
10. **`downloadAssetUrl`'s return value is ignored** at every Step 4 call site.
    Nothing currently announces a false success, but the signal that exists to
    prevent that is unused.

### Functional gaps and defects

11. **BoQ supporting-document upload is unreachable.** The reducer has
    `uploadDocument`, `boqDocuments.js` has `createBoqDocument`, and the header
    has `UploadedDocumentsDropdown` — but no component exposes an attachment
    control and nothing ever dispatches the action. `createBoqDocument` has zero
    call sites.
12. **Step 3 gateway's "Upload 3D Plan" is orphaned and leaks.**
    `BoQAssistantGateway` holds the uploaded plan in component-local state, so it
    is discarded on navigation and never reaches `ProjectsProvider`, Step 4 or the
    ZIP. It mints **two** object URLs per file (`imageUrl` and `previewUrl`) and
    revokes neither, including on remove and on unmount.
13. **Design Assistant "Full View" can throw.** `DesignAssistantPage` builds the
    lightbox name with `viewAngleById(expanded.viewAngleId).label`.
    `viewAngleById` returns `null` for an unknown/`null` id, and
    `DEFAULT_VIEW_ANGLE_ID` **is** `null`, so any result produced by a typed
    prompt (rather than by picking a view angle) has `viewAngleId: null` and
    expanding it dereferences `null`. `AssistantResult` guards this correctly with
    `angle?.label`; the page does not.
14. **`requestFloorPlanGeneration` has an inverted guard.** In
    `step-1/floorPlanGeneration.js`, `if (FLOOR_PLAN_GENERATION_ENABLED) { throw
    new FloorPlanGenerationUnavailableError() }` — i.e. turning the real service
    flag ON makes generation throw "not connected". Harmless today because the
    flag is `false` and the mock branch runs, but it will misfire the moment the
    real service is wired.
15. **`latestBoqResult` relies on object key order.** It reads
    `Object.keys(state.results)` and takes the last key, rather than walking the
    message list the way Step 1 and Step 2 selectors do.
16. **`Login.jsx` no longer requires a password**, and does not require an email
    at all — part of the bypass (§2), but worth listing separately because the
    fix is in a different file.
17. **`ProfileContext.DEFAULT_PROFILE` supplies plausible-looking placeholder
    identity data** ("Shayan Delta", "Studio Kraios Architecture", "Albania")
    whenever a real field is missing, so the Profile panel can display invented
    values as though they were the user's.
18. **`Profile.jsx` carries a stale comment** — "Fetch /auth/me/ profile API" —
    above a call that actually fires `GET /profile/`.

### Deliberate delays still present

- Step 1 upload → 3D Rendering transition: **1400 ms**
- Step 1 assistant → canvas open: **1800 ms**
- Step 2 assistant → canvas open: **2200 ms**
- BoQ mock generation: **1400 ms** (deliberate, so the pending/cancel state stays
  observable)

2D and 3D mock generation have **no** artificial delay.

### Resolved — previously documented, no longer true

- The canvas Lasso / Cutout tool that only drew freehand strokes has been
  **removed**; the canvas now ships two honest tools.
- Dropdown double-fire (`onMouseDown` + `onClick`) is gone from all assistant
  menus.
- The ESLint Node-globals gap that made `api/proxy.js` report `no-undef` is
  fixed — the flat config now includes `globals.node`.
- Step 4 no longer substitutes an unapproved BoQ draft for an approved one **at
  the stage level** (`OutputStage` reads `approvedBoqResult` only) — but see
  issue 6 for the section-level sample fallback that still does.
- `hasBoQ` is correctly derived from Step 3's `approvedResultId`.
- No stray `console.log` / `console.warn` / `console.error` statements remain in
  `src/` (the Login and Signup pages keep them commented out).

---

## 12. Follow-ups (not started)

**Authentication (blocking for production)**

1. Remove `DUMMY_USER` and both dummy login paths from `AuthContext`; let
   `login()` reject so the Login page's existing error toast fires.
2. Remove the dummy fallback from `verifySession`'s `.catch()` so a rejected
   `/auth/me/` produces `anonymous` and the caution modal.
3. Restore required-field validation for email and password on the Login page.
4. Re-verify the three route-integrity cases (public / protected-no-session /
   non-existent) after the bypass is gone.

**Honesty of feedback**

5. Let `ProfileContext.updateProfile` propagate a failed `PATCH` instead of
   synthesizing success.
6. Replace the Forgot Password "Email Sent" modal with copy that matches the
   fact that no request is made — or connect a real endpoint.
7. Remove or gate the Step 4 sample-data fallbacks (counts, BoQ rows, documents,
   version histories, the always-on "DELIVERABLES READY" badge) so Output can
   never show or export invented figures.

**Functional**

8. Wire a real attachment control into `BoQComposer` so `createBoqDocument` /
   `uploadDocument` become reachable (a design decision — new element in an
   approved interface).
9. Route the Step 3 gateway's "Upload 3D Plan" through `ProjectsProvider`, or
   remove it; revoke its object URLs either way.
10. Guard `viewAngleById(...)` with `?.` in `DesignAssistantPage`'s lightbox.
11. Fix the inverted `FLOOR_PLAN_GENERATION_ENABLED` guard.
12. Delete the unused modules listed in §10 after one more verification pass.

**Backend integration (blocked on services)**

13. Project persistence API (list / create / delete / read), replacing the
    session-memory store. The context value is already shaped like the API that
    will replace it.
14. 2D generation service → `step-1/floorPlanGeneration.js` only.
15. 3D generation service → `step-2/modelGeneration.js` only (plus
    `MODEL_GENERATION_SUPPORTS_CANCEL` if the endpoint honours `AbortSignal`).
16. BoQ generation / quantity-takeoff service → `step-3/boqGeneration.js`.
17. Document upload + storage service.
18. Server-side deliverables packaging, for archives too large to hold in browser
    memory.
19. Billing / subscription API to replace `subscriptionPlans.js`.

**Performance (not urgent)**

20. `ProjectsProvider` is broad and receives high-frequency assistant updates —
    consider narrower providers or selector boundaries before reaching for a
    state library.
21. Canvas history stores 30 full base64 PNG snapshots.

---

## 13. Validation status

- **`npm run lint` — RUN and PASSED.** `eslint .` exited 0 with no errors and no
  warnings on the current source. Caveat: `no-unused-vars` is configured with
  `varsIgnorePattern: '^[A-Z_]'`, so the unused component imports and unused
  local components listed in §10 are not reported.
- **`npm run build` — NOT run** in this pass.
- **Tests — none exist** in the repository.
- **Responsive verification — NOT performed.** No viewport in the
  1920 → 360 list has been visually verified recently; do not claim otherwise.
- **Runtime / browser verification — NOT performed** in this pass. Everything in
  this document was established by reading the current source.

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
| Public site (landing, nav, sections) | ✅ complete | content from `src/lib/content.js` | Contact section's form wired to `POST /support/contact/` |
| Login | ✅ complete | — | `POST /auth/login/` wired **and enforced** |
| Signup (request a session) | ✅ complete | — | `POST /auth/signup-request/` wired; the calendar and slot list read the admin's availability via `GET /auth/booking/days|slots/` |
| Forgot Password | ✅ complete | ⚠️ no request is made | none (no endpoint in contract) |
| Reset Password | ✅ complete | — | `POST /auth/reset-password/` wired |
| Session bootstrap | ✅ complete | — | `GET /auth/me/` wired **and enforced** |
| Dashboard shell / navigation | ✅ complete | — | n/a |
| Overview | ✅ complete | — | no API |
| Projects library | ✅ complete | — | `GET`/`POST`/`DELETE /projects/` wired |
| Subscription | ✅ complete | all data mock | ❌ no billing API |
| Profile | ✅ complete | ⚠️ save falls back locally | `GET`/`PATCH /profile/` + 4 OTP endpoints wired |
| Step 1 Upload / Generate | ✅ complete | — | `POST /step-1/upload/` wired |
| 2D Floor Plan Assistant | ✅ complete | — | generate · edit · approve wired |
| Step 2 3D Rendering gateway | ✅ complete | — | reads Step 1 + Step 2 history |
| Design Assistant | ✅ complete | — | generate · edit · angle · approve wired |
| Kraios Design Canvas | ✅ complete | — | exports the edit mask |
| Step 3 BoQ gateway | ✅ complete | — | `POST /step-3/skip/` wired |
| BoQ Assistant | ✅ complete | — | generate · manual version · documents · approve |
| Step 4 Output / Deliverables | ✅ complete | — | `GET /output/` + scoped ZIP jobs |
| Notifications | ✅ complete | — | n/a |

`✅` = implemented in source. `⚠️` = implemented but currently behaves in a way
that overstates reality; see §11 Known issues.

**The project workflow is now a real backend integration.** Every frontend
generation mock and every Step 4 fixture has been removed — see §5 and §10.

**Backend AI status (stated by the API contract, not by this frontend):** the
Celery tasks behind 2D generation, 3D generation and BOQ generation return
placeholder results with simulated progress. The API, persistence, versions,
approvals, jobs and archive generation are real. This frontend integrates the
real contract and does not dress a placeholder up as finished AI output.

---

## 2. ✅ Authentication is enforced — the bypass has been REMOVED

The dummy-identity fallbacks that previously made the dashboard reachable
without a real session are gone from `src/contexts/AuthContext.jsx`. Removed:
the exported `DUMMY_USER` constant, the `.catch()` fallback inside
`verifySession()`, the blank-credentials shortcut in `login()`, and the
`catch` branch that signed a user in after `loginUser()` threw.

Current behaviour, as implemented:

1. **`verifySession()` can fail.** `GET /auth/me/` is issued with
   `skipRefresh: true`. On success the user is merged into state and the status
   becomes `authenticated`. On ANY rejection — 401, CSRF, CORS, 500, unreachable
   backend — it clears `tokenStorage`, sets `user` to `null`, sets the status to
   `anonymous` and resolves `false`. An offline backend is now "not signed in",
   never "signed in as somebody".

2. **`login()` can reject.** The dashboard is reached only when
   `POST /auth/login/` succeeds. On failure the client session is cleared, the
   status becomes `anonymous`, and the normalized `parseApiError` message is
   rethrown — so `Login.jsx` stays on the page and raises its one error toast
   (`{ id: 'login-error' }`) instead of navigating.

3. **A login response without a user payload leaves the status `unknown`,** not
   guessed. `DashboardLayout` then runs its ONE `GET /auth/me/` bootstrap, which
   keeps `/auth/me/` owned by the boundary and off the login page (CLAUDE.md §9).

4. **`sessionExpired` is now derived, not assumed.** `wasAuthenticatedRef`
   decides between the caution modal's two copies: "Session Expired / Sign In
   Again" for a session that existed and was lost, "Access Required / Sign In To
   Continue" for a cold visit to a dashboard URL.

5. **Login page validation is strict.** `Login.jsx` `validate()` requires a
   non-empty email, a valid email format, and a non-empty password, and raises
   ONE toast for the first failure in `FIELD_ORDER`.

**Observable consequence:** every dashboard route is now gated. See §13 for the
recorded browser validation of the three route-integrity cases.

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
  with `ngrok-skip-browser-warning`, and `/ws` (`ws: true`) for the optional job
  socket. Nothing connects to `/ws` yet; REST polling is the contract.
- `vercel.json` — `/api/(.*)` → `/api/proxy?path=$1`; everything else (except
  `api/` and `assets/`) → `/index.html`.
- `api/proxy.js` — serverless forwarder. **Vercel's body parser is disabled**
  (`config.api.bodyParser = false`) and the raw stream is forwarded, because a
  re-serialized body loses the multipart boundary and the project API sends
  uploads (floor plan, canvas mask, supporting document). It forwards the query
  string, the `content-type` / `cookie` / `origin` / `referer` / `x-csrftoken`
  request headers, and passes back `set-cookie` (multi-cookie via
  `getSetCookie()`) plus `content-type`, **`content-disposition`**,
  `content-length`, `cache-control`, `etag` and `last-modified` — the
  disposition header carries the filename for CSV and ZIP downloads.
- `.env` / `.env.example` — `VITE_API_BASE_URL=/api/v1`.
- `FRONTEND_PROFILE_API_GUIDE.md` and `FRONTEND_PROJECT_API_GUIDE.md` sit at the
  repository root and are the backend contracts `src/lib/api/profile.js` and
  `src/lib/api/projects.js` implement.
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
  `/dashboard/projects` via `RequireProject`, which loads the project first and
  holds the surface while it does — so refreshing ON a workspace refetches the
  project rather than landing on an empty library.

### History floors — the browser Back button

`src/hooks/useHistoryFloor.js`. Three transitions are terminal, and Back must
not walk out of where they land:

| transition | lands on | set by |
|---|---|---|
| sign in | `from` or `/dashboard` | `Login.jsx` |
| finish a project | `/dashboard/projects` | `useFinishProject.js` |
| sign out | `/login` | `DashboardNavItem.jsx` (the sign-out row) and `DashboardLayout`'s discard confirmation |

Each navigates with `replace: true` AND `state: HISTORY_FLOOR_STATE`. The floor
lives in the router state of that history ENTRY — not in a module flag — so it
survives a refresh, a forward navigation and a return to it. `useHistoryFloor()`
is called once in `AppLayout` and once in `DashboardLayout` (sibling routes, so
only ever one blocker, which is all React Router allows): it registers a
`useBlocker` that refuses POP while the current entry carries the flag, and
resets the blocker to idle afterwards. The router restores the address itself on
a blocked POP, so nothing else is needed and nothing is announced — the page not
moving is the answer.

PUSH is never blocked; the product's own links, redirects and the workflow
stepper are unaffected. What CANNOT be blocked is Back out of the tab's first
entry — with no router-created entry behind it React Router receives no delta,
so a user who opened `/login` directly as the first page in a tab can still
leave the site.

Signing out from INSIDE a project workflow goes through the discard-confirmation
guard, which intercepts the row's own click. That branch now calls `logout()`
itself before navigating; previously it navigated to `/login` and left the
session alive.

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
| `POST /auth/login/` | `loginUser` | Login page via `AuthContext.login` | valid submit | integrated, failure rejects |
| `POST /auth/signup-request/` | `submitSignupRequest` | Signup page | valid submit | integrated |
| `GET /auth/booking/days/` | `fetchBookingDays` | Signup page calendar | mount + each month paged | integrated, public (no session) |
| `GET /auth/booking/slots/` | `fetchBookingSlots` | Signup page time list | a date is chosen | integrated, public (no session) |
| `POST /support/contact/` | `submitContactRequest` | Landing Contact section | valid submit | integrated, public (no session) |
| `POST /auth/logout/` | `logoutUser` | Sidebar / mobile nav Log out | click | integrated (swallows transport failure) |
| `POST /auth/refresh/` | internal | client on 401 | automatic, once | integrated |
| `GET /auth/me/` | `getCurrentUser` | `DashboardLayout` boundary | status `unknown` | integrated, failure → `anonymous` |
| `POST /auth/reset-password/` | `apiRequest` + `AUTH_ENDPOINTS` | ResetPassword page | valid submit | integrated |
| `GET /profile/` | `fetchProfile` | Profile page mount | on entry | integrated |
| `PATCH /profile/` | `updateProfile` | EditProfileModal | save | integrated, ⚠️ local fallback on failure |
| `POST /profile/password-change/request/` | `requestPasswordChange` | ResetPasswordModal | step A | integrated |
| `POST /profile/password-change/confirm/` | `confirmPasswordChange` | ResetPasswordModal | step B → `clearSession()` → `/login` | integrated |
| `POST /profile/delete-account/request/` | `requestAccountDeletion` | DeleteAccountModal | step A | integrated |
| `POST /profile/delete-account/confirm/` | `confirmAccountDeletion` | DeleteAccountModal | step B → `clearSession()` → `/` | integrated |

### Project workflow endpoints — all integrated

Services in `src/lib/api/projects.js`; job polling in `src/lib/api/jobs.js`;
authenticated files in `src/lib/api/files.js`.

| Endpoint | Caller | Fires when |
|---|---|---|
| `GET /projects/` | `ProjectsProvider` | once, when the dashboard mounts |
| `POST /projects/` | CreateProjectModal | valid submit → navigates to Step 1 |
| `GET /projects/{id}/` | `RequireProject`, every step loader | opening a project (cache hit after) |
| `PATCH /projects/{id}/` | `renameProject` service | **no UI calls it yet** |
| `DELETE /projects/{id}/` | ProjectGrid delete modal | confirm |
| `GET /projects/{id}/output/` | OutputStage | Step 4 entry |
| `POST /projects/{id}/finish/` | ProjectStepNavigation | Finish on Step 4 |
| `GET /step-1/conversation/` + `/history/` | `loadStep1` | Step 1 stage, Step 1/2/3 assistants |
| `POST /step-1/upload/` | FloorPlanInputStage | file chosen or dropped |
| `POST /step-1/generate/` | FloorPlanAssistantPage | send / opener / retry |
| `POST /step-1/edit/` | FloorPlanAssistantPage | canvas Proceed (with mask) |
| `POST /step-1/versions/{id}/approve/` | FloorPlanAssistantPage | Approve |
| `GET /step-2/conversation/` + `/history/` | `loadStep2` | Step 2 gateway, Step 2/3 assistants |
| `POST /step-2/generate/` | DesignAssistantPage | send / opener / retry |
| `POST /step-2/edit/` | DesignAssistantPage | canvas Proceed (with mask) |
| `POST /step-2/angle/` | DesignAssistantPage | view-angle choice |
| `POST /step-2/versions/{id}/approve/` | DesignAssistantPage | Approve |
| `GET /step-3/conversation/`, `/versions/`, `/documents/` | `loadStep3` | Step 3 gateway and assistant |
| `POST /step-3/generate/` | BoQAssistantPage | send / retry |
| `POST /step-3/versions/manual/` | BoQAssistantPage | Add Row / Delete Row |
| `POST /step-3/versions/{id}/approve/` | BoQAssistantPage | Approve |
| `GET /step-3/versions/{id}/download-csv/` | OutputBoQSection | Download CSV |
| `POST /step-3/skip/` | BoQStage | Skip, after modal confirmation |
| `POST /step-3/documents/` | ProjectFilesPanel document slot | file chosen |
| `DELETE /step-3/documents/{id}/` | ProjectFilesPanel document card | Remove |
| `DELETE /projects/{id}/conversations/messages/{messageId}/` | all three assistants | turn sheet delete |
| `GET /projects/jobs/{id}/` | `waitForJob` | while any job runs |
| `GET /projects/{id}/assets/{assetId}/download/` | every download | click |
| `POST /projects/{id}/download-all/` | OutputHeader, renders + documents sections | scoped ZIP |

**Not called by any UI yet (services exist, deliberately kept):**
`renameProject`, `postBoqMessage` (text-only BoQ message),
`fetchProjectAssets`, `updateBoqDocument`.

**No API exists for:** billing / subscription.

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

**`ProjectsProvider`** (inside `DashboardLayout`) — backed by the project API:

```
projects[]                     normalized Project records (backend UUIDs)
projectsStatus / projectsError the one GET /projects/ read
cache (useResourceCache)       project:{id}:detail | :step-1 | :step-2
                               | :step-3 | :output
floorPlanAssistantStates{}     per project — Step 1 view model (hydrated)
designAssistantStates{}        per project — Step 2 view model (hydrated)
boqAssistantStates{}           per project — Step 3 view model (hydrated)
```

- Ids are backend UUIDs. The `nextProjectId` counter is gone.
- `has3DRender` / `hasBoQ` are **derived** in `normalizeProject` from
  `selected_three_d` / `selected_boq` — never written into the record.
- The reducers are unchanged in shape but are now VIEW MODELS: `hydrate`
  replaces the transcript with the server's record, and `startGeneration` is
  optimistic only until the refetch that answers it.
- `useResourceCache` de-duplicates concurrent reads, serves cache hits without a
  request, tracks `status`/`data`/`error` per key, and invalidates by key or
  prefix. A forced read chains onto an in-flight one so a post-mutation refetch
  cannot resolve with pre-mutation state.
- Hooks: `useProjects`, `useProject`, `useStep1Data` / `useStep2Data` /
  `useStep3Data` / `useProjectOutput`, `useFloorPlanAssistant`,
  `useDesignAssistant`, `useBoqAssistant`, `useFloorPlanSource`.
- `useFloorPlanSource(projectId)` returns the source OBJECT, not a
  `[source, setSource]` pair. It is derived from the approved Step 1 version;
  there is no local setter, because `selected_floor_plan` is the record.
- No blob-URL bookkeeping remains: every image and document is a backend url.

**Request cost per screen** (all cached after the first read):

```
Overview / Subscription      0
Projects library             1  (the list, loaded once by the provider)
Project workspace entry      1  (project detail; a cache hit from the list)
Step 1 stage / assistant     2  (step-1 conversation + history)
Step 2 gateway / assistant   4  (step-1 + step-2, both pairs)
Step 3 gateway / assistant   7  (step-1 + step-2 + step-3's three lists)
Step 4                       1  (the grouped output bundle)
```

**Job polling.** `src/lib/api/jobs.js` runs ONE loop per job however many
watchers, backs the interval off (1.2s → 2s → 3.5s → 5s), pauses while the tab
is hidden, and stops on COMPLETED / FAILED or when the last watcher leaves.
`useResumedJob` re-attaches to a version that was still QUEUED / PROCESSING when
a workspace opened, so a refresh mid-generation resumes instead of stalling.
There is no cancel endpoint, so no UI offers to cancel a job.

**Persistence: the backend's.** Projects, conversations, versions, approvals and
documents all survive a refresh. `sessionStorage` still holds only the OTP
`verification_id`; nothing else is stored client-side.

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
Project" CTA, and FOUR states, which are genuinely different: still loading,
failed to load (with a Try Again action), loaded and empty ("NO PROJECTS YET"),
and the grid. Showing the empty state while loading would claim the account has
no projects when nobody has managed to ask yet.

`ProjectGrid` → `ProjectCard`. The card shows a shortened id chip (the leading
segment of the backend UUID — a full 36 characters would wrap the identity row),
creation date, name, a delete action, and an "Open Workspace" link that RESUMES:
`projectResumePath` reads `workflow_state.current_step`, so reopening a project
lands on the stage the backend says it is on.

`ProjectGrid` owns the delete confirmation modal, calls
`DELETE /projects/{id}/` and toasts "Project deleted." only once the backend has
actually deleted it. `CreateProjectModal` validates the name (one toast), calls
`POST /projects/`, and navigates into Step 1 of the real project on its real
UUID; a duplicate name comes back as the backend's own sentence, shown on the
field and said once in a toast, with the modal left open.
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

- **Upload** — the dropzone validates (one file only, PNG/JPG/JPEG/WEBP/PDF by
  mime AND extension, 25 MB ceiling) and hands the raw `File` up. The stage owns
  the request: `POST /step-1/upload/`, invalidate Step 1, refetch the project,
  and navigate to `/rendering` only once `workflow_state.step_1_complete`
  confirms it. The "UPLOADING FLOOR PLAN…" loader covers real work, not a timer.
  A failure keeps the user on Step 1 with a normalized message.
- **Generate** — a gateway card ("GENERATE NOW") into the 2D Floor Plan
  Assistant, with a bottom status strip that is green when a source exists and
  red otherwise.
- Mode toggle navigates between `/upload` and `/generate`; the mode locked by an
  existing source raises one info toast instead of switching.
- The stage loads Step 1's conversation and history on entry, and holds a loader
  while that is in flight — so it cannot show "no plan yet" to a project that
  has one.
- Next is gated on the project's `workflow_state.step_1_complete`.

**Not present:** an in-stage source preview / remove / regenerate card.
`FloorPlanSourcePreview.jsx` has been deleted. Once a plan is approved the stage
moves on to Step 2; returning to Step 1 shows the upload dropzone again, with
the mode lock applied.

### 2D Floor Plan Assistant (`/upload/assistant`, `/generate/assistant`)

**Backend integrated.**

- Header: Back (to whichever Step 1 address the user came from), brand block
  titled **"2D Rendering"** (`workspaceTitle`), `ApprovalStatus` indicator. There
  is no "Approve Now" button in the header — approval is per result, in the
  result's header row.
- Conversation: empty state with four `FLOOR_PLAN_QUICK_PROMPTS`, then one
  **turn block** per exchange — `AssistantTurnCard` holding the instruction, the
  red delete control in a reserved column beside it, and what the instruction
  produced under a rule that spans the block's full inner width.
- The block's boundary is drawn by its OUTER element, so the resting hairline
  (`--tone-line`), the hover surface (slate line + white fill) and the
  delete-hover warning all enclose the instruction, its replies and the action
  column together. Every turn gets the block, running or settled, and only the
  HOVERED one is filled — the transcript itself is transparent, with the
  conversation's two blue setting-out lines running its whole height. The DELETE
  control appears only on a SETTLED turn (`isTurnSettled` — replies exist, none
  pending, none a failure notice).
- A floating **scroll-to-bottom** control (`ScrollToBottomButton`, Step 2's,
  shared by all three conversations) fades in over the foot of the transcript
  once the reader is more than `JUMP_THRESHOLD_PX` (220) from the bottom, and
  scrolls back to the latest message on click. Its visibility is read off the
  same `handleScroll` measurement the auto-follow behaviour already takes; the
  arrow bounces only while the control is offered, and drops that under reduced
  motion. Hidden, it is out of the tab order and inert to the pointer.
- **Delete is wired**: `DELETE /projects/{id}/conversations/messages/{messageId}/`
  with the prompt's `serverMessageId`. The backend deletes the whole block —
  message, version, job and stored files — so the client deletes no image
  separately; afterwards Step 1 is refetched, the project reloaded (a deleted
  selection clears `selected_floor_plan`) and Step 4's bundle invalidated. One
  success toast, one error toast, and the sheet dims with a spinner while it
  runs.
- The backend's own assistant sentences ("Your 2D floor plan is ready for
  review.") are NOT transcribed — the drawing under them already said it.
  Failures and running jobs still speak; those come from the version.
- The pending block shows the job's `message` with **no percentage**
  (`jobProgressText`), because the pipeline's progress is a simulated ramp.
- The whole transcript is rebuilt from `/step-1/conversation/` +
  `/step-1/history/` by `floorPlanAdapters.hydrateFloorPlanState`.
- Composer: Step 2's `AssistantComposer` with a 2D-specific placeholder. The
  composer zone has no surface of its own — the field is a white bar floating on
  the workspace backdrop at `--radius-field` (12px, the one radius exception).
- Generation: `POST /step-1/generate/` (a bare instruction refines the version
  being edited via `parent_version_id`), then the job is watched and its
  progress written onto the pending block, then Step 1 is refetched.
- Edit: `POST /step-1/edit/` with the canvas's annotation MASK as a real file.
- Approve: `POST /step-1/versions/{id}/approve/` — sets `selected_floor_plan`,
  completes Step 1, navigates back. There is no un-approve endpoint, so the
  control does not toggle.
- A version still QUEUED/PROCESSING is restored as a pending block and
  re-watched by `useResumedJob`.
- Edit opens `KraiosDesignCanvas` after a **1800 ms** transition loader.

### Step 2 — 3D Rendering gateway (`/rendering`)

`RenderingStage` renders exactly one thing: `DesignAssistantGateway` — a
branded, animated entry card with the capability hint, the "Open Design
Assistant" CTA and an approved/unapproved state. `renderingStatusNote` derives
the contextual line from real state.

Next is gated on the project's `workflow_state.step_2_complete`. The stage
loads Step 1 and Step 2 and holds a loader while either is in flight.

### Design Assistant (`/rendering/assistant`)

**Backend integrated.**

- Header: Back to 3D Rendering, brand block titled **"3D Rendering"**
  (`workspaceTitle`), `ProjectFilesPanel` in its compact variant (the 2D plan,
  with a full-screen preview), `ApprovalStatus`.
- Conversation: `AssistantEmptyState` + four `QUICK_PROMPTS`, then turn blocks —
  same block boundary, same settled-only delete (Step 2's reload + project
  refresh) and the same no-commentary / no-percentage rules as the 2D assistant
  above.
- Result header controls: Edit, Approve (toggle, with tooltip), View Angle menu.
- A PREVIEW result — a version whose backend `source` is in
  `PREVIEW_RENDER_SOURCES` (`ANGLE`, i.e. the View Angle action's own output;
  never inferred from the prompt text) — shows the render and a "Preview only"
  label instead
  of those three controls, is not clickable as the refinement base, and is
  skipped by `latestResult`. It still appears in Step 4's render gallery, which
  is view-and-download and offers no approval anyway.
- Result rail: Full View always; DWG only when the result actually carries a
  `dwgUrl` (the mock never does, so no DWG button is shown).
- Composer: single-line input on a white `--radius-field` bar over a transparent
  zone, Enter to send, `RenderStyleDropdown` inline. The
  Cancel control is gated on `THREE_D_GENERATION_SUPPORTS_CANCEL`, which is
  `false` because the contract has no cancel endpoint — so no cancel button is
  rendered.
- **Render styles: SketchUp, Photo Realistic** → `SKETCHUP`, `PHOTOREALISTIC`.
- **View angles: Isometric 45° only** → `ISOMETRIC_45`. `DEFAULT_VIEW_ANGLE_ID`
  is `null`, which maps to the backend's `ORIGINAL`. Enum translation lives in
  `designAdapters.js`; no component types an uppercase value.
- Generation: `POST /step-2/generate/`, carrying `render_style` and the approved
  2D plan's version id. Edit: `POST /step-2/edit/` with the canvas mask.
- Selecting a view angle is `POST /step-2/angle/`, through the SAME
  `runGeneration` path — a real request producing a new version with
  `source: 'ANGLE'`, leaving the original untouched. No CSS transform stands in
  for a viewpoint. Choosing an angle before anything is rendered explains itself
  instead of failing.
- Approve: `POST /step-2/versions/{id}/approve/`, then back to `/rendering`. It
  clears an existing BoQ approval or skip on the backend, so Step 3's cache is
  invalidated too.
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
- "Proceed" produces TWO images and passes both to
  `onRegenerate(promptText, result, compositeSnapshotUrl, maskSnapshotUrl)`: the
  composite (base + annotations) for the transcript, and the annotation layer
  alone as the MASK the `/edit/` endpoints take. If the base image cannot be
  read back into a canvas, the mask is still valid and the edit still goes.

Every advertised shortcut in the toolbar is implemented.

### Step 3 — BoQ gateway (`/boq`)

`BoQStage` renders `BoQAssistantGateway`: BoQ identity tile, four capability
chips, "Open BoQ Assistant", approved/unapproved state, a full-screen preview
modal, and the bottom strip that offers the optional skip to Output. The stage
loads Steps 1–3 and holds a loader while any is in flight.

BoQ is optional: Next is never blocked here.

**Skip is a real transition.** The bottom strip's control opens a confirmation
modal; confirming calls `POST /step-3/skip/`, which clears any selected BoQ and
makes Step 4 the current step, and only then navigates to `/output`.

The gateway also carries a local **"Upload 3D Plan"** file input with
component-local state — see §11.5, it is not wired to the document API and leaks
object URLs. It is the one part of the workflow still holding browser-only file
state.

### BoQ Assistant (`/boq/assistant`)

**Backend integrated.**

- Header: Back to BoQ, brand block titled **"BOQ Generation"**
  (`workspaceTitle`), ONE `ProjectFilesPanel` control, `ApprovalStatus`. Steps 1
  and 2 are still loaded — the panel shows the 2D plan and the approved render.
- Conversation: empty state, user/assistant messages, assistant text rendered as
  Markdown (`react-markdown` + `remark-gfm` — the only place either is used),
  pending / failure / retry blocks, `BoQResult` → `BoQTable`. Rebuilt from
  `/step-3/conversation/` + `/step-3/versions/` by `boqAdapters.hydrateBoqState`,
  which matches each version to its `source_message` so a result sits under the
  instruction that asked for it; a `MANUAL` version has no message and is
  appended in creation order.
- `structured_data` is read in every shape the contract allows — an object with
  `columns` + rows-as-arrays, an object with row objects, or a bare array — with
  column-name aliases (`Quantity`/`Qty`, `Rate`/`Unit Rate`, …). An unreadable
  payload becomes an empty table with an honest zero count, never a crash.
- Table: Add Row and per-row Delete compute the amended rows and post
  `POST /step-3/versions/manual/` parented on the edited version, then refetch.
  A BOQ version is immutable on the backend, so an edit is a NEW unapproved
  version — which preserves the old rule without a browser-only copy.
- Approve: `POST /step-3/versions/{id}/approve/`, then back to `/boq`.
- Conversation: the SAME turn blocks as the two design assistants
  (`AssistantTurnCard`), with the settled-only delete — the BoQ assistant's own
  `BoQMessage` is what sits inside them, because here the assistant's Markdown
  text is a real answer rather than commentary.
- Composer: single-line input + send, and nothing else. The paperclip and the
  document-type menu moved into `ProjectFilesPanel`, where the slot a file is
  dropped on IS its classification.
- `ProjectFilesPanel` (shared/) shows REQUIRED — the approved 2D plan and the
  approved 3D render, each with a preview and a full-screen View — and
  DOCUMENTS: four slots, **General Document · MEP Drawing · HVAC Drawing ·
  Door & Window Schedule**. It does NOT scroll: the panel is its content's
  height, cards are two-up at every width, and it was measured inside the
  viewport at 1440×900, 1366×768, 1280×720 and 390×844. Empty slots are "+ Add document"; a filled one shows
  the file, its type and size, View and Remove. Upload is
  `POST /step-3/documents/`, remove is `DELETE /step-3/documents/{id}/`, both
  refetching afterwards.
- While a file uploads, THAT slot shows it: brand tint, spinner, "Uploading…"
  and the file name, with the other slots disabled and a small spinner on the
  panel's trigger. The panel holds the state keyed by slot id and clears it when
  the page's handler resolves — which is after the document list has been
  refetched, so there is no gap between the spinner ending and the real card.
- `document_type` is still the backend's seven enum values. The three drawing
  slots have no member of their own there, so they are stored as
  `STRUCTURAL_DRAWING` (whose description covers structural, MEP, HVAC and
  technical drawings) — declared beside the label in `PROJECT_DOCUMENT_SLOTS`.
  Because that alone could not tell two drawing slots apart, the slot is also
  tagged into the document's `title` (`slotDocumentTitle` / `slotIdFromTitle`),
  so a file reopens in the slot it was dropped on. The tag is invisible: the
  panel and Step 4 display `name` (the asset's `original_name`).
  `assignDocumentsToSlots` fills by title tag, then by `document_type`, then by
  first free slot; documents past the four are listed under "Additional" rather
  than dropped. A real per-slot type is still a backend enum change.
- Generation: `POST /step-3/generate/`, job watched, then refetch.

### Step 4 — Output / Deliverables (`/output`)

**Backend integrated. No fixtures remain.**

ONE request builds the page: `GET /projects/{id}/output/` returns the project, a
summary, and the floor plans, 3D renders, BOQ versions and documents together.
`selected: true` is what marks the approved item — nothing is re-derived.

Current composition (`OutputStage`):

```
OutputHeader              hero, readiness badge, four counted stat chips,
                          Quick Downloads card:
                            Download All (ZIP) · Latest 3D · 3D Images · 2D Plans
OutputDeliverablesTabs    All Deliverables · 3D Renders · 2D Floor Plans · BOQ · Documents
Output3DRendersSection    approved render + the project's real render history
Output2DPlansSection      approved plan + the project's real plan history
OutputBoQSection          approved BoQ preview, backend CSV export, full modal,
                          "Edit BoQ" → /boq/assistant
OutputDocumentsSection    the project's documents, or an honest empty state
OutputFinishBar           the close of the page: Finish this project
OutputBoQModal            full-screen BoQ inspection
FloorPlanFullscreenModal  shared lightbox
```

Behaviour:

- `OutputFinishBar` ends the page with the same Finish the bottom navigation
  offers. Both render `useFinishProject` — one gate, one `POST /finish/`, one
  set of toasts, one redirect to `/dashboard/projects`.
- Every count comes from `summary` or from the lists themselves.
- The readiness badge reads "NO DELIVERABLES YET" when there is nothing.
- The "APPROVED LATEST" cards render only when something IS approved — they used
  to render unconditionally, badge and all, over a null image and a hardcoded
  "Approved on May 24, 2026". Approval dates are the versions' own.
- Every section has an honest empty state: no renders, no plans, no finalized
  BoQ, no documents.
- Single downloads go through `downloadApiFile`: same-origin, cookie
  authenticated, `response.ok` verified, and the return value checked at every
  call site — nothing announces a download that did not happen.
- "Download All", "3D Images", "2D Plans" and the documents section's
  "Download All" each queue their own scoped `POST /download-all/`, watch the
  job, and download the asset it produced. Re-queuing a running scope joins that
  job rather than starting another.
- The BoQ CSV is `GET /step-3/versions/{id}/download-csv/` — the backend's
  rendering of the approved version, not a browser-side CSV of the rows on
  screen. It is disabled when nothing is approved.
- `generateBoqCsv` / `downloadText` survive only for the inspection modal, which
  exports exactly the rows it is showing.
- **Finish** (`ProjectStepNavigation`) calls `POST /finish/`, gated by
  `canFinishProject`.

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

## 10. Dead / unused source

### Removed in the project-API integration

Each was verified unreferenced before deletion:

```
src/lib/dashboard/workflow/step-1/floorPlanGeneration.js    mock 2D generation
src/lib/dashboard/workflow/step-2/modelGeneration.js        mock 3D generation
src/lib/dashboard/workflow/step-3/boqGeneration.js          mock BoQ generation
src/lib/dashboard/workflow/step-3/boqDemoData.js            BoQ fixture rows
src/lib/dashboard/workflow/step-3/boqDocuments.js           browser-blob documents
src/components/.../step-1/FloorPlanSourcePreview.jsx
src/components/.../step-4/PlansAndRendersSection.jsx
src/components/.../step-4/OutputPlanCard.jsx
src/components/.../step-4/FinalBoQSection.jsx
src/components/.../step-4/FinalBoQTable.jsx
src/components/.../step-4/UploadedDocumentsSection.jsx
```

Also removed from live modules: `buildZipArchive` and
`downloadProjectPackageZip` (the hand-rolled PKZIP writer) from
`outputDownloads.js`; `DEMO_ASSETS` from `outputConfig.js`; the in-place
`addRow` / `deleteRow` / `withRowEdit` and the local `uploadDocument` /
`removeDocument` transitions from the BoQ reducer.

### Still unused (not removed)

```
src/components/dashboard/projects/workflow/step-2/SheetTitleBlock.jsx
src/components/dashboard/projects/workflow/step-2/ReferenceSourceStrip.jsx
src/lib/dashboard/currentUser.js    reads tokenStorage.getUser(), always null
```

Unused stage copy in `step-1/floorPlanSource.js` — `PROMPT_PLACEHOLDER`,
`EMPTY_PROMPT_ERROR`, `FLOOR_PLAN_FORMATS_TERM`, `FLOOR_PLAN_FORMATS_LABEL`.
Nothing renders these; they predate this pass and are left in place because
CLAUDE.md §16 says declared stage copy is kept for a view that may want it
again.

Removed from `floorPlanSource.js` with the session-memory source they served:
`createUploadSource`, `createGeneratedSource`, `releaseFloorPlanSource`,
`hasFloorPlanSource`, `floorPlanGateMessage`, `NEXT_STEP_PENDING`,
`NEXT_STEP_READY`. Also removed: `renderingGateMessage` (Step 2 selectors), and
`boqGateMessage` / `latestBoqResult` / `boqStatusNote` (Step 3 selectors) — the
gate is `stageGateMessage` now, and nothing rendered the other two.

Also unused in place:

- `RenderingStage.jsx` imports `ApprovedDesignSheet` and defines a local
  `StageNote` component that the rendered JSX does not use.
- `GenerateFloorPlanPanel` accepts `source` and reads it only as a boolean.

None of this is reported by ESLint, because `no-unused-vars` is configured with
`varsIgnorePattern: '^[A-Z_]'` — PascalCase component imports are exempt. A green
lint run is therefore **not** evidence that a component is reachable.

---

## 11. Known issues — verified in the current source

Ordered roughly by impact.

### Auth / honesty (unchanged in this pass)

1. **Profile save can report success for a failed request.**
   `ProfileContext.updateProfile` wraps the `PATCH /profile/` call in an inner
   `try/catch` that, on ANY failure, synthesizes a `responseData` object from the
   submitted form and continues down the success path. `EditProfileModal`
   therefore toasts "Profile updated successfully." and clears the dirty state
   even when the backend rejected or was unreachable. This contradicts the
   honest-feedback rule in CLAUDE.md §28.
2. **Forgot Password claims an email was sent.** `src/pages/ForgotPassword.jsx`
   makes no request at all (correctly — there is no endpoint), but on submit it
   opens a modal titled **"Email Sent"**. Nothing was sent.
3. **`ProfileContext.DEFAULT_PROFILE` supplies plausible-looking placeholder
   identity data** ("Shayan Delta", "Studio Kraios Architecture", "Albania")
   whenever a real field is missing, so the Profile panel can display invented
   values as though they were the user's.
4. **`Profile.jsx` carries a stale comment** — "Fetch /auth/me/ profile API" —
   above a call that actually fires `GET /profile/`.

### Workflow

5. **Step 3 gateway's "Upload 3D Plan" is orphaned and leaks.**
   `BoQAssistantGateway` holds the uploaded plan in component-local state, so it
   is discarded on navigation and never reaches the backend, Step 4 or the ZIP.
   It mints **two** object URLs per file (`imageUrl` and `previewUrl`) and
   revokes neither, including on remove and on unmount. The gateway also
   receives `source` and `approvedRender` props it does not render. Correcting
   it means changing the gateway's composition, which is a visual change and was
   therefore left for an explicit design pass — it is the one place in the
   workflow that still holds browser-only file state.
6. **`GET /projects/{id}/` is fetched per project, not batched.** Opening the
   Design Assistant reads Step 1 and Step 2 (four list calls); the BoQ Assistant
   reads Steps 1–3 (seven). All are cached for the session and shared between
   the gateway and the assistant, so the cost is paid once per project — but a
   backend endpoint returning a step bundle would halve it.
7. **Vercel serverless request-body limit.** `api/proxy.js` now streams the raw
   body so multipart uploads forward correctly, but Vercel functions cap a
   request body at ~4.5 MB. The floor-plan limit is 25 MB, so a large upload will
   succeed in local development (Vite proxy) and fail on a Vercel deployment. The
   final Nginx/VPS routing has no such limit.
8. **WebSocket job updates are not used.** REST polling is the contract and is
   what is implemented. `vite.config.js` proxies `/ws` for local development, but
   nothing connects: the Vercel proxy forwards HTTP only, so a socket path would
   work in one environment and silently not in another.
9. **Rename, message deletion and text-only BoQ messages have services but no
   UI.** `renameProject`, `deleteConversationMessage` and `postBoqMessage` are
   implemented and exported; no component calls them yet. Per CLAUDE.md §9 they
   are kept, not deleted.

### Deliberate delays still present

- Step 1 assistant → canvas open: **1800 ms**
- Step 2 assistant → canvas open: **2200 ms**

The Step 1 upload transition (1400 ms) and the BoQ generation wait (1400 ms) are
gone — both now cover real requests.

### Resolved in this pass

- **Every frontend generation mock is removed.** 2D, 3D and BoQ generation all
  call the real endpoints; `floorPlanGeneration.js`, `modelGeneration.js`,
  `boqGeneration.js` and `boqDemoData.js` are deleted. The inverted
  `FLOOR_PLAN_GENERATION_ENABLED` guard went with them.
- **Every Step 4 fixture is removed** — invented counts (45 / 18 / 2 / 1 / 24),
  the sample costed BoQ rows, the four sample documents, the sample render and
  plan histories, and the placeholder Blob that Download produced when it could
  not find a real file.
- **The "DELIVERABLES READY" badge reflects real state**; a project with nothing
  in it reads "NO DELIVERABLES YET".
- **Quick downloads are honest.** "3D Images" and "2D Plans" queue their own
  scoped backend archives instead of one calling the full-project handler and
  the other downloading a single asset.
- **Every download's return value is checked.** Nothing announces a download
  that did not happen, and an HTTP error body is never saved as a file.
- **BoQ supporting-document upload is reachable** — `BoQComposer` has an
  attachment control backed by `POST /step-3/documents/`.
- **Design Assistant "Full View" can no longer throw** on a result with a null
  view angle.
- **`latestBoqResult` no longer depends on object key order** — it walks the
  transcript, as the Step 1 and Step 2 selectors do.
- **The client-side PKZIP writer is gone**; archives are built by the backend.
- **Project data survives a refresh.** `RequireProject` refetches the project
  instead of redirecting to an empty library.
- **In-flight generations survive a refresh** — `useResumedJob` re-attaches to a
  version still QUEUED / PROCESSING.
- The canvas Lasso / Cutout tool that only drew freehand strokes was removed
  earlier; the canvas ships two honest tools.
- Dropdown double-fire (`onMouseDown` + `onClick`) is gone from all assistant
  menus.
- The ESLint Node-globals gap that made `api/proxy.js` report `no-undef` is
  fixed — the flat config includes `globals.node`.
- No stray `console.log` / `console.warn` / `console.error` statements remain in
  `src/` (the Login and Signup pages keep them commented out).

---

## 12. Follow-ups

**Authentication** — the bypass removal listed here is DONE; see §2 and §13.
**Project API integration** — DONE; see §5.

**Honesty of feedback**

1. Let `ProfileContext.updateProfile` propagate a failed `PATCH` instead of
   synthesizing success.
2. Replace the Forgot Password "Email Sent" modal with copy that matches the
   fact that no request is made — or connect a real endpoint.
3. Remove `ProfileContext.DEFAULT_PROFILE`'s placeholder identity values.

**Functional**

4. Route the Step 3 gateway's "Upload 3D Plan" through the document API, or
   replace it with the approved 3D render it already receives as a prop; revoke
   its object URLs either way. This is a composition change, so it needs a
   design decision (§11.5).
5. Add UI for the three services that have no call site: project rename,
   conversation-message deletion, and the text-only BoQ message.
6. Deploy-path fix for uploads larger than ~4.5 MB on Vercel (§11.7) — either
   move the proxy off a serverless function or point the browser at the backend
   origin with CORS for uploads only.
7. Delete the modules still listed in §10 after one more verification pass.

**Backend integration (blocked on services)**

8. Real AI behind the three generation jobs — no frontend change required; the
   contract, job flow and version handling are already integrated.
9. Billing / subscription API to replace `subscriptionPlans.js`.
10. Optional WebSocket job updates, once a deployment path forwards `/ws`
    consistently. REST polling must remain the fallback.

**Performance (not urgent)**

11. `ProjectsProvider` is broad; its context value changes on every cache write.
    If assistant updates become a bottleneck, split the cache and the assistant
    view models into separate providers, or add selector boundaries — before
    reaching for a state library.
12. A backend endpoint returning a per-step bundle would halve the assistant
    workspaces' request count (§11.6).
13. Canvas history stores 30 full base64 PNG snapshots.

---

## 13. Validation status

- **`npm run lint` — RUN and PASSED** on the current source, after the project
  API integration. `eslint .` exited 0 with no errors and no warnings. Caveat:
  `no-unused-vars` is configured with `varsIgnorePattern: '^[A-Z_]'`, so the
  unused component imports and unused local components listed in §10 are not
  reported.
- **`npm run build` — RUN and PASSED.** Vite production build completes; route
  chunks still split per page.
- **Tests — none exist** in the repository.
- **The project API integration has NOT been exercised against a live backend.**
  It is verified by source inspection, lint and build only. Nothing in §5 has
  been observed returning real data, and no request/response pair has been seen
  in a browser. Do not report the workflow as end-to-end verified until it has
  been run against the API.
- **Responsive verification — NOT performed.** No viewport in the
  1920 → 360 list has been visually verified recently; do not claim otherwise.

### Browser verification of this UI pass — RUN, PARTIAL

Driven through the Chrome DevTools Protocol against `npm run dev`. What was
actually observed in a real browser:

- **`/login` and `/reset-password`** — every password field carries the reveal
  control. Clicking it flipped `input.type` `password` → `text` → `password`,
  the accessible name flipped with it, the control is out of the tab order
  (`tabIndex -1`) and measured EXACTLY centred on the field (0px delta) with a
  14px inset. The first attempt was 6px low — the field's own `mt-3` collapses
  out of the wrapper — and was fixed and re-measured, not assumed.
- **The assistant workspace pieces** — the Project Files panel (both variants),
  the composer and the sidebar toggle were rendered in a THROWAWAY harness entry
  (`uiproof.html` + `src/uiproof.jsx`, both deleted afterwards; nothing in
  `src/` still references them) with static props, at 1440, 1280, 900 and 390
  CSS px. Observed: no horizontal overflow at 390
  (`scrollWidth === innerWidth`); the composer field computes to a 12px radius;
  the sidebar toggle's border computes to `rgba(11,22,36,0.3)`.
- The turn-card measurements taken in that harness described the PREVIOUS
  structure (a settled-only sheet with the delete control outside its right
  edge) and no longer describe `AssistantTurnCard`. The current block — one
  boundary around the instruction, its replies and the action column, on every
  turn — has NOT been measured in a browser; it is verified only by lint and a
  production build.

NOT verified in a browser, because both need a live session and real project
data: the delete REQUEST itself (`DELETE /conversations/messages/{id}/` and the
refetch that follows), the document upload/remove path through the new panel,
and the Output stage's Finish bar against a real `canFinishProject` state. Those
are source-verified only.

### Browser verification of auth enforcement and route integrity — RUN and PASSED

Driven through the Chrome DevTools Protocol against `npm run dev` on
`http://localhost:5173`, with the live backend behind the Vite `/api` proxy and
browser cookies cleared first. Recorded results:

| Address | Rendered | API requests fired |
|---|---|---|
| `/` | landing, no modal | none |
| `/login` | login form, no modal | none |
| `/signup` | signup form, no modal | none |
| `/dashboard` | "Sign In To Continue" (red caution modal) | `GET /auth/me/` ×1 |
| `/dashboard/profile` | "Sign In To Continue" | `GET /auth/me/` ×1 |
| `/dashboard/projects/1/upload` | "Sign In To Continue" | `GET /auth/me/` ×1 |
| `/banana` | "This Page Doesn't Exist" (blue modal) | none |
| `/dashboard/banana` | "This Page Doesn't Exist" | none |

Login submit with a wrong credential pair (`nobody@kraios.ai`) fired
`GET /auth/csrf/` then `POST /auth/login/`, the backend answered with a
rejection, the page STAYED on `/login`, the submit button left its busy state,
and exactly one error toast appeared carrying the normalized backend message
("Invalid email or password."). No navigation to `/dashboard` occurred.

Both modals were confirmed fully visible — computed `opacity: 1` and a settled
`matrix(1, 0, 0, 1, 0, 0)` transform on `[data-modal-panel]` after the GSAP
entrance — so §33 cases A, B and C all behave as specified.

Not covered: the successful-login path, which needs valid credentials — and,
consequently, none of the project workflow, which is only reachable behind it.

That browser run predates the project API integration. The auth and route-
integrity behaviour it verified is unchanged by this pass (nothing in
`AuthContext`, the router or `DashboardLayout`'s boundary was touched), but the
dashboard beyond the boundary now behaves very differently and has not been
re-verified in a browser.

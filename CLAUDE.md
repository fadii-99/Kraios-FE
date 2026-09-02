# KRAIOS — CLAUDE.md

Permanent project rules and durable architecture for KRAIOS.

Read this file before changing the application. Then read PROGRESS.md for the
current implementation state, mock/backend boundaries, known issues and the
latest validation status.

---

## 1. Source of truth

When instructions or documents disagree, use this priority:

1. The user's explicit instruction for the current task.
2. This CLAUDE.md, for durable KRAIOS product, design, architecture and
   engineering rules.
3. The actual current source code, for implementation details.
4. PROGRESS.md, for completion state, mock behaviour, known issues and
   validation status.

Do not preserve stale documentation just because it already exists.

Do not guess routes, filenames, component names, state ownership, backend
capability or supported features. Inspect the current code first.

---

## 2. Product

Brand: **KRAIOS**.

KRAIOS is a self-serve SaaS application for architectural / fit-out workflows.
The user works inside the application. KRAIOS is not an agency hand-off service.

The project workflow has exactly four stages:

1. Upload
2. 3D Rendering
3. BoQ
4. Output

Do not use agency copy such as "send us your plans", "share your files with us",
"our team will build it for you", "contact us to process your project".

Do not invent customer counts, testimonials, project metrics, pricing,
processing accuracy, backend persistence, AI analysis, or file-generation
claims.

Frontend/demo data is allowed while backend services are unavailable, but it
must remain identifiable as mock/demo behaviour in code and documentation, and
it must never be presented to the user as a real result. PROGRESS.md records
where the current source breaks that rule.

---

## 3. Current stack

From `package.json`:

- Vite 8
- React 19 / React DOM 19
- JavaScript + JSX only
- React Router DOM 7 (`createBrowserRouter`)
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- GSAP + `@gsap/react`
- `@phosphor-icons/react`
- `react-markdown` + `remark-gfm` (used only by the BoQ Assistant transcript)
- `react-hot-toast`
- `@fontsource-variable/inter`

Dev tooling: ESLint 10 flat config, `@eslint/js`, `eslint-plugin-react-hooks`,
`eslint-plugin-react-refresh`, `globals`, `@vitejs/plugin-react`.

There is **no HTTP client dependency**. All network calls go through the native
`fetch` wrapper in `src/lib/api/client.js`. Do not add Axios.

Do not introduce TypeScript, a second router, Redux / Zustand / another state
library, another icon library, another UI kit, another form framework, another
notification library, or another HTTP client, unless the user explicitly
requests it or there is a clear architectural reason.

React Hot Toast is the only notification library. React-Toastify is gone; do not
reintroduce it and do not add a second notification API.

The `@` alias resolves to `./src` (`vite.config.js` → `resolve.alias`). Import
through it rather than with long relative chains.

---

## 4. Design system — critical

When creating or modifying KRAIOS UI, reuse the existing KRAIOS system first.

Preserve and reuse: current colours, CSS design tokens, KRAIOS blue, typography,
spacing rhythm, border language, the subtle radius system, the existing Button,
FormInput, CountryDropdown, CalendarPicker, Modal, full-screen floor-plan
viewer, the dropdown family, toast styling, Phosphor icons, the dashboard page
surface, the architectural grid/detail language and the current motion language.

Do not introduce a visually separate mini-design-system inside one feature. New
UI must feel native to the current product.

Shared components / patterns to inspect before creating equivalents:

```
src/components/ui/PrimaryButton.jsx
src/components/ui/FormInput.jsx
src/components/ui/CountryDropdown.jsx
src/components/ui/CalendarPicker.jsx
src/components/ui/Modal.jsx
src/components/ui/NotFoundModal.jsx
src/components/ui/PageLoader.jsx
src/components/ui/KraiosToaster.jsx
src/components/ui/AuthShell.jsx
src/components/ui/Logo.jsx
src/components/ui/BlueprintBackdrop.jsx
src/components/ui/DashboardBlueprintField.jsx
src/components/dashboard/AuthRequiredModal.jsx
src/components/dashboard/DashboardPageHeader.jsx
src/components/dashboard/DashboardPageSurface.jsx
src/components/dashboard/TechnicalIconFrame.jsx
src/components/dashboard/projects/workflow/shared/FloorPlanFullscreenModal.jsx
src/components/dashboard/projects/workflow/shared/ProjectFilesPanel.jsx
src/components/dashboard/projects/workflow/shared/FloorPlanWorkArea.jsx
src/lib/dashboard/layout.js          # DASHBOARD_GUTTER / DASHBOARD_BODY_PADDING
src/lib/dashboard/motion.js          # DASHBOARD_MOTION
src/styles/index.css
src/styles/toast.css
```

Do not recreate these concepts per page.

---

## 5. Colour / typography rules

The live visual source of truth is `src/styles/index.css`.

Current direction:

- navy / deep navy (`--color-navy` `#071426`, `--color-navy-2` `#0b1c32`)
- KRAIOS blue (`--color-brand` `#1677ff`, `--color-brand-deep` `#0b5ed7`)
- light application surface (`--color-light` `#f4f6f8`)
- restrained neutral borders (`--tone-line`, `--tone-line-strong`, and
  `--tone-line-soft` — half a hairline, for surfaces that sit on the workspace
  backdrop; the assistant turn sheets are its only current use)
- semantic colours: `--color-success` `#0a6c48`, `--color-danger` `#b42318`,
  `--color-warning` `#b54708`

`--color-brand` is deliberately NOT used as a button fill — see the contrast
note in `PrimaryButton.jsx`. Filled CTAs use `--btn-bg` / `--btn-bg-hover`.

The runtime font is **Inter Variable**; `--font-display` and `--font-body` are
deliberately the same family. Do not add another font unless explicitly
requested.

`tone-light`, `tone-navy` and related tone classes re-map the `--tone-*` and
`--btn-*` variables per surface. The dashboard shell mounts under `tone-light`.

---

## 6. Shape language

KRAIOS uses a restrained, lightly-rounded architectural shape language. The
application is not zero-radius.

```
--radius-xs:    0.1875rem  (3px)  chips, tiny toggles, hairline marks
--radius-sm:    0.25rem    (4px)  buttons, inputs, icon frames, menu items
--radius-md:    0.375rem   (6px)  cards, panels, dropdown surfaces, image frames
--radius-lg:    0.5rem     (8px)  modals and the largest page surfaces
--radius-field: 0.75rem   (12px)  the assistant composer field — ONLY
```

`--radius-field` is a deliberate, product-decided exception, not an opening of
the scale. It exists because the assistant composer is a single bar floating on
the workspace backdrop rather than a boxed form input. Nothing else may use it,
and `--radius-lg` remains the ceiling everywhere else.

Tailwind's `xl` / `2xl` / `3xl` / `4xl` radius utilities are deliberately
disabled (`initial`) in `src/styles/index.css`. Use the token scale; do not
invent arbitrary radii and do not introduce generic SaaS 12–24px card rounding.

Intentional circles remain circles: status dots, avatars, spinners, workflow
nodes, circular controls, decorative radial marks.

Structural layout wrappers do not need a radius merely because they are `<div>`
elements.

---

## 7. Public site

Public/auth routes live under `AppLayout`, which owns the Navbar, the Footer,
the `PageLoader` overlay and `useScrollToTop`. No page renders its own Navbar or
Footer.

Public routes: `/`, `/login`, `/forgot-password`, `/reset-password`, `/signup`.

Landing navigation (from `src/lib/content.js` → `navLinks`):
Home · About · How It Works · Why Kraios · Team · FAQ · Contact

Landing section ids: `home`, `about`, `process`, `why`, `team`, `faq`,
`contact`.

Do not casually rename section ids — navigation and scroll behaviour depend on
them.

Public content primarily comes from `src/lib/content.js`.

---

## 8. Application entry and provider order

`src/main.jsx` mounts, in this order:

```
StrictMode
  AuthProvider          (src/contexts/AuthContext.jsx)
    ProfileProvider     (src/contexts/ProfileContext.jsx)
      RouterProvider
      KraiosToaster     (the one Toaster)
```

Auth and Profile sit ABOVE the router and are available to public, auth and
dashboard routes alike. `ProjectsProvider` is mounted lower, inside
`DashboardLayout`, because project state is dashboard-only.

Do not mount a second `AuthProvider`, `ProfileProvider`, `ProjectsProvider` or
`Toaster`.

---

## 9. API / auth architecture

All HTTP goes through ONE client: `src/lib/api/client.js`, re-exported together
with the auth and profile services from `src/lib/api.js`. Import from
`@/lib/api`; do not call `fetch` against the backend from a component.

### Base URL and proxying

`API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'`

`.env` / `.env.example` set `VITE_API_BASE_URL` to the relative `/api/v1`, so the
browser always talks to the same origin. The backend is reached by a proxy at
each layer, never by a hardcoded absolute URL inside `src/`:

- dev — `vite.config.js` `server.proxy['/api']` targets the backend host and
  adds `ngrok-skip-browser-warning`
- Vercel — `vercel.json` rewrites `/api/(.*)` to `/api/proxy?path=$1`, handled by
  the serverless function `api/proxy.js`, which forwards method, body and the
  `content-type` / `cookie` / `origin` / `referer` / `x-csrftoken` headers and
  passes `set-cookie` back through

If the backend host changes, change `vite.config.js` and `api/proxy.js`. Do not
scatter the URL through `src/`.

### Session model — cookie based

- Authentication is HttpOnly cookies set by the backend; every request is sent
  with `credentials: 'include'`.
- NOTHING is stored in localStorage or sessionStorage for auth.
  `src/lib/api/tokenStorage.js` exists only to clear legacy keys; `getUser()`
  returns null and `setUser()` is a no-op. Do not reintroduce token storage.
- CSRF: `ensureCsrfToken()` calls `GET /auth/csrf/` and reads the `csrftoken` /
  `csrf_token` / `XSRF-TOKEN` cookie (falling back to a token in the JSON body).
  The client attaches `X-CSRFToken` to POST / PUT / PATCH / DELETE
  automatically.
- 401 handling: the client tries `POST /auth/refresh/` once (never for
  `/auth/login/`, `/auth/refresh/`, `/auth/csrf/`, `/auth/signup-request/`, and
  never when `skipRefresh: true`), retries the original request, and on failure
  dispatches the `kraios:auth-expired` window event. `AuthContext` listens for
  it, clears the session and moves the status to `anonymous`. It raises NO
  toast: the dashboard boundary answers that event with the caution modal, and
  one event must not produce two notifications.
- Error normalization is `parseApiError` — DRF / Django / FastAPI shapes plus
  status-code fallbacks. A raw thrown message, HTML body or backend field name
  must never reach the user; surface the normalized message.

### Declared endpoints

`src/lib/api/auth.js` → `AUTH_ENDPOINTS`:

```
POST /auth/signup-request/
POST /auth/login/
POST /auth/logout/
POST /auth/refresh/
GET  /auth/me/
GET  /auth/csrf/
POST /auth/reset-password/
```

`src/lib/api/profile.js` → `PROFILE_ENDPOINTS`:

```
GET   /profile/
PATCH /profile/                            (editable fields ONLY)
POST  /profile/password-change/request/
POST  /profile/password-change/confirm/
POST  /profile/delete-account/request/
POST  /profile/delete-account/confirm/
```

`EDITABLE_PROFILE_FIELDS` is `full_name`, `firm_name`, `country`, `job_title`,
`phone`. `updateProfile` strips everything else, so `email`, `role`, `id`,
`date_joined` and any password field can never be sent.

`src/lib/api/projects.js` -> `PROJECT_ENDPOINTS` — every path under
`/projects`:

```
GET  POST            /projects/
GET  PATCH  DELETE   /projects/{id}/
GET                  /projects/{id}/output/
POST                 /projects/{id}/finish/

GET   /step-1/conversation/   GET  /step-1/history/
POST  /step-1/upload/         POST /step-1/generate/   POST /step-1/edit/
POST  /step-1/versions/{id}/approve/

GET   /step-2/conversation/   GET  /step-2/history/
POST  /step-2/generate/       POST /step-2/edit/       POST /step-2/angle/
POST  /step-2/versions/{id}/approve/

GET POST  /step-3/conversation/     POST /step-3/generate/
GET       /step-3/versions/         POST /step-3/versions/manual/
POST      /step-3/versions/{id}/approve/
GET       /step-3/versions/{id}/download-csv/
POST      /step-3/skip/
GET POST                /step-3/documents/
GET PATCH DELETE        /step-3/documents/{id}/

DELETE /projects/{id}/conversations/messages/{messageId}/
GET    /projects/jobs/{jobId}/
GET    /projects/{id}/assets/            (optional ?kind=)
GET    /projects/{id}/assets/{assetId}/download/
POST   /projects/{id}/download-all/
```

Enum values belong to the backend and are declared beside the endpoints:
`RENDER_STYLE_VALUES`, `ANGLE_VALUES`, `DOCUMENT_TYPE_VALUES`,
`ARCHIVE_SCOPES`. A component never types one — the UI's own lowercase ids are
translated in the step's adapter module (§14).

### Background jobs

Generation, edit and archive endpoints answer `202 Accepted` with a
`ProcessingJob`. `src/lib/api/jobs.js` is the ONE place that waits for one:

- `waitForJob(jobId, { signal, onProgress })` polls `GET /projects/jobs/{id}/`
- one loop per job however many watchers — a second watcher subscribes, it does
  not start a second poll
- the interval backs off (1.2s -> 2s -> 3.5s -> 5s), pauses while the tab is
  hidden, and stops on COMPLETED / FAILED or when the last watcher leaves
- `jobIdFromResponse` reads the job whether it is nested under a version or
  returned directly (the archive endpoint)

Never open a second polling loop in a component. Leaving a workspace stops the
WATCH, never the job: the version list carries the running job back, and
`useResumedJob` re-attaches. There is no cancel endpoint, so nothing in the UI
may offer to cancel a queued job.

### Files and assets

`src/lib/api/files.js` owns authenticated file access. Assets sit behind the
session cookie, so a bare `<a href>` to an absolute backend URL gets a 401
rendered as a broken image:

- `assetSrc(assetOrUrl, projectId)` — a SAME-ORIGIN url for `src` / `href`; an
  absolute backend url is rewritten onto this origin so the cookie travels
- `downloadApiFile(path, filename)` — fetch with credentials, verify the
  response, then save the blob. Returns whether a file was really produced
- `dataUrlToFile` — the canvas mask as the `File` the edit endpoints require

Never put a backend `download_url` straight into `src`, and never save an
unverified response as a file.

OTP rules are the backend's and the UI must not overstate them: six digits,
10-minute expiry, a new request invalidates the previous code, five wrong
attempts maximum, five requests per hour per user. The ONLY thing sessionStorage
may hold for these flows is the short-lived `verification_id`
(`VERIFICATION_KEYS`) — never a password, never a token. Both confirm endpoints
end the session backend-side, so the client follows with
`AuthContext.clearSession()` — NOT `logout()`, which would POST to a session
that is already gone — and navigates to `/login` (password change) or `/`
(account deletion).

### Auth state ownership

`AuthContext` owns `user`, `sessionStatus`, `sessionExpired`, `isLoading`,
`error`, and the `verifySession` / `login` / `signup` / `logout` /
`clearSession` / `setUser` actions. The user object lives in React state only;
`token` is always `null`.

`SESSION_STATUS` is the single source of truth for access, and `isAuthenticated`
is derived from it — never from `Boolean(user)`:

- `unknown` — nothing checked yet. ONLY the authenticated boundary turns this
  into a request.
- `verifying` — the one `GET /auth/me/` is in flight; the boundary holds the
  surface with the shared loader.
- `authenticated` — dashboard children may render; no further `/auth/me/`.
- `anonymous` — no usable session (never signed in, rejected, expired, signed
  out). The boundary answers immediately and issues NO request.

`verifySession()` de-duplicates through a promise ref, so React's double effect
invocation in development cannot produce a second request.

`ProfileContext` seeds its form model from the auth user (adjusting state during
render via the `prevUser` pattern), then owns the Profile feature's own API:
`GET /profile/` through `fetchProfile` (called once when the Profile page
mounts) and `PATCH /profile/` through `updateProfile` on save. It NEVER calls
`/auth/me/` — that is the boundary's session bootstrap, and a feature must not
re-verify the session to read its own data. `fetchProfile`'s identity is stable
on purpose. `mergeUserData` keeps both the backend spelling (`full_name`,
`firm_name`, `job_title`) and the UI spelling (`name`, `firm`/`company`,
`jobTitle`) in sync in ONE place rather than per component.

> **No development bypass.** The dummy-identity fallbacks that once made the
> dashboard reachable without a session (`DUMMY_USER`, a dummy fallback in
> `verifySession`, and a blank-credential login path) have been REMOVED. Do not
> reintroduce them in any form. The rules that replace them:
>
> - `verifySession()` resolves `true` only when `GET /auth/me/` succeeds. Any
>   rejection — 401, CORS, 500, unreachable backend — clears the client session
>   and sets the status to `anonymous`, which is what makes the boundary render
>   the caution modal. An unreachable backend is "not signed in", never
>   "signed in as somebody".
> - `login()` reaches the dashboard only on a successful `POST /auth/login/`.
>   On failure it clears the session, sets `anonymous`, and RETHROWS the
>   normalized message so the Login page stays put and raises one error toast.
> - When the login response carries no user payload, `login()` leaves the status
>   `unknown` rather than guessing. The dashboard boundary then runs its ONE
>   `GET /auth/me/` to load the account, so `/auth/me/` stays owned by the
>   boundary and off the login page.
> - `sessionExpired` is derived from `wasAuthenticatedRef`: a session that
>   existed and was lost gets the "Session Expired" copy; a cold visit to a
>   dashboard URL gets "Access Required".

### API calling boundaries — WHERE a request may fire

Every API that exists stays; what is governed here is where each one runs. An
API request must never fire merely because the application mounted.

- **PUBLIC routes** (`/`, `/login`, `/signup`, `/forgot-password`,
  `/reset-password`) fire NO authenticated request. Landing and the auth pages
  must reach a visitor with an empty network panel. Never mount an auth
  bootstrap above the router.
- **LOGIN page** owns the login request only, and only on a valid submit:
  `GET /auth/csrf/` then `POST /auth/login/`. It does not call `/auth/me/`.
- **SIGNUP page** owns `POST /auth/signup-request/` only, on a valid submit.
- **FORGOT PASSWORD** calls nothing — there is no such endpoint in the contract.
- **RESET PASSWORD** owns `POST /auth/reset-password/` on submit.
- **AUTHENTICATED BOUNDARY** (`DashboardLayout`) owns the ONE `GET /auth/me/`.
- **PROFILE page** owns `GET /profile/` on entry; its modals own `PATCH
  /profile/` and the four OTP endpoints on submit.
- **SIGN OUT** (sidebar / mobile nav) owns `POST /auth/logout/`.
- **DASHBOARD FEATURES** own their own data requests where their data is needed.
  `/auth/me/` is the session bootstrap, not the only dashboard API.
- **PROJECTS** — `ProjectsProvider` owns the ONE `GET /projects/` when the
  dashboard mounts. Each stage and assistant then loads ITS OWN step, through
  the cache in §13: the Step 1 stage and its assistant read Step 1, Step 2's
  gateway and assistant read Steps 1 and 2, Step 3 reads Steps 1–3, and Step 4
  reads only `GET /projects/{id}/output/`. Nothing prefetches a step the user
  is not on.

No dashboard page fetches `/auth/me/` again. Overview → Subscription costs zero
requests, Projects costs the one list, and Profile costs exactly one
`GET /profile/`.

Never delete an API service because a page stopped calling it. Move the call
site; keep the function.

---

## 10. Dashboard shell

Authenticated routes use one shared `DashboardLayout`
(`src/layouts/DashboardLayout.jsx`). It owns:

- the authenticated route boundary — the ONE place the product verifies a
  session
- the single `GET /auth/me/` bootstrap, run when the status is `unknown`
- the shared loader while that verification is pending — no protected content
  mounts behind it
- the caution answer → `AuthRequiredModal` when there is no session, carrying
  the attempted address so signing in returns there
- `DashboardSidebar` (desktop) and `DashboardMobileNav` (< 1024)
- `DashboardPageSurface` and the routed `Outlet` inside `Suspense`
- the `RouteReady` / opacity crossfade that replaces a Suspense fallback so the
  loader can fade rather than pop
- `ProjectsProvider`
- the leave-an-active-project `DiscardProjectModal` guard: any sidebar / mobile
  nav click while the path matches `/dashboard/projects/<id>…` is intercepted
  and confirmed
- `useScrollToTop`

Invalid dashboard addresses are NOT detected here. A dashboard branch only
matches when one of its leaves matches the whole path, so `/dashboard/banana`
never reaches this layout — the router's `*` route answers it. Do not
reintroduce a route list in the layout.

Do not create another dashboard shell inside workflow features. Do not
hide/recreate the sidebar for the 2D Floor Plan Assistant, Design Assistant or
BoQ Assistant. "Full-screen assistant" means the full available right-side
dashboard workspace, not replacing the dashboard shell.

Global dashboard navigation source: `src/lib/dashboard/dashboardNavigation.js`.

`DASHBOARD_NAV_ITEMS`: Overview · Projects · Subscription · Profile.
`DASHBOARD_SIGN_OUT` (Log out) is exported separately — it is an action, not a
destination, and must never be iterated into the navigation register.

Project workflow stages do not belong in the global sidebar.

---

## 11. Current routes

Route knowledge lives in ONE place: `src/router/router.jsx`.

Public (`AppLayout`):

```
/
/login
/forgot-password
/reset-password
/signup
```

Dashboard (`DashboardLayout`):

```
/dashboard
/dashboard/projects
/dashboard/profile
/dashboard/subscription

/dashboard/projects/:projectId                    → RequireProject → ProjectWorkspace
  index                                           → redirect to DEFAULT_WORKFLOW_SEGMENT ('upload')
  /dashboard/projects/:projectId/upload           → UploadStep      (Step 1, upload mode)
  /dashboard/projects/:projectId/generate         → GenerateStep    (Step 1, generate mode)
  /dashboard/projects/:projectId/rendering        → RenderingStep   (Step 2 gateway)
  /dashboard/projects/:projectId/boq              → BoQStep         (Step 3 gateway)
  /dashboard/projects/:projectId/output           → OutputStep      (Step 4)

/dashboard/projects/:projectId/upload/assistant    → RequireProject → FloorPlanAssistantPage
/dashboard/projects/:projectId/generate/assistant  → RequireProject → FloorPlanAssistantPage
/dashboard/projects/:projectId/rendering/assistant → RequireProject → DesignAssistantPage
/dashboard/projects/:projectId/boq/assistant       → RequireProject → BoQAssistantPage
```

Global:

```
*  → NotFoundPage (renders NotFoundModal on the light surface)
```

Notes that must stay true:

- The four workflow stages are sibling routes under one selected project. Output
  is deliberately not nested under BoQ, because BoQ is optional and skippable.
- `upload` and `generate` are two addressable modes of the SAME Step 1 stage
  component (`FloorPlanInputStage`), not two stages.
- The three assistants are sibling focused workspaces inside `DashboardLayout`.
  They intentionally sit outside `ProjectWorkspace`, so they do not inherit the
  workflow stepper or the Previous/Next bar.
- Every project-scoped route is wrapped in `RequireProject`.
- All page components are lazy EXCEPT `RequireProject` (tiny, always needed) and
  `NotFoundPage` — the latter is the only route element outside `AppLayout` and
  `DashboardLayout`, so there is no Suspense boundary above it.
- Use the path builders in `src/lib/dashboard/workflow/projectWorkflow.js`
  (`projectStagePath`, `floorPlanAssistantPath`, `designAssistantPath`,
  `boqAssistantPath`) rather than typing route strings.
- Do not create a second router.

---

## 12. Dashboard pages

Current dashboard UI exists for:

- Overview (`DashboardHome` → `WelcomeWorkflowCanvas` + `CreateProjectModal`) —
  a centred welcome composition: status badge, brand mark, a personalized
  "Welcome, &lt;name&gt;" headline, one line of product copy, and two CTAs
  ("Create New Project", "View Projects")
- Projects library, its empty state, project cards, Create Project modal, Delete
  Project confirmation
- Subscription (current plan card + three plan cards + "not connected" notice
  modal)
- Profile (identity panel + Edit Profile / Reset Password / Delete Account
  modals)
- The complete four-stage project workflow UI, plus three assistant workspaces

These screens are implemented; they are not placeholders. Maintenance /
optimization tasks must not visually redesign them unless the user explicitly
requests a redesign.

---

## 13. Project state

`ProjectsProvider` (`src/lib/dashboard/projects/ProjectsProvider.jsx`) is
mounted in the dashboard shell and is BACKED BY THE PROJECT API. It holds three
things and nothing else:

1. **The project list** — one `GET /projects/` when the dashboard mounts,
   de-duplicated through a promise ref. `createProject`, `renameProject` and
   `deleteProject` are real requests whose responses are written straight back,
   so the library never refetches to show what just happened.
2. **A keyed request cache** — `useResourceCache.js`, about a hundred lines and
   no dependency. It de-duplicates concurrent reads of the same key, serves a
   cache hit without a request, keeps `status` / `data` / `error` together per
   key, and invalidates by key or by prefix. A FORCED read chains onto an
   in-flight one rather than joining it, so a refetch after a mutation cannot
   resolve with pre-mutation state.
3. **The three assistant view models** — the same pure reducers as before,
   HYDRATED FROM THE SERVER. `hydrate` REPLACES the transcript with what the
   backend holds; the optimistic `startGeneration` block only covers the gap
   between sending a request and the refetch that answers it.

Cache keys live in `projectShape.js` (`CACHE_KEYS`), one naming scheme
(`project:{id}:…`) so a deleted project's data drops by prefix.

Consumed through the hooks in `projectsContext.js`:

- `useProjects` — the store
- `useProject(id)` — one project, from the detail cache or the list
- `useStep1Data` / `useStep2Data` / `useStep3Data` / `useProjectOutput` — load
  on mount and report `{ status, data, error, isLoading, isReady, reload }`
- `useFloorPlanAssistant` / `useDesignAssistant` / `useBoqAssistant` —
  `[state, dispatch]`
- `useFloorPlanSource(projectId)` — returns the SOURCE OBJECT, not a
  `[source, setSource]` pair. There is no setter: the source is DERIVED from
  the approved Step 1 version (`sourceFromApprovedVersion`), because
  `selected_floor_plan` on the project is the record of which plan the project
  works from and a second local copy could only disagree with it

Each per-project hook returns a shared FROZEN default state for a project that
has not been read yet, so no view has to null-check.

`has3DRender` and `hasBoQ` are DERIVED on read in `normalizeProject`, from
`selected_three_d` and `selected_boq`. Do not write duplicate status truth into
`ProjectCard` or another store.

**Ids are backend UUIDs.** The `nextProjectId` counter that minted
`project-001` is gone; do not reintroduce a client-side id.

**Project state is now persistent** — it is the backend's. A refresh reloads
the project, its conversations and its versions. The blob-URL bookkeeping the
provider used to do is gone with the browser-only records that needed it: every
image and document is a backend url.

Do not add Redux/Zustand merely to restructure this provider. If high-frequency
assistant updates become a performance issue, first consider narrower
contexts/providers or selector-style boundaries.

---

## 14. Feature ownership

UI ownership:

```
src/components/dashboard/projects/
├── library/
│   ├── CreateProjectModal.jsx
│   ├── ProjectCard.jsx
│   └── ProjectGrid.jsx
└── workflow/
    ├── shared/
    │   ├── DiscardProjectModal.jsx
    │   ├── FloorPlanFullscreenModal.jsx
    │   ├── FloorPlanWorkArea.jsx
    │   ├── ProjectStepNavigation.jsx
    │   ├── ProjectWorkflowNav.jsx
    │   └── StepPlaceholder.jsx
    ├── step-1/            (+ step-1/assistant/)
    ├── step-2/            (+ step-2/assistant/, step-2/canvas/)
    ├── step-3/            (+ step-3/assistant/)
    └── step-4/
```

Domain ownership:

```
src/lib/
├── api.js                      # the single API surface (re-exports)
├── api/
│   ├── client.js               # fetch wrapper, CSRF, 401 refresh, error parsing
│   ├── auth.js                 # AUTH_ENDPOINTS + auth services
│   ├── profile.js              # PROFILE_ENDPOINTS + profile / OTP services
│   ├── projects.js             # PROJECT_ENDPOINTS + every workflow service
│   ├── jobs.js                 # the ONE job poller (shared, backing off)
│   ├── files.js                # authenticated asset urls and downloads
│   └── tokenStorage.js         # legacy-storage cleanup only
├── toast.js                    # the toast API (NOT in the toast component module)
├── countries.js                # country list + aliases + search ranking
├── content.js                  # public site content
├── cn.js  date.js  scroll.js  validate.js
└── dashboard/
    ├── dashboardNavigation.js
    ├── layout.js  motion.js  subscriptionPlans.js
    ├── projects/
    │   ├── ProjectsProvider.jsx
    │   ├── projectsContext.js
    │   ├── projectShape.js        # Project normalization, CACHE_KEYS, resume
    │   └── useResourceCache.js    # the keyed request cache
    └── workflow/
        ├── projectWorkflow.js     # stages, paths, stageGateMessage
        ├── apiShapes.js           # what all three steps share of the payloads
        ├── step-1/  floorPlanSource.js · floorPlanAdapters.js
        │             floorPlanAssistantConfig.js · …State.js · …Selectors.js
        ├── step-2/  designAssistantConfig.js · …State.js · …Selectors.js
        │             designAdapters.js
        ├── step-3/  boqAssistantConfig.js · …State.js · …Selectors.js
        │             boqAdapters.js
        └── step-4/  outputConfig.js · outputDownloads.js
```

**Adapters are the seam.** A `…Adapters.js` module is the ONE translation
between a step's backend payloads and the view model its components already
render: versions to results, a conversation to a transcript, and the step's own
enum spellings. A component never sees `snake_case` or an uppercase enum, and a
request never carries a lowercase UI id. `apiShapes.js` holds only what is
genuinely identical across the three steps — timestamps, version status, the
role map, the pending-job lookup — and must never become a switch on the step
number.

```
```

Project routes are guarded once, not per stage:
`src/pages/dashboard/projects/RequireProject.jsx` wraps the workspace and all
four assistant routes and redirects an unknown `:projectId` to
`/dashboard/projects` (with `replace`). Do not add per-stage `if (!project)`
checks; extend the guard instead.

All four workflow stage folders contain real UI/domain code. Do not write
documentation saying Step 3 or Step 4 are future placeholders.

---

## 15. Shared vs feature-specific code

Share only genuinely generic primitives. Current legitimate cross-step reuse:

- `FloorPlanFullscreenModal` and `FloorPlanWorkArea` (shared/)
- `ApprovalStatus` — used by all three assistant headers
- `AssistantComposer` and `ResultHeaderControls` — Step 2 modules reused by the
  Step 1 assistant
- `assistantGrid.js` (`ASSISTANT_GRID` / `ASSISTANT_GUTTER`) — shared by the
  Step 2 and Step 3 composers
- `ProjectFilesPanel` (shared/) — the ONE files control, in Steps 2 and 3
- `AssistantTurnCard` and `assistantTurns.js` — Step 2 modules reused by the
  Step 1 assistant
- `formatFileSize` from `step-1/floorPlanSource.js`

Keep feature BEHAVIOUR separate.

Step 2 owns: render-style behaviour, view-angle behaviour, 3D results, canvas
editing, 3D approval.

Step 3 owns: document type, uploaded-document context, BoQ results, the BoQ
table, BoQ approval/finalization.

Do not create one giant conditional component such as
`<Assistant type="design" />` / `<Assistant type="boq" />` with large if/else
branches for feature-specific behaviour.

---

## 16. Workflow source of truth

`src/lib/dashboard/workflow/projectWorkflow.js` declares `WORKFLOW_STAGES`:

| # | id | label | segment | notes |
|---|----|-------|---------|-------|
| 01 | `upload` | Upload | `upload` | |
| 02 | `rendering` | 3D Rendering | `rendering` | |
| 03 | `boq` | BoQ | `boq` | `optional: true` |
| 04 | `output` | Output | `output` | |

Each stage also carries `description` and `summary` copy. Neither is currently
rendered — the stepper and the Previous/Next bar read `number`, `label` and
`segment` only. Keep the copy declared here if a view needs it again; do not
duplicate stage copy into a component.

`DEFAULT_WORKFLOW_SEGMENT` is `upload`. `workflowIndexForPath` reads the LAST
path segment only and maps `generate` back to stage index 0.

BoQ is optional: the user may reach Output without completing BoQ. If this
product rule changes, change the workflow deliberately and update code and
documentation together.

Do not create a fifth stage for any assistant. They are focused workspaces
belonging to Steps 1, 2 and 3.

### Stage gating

`ProjectWorkspace` asks `stageGateMessage(stageId, project)` in
`projectWorkflow.js` for a reason the next stage is not reachable, and hands it
to the shared bottom navigation, which explains via one info toast instead of
navigating.

The answer is read from the PROJECT's `workflow_state`, which is the backend's
own record of progress. That matters twice: it is the same answer the API will
give when the next stage's endpoint is called, so the nav cannot promise what
the server then refuses; and it costs no request, so the bottom bar never has to
load a step's history to decide whether Next is allowed.

- `upload` → blocked until `step_1_complete`
- `rendering` → blocked until `step_2_complete`
- `boq` → always `null`, because BoQ is optional

Nothing is gated while `workflow_state` is unknown — a nav that blocks on
missing data blocks a user who has in fact finished the stage.

**Finish** is `POST /finish/`, gated by `canFinishProject(project)`: a 2D plan
approved, a 3D render approved, and a BoQ either approved or explicitly skipped.
Those are the backend's rules, so the button explains rather than firing a
request it knows will 400.

TWO controls offer it — the workflow's bottom navigation on the Output stage,
and `OutputFinishBar` at the close of the Output page, because that page is long
enough that the nav is well behind the reader by the time they reach the end.
They are the same action: the gate, the request, the three toasts and the
redirect all live in `src/hooks/useFinishProject.js`, and each control is only a
button. Do not re-implement finishing in a third place.

---

## 17. ProjectWorkspace structure

```
TOP     ProjectWorkflowNav   (the four-stage stepper + progress rule)
MIDDLE  <Outlet />           (the active stage — the ONLY scrolling zone)
BOTTOM  ProjectStepNavigation (Previous / Next)
```

Preserve this architecture. Do not move the bottom workflow navigation inside a
nested stage scroller, and do not replace it with fixed/absolute hacks.

`StepPlaceholder` is the stage content wrapper (`flex w-full flex-1 flex-col`)
used by all five stage route pages. It is a container, not a "not implemented"
marker.

---

## 18. Step 1 — Upload / Generate

Routes: `/upload` and `/generate`. Both render `FloorPlanInputStage` with a
`defaultMode`; `FloorPlanModeToggle` navigates between the two addresses, and a
locked mode raises one info toast (`MODE_LOCK_MESSAGES`) instead of switching.

Components: `FloorPlanInputStage`, `FloorPlanModeToggle`, `FloorPlanBrief`,
`UploadFloorPlanPanel`, `GenerateFloorPlanPanel`.

**Upload mode** — `UploadFloorPlanPanel` is a drafted dropzone: file input +
drag & drop with refcounted drag depth, one plan only (extra files raise an info
toast), `FLOOR_PLAN_ACCEPT` = PNG · JPG · JPEG · WEBP · PDF validated by mime
AND extension (`fileKind`), and a 25 MB ceiling (`FLOOR_PLAN_MAX_BYTES`) checked
before the upload rather than after it. The list mirrors what
`POST /step-1/upload/` accepts; adding a format the backend rejects only moves
the refusal from the dropzone to a 400.

The panel validates and hands the raw `File` UP. `FloorPlanInputStage` owns the
request, because the upload creates a version, an approval and a workflow move
on the backend and only the stage can wait for that: it uploads, invalidates
Step 1, refetches the project, and navigates to `/rendering` only once
`workflow_state.step_1_complete` confirms it. The loader covers real work, not a
timer. A failure leaves the user on Step 1 with an explanation.

**Generate mode** — `GenerateFloorPlanPanel` is a gateway card: heading,
description, a centred "GENERATE NOW" CTA into the 2D Floor Plan Assistant, and
a full-width bottom status strip (green when a source is approved, red when
not).

### Source model — `step-1/floorPlanSource.js`

A project has exactly ONE active floor-plan source:

```
null                       → no source yet, both modes open
{ type: 'upload',    … }   → an uploaded file is the source
{ type: 'generated', … }   → an AI-generated plan is the source
```

`lockedModeForSource` derives which mode is closed, so "upload OR generated,
never both" holds by construction. `createUploadSource` / `createGeneratedSource`
build the record; `ownsPreviewUrl` marks a blob URL as ours and
`releaseFloorPlanSource` frees it. This module also owns Step 1's copy
(`UPLOAD_BRIEF`, `GENERATE_BRIEF`, `MODE_LOCK_MESSAGES`, `NEXT_STEP_*`) and
`formatFileSize`.

### Generation

There is no generation seam module any more. `floorPlanGeneration.js` held a
frontend mock that returned a fixed local SVG as if it were a generated plan,
behind two flags; Step 1 calls `POST /step-1/generate/` directly and the module
is deleted. Its only surviving export, `GENERATION_FAILED_MESSAGE`, moved to
`floorPlanAssistantConfig.js`.

Do not reintroduce a mock generation path in any step.

---

## 19. 2D Floor Plan Assistant

Routes: `/upload/assistant` and `/generate/assistant` → `FloorPlanAssistantPage`.
"Back" returns to whichever of the two Step 1 addresses the user came from.

Workspace: `FloorPlanAssistantHeader` (Back + brand + `ApprovalStatus`
indicator), `FloorPlanAssistantConversation` (empty state with
`FLOOR_PLAN_QUICK_PROMPTS`, turn cards, pending block, failure notice with
Retry, result blocks), Step 2's `ResultHeaderControls` for Edit and Approve,
`FloorPlanAssistantResult` (Full View overlay rail), and Step 2's
`AssistantComposer`.

The header names the STAGE (`workspaceTitle` — "2D Rendering"), not the product.
`assistantTitle` is what a gateway card says when it offers to open the
workspace; once the user is inside one, the header says where in the project
they are standing.

State: `step-1/floorPlanAssistantState.js` (reducer) +
`floorPlanAssistantSelectors.js`, held per project in `ProjectsProvider`.

Every turn is a real backend round trip, in three beats:

1. `POST /step-1/generate/` — or `/step-1/edit/` when the canvas produced a mask
   — answers `202` with a version and a nested job.
2. The job is watched, and its `progress` / `message` written onto the pending
   block (`generationProgress`) so the wait is legible.
3. The step is refetched and the transcript REPLACED with what the server holds.

Rules:

- **A turn is one sheet.** `AssistantTurnCard` (Step 2's, reused by Steps 1 and
  3) puts the instruction and everything it produced on ONE white sheet.
  `assistantTurns.groupIntoTurns` derives the grouping on render — a user
  message opens a turn, every assistant block that follows belongs to it — so
  the reducers and adapters keep their flat message list and no second source of
  truth about ordering exists.
- **The sheet appears only when the turn SETTLED** (`isTurnSettled`: it has
  replies, none pending, none a failure notice). A running or failed turn stays
  on the bare backdrop. A finished-looking container around unfinished work is a
  lie, and there is nothing to keep — or delete — until there is a result. The
  sheet's line is `--tone-line-soft`, half a hairline; it separates turns rather
  than boxing them.
- **Delete belongs to the turn, and sits OUTSIDE the sheet**, in a reserved
  column to its right that exists in every state — so the sheet does not change
  width when a turn settles, and the control cannot push the transcript into a
  horizontal scroll. It calls
  `DELETE /projects/{id}/conversations/messages/{messageId}/` with the prompt's
  `serverMessageId`; the backend deletes the whole block (message, version, job,
  files), so nothing deletes an image separately. Afterwards the step is
  refetched, the project reloaded (deleting the selected version clears that
  selection) and Step 4's bundle invalidated. Never offer delete on a pending or
  failed turn.
- **The transcript carries the user's words and the assistant's WORK, not the
  assistant's commentary.** Steps 1 and 2 skip the backend's own assistant text
  messages ("Your 2D floor plan is ready for review."): the drawing directly
  underneath already said it, and a line of copy per result stopped the images
  reading as the subject of the workspace. Failures and running jobs still
  speak — those come from the version, not the conversation. Step 3 is
  different on purpose: its assistant text IS the answer, and is rendered as
  Markdown.
- The pending block shows the job's own `message` and NO percentage. The
  pipeline's `progress` is a simulated ramp, so a number on screen read as an
  estimate the backend cannot make (`jobProgressText`).
- A result's `id` IS the backend version id, so approval points at a real
  `FloorPlanVersion` rather than at a local flag that happens to match one.
- Approval is `POST /step-1/versions/{id}/approve/`. It sets
  `selected_floor_plan`, completes Step 1, and returns to the Step 1 stage.
- **There is no un-approve.** The contract has no such endpoint, so the control
  does not toggle: approving the plan that is already approved says so and
  returns to the stage rather than pretending to clear a record the backend
  still holds. The way to change the approved plan is to approve another
  version.
- Editing a result opens `KraiosDesignCanvas` (after a deliberate transition
  loader); a canvas "Proceed" sends the annotation MASK to `/step-1/edit/` and
  shows the composite in the transcript (§22).
- A version still QUEUED or PROCESSING comes back from the history as a pending
  block carrying its job, and `useResumedJob` re-attaches — so a refresh mid-run
  resumes rather than stalling.

---

## 20. Step 2 — 3D Rendering gateway

Route: `/rendering` → `RenderingStep` → `RenderingStage` → `DesignAssistantGateway`.

Normal Step 2 is a gateway/status screen, not the assistant. One centred
composition, not a grid of widgets. It says what Step 2 does, reflects whether a
design has been signed off, and opens the workspace where the work is done.

Do not embed the full conversation inside the gateway.

Step 2 copy lives in `RENDERING_COPY` (`designAssistantConfig.js`);
`renderingStatusNote` derives the contextual status line from real state
(generating / N unapproved renders / nothing yet).

---

## 21. Design Assistant

Route: `/rendering/assistant` → `DesignAssistantPage`. The dashboard sidebar
stays; this is the full right-hand workspace, not a second shell.

Workspace: `AssistantHeader` (Back, brand — `workspaceTitle` "3D Rendering" —
`ProjectFilesPanel` in its compact variant, `ApprovalStatus`), `AssistantConversation` (`AssistantEmptyState` +
`QUICK_PROMPTS`, `AssistantMessage` with timestamps, pending/failure/retry
blocks, `AssistantResult` blocks with `ResultHeaderControls` in the message
header), and `AssistantComposer` (single-line input, Enter to send,
`RenderStyleDropdown` inline, Cancel gated on
`MODEL_GENERATION_SUPPORTS_CANCEL`).

The transcript follows Step 1's rules exactly — settled-only turn sheets, the
delete control outside the sheet, no assistant commentary, no percentage on the
pending block (§19). Step 3's transcript uses the same sheet and the same delete
behaviour; only its message component differs, because its assistant text IS the
answer.

Result actions split by intent, and the split must be preserved:

- **Change / refine** — View Angle, Edit, Approve — live in the message header,
  always visible.
- **Inspect** — Full View, and DWG only when the service actually returned a
  `dwgUrl` — ride an overlay rail that becomes a real row on coarse pointers.
- **Select** — clicking the render itself makes it the base the next
  instruction refines. `refinementBase` is the ONE derivation of that answer.

Configuration (`designAssistantConfig.js`):

- `RENDER_STYLES` — SketchUp, Photo Realistic. Both are real backend values
  (`SKETCHUP`, `PHOTOREALISTIC`); the translation lives in `designAdapters.js`
- `VIEW_ANGLES` — Isometric 45° (`DEFAULT_VIEW_ANGLE_ID` is `null`, which is the
  backend's `ORIGINAL`)
- Both lists are the single source of truth for the control AND the request
- `THREE_D_GENERATION_SUPPORTS_CANCEL` is `false`, and honestly so: the contract
  has no endpoint that cancels a queued job. Leaving the workspace stops the
  polling, not the work. The composer shows no Cancel action rather than one
  that only stops watching. `modelGeneration.js` — the mock seam that returned a
  fixed local SVG — is deleted; do not reintroduce it.

Three endpoints, one `runGeneration` path:

- `POST /step-2/generate/` for an instruction, carrying `render_style` and the
  approved 2D plan's version id
- `POST /step-2/edit/` for a canvas edit, carrying the annotation mask
- `POST /step-2/angle/` for a view angle

Approval rules:

- Approval is `POST /step-2/versions/{id}/approve/`, which sets
  `selected_three_d` and completes Step 2. A new version arrives unapproved, so
  approval never silently transfers.
- Approving a different render clears an existing BoQ approval or skip — that is
  the backend's rule, and why approving invalidates Step 3's cache too.
- There is no un-approve endpoint; the control does not toggle (§19).
- Approving navigates back to `/rendering`.

**View Angle rule.** Selecting a view angle is a generation request, not a
display setting. `POST /step-2/angle/` creates ANOTHER version with
`source: 'ANGLE'` from a completed one, leaving the original untouched. It goes
through the SAME `runGeneration` path a typed instruction takes. Do not add a
second generation implementation for it, and do not fake a viewpoint by
transforming an existing image. It needs a version to convert, so choosing an
angle before anything has been rendered explains itself instead of failing.

---

## 22. Kraios Design Canvas

`step-2/canvas/KraiosDesignCanvas.jsx` is a Step 2 feature reused by the Step 1
assistant (with different title/subtitle/prompt props). It is not a workflow
stage; do not move canvas logic into global dashboard UI.

Current capability, stated exactly:

- **Two tools**: Markup Pen (`brush`, shortcut **P**) and Marker / highlighter
  (`highlighter`, shortcuts **M** or **H**). There is no lasso, selection or
  cutout tool.
- Ten colour swatches, five brush-width presets, zoom in/out/reset, clear.
- Undo / redo, wired to **Ctrl+Z**, **Ctrl+Y** and **Ctrl+Shift+Z** (ignored
  while focus is in an editable field).
- History is capped at `MAX_HISTORY = 30` full-canvas `toDataURL()` snapshots;
  past the cap the oldest is dropped and the index clamped.
- "Proceed" produces TWO images from the same canvases and passes both:
  `onRegenerate(promptText, result, compositeSnapshotUrl, maskSnapshotUrl)`.
  The COMPOSITE (base image + annotations) is what the conversation shows, so
  the user's turn looks like what they drew on. The MASK is the annotation layer
  alone — transparent everywhere the user did not draw — and is what the
  `/step-1/edit/` and `/step-2/edit/` endpoints take. Sending the composite as
  the mask would tell the service the whole image was selected.
- If the base image cannot be read back into a canvas (a cross-origin asset
  without CORS headers), the mask is still valid and the edit still goes.

Honesty rule: do not advertise a tool or a shortcut that is not implemented. A
future cheaper history representation is allowed, but must not redesign the
canvas.

---

## 23. Step 3 — BoQ gateway

Route: `/boq` → `BoQStep` → `BoQStage` → `BoQAssistantGateway`.

Step 3 is a gateway/status experience: BoQ identity, the four "what you build"
capability chips (`BOQ_COPY.buildOutputs`), the current approval state, entry
into the BoQ Assistant, and the bottom strip offering the optional
skip-to-Output path.

BoQ never blocks Next.

**Skip is an action, not a link.** `POST /step-3/skip/` clears any selected BoQ,
records `boq_skipped_at` and makes Step 4 the current step, so Output is reached
because the backend agrees the stage was skipped — not because the browser
navigated past it. It is confirmed with a modal first (a toast cannot ask a
question), and the navigation happens only after the response.

The route page uses `StepPlaceholder` as a shell wrapper; the content is
`BoQStage` / `BoQAssistantGateway`. Do not describe Step 3 as a placeholder.

---

## 24. BoQ Assistant

Route: `/boq/assistant` → `BoQAssistantPage`, in the same dashboard shell family
as the Design Assistant.

Workspace: `BoQAssistantHeader` (Back, brand — `workspaceTitle` "BOQ
Generation" — `ProjectFilesPanel`, `ApprovalStatus`), `BoQConversation`
(`BoQAssistantEmptyState`, `BoQMessage` rendering assistant markdown through
`react-markdown` + `remark-gfm`, pending/failure/retry blocks, `BoQResult` →
`BoQTable`, all grouped into the shared `AssistantTurnCard` sheets with the same
delete control — §19), and `BoQComposer` (input + send, and nothing else).

`DOCUMENT_TYPES` (`boqAssistantConfig.js`) is exactly the seven values the
backend's `document_type` enum accepts, each carrying its `apiValue`: General
Document · Project Brief · Structural Drawing · Estimation · Material
Specification · 3D Model · Other. Labels are ours; values are the contract's,
and the two are declared together so they cannot drift apart. Never add a
`DOCUMENT_TYPES` entry whose `apiValue` the enum does not accept.

`PROJECT_DOCUMENT_SLOTS` (same module) is what the Project Files panel OFFERS —
General Document · MEP Drawing · HVAC Drawing · Door & Window Schedule — and it
is a set of SLOTS, not a second enum. Three of the four have no member of their
own in `document_type`, so each slot declares the contract value it is stored as
beside its label: the drawing slots are `STRUCTURAL_DRAWING`, whose own
description already covers structural, MEP, HVAC and technical drawings.

Because those three share one enum value, the enum alone cannot say which slot a
file came from — and a file that reappeared in a different slot after a refresh
read as a bug rather than as a contract limit. So the slot is ALSO recorded in
the document's `title`, a free-text field the backend stores and returns:
`slotDocumentTitle` writes the tag in front of the file name on upload, and
`slotIdFromTitle` reads it back. Nothing user-facing shows the tag — the panel
and Step 4 both display `name`, the asset's `original_name`.

`assignDocumentsToSlots` therefore fills in three passes, most specific first:
the slot from the title tag, then the first free slot matching `document_type`
(which is what a document uploaded before this convention gets), then the first
free slot at all. Anything past the four slots is listed under "Additional"
rather than dropped. This is a labelling convention, not a classification:
`document_type` stays the contract's, and a real per-slot type is still a
backend enum change.

While a file is going up, the SLOT it was dropped on shows the wait — a brand
tint, a spinner, "Uploading…" and the file's name — and the other slots are
disabled. The panel owns that state (keyed by slot id, because a `typeId` cannot
tell two drawing slots apart) and clears it only when the page's handler
resolves, which is after the document list has been refetched. Do not replace it
with a single panel-wide busy flag: "something is uploading" does not answer
"which one?".

Generation is `POST /step-3/generate/`, watched and refetched like every other
step. `boqGeneration.js` — the keyword-matched fixture mock — and
`boqDemoData.js` are deleted.

The backend's current BOQ task returns a placeholder table. Do not claim the
table was calculated from the user's floor plan, approved 3D geometry, uploaded
files or live market prices.

### Document record contract

A supporting document is a backend `ProjectDocument`, mapped by
`boqAdapters.documentToRecord` into
`{ id, name, title, size, mime, extension, kind, typeId, typeLabel,
documentType, assetId, previewUrl, downloadUrl, addedAt }` — the shape Step 4
needs to list, preview and download it. `previewUrl` and `downloadUrl` are
same-origin asset urls from `assetSrc`, so nothing here is a blob this app must
revoke, and `boqDocuments.js` (which minted them) is deleted.

Documents are deliberately separate from conversation attachments: BOQ
generation records the document ids that exist when the job is submitted, so a
file must be uploaded through the document API before it can inform a BOQ. Never
send a file to the conversation or generation endpoints.

Documents are added and removed from ONE place: `ProjectFilesPanel` in the
header. The composer's paperclip and its document-type menu are gone — attaching
a file and saying what kind of file it is are one decision, and answering it in
two controls at opposite ends of the field let a document be saved under
whatever the menu was last left on. In the panel, the SLOT is the
classification: it uploads through `POST /step-3/documents/` with the slot's own
`typeId`, deletes through `DELETE /step-3/documents/{id}/`, and refetches the
list after either, because the backend decides the title and the stored asset.

### Project Files — the one files control

`components/.../workflow/shared/ProjectFilesPanel.jsx` is the single control for
"the files this workspace works from", in TWO variants:

- `full` (Step 3) — the approved 2D plan, the approved 3D render, and the four
  document slots, with upload and remove.
- `compact` (Step 2) — the 2D plan alone, which is all Step 2 works from.

It replaced five separate controls (`FloorPlansDropdown`, `FloorPlans3DDropdown`,
`UploadedDocumentsDropdown`, `DocumentTypeDropdown` and the composer paperclip),
all now deleted. Do not reintroduce a per-file-type dropdown in an assistant
header. The panel invents nothing: a missing plan, render or document says it is
missing rather than falling back to a fixture drawing.

**The panel does not scroll.** It holds a fixed, small set — two required files
and four document slots — so it is sized by its content and read at a glance;
the cards stay two-up at every width, because stacking them on a phone made the
unscrolled panel taller than the viewport and put the last slots out of reach.
Measured: 496×648 on desktop, 352×644 at 390px, inside the viewport in both. If
"Additional" documents ever outgrow a short viewport, cap and scroll THAT list
alone — never the panel.

---

## 25. BoQ approval rules

Approval belongs to one specific BoQ version.

- Approval is `POST /step-3/versions/{id}/approve/`. It sets `selected_boq`,
  completes Step 3 and clears a previous skip. There is no un-approve endpoint.
- A BOQ version is IMMUTABLE on the backend, so a table edit is not a mutation:
  Add Row and Delete Row compute the amended rows (`withAddedRow` /
  `withDeletedRow` in `boqAdapters.js`), post them to
  `POST /step-3/versions/manual/` parented on the version they were edited from,
  and refetch. The new `MANUAL` version arrives unapproved.
  That preserves the old rule — an edited table is not the table anybody signed
  off — without a browser-only copy the server would never agree with. The
  reducer's in-place `addRow` / `deleteRow` / `withRowEdit` are gone; do not
  reintroduce them.
- `approvedResultId` mirrors `selected_boq` and is the single approval flag in
  the view model. Do not add a component-local `isApproved`.

---

## 26. Step 4 — Output / Deliverables

Route: `/output` → `OutputStep` → `OutputStage`.

Step 4 is the final project deliverables workspace, not an assistant/editor.

Current composition:

```
OutputHeader              hero + deliverable stat chips + Quick Downloads card
                          (Download All ZIP · Latest 3D · 3D Images · 2D Plans)
OutputDeliverablesTabs    All Deliverables · 3D Renders · 2D Floor Plans · BOQ · Documents
Output3DRendersSection    approved render + version gallery, preview + download
Output2DPlansSection      2D plan + versions, preview + download
OutputBoQSection          BoQ preview table, CSV export, open full modal, edit → BoQ Assistant
OutputDocumentsSection    supporting documents grid + downloads
OutputFinishBar           the close of the page: Finish this project
OutputBoQModal            full-screen BoQ inspection
FloorPlanFullscreenModal  shared lightbox for plans and renders
```

`OutputFinishBar` is not a second finish rule — it renders `useFinishProject`,
the same hook the bottom navigation renders (§16).

Domain modules: `step-4/outputConfig.js` (copy) and `step-4/outputDownloads.js`.

**ONE request builds this page**: `GET /projects/{id}/output/` returns the
project, a summary, and the floor plans, 3D renders, BOQ versions and documents
together. Step 4 never reassembles itself from four step caches, and never
re-derives what was approved — the backend marks the approved item with
`selected: true`.

`DEMO_ASSETS` is gone. It was a local 2D SVG and a local 3D SVG that every
section fell back to when the real asset was missing, so an empty project
displayed two drawings it did not own.

Step 4 should remain **View · Review · Download**. Do not add upstream editing
behaviour to Output (the BoQ "edit" control navigates to the BoQ Assistant; it
does not edit in place).

### Step 4 data truth

Step 4 reads, all from the one output bundle:

- the 2D floor-plan version marked `selected`, plus the project's other
  completed plans as its version list
- the 3D version marked `selected`, plus the project's other completed renders
- the BOQ version marked `selected`, and nothing else
- the project's documents

**Every count is COUNTED**, from `summary` or from the lists themselves. The
page used to declare 45 deliverables — 18 renders, 2 plans, 1 BoQ, 24 documents
— as constants regardless of what the project contained. A project with one
render says one.

**Final BoQ rule.** There is no fallback to the latest result: an unapproved
draft is not a deliverable, must not appear under an approved badge, must not be
exportable as the project CSV, and must not be written into the deliverables ZIP.
Because BoQ is optional and skippable, "no finalized BoQ" is a normal state
(`OUTPUT_COPY.noBoqHeading` / `noBoqBlurb`), and the rest of the page works
without it.

**Fixture rule.** A fixture may stand in for a *picture* while a real asset is
missing; it must never stand in for an *approval*, a *count*, or a *cost*.
Step 4 now holds no fixtures at all — the invented render gallery
(3D_Model_v6/v7/v8), the invented 2D version, the four invented documents
(Project Brief.pdf, Structural Drawings.zip …) and the five invented costed BoQ
rows are all removed, along with the placeholder Blob that Download produced
when it could not find a real file. Where there is nothing, the page says so.

---

## 27. Downloads

Every file Step 4 offers is an authenticated backend asset, so nothing is built
in the browser. `outputDownloads.js` provides:

- `safeFileName` / `projectSlug` — name normalization
- `downloadAssetUrl` / `downloadAsset` — one authenticated asset
- `downloadBoqCsv` — `GET /step-3/versions/{id}/download-csv/`
- `downloadProjectArchive` — queue `POST /download-all/` with a scope, watch the
  job, download the asset it produced
- `generateBoqCsv` / `downloadText` — kept ONLY for the inspection modal, which
  exports exactly the rows on screen

The hand-rolled PKZIP 2.0 writer (`buildZipArchive`, `downloadProjectPackageZip`)
is DELETED. It assembled the package in browser memory from client-side state;
the backend creates real archives from the stored project files, so the package
is built where the files actually live and a large project is no longer limited
by a tab's heap. Do not reintroduce client-side zipping.

Download rules:

- A download is announced ONLY when a file was actually produced. Every download
  helper returns a boolean, and `downloadProjectArchive` returns false when a
  completed archive job produced no asset.
- Never save an unverified response as a file — an HTTP error body is not a
  floor plan.
- Never substitute generated placeholder content for a file the user asked for.
- Normalize every user-supplied name with `safeFileName` (no `/`, `\`, `..`, or
  empty names) and use `projectSlug` for filenames rather than an inline copy.
- The project's BoQ export is the BACKEND's rendering of the approved version,
  not a browser-side CSV of whatever rows are on screen.
- Re-queuing an archive scope that is already running returns that same job, so
  a second click joins the first archive rather than starting another.

---

## 28. Notifications

React Hot Toast. One notification system, one notification API.

**One global host.** `src/components/ui/KraiosToaster.jsx` renders the single
`<Toaster>`, mounted once in `src/main.jsx`. It serves public, auth, dashboard,
workflow, assistant and modal surfaces alike. Never render a second Toaster.

**Module split — do not undo it.** `KraiosToaster.jsx` exports ONLY components;
mixing helpers into a component module broke React Fast Refresh for every
consumer. `src/lib/toast.js` is the plain-JS API every caller uses:
`showSuccessToast` / `showErrorToast` / `showInfoToast` / `showLoadingToast` /
`dismissToast`, plus `TOAST_DURATION` and `toastKind`. No file outside those two
imports `react-hot-toast` directly.

**Presentation.** Top-right, inset from the viewport; below 1024 the stack clears
the mobile navigation bar. White surface, hairline border, `--radius-md`,
restrained shadow, 0.75rem body type, width capped so long copy wraps. Semantic
meaning is carried by a small icon badge and a 2px remaining-time rule — success
green, error red, info/loading KRAIOS blue. The surface is never filled with the
semantic colour. Styling lives in `src/styles/toast.css` (`.kraios-toaster` /
`.kraios-toast`) and in the component.

**Durations** live in `TOAST_DURATION`: success 3000ms, info 3500ms, error
4500ms, loading until resolved or dismissed. Do not pass ad-hoc timings per call
site.

**Duplicate prevention.** Pass a stable `{ id }` for anything a user can fire
repeatedly — a workflow gate, a rejected file, a blocked action, a retried
generation, a submitted auth form.

**One user-facing toast per event**, decided by the UI/action layer. A service or
helper returns or throws a structured failure; it does not raise a toast, and a
page must not toast the same failure a component already toasted.

**Modal or toast, never both** for the same event. Blocked access to a protected
route and an address that does not exist are answered by a modal ALONE. The same
holds for an expired session: `AuthContext` clears the session silently and the
caution modal is the notification.

**Form validation.** Transient validation copy is a toast, never an inline red
line. On submit: validate, prevent the submit, keep the invalid field styling,
focus the first invalid field, and raise ONE toast for the first
(declared-order) error. Never toast while the user types. Field-level state is
NOT optional — `aria-invalid`, required semantics, the invalid border and a
screen-reader-only message referenced by `aria-describedby` all remain. Never
leave a dangling `aria-describedby` id.

**Honest feedback.** Never announce success before the action succeeded. Never
surface a raw thrown `message`, fetch string or backend field name — API
failures reach the UI already normalized by `parseApiError`. No success toast for
small UI interactions (opening a dropdown or modal, selecting a render style or
document type, focusing a field).

Transient event feedback belongs in toasts. Persistent product states stay
visible in page UI — DESIGN APPROVED, BOQ READY, NO DOCUMENTS UPLOADED, NO
PROJECTS YET.

---

## 29. Buttons and loading state

`src/components/ui/PrimaryButton.jsx` is the one CTA component for the whole
product — public site, auth forms, modals, dashboard and workflow.

It owns the loading pattern. Pass `loading`:

- the button is disabled and gets `aria-busy="true"`
- the label/arrow wrapper stays in layout but becomes invisible, so width and
  height do not change
- a centred `CircleNotch` spinner is overlaid
- `loadingLabel` supplies the accessible name when children are not a string

Variants: `solid` (filled CTA) and `outline` (hairline sibling).
Sizes: `default`, `compact`, `sm`, `xs`. `as` renders it as a `label`, `a` or
`Link` where the control needs to be one.

Do not build a second button, a second spinner convention, or a per-page
"Submitting…" text swap. A submitting form also guards re-entry in its own
handler (`if (status === 'submitting') return`) — keep both.

---

## 30. Auth forms

Login, Signup, Forgot Password, Reset Password and the Profile modals share:

- `AuthShell` / dashboard surface presentation
- `FormInput` field semantics, including the password REVEAL control: a
  `type="password"` field gets the eye toggle automatically (the same one the
  Profile Reset Password modal uses), out of the tab order and with a real
  accessible name. Do not hand-build a second one per form.
- `PrimaryButton loading`
- one error toast per invalid submit, chosen by declared field order
- no inline red error line; the message goes to a screen-reader-only node

Login submits through `AuthContext.login` and navigates to
`location.state.from` (when it starts with `/dashboard`) or `/dashboard`.

Signup submits `{ name, firm, email, country, date, time }` with the date
normalized to `YYYY-MM-DD`, and opens the confirmation modal on success.

Never reintroduce "any email works" demo copy, and never claim an
authentication, an email or a persisted change that did not happen.

---

## 31. Country dropdown

`src/components/ui/CountryDropdown.jsx` is the country control. It is a custom
listbox, not a native select, and it is the only one — do not add a second
country input or a countries package.

Data lives in `src/lib/countries.js`:

- `countries` — 196 canonical English names, already sorted A–Z. Keep the array
  sorted; it is rendered in declaration order.
- `COUNTRY_ALIASES` — search-only aliases mapped to the canonical name (usa/us/
  america, uk/britain/england/scotland/wales, uae/emirates/dubai/abu dhabi, the
  Korea forms, holland, czechia, vatican/holy see, drc/dr congo, cape verde, the
  St. forms, and others). Aliases affect MATCHING ONLY — the selected value is
  always the canonical country string, and that is what the signup payload
  sends.
- `normalizeCountrySearchText` — strips diacritics, lowercases, flattens
  punctuation.
- `filterCountries` — ranks matches in tiers (exact, alias-exact, prefix, token
  prefix, substring, alias substring).

Behaviour to preserve: in-menu search input, tiered ranking, match highlight,
clear control, click-outside dismiss, and REAL keyboard navigation — ArrowUp /
ArrowDown move the active option, Enter selects it, Escape closes and returns
focus to the trigger. This control DOES have arrow-key navigation; the assistant
dropdowns (§32) do not. Do not copy the claim in either direction.

---

## 32. Custom dropdown rules

Custom KRAIOS dropdowns must visually match the current control family, select
exactly once per user action, close correctly, be keyboard/focus accessible, and
not claim keyboard behaviour that does not exist.

Selection is bound to `onClick` and to nothing else. Binding it to `onMouseDown`
as well ran it twice for one mouse press; if a duplicate ever reappears, remove
the second binding rather than suppressing the second call with a flag or a
timer.

Current keyboard reality for the assistant menus — `RenderStyleDropdown`,
`ViewAngleMenu` and `ProjectFilesPanel` — stated plainly so no comment
overstates it: the trigger is a real button (focusable, Enter/Space to open),
Escape closes the menu and returns focus to the trigger, and choosing an option
also returns focus there. Arrow-key roving focus over the option rows is NOT
implemented. Implement it properly or say it does not exist — and do not add a
third-party dropdown library.

---

## 33. Route integrity

Workflow state must belong to a real project. A direct URL with an invalid
`projectId` must not silently create a usable fake workflow session.

Implemented as `src/pages/dashboard/projects/RequireProject.jsx`, wrapping the
`ProjectWorkspace` route and all four assistant routes. It asks the store to
load the project — a cache read when the library has already listed it, one
`GET /projects/{id}/` when the address was opened directly — holds the surface
with the shared loader while that is in flight, and redirects (`replace`) to
`/dashboard/projects` when it fails. That is what makes a refresh ON a project
workspace work: the project is fetched again, not lost with the tab.

The three outcomes are read from the store's own request state rather than
mirrored into local state — one source of truth, and no setState inside an
effect to keep a copy of it in step. One error toast per rejected id, not one
per render.

Without the guard, an unknown id would mount the whole workflow and every stage
would fire its own request and show its own 404 — four failures for one missing
project. The per-project state hooks still return a shared frozen default for a
project that EXISTS but has not been read yet; the guard is what stops that
being reached with an id that does not exist.

Three cases, and they must never be confused:

- **A** — route EXISTS and is PUBLIC (`/login`) → render it, with no
  authenticated request.
- **B** — route EXISTS and is PROTECTED but there is no session
  (`/dashboard/profile`) → the red `AuthRequiredModal` from the dashboard
  boundary.
- **C** — route DOES NOT EXIST (`/banana`, `/dashboard/banana`,
  `/dashboard/projects/1/banana`) → the blue `NotFoundModal` from the router's
  `*` route.

Case C wins over case B structurally, not by a check anyone maintains: React
Router only matches the `dashboard` branch when one of its leaves matches the
whole path, so an unknown dashboard address never mounts `DashboardLayout`.

Route shape and project existence are separate questions.
`/dashboard/projects/999/upload` is a valid route shape; whether project 999
exists is `RequireProject`'s business. Do not answer a missing project with the
not-found modal, or a bad path with a redirect.

---

## 34. Responsiveness

Use ONE responsive implementation per component. Do not create
`DesktopDashboard` / `TabletDashboard` / `MobileDashboard`.

Use the existing CSS/Tailwind responsive system and the shared geometry in
`src/lib/dashboard/layout.js` — `DASHBOARD_GUTTER`
(`px-5 sm:px-7 lg:px-10 xl:px-12`) and `DASHBOARD_BODY_PADDING`. Every dashboard
page header and body uses that one scale so the left datum never shifts between
pages.

The dashboard sidebar appears at `lg` (1024); below that `DashboardMobileNav` is
the navigation.

Viewport widths to preserve/test when a responsive QA task is requested: 1920,
1440, 1366, 1280, 1024, 834, 768, 430, 390, 375, 360.

Do not claim those widths are visually verified unless they were actually
tested.

---

## 35. Scroll ownership

Avoid unnecessary nested scrollbars.

Valid internal scroll: the three assistant conversations, the BoQ table's
horizontal overflow, the country dropdown option list, the Output deliverables
tab strip, and the project workspace's middle stage zone.

Normal gateway pages and standard forms should use natural page/workspace layout
rather than nested scrolling caused by bad height constraints.

---

## 36. Motion

Use existing GSAP patterns, `useGSAP` with a `scope` ref, the shared
`DASHBOARD_MOTION` tokens, and `usePrefersReducedMotion` (every animated
component returns early when reduced motion is preferred).

Clean up timers, event listeners, GSAP timelines, object URLs and transient
resources.

Do not add heavy motion during maintenance work.

---

## 37. React performance

Do not blindly add `React.memo`, `useMemo` or `useCallback`. Optimize real
bottlenecks.

Prefer: correct state ownership, narrower high-frequency subscriptions, bounded
histories, effect cleanup, route-level code splitting, avoiding duplicate
expensive work, avoiding unnecessary artificial waits.

Current page-level route lazy loading must be preserved.

---

## 38. Known performance targets

- `ProjectsProvider` is broad and receives high-frequency assistant state
  updates.
- Canvas history is capped at 30 entries, but each entry is a full base64 PNG
  snapshot.
- Several UI/demo flows contain deliberate delays (enumerated in PROGRESS.md).
- Client-side ZIP packaging keeps project files in browser memory.

Do not redesign the UI while optimizing these.

---

## 39. Dead / unused code cleanup

Do not keep unused source indefinitely. Before deleting anything, verify once —
dynamic usage/import patterns can exist.

Note that the ESLint rule `no-unused-vars` uses
`varsIgnorePattern: '^[A-Z_]'`, so an unused PascalCase component import is NOT
reported — lint passing is not evidence that a component is used.

Removed during the project-API integration, all verified unreferenced first:

```
lib/dashboard/workflow/step-1/floorPlanGeneration.js   mock 2D generation
lib/dashboard/workflow/step-2/modelGeneration.js       mock 3D generation
lib/dashboard/workflow/step-3/boqGeneration.js         mock BoQ generation
lib/dashboard/workflow/step-3/boqDemoData.js           BoQ fixtures
lib/dashboard/workflow/step-3/boqDocuments.js          browser-blob documents
components/.../step-1/FloorPlanSourcePreview.jsx
components/.../step-4/PlansAndRendersSection.jsx
components/.../step-4/OutputPlanCard.jsx
components/.../step-4/FinalBoQSection.jsx
components/.../step-4/FinalBoQTable.jsx
components/.../step-4/UploadedDocumentsSection.jsx
```

Removed when `ProjectFilesPanel` replaced them, all verified unreferenced first:

```
components/.../step-2/assistant/FloorPlansDropdown.jsx
components/.../step-3/assistant/FloorPlans3DDropdown.jsx
components/.../step-3/assistant/UploadedDocumentsDropdown.jsx
components/.../step-3/assistant/DocumentTypeDropdown.jsx
```

PROGRESS.md records what remains.

Unused-code cleanup must not change visible UI.

---

## 40. Maintenance tasks must preserve UI

When the task is bug fixing, lint cleanup, performance optimization, state
correction, architecture cleanup, dead-code removal, dependency migration or API
integration, do not redesign the application unless the user explicitly asks for
visual changes.

Preserve layout, spacing, typography, colours, button appearance, icon
appearance, radius, page composition, existing responsive intent and existing
motion.

A maintenance refactor should ideally be visually indistinguishable from the
previous UI.

---

## 41. Lint / validation

Never write "lint passes" unless lint was actually run and passed on the current
source.

`npm run lint` runs `eslint .` against the flat config in `eslint.config.js`,
which lints `**/*.{js,jsx}` with BOTH browser and Node globals (so `api/proxy.js`
is covered and its `Buffer` usage no longer reports `no-undef`).

Fix the stale code a rule points at rather than silencing the rule. Do not add
`eslint-disable`, dummy references, `void unused`, or blanket `_` renames to get
a green run.

Do not claim production readiness solely from static source inspection.

---

## 42. Documentation

CLAUDE.md contains durable rules. PROGRESS.md contains current implementation
status. Do not turn either file into append-only history.

After a meaningful change: inspect final code, update the relevant current
section, remove stale/contradictory statements, and record only real validation
results.

Most important current facts:

- All four workflow stage UIs and all three assistant workspaces are implemented
  in the current source. Step 3 and Step 4 are not placeholders.
- The auth/profile API layer is a real cookie-based integration and is now
  genuinely enforced: the dashboard is reachable only after `POST /auth/login/`
  or `GET /auth/me/` succeeds. The dummy-identity bypass is gone — see the note
  in §9 and do not reintroduce it.
- **The project workflow is a real backend integration.** Projects, versions,
  conversations, approvals, documents, jobs and the deliverables bundle all come
  from `/api/v1/projects`. Project data PERSISTS across a refresh, ids are
  backend UUIDs, and progress is the backend's `workflow_state`.
- Every frontend generation mock and every Step 4 fixture is REMOVED. Nothing in
  the workflow fabricates a result, a count, an approval or a file any more.
- The AI pipelines themselves are not implemented on the backend yet: the Celery
  tasks return placeholder images and a placeholder BOQ table, with simulated
  progress. The API contract, persistence and job flow around them are real.
  Do not present a placeholder result as finished AI output — and do not add a
  frontend mock back to compensate for one.

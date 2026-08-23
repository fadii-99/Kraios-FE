# Kraios — Progress

Landing page plus the auth routes (Login, Forgot Password, Signup/Booking).

Legend: `[x]` done · `[~]` in progress · `[ ]` pending

> Status reflects what has actually been built and verified — nothing is marked
> done in advance.

---

## Page structure (final)

Tone rhythm alternates dark-blue and light:

| # | Section | Tone | id |
|---|---------|------|-----|
| — | Hero (left-aligned, video background) | dark navy | `home` |
| 01 | About Us | light | `about` |
| 02 | How It Works (2D → 3D → customize → download) | dark navy | `process` |
| 03 | Why Kraios | light | `why` |
| 04 | The Team | deep navy | `team` |
| 05 | Frequently Asked | light | `faq` |
| 06 | Contact — final CTA (no form) | light | `contact` |
| — | Footer | dark navy | — |

---

## G. Project card redesign + dashboard consistency pass (applied)

Dashboard-only. No landing-page, auth or public-navigation file was touched.

### Project card (`ProjectCard`) — rebuilt

- [x] Shows **only real project state**: id, name, `has3DRender`, `hasBoQ`.
      Removed the invented "ARCHITECTURAL SUITE" category, the created-date
      stamp and the "2/4 Complete" workflow meter — none of them were state
- [x] Name is the dominant element (`--font-display`, uppercase), clamped to two
      lines with its height reserved, so long names wrap instead of breaking the
      card and every card in a row stays aligned
- [x] Status is **one block, not two nested boxes**: two hairline-separated rows
      (icon · stage label · state). `Ready` in `--color-brand-deep` with a filled
      icon, `Not generated` in `--tone-muted-dark`. No invented success green
- [x] Icons from the existing Phosphor set, matching the workflow nav's family:
      `Blueprint` (project), `Cube` (3D rendering), `Calculator` (BoQ),
      `ArrowRight` (open), `Trash` (delete)
- [x] Plan band simplified — one measured unit, one dimension string, no
      crosshairs or survey marks. Radius 0 everywhere (was `rounded-lg`)
- [x] Action row: **Open project** takes the width and the accent;
      **Delete** is a neutral icon button beside it, restrained red on
      hover/focus only. Delete is a sibling of the link, never nested, so it
      cannot trigger navigation. It still opens the shared `Modal` confirmation
- [x] Hover is border + 2px lift + arrow shift. No shadow bloom, no zoom, no
      looping status animation
- [x] Grid: 1 column below 640px, 2 from 640px, **3 only from 1280px** — three
      cards at 1024 fell under ~260px once the sidebar took its width

### Dashboard consistency & responsiveness

- [x] `DashboardPageHeader` added — one eyebrow + `.display-product` title +
      optional right slot. Projects and Profile had been re-typing the same
      header with different padding, weights and a dead `label-ui` font-size
      override; both now use it, as do the two unlinked placeholder pages
- [x] `.display-product` adopted (it existed in `index.css` and was used
      nowhere): Inter 700 — the display scale has one weight — at
      `clamp(1.5rem, 2.6vw, 2.25rem)`, matching the size the titles already had
- [x] `ProjectStepNavigation` stacked below 640px. Both labels are
      `whitespace-nowrap`, so "3D Rendering" in a half-width column overflowed
      horizontally on phones. Spacers hide below `sm` (smallest possible fix —
      the design is otherwise unchanged)
- [x] `Models` / `Estimates` (unlinked placeholders) rebuilt on the shared
      header and the shared surface padding — they had been rendering flush to
      the surface edge with no gutter
- [x] Projects empty state squared off (`rounded-2xl` → hairline box) and its
      second line now says what to do instead of repeating the heading

### Cleanup / performance

- [x] Deleted dead files: `WorkspacePanel.jsx` (alias of `DashboardPageSurface`,
      imported nowhere), `WelcomeWorkflow.jsx`, `PlanAxonometric.jsx`
- [x] Removed the unused `DashboardBlueprintField` import from
      `WelcomeWorkflowCanvas` and the dead `[data-canvas-grid]` tween in
      `DashboardHome` — the field lives in `DashboardPageSurface`, outside that
      component's GSAP scope, so the selector matched nothing
- [x] Project grid entrance no longer re-runs over every card when one project
      is added or deleted; only not-yet-revealed cards animate
- [x] Project ids come from a monotonic counter instead of `projects.length`.
      Delete-then-create used to mint a duplicate id — and a duplicate React key

### Still not implemented (unchanged by this pass)

- [ ] Nothing flips `has3DRender` / `hasBoQ` yet — the stage pages are still
      placeholders, so every card reads "Not generated". The card is data-driven;
      the data source is what is missing
- [ ] Persistence, backend, API, real auth
- [ ] Upload, 3D rendering, BoQ generation, output/downloads
- [ ] Profile's subscription panel is placeholder content, not billing data

### Verification

Reviewed by reading the rendered structure and lint (`eslint` clean on all
dashboard paths). No build, no production build and no test run was performed —
those were out of scope for this pass.

---

## F. Dashboard product UI — Welcome, Projects, Create Project (applied)

The first designed pass over the logged-in application. Structure from section E
is unchanged; this is UI, plus the session-scoped project store the UI needs.

### Done

- [x] **Sidebar simplified** to Overview + Projects, Profile still pinned at the
      bottom. `3D Models` and `Estimates` dropped from the nav — they duplicated
      per-project stages as global pages. Their routes still resolve, unlinked
- [x] `src/lib/dashboard/currentUser.js` — the one placeholder identity
      (`{ name: 'User' }`); no name is hardcoded in JSX
- [x] `ProjectsProvider` + `projectsContext` — session-scoped project store
      (context + `useState`, no library, no backend, deliberately no
      localStorage). Mounted in `DashboardLayout` **outside** its Suspense
      boundary, or a route change would wipe the session's projects
- [x] **Welcome screen** (`/dashboard`) — white page surface inside the grey
      workspace, sized to one dashboard viewport. Editorial split down a
      hairline: greeting + `WELCOME, / USER` + CTA on the left rail, the
      four-stage setting-out line on the right. Corner ticks, accent rule,
      station marks; no photography, renders or stock art
- [x] `.display-app` added to the type scale for the user's name — `.display-lg`
      is `nowrap` at ≥1024 and would have clipped a two-word name mid-word
- [x] **BoQ reads as optional** via a plain "Optional" annotation — a word, not
      a colour and not a lock
- [x] **Create Project modal** — reuses the shared `Modal` (focus moved in,
      focus trap, Escape, focus restored to trigger, body scroll lock, all
      re-verified), one Project Name field, Cancel / Create, then a
      "Creating Project" state and a route to `/dashboard/projects`
- [x] **Projects page** — header + CTA, real empty state, and a responsive card
      grid once projects exist *(both revised in section G)*
- [x] **Project card** — first pass; **superseded by section G**
- [x] Touch targets: `touch:min-h-11` on sidebar nav items (coarse pointers
      only, so the desktop rail is unchanged); mobile drawer icon buttons 40→44px

### Explicitly NOT implemented

- [ ] Persistence of any kind — projects live in memory and are gone on refresh
- [ ] Backend, API, auth (Login still simulates and routes to `/dashboard`)
- [ ] Real upload, 3D rendering, BoQ generation, output/downloads
- [ ] Project status — the card reads `has3DRender` / `hasBoQ`, but no stage
      writes them yet, so they are `false` for every project
- [ ] BoQ skip and re-entry behaviour (architecture allows it; no UI yet)
- [ ] The four workflow step pages remain the section-E placeholders

### Verified (production build, headless Chrome)

| Check | Result |
|---|---|
| Journey: login → Welcome → Create Project → Projects → card → workspace → all 4 stages | pass |
| Modal: focus into dialog, Tab wraps, Escape closes, focus restored, scroll locked | pass |
| Empty submit blocked with `role="alert"` + `aria-invalid` | pass |
| Grey workspace `rgb(244,246,248)` on every dashboard page; Welcome panel white | pass |
| Welcome fits one viewport: 1920×1080 · 1600×900 · 1512×982 · 1440×900/800 · 1366×768 · 1280×800/720 · 1152×720 · 1024×768 | no scroll at any |
| Horizontal overflow at 1440/1280/1024/768/430/390/375/320 | none |
| Panel gutters symmetric at mobile widths (20px each side) | pass |
| Heading order h1 → h2 → h3; all SVGs decorative or labelled | pass |
| Reduced motion — content lands at full opacity | pass |
| CTA `rgb(11,94,215)` on light ink | pass |
| Console errors/warnings across the journey | none |

---

## E. Project workflow — structural foundation (applied)

The empty rooms and hallways of the logged-in application. **Architecture only —
no workflow functionality was built.**

### Done

- [x] `src/pages/dashboard/projects/` — `ProjectWorkspace`, `UploadStep`,
      `RenderingStep`, `BoQStep`, `OutputStep`
- [x] `src/components/dashboard/projects/` — `ProjectWorkflowNav`,
      `StepPlaceholder`, `CreateProjectDialog`
- [x] `src/lib/dashboard/projectWorkflow.js` — the four stages declared **once**
      (id / number / label / segment) plus `projectStagePath()`. No status model
- [x] Dynamic route `/dashboard/projects/:projectId` in the existing
      `createBrowserRouter` — no second router, no `BrowserRouter`
- [x] `ProjectWorkspace` is a parent shell: back link + project context +
      `ProjectWorkflowNav` + `<Outlet />`. The nav is never repeated in a step page
- [x] Index route redirects to `upload` via `<Navigate replace />` in the route
      config — not a `useEffect`
- [x] All four stages are **siblings**; Output is not nested under BoQ and not
      gated on it, so a future skip-and-return-to-BoQ stays possible
- [x] `ProjectWorkflowNav` is route-aware via `NavLink` — no `activeStep` state.
      Exactly one `aria-current="page"` per route, verified on client-side nav
- [x] Mobile: the nav row scrolls inside its own container, so four steps never
      widen the page at 320px
- [x] Page-level `React.lazy` for all five new pages; a nested `Suspense` in the
      workspace keeps the workflow nav mounted while a step chunk loads.
      `DashboardFallback` extracted from `DashboardLayout` so both share it
- [x] Minimal Create Project demonstration: name field only → "Creating
      project…" → `/dashboard/projects`. Reuses the existing `Modal`,
      `FormInput` and `PrimaryButton`
- [x] `DashboardHome` and `Projects` pared back to minimal; `Projects` carries a
      single `project-001` route-testing link, not a project card
- [x] Global sidebar untouched — workflow steps are local to a project
- [x] `npm run lint` clean · `npm run build` succeeds

### Explicitly NOT implemented

- [ ] Project persistence (no backend, no API, no localStorage — nothing is stored)
- [ ] Real file upload / 2D plan processing
- [ ] 3D rendering, viewer or AI integration
- [ ] BoQ generation, tables or pricing
- [ ] BoQ skip functionality (architectural allowance only)
- [ ] Project status / stage-state logic
- [ ] Output, download or export functionality
- [ ] Final UI for the Projects list, Dashboard welcome, or any of the four steps

### Removed during this pass

An earlier uncommitted draft had overbuilt ahead of the brief: `mockProjects.js`
(three realistic fake projects), `ProjectCard.jsx`, `ProjectStepBadge.jsx`, a
`canNavigateToStage()` gating engine and a next-step-suggesting project
overview. All deleted — the gating engine in particular contradicted the rule
that stages stay independently addressable.

### Verified (production build, headless Chrome)

| Check | Result |
|---|---|
| `/dashboard`, `/dashboard/projects` render | pass |
| `/dashboard/projects/project-001` redirects to `…/upload` | pass |
| Direct URL to `…/upload`, `…/rendering`, `…/boq`, `…/output` | all render |
| Sidebar + workflow nav mounted on every step route | pass |
| Only the step content changes between stages | pass |
| Exactly one correct `aria-current="page"` per stage | pass |
| Login → `/dashboard` → Create Project → `/dashboard/projects` | pass |
| Projects → project-001 → upload | pass |
| BoQ → Output → back to BoQ (re-entry) | pass |
| Horizontal overflow at 1440/1280/1024/768/430/390/375/320 | none |
| Console errors or warnings during the full flow | none |

---

## D. Dashboard Foundation — Light Theme (applied)

Initial after-login application workspace structure and routing foundation.

### Architecture & Routing
- [x] Dedicated `DashboardLayout` in `src/layouts/DashboardLayout.jsx` (Light theme, no public Navbar/Footer)
- [x] Dashboard folder structure separated from marketing components:
  - `src/components/dashboard/` — `DashboardSidebar.jsx`, `DashboardNavItem.jsx`, `DashboardMobileNav.jsx`
  - `src/pages/dashboard/` — `DashboardHome.jsx`, `Projects.jsx`, `Models.jsx`, `Estimates.jsx`, `Profile.jsx`
  - `src/lib/dashboard/` — `dashboardNavigation.js` (central navigation config)
- [x] Nested routes added to `src/router/router.jsx`: `/dashboard`, `/dashboard/projects`, `/dashboard/models`, `/dashboard/estimates`, `/dashboard/profile`
- [x] Route-level lazy loading with `React.lazy` on all 5 dashboard page chunks
- [x] Login submission connected to navigate to `/dashboard` upon simulated completion

### UI & Styling
- [x] **Light Theme** workspace: `#F4F6F8` neutral background, white content surfaces, dark navy `#071426` text, strategic brand-deep blue accents (`#0B5ED7`)
- [x] **Thin / Compact Sidebar** on desktop (208px–224px / `w-52` to `xl:w-56`), white surface, hairline right border
- [x] Kraios brand logo at top of sidebar
- [x] 4 Primary tabs (Overview, Projects, 3D Models, Estimates) with Phosphor icons & active indicator states
- [x] Dedicated Profile item at sidebar bottom (`/dashboard/profile`)
- [x] Responsive mobile/tablet header (<1024px) with light-theme slide-over navigation drawer
- [x] Structural placeholder pages with architectural headers and clean layout frames (no fake metrics)

---

## C. Client content v2 — Kraios (applied)

Content and branding pass over the approved build. **No layout, animation,
routing, breakpoint or component redesign** — everything below is copy, data and
the two routing changes the new CTAs require.

### Branding

- [x] Brand is **KRAIOS** everywhere in the DOM — navbar mark `aria-label`,
      oversized footer wordmark, footer legal line, loader/auth labels
- [x] `site.name` / `site.tagline` are the single source; footer strap now reads
      **KRAIOS | FROM BRIEF TO ESTIMATE**
- [x] "Floor"/"FLOOR STUDIO" gone from all `src/` and `index.html` copy
- [x] Product terminology **kept**: floor plan, 2D floor plan, 3D floor plan
- [ ] **"FLOOR STUDIO" still baked into the plan SVG title blocks** — see below

### Positioning

- [x] Agency language removed — no "send us", "share your files", "tell us what
      you need", "we'll build it for you"
- [x] "photoreal / photorealistic" removed from meta description and all copy
- [x] Copy reframed as self-serve SaaS: the user uploads, iterates and exports
      inside the platform, with their own login

### SEO / meta (`index.html`, existing Vite setup — no SEO library added)

- [x] Title → `Kraios — From Brief to Estimate | AI Design Partner for Architecture Firms`
- [x] Description → the client's BoQ one-liner
- [x] `theme-color` `#071426` (already correct, left alone)

### Sections

- [x] **Navigation** — Home · About · How It Works · **Why Kraios** · Team · FAQ ·
      Contact. Ids unchanged, so scroll-spy, smooth scroll and cross-route
      scrolling all still work. Log In / Sign Up unchanged
- [x] **Hero** — new eyebrow, two-line `FROM BRIEF / TO ESTIMATE.`, new
      paragraph. Primary CTA **Sign Up** now *routes* to `/signup` (was a scroll);
      secondary **See How It Works** still scrolls to `#process`
- [x] **About** — new paragraph; stats now Established 2026 · Headquarters Dubai,
      UAE · Plans Delivered 20+ · Markets Served 5+. Same editorial `<dl>`, no
      stat cards introduced
- [x] **How It Works** — all four steps rewritten to the platform workflow
      (upload → 3D model → materials/quantities/pricing → export BoQ), chips
      updated. Sticky/crossfade behaviour untouched and verified in sync
- [x] **Why Choose Us → Why Kraios** — heading, eyebrow, nav label and all four
      benefits replaced. Kept the editorial split + framed visual; icons remapped
      to match the new benefits (Phosphor, same size/weight/container). Not
      converted into SaaS cards
- [x] **Team** — Michel Abourizk, Jad Soubra, Hammad Rizwan + collective
      "The Build Team / Engineering & AI" fourth slot. The bio row is now
      conditional so the collective entry renders no empty gap
- [x] **FAQ** — 12 client items, three-line desktop heading kept, accordion
      behaviour untouched
- [x] **Contact → final CTA** — `SEE IT ON YOUR / NEXT PROJECT.` + paragraph +
      **Sign Up** (primary) and **Schedule a Session** (secondary), both real
      `<Link>`s. The generic project-enquiry form was **removed** and
      `ContactForm.jsx` deleted
- [x] **Footer** — brand strap updated; the placeholder note replaced with the
      client's own product line

### Auth pages (copy only — architecture untouched)

- [x] `/signup` fields are now **Name · Firm · Email · Country** plus the
      existing date + time pickers; submit is "Schedule Session"; confirmation
      modal reads **"Booked. A calendar invitation is on its way."**
- [x] `/login` description and the "no account yet" line de-agencied
- [x] `you@studio.com` → `you@firm.com`; the fake-person placeholder replaced

### Open item — both final CTAs share one route

`Sign Up` and `Schedule a Session` both point at `/signup`, because `/signup` is
the only account/session route that exists and no account backend was invented
for this pass. They should diverge once a real account-creation flow lands.

---

## R. Router architecture

- [x] `react-router-dom` with **`createBrowserRouter`** (not BrowserRouter/Routes/Route)
- [x] Single router in `src/router/router.jsx`
- [x] Parent layout `src/layouts/AppLayout.jsx` = `<Navbar />` + `<Suspense><Outlet /></Suspense>` + `<Footer />`
- [x] Navbar and Footer render **once**, from the layout — no page mounts its own
      (the Footer moved out of `Home`, so auth pages get it too)
- [x] Child routes: `/` (index) · `/login` · `/forgot-password` · `/signup`
- [x] The landing page is a child route of the same layout
- [x] `main.jsx` renders `<RouterProvider />`; `App.jsx` and `LandingPage.jsx` removed

### Lazy loading

- [x] `React.lazy` on all four pages, `Suspense` around the Outlet
- [x] Confirmed separate chunks in the production build:
      `Home` 86.9kB · `Signup` 15.1kB · `ForgotPassword` 4.2kB · `Login` 2.5kB
- [x] Reusable components are deliberately **not** lazy

### PageLoader

- [x] **Light theme** — `#F4F6F8` surface, `#1677FF` outlined floor-plan icon,
      dark-navy label. Never dark, never black
- [x] Blueprint grid behind it (two hairline scales, radially masked so it fades
      at the edges and never competes with the icon)
- [x] The plan draws itself via `stroke-dashoffset` — pure CSS, so no JS runs
      while a chunk is in flight
- [x] **Full-screen overlay**: `position: fixed`, `inset: 0`, `z-index: 70`,
      opaque. The Navbar and Footer sit outside the Suspense boundary, so an
      in-flow loader previously left the footer visible during a refresh
- [x] **Real fade-out**: the overlay is not the Suspense fallback — a fallback is
      unmounted synchronously, leaving nothing to animate. It stays mounted and a
      `RouteReady` sentinel inside the boundary flips it, so it fades over 500ms
      and goes `pointer-events: none` + `aria-hidden`
- [x] **Verified mid-flight** (1500ms latency, cache disabled): `position: fixed`,
      `inset: 0px`, `z-index: 70`, background `rgb(244,246,248)`, covers the
      viewport, and hit-testing at the footer's position returns the loader —
      the footer is fully covered. After load: `opacity: 0`, transition on opacity

### Navigation behaviour

- [x] Navbar `LOG IN` → `/login`, `SIGN UP` → `/signup` (desktop and mobile menu)
- [x] Landing-section links still scroll when already on `/`
- [x] From an auth page they route home first, then scroll — the target rides in
      `location.state.scrollTo` and `Home` scrolls after two frames, once the
      sections have mounted; the state is then cleared so refresh doesn't re-scroll
- [x] Scroll-spy receives an empty id list off `/` (no sections to observe)
- [x] **Every navigation starts at the top** — `useScrollToTop()` in `AppLayout`.
      React Router preserves scroll across routes, so "Sign Up" from halfway down the
      landing page landed mid-way down the auth page. Skips the first render (so a
      refresh keeps browser scroll restoration) and skips when the navigation carries
      `state.scrollTo` (that is the section-link flow, which does its own scrolling).
      Verified: from scrollY 3992, clicking Sign Up lands on `/signup` at scrollY 1,
      while a footer "Team" click from `/signup` still reaches `/` at scrollY 6215
      with Team at the top of the viewport

### Navbar per route

- [x] **Two states only**, driven by `overHero = onHome && !scrolled`:
      transparent + `tone-dark` over the hero video, light `tone-light` surface with
      dark ink everywhere else. The old navy-on-scroll state is gone — the landing
      page and the auth routes now share one scrolled bar
- [x] **Auth pages**: never transparent; the hero veil is not rendered
- [x] Nav links, hamburger and the Sign Up button all read `--tone-*` /
      `--btn-*`, so one component serves both bars
- [x] **Verified by measurement** — at the top of the hero the bar is
      `rgba(0, 0, 0, 0)` with `rgb(159,178,203)` links; scrolled it is the light
      surface with `rgb(74,90,110)` links, byte-identical to the auth bar
- [x] **Verified** — from `/forgot-password`, clicking `Team` landed on `/` at
      scrollY 6215 with the Team section at the top of the viewport

## A. Auth pages

- [x] `AuthShell` — shared light architectural background (`BlueprintBackdrop`)
      + centred white card with a subtle border and shadow
- [x] Short entrance only (card → head → body). No scroll animation on auth pages
- [x] **Login** — `WELCOME BACK` / `LOGIN`, email + password, Forgot Password link
- [x] **Forgot Password** — `ACCOUNT RECOVERY` / `FORGOT PASSWORD`, email,
      `SEND RESET LINK`, success modal
- [x] **Signup / Booking** — name, email, calendar, time slots, `SEND REQUEST`,
      success modal showing the chosen slot. **No password fields**, by design

### Calendar & booking

- [x] Custom light-theme `CalendarPicker` — month navigation, Monday-first grid,
      past dates disabled, today marked, selected state in brand blue
- [x] Every day is a real `<button>` with `aria-pressed` and a full-date `aria-label`
- [x] Six placeholder time slots in `content.js` → `booking.timeSlots`, each
      supporting `disabled` so API data drops straight in
- [x] Live "Selected" summary of the chosen date and time
- [x] Fixed: unselected days rendered **no** `aria-pressed` — `value && …` returns
      `null` and React omits null attributes, so they stopped reading as toggles

### Reusable components

- [x] `FormInput` — label, name, type, placeholder, value, onChange, onBlur,
      required, disabled, error, autoComplete; used by Contact **and** all auth pages
- [x] `PrimaryButton` — one CTA for the whole site, loading state, arrow motion
- [x] `Modal` — Escape to close, focus moved in and restored to the trigger,
      Tab cycled inside the panel, body scroll locked, animated. Never `alert()`
- [x] Old `Field.jsx` and `Button.jsx` deleted; nothing duplicates their styles

### CTA hover fix

- [x] The Contact button no longer turns white on hover. `--btn-bg` /
      `--btn-bg-hover` are per-tone and both stay blue:
      light `#0B5ED7 → #0E4FA8` (5.57 → 7.41), dark `#3B91FF → #5CA5FF` (5.79 → 7.17)
- [x] `#1677FF` is never a fill — white on it is 3.92:1, dark ink 4.43:1, both fail AA

### Verified in a real browser

| Check | Result |
|---|---|
| All four routes render, exactly one navbar each | pass |
| Lazy chunks fetched per route | pass |
| Client-side nav (no full reload) | pass |
| Empty submit blocked, `aria-invalid`, focus to first invalid | pass |
| Modal `role="dialog"` + `aria-modal`, focus inside, body locked | pass |
| Escape closes and restores scroll | pass |
| Calendar: 31 days, 24 enabled, past disabled | pass |
| Date + time select → summary "Tuesday, August 11, 2026 · 09:00 AM" | pass |
| Signup success modal shows the chosen slot | pass |
| CTA computed background `rgb(11,94,215)` (blue, not white) | pass |
| No horizontal overflow at 1440 / 1280 / 768 / 375 | pass |
| Console errors | none |

- [ ] Not wired to a backend — Login, Forgot Password and Signup all simulate

## 0. Foundation

- [x] Vite 8 + React 19 + JavaScript scaffold
- [x] Tailwind CSS v4 via `@tailwindcss/vite` (CSS-first config, no JS config file)
- [x] ESLint flat config, `@/` alias
- [x] GSAP + ScrollTrigger + `@gsap/react`
- [x] Phosphor icons
- [x] Self-hosted fonts: Archivo (display), Inter (body), JetBrains Mono (labels)
- [x] Design direction via ui-ux-pro-max (Swiss Modernism 2.0 + Editorial Grid)
- [x] Design system persisted to `design-system/floor/MASTER.md`
- [x] Dark-blue palette contrast-validated (found 3 failing pairs — documented in CLAUDE.md)
- [x] Tone system (`tone-dark` / `tone-deep` / `tone-light`) driving all components
- [x] `CLAUDE.md` permanent project rules

## 1. Navbar

- [x] Dummy logo, smooth scroll, header offset
- [x] Seven links: Home · About · How It Works · Why Us · Team · FAQ · Contact
- [x] **Log In** (ghost) + **Sign Up** (accent fill) on the right
- [x] Transparent over hero (veil capped at 30%); solid navy after scroll
- [x] Scroll-spy active link across all seven sections
- [x] GSAP entrance (drop-in + staggered items)
- [x] Full-screen mobile menu with the same links + auth buttons, scroll lock, Escape
- [x] Keyboard accessible, visible focus rings
- [x] Log In / Sign Up point at the real `/login` and `/signup` routes via
      `authLinks` in `content.js` (superseded the old scroll-to-contact placeholder).
      Still no auth **backend** — both pages simulate.
- [ ] "Start a Project" button was dropped from the bar to make room for the auth
      pair; the CTA still appears in the hero and contact section

## 2. Hero

- [x] **Footage now carries the product.** The old clip was generic. It is now an
      architect's desk holding 2D drawings, a physical 3D model and a stack of navy
      blueprints — plan and model in one frame, which is the 2D→3D story. Fallback is
      a dark-navy plan sheet, the closest clip to the brand palette
- [x] **The poster is a frame cut from the video itself** (t=0.4s), so the hand-off
      from poster to footage is invisible instead of a jump cut between two unrelated
      images. Local `hero-poster-1600.jpg` (83kB) / `-768.jpg` (31kB), which also
      drops one third-party dependency
- [x] Verified playing on the real page at 1440 and 390: `readyState 4`,
      `duration 8.96`, `currentTime` advancing, no media error, opacity 1
- [x] Video fades in on `canplay`; poster shows if the CDN is blocked
- [x] **Left-aligned** composition — copy sits over a left scrim, not a blanket overlay
- [x] Overlays cut right down (0.14–0.5 vertical) so the footage stays the subject
- [x] ALL-CAPS headline sized to its column rather than filling the frame
- [x] White pill primary CTA + circular play-icon secondary
- [x] Floating 3D preview card (bottom right, ≥1280px)
- [x] Navbar fully transparent over the hero; veil reduced to 30%
- [x] Cinematic entrance: video scale, masked line reveal, staggered CTAs, card slide-in
- [x] Bottom rail: scroll cue + credential line
- [x] Verified playing (`readyState 4`, `currentTime` advancing)

## 3. About Us

Pared back to essentials on request:

- [x] Light band with the shared `BlueprintBackdrop`
- [x] `01 ABOUT US` index + label, matching every other section header
- [x] One-line `ABOUT US` heading at the shared size
- [x] Paragraph left, studio credentials flush right (values bold, larger),
      lifted so the block's centre lines up with the paragraph's
- [x] Masked heading reveal + staggered copy
- [x] Removed on request: the statement line, the four icon cells, and the
      draggable plan gallery (`PlanSlider.jsx` deleted, its content data too).
      `public/assets/plan-2d-light.svg` is kept for future use.

## 4. How It Works (merged process section)

- [x] Replaced the old separate "2D/3D Showcase" + "How It Works" — now ONE section
- [x] Four steps: Upload 2D → Get Your 3D Floor → Customize → Download
- [x] Desktop: CSS-sticky visual, image swaps per active step
- [x] Oversized step number + meta over the visual
- [x] Scroll-driven progress ticks
- [x] Image always matches the step content
- [x] Tablet/mobile: stacked sequence with per-step wipes, no pinning
- [x] Sticky images load eagerly (a lazy fetch left the active layer blank)

### Step visuals — reworked so each matches its own heading

| Step | Was | Now |
|---|---|---|
| 01 Upload 2D Floor Plan | `plan-2d-primary.svg` — dark sheet | **`plan-2d-light.svg`** — white drafting sheet, black walls, blue dimension strings |
| 02 Get Your 3D Floor | `plan-3d-primary.svg` — dark wireframe axonometric | **`plan-3d-light.svg`** — light furnished 3D render of the same unit |
| 03 Customize Your Space | Unsplash furnished interior | unchanged — it already matched the heading |
| 04 Download Floor Plans | Unsplash **interior** — a near-duplicate of step 03 | **Unsplash printed plan sheets** — the delivered set |

- [x] Steps 01 and 02 now show **the same apartment**, which is what the copy
      already claimed ("derived from your original plan so the two never
      disagree"). `plan-3d-light.svg` is generated by projecting the 2D drawing's
      own room and wall coordinates through a dimetric transform, so the two
      drawings cannot drift apart.
- [x] 3D render: low dollhouse walls, per-room floor tones, wood counters, a sofa
      built from arms/back/seat, beds, wardrobe, bath fixtures, rugs painted with
      the floors (centroid sorting would otherwise let a rug paint over the coffee
      table standing on it), blue glazing, halo'd room labels, and a matching
      `DRAWING 3D-104` title block
- [x] `plan-2d-light.svg` re-framed to a 4:3 viewBox with even margins. At its
      native 1.6:1 the `aspect-4/3` `object-cover` box cropped ~133px off each side
      and cut the left dimension string off the drawing. Drawing coordinates are
      unchanged — only the viewBox and the two sheet-background rects moved.
- [x] Verified in the real component at 390px and 1440px: all four visuals render,
      nothing is cropped, and the 2D keeps both dimension strings
- [x] Desktop image weight unchanged at **5 requests / 365kB** (the two SVGs
      transfer at 2kB and 4kB). No horizontal overflow and a clean console at all
      eight widths; lint and build pass
- [ ] `plan-2d-primary.svg`, `plan-3d-primary.svg` and `plan-2d-detail.svg` are now
      unused. Kept for the dark-band variants a future section may want

## 5. Why Choose Us

- [x] Light band with the shared `BlueprintBackdrop`
- [x] Two columns from the top: header + visualization left, benefits right,
      running alongside the heading rather than below it
- [x] Left rail is **6 columns, not 5** — at the shared heading size
      "WHY CHOOSE US" needs ~532px and was being silently clipped in a 5-col rail
- [x] Benefits start at column 7 (no empty column between the halves)
- [x] Framed 3D architectural visualization — offset mat rule + corner ticks
- [x] Four boxed benefits: hairline border, blue icon tile, title, description
- [x] No numbering, no hover effects (kept deliberately quiet)
- [x] Signature move: each box lifts in → icon settles → copy rises

## 6. Team

- [x] Four members, large editorial portraits
- [x] Staggered vertical offsets, not a card grid
- [x] Clip reveal + scale-down settle, differential column drift
- [x] Hover: grayscale→colour, scale, accent rule, name/role shift

## 7. FAQ

- [x] Six questions covering upload, 3D delivery, customization, revisions,
      download formats and timing
- [x] Accessible accordion: `aria-expanded` + `aria-controls` + `role="region"`,
      real `<button>` inside `<h3>`
- [x] Only one item open at a time
- [x] GSAP height animation, exit faster than enter; plus icon rotates 45°
- [x] Deliberately restrained motion — label/heading/copy only, no per-row slide
- [x] **Verified functionally** — click opens exactly one panel, Enter and Space
      both toggle from the keyboard, focus lands on a native button

## 8. Contact

- [x] Deliberately the simplest section: **centred** label → heading →
      one paragraph, with the form directly beneath it. Nothing else.
- [x] Same light band and `BlueprintBackdrop` as Why Choose Us / About / FAQ
- [x] Contact detail rows removed — phone, email and address still live in the
      footer, so nothing is lost
- [x] Fields: Name, Email, Project Details — **boxed** inputs, sharp corners,
      tone-aware surface (`--field-bg`)
- [x] Real `<label>` per field, no placeholder-as-label
- [x] Blur validation, inline errors, `role="alert"`, "Error —" prefix
- [x] Focus moves to first invalid field on submit
- [x] Loading → success states; arrow steps forward on button hover
- [x] Understated direct contact rows (no icon tiles — kept plain here)
- [x] **Verified functionally** — all three fields labelled, 54px/128px touch
      targets, empty submit blocked with focus on the first invalid field and
      three `role="alert"` messages, valid submit reaches the success state
- [ ] Frontend only — not wired to a backend yet (by design)

## 9. Footer

- [x] Oversized wordmark, nav links, email/phone, dynamic-year copyright
- [x] **Fake links removed.** The "Services" column listed 2D Floor Plans / 3D
      Visualization / Site Plans / Walkthroughs — four links that all scrolled to
      `#about`. Replaced with **Sections** (the 7 real landing sections) and
      **Account** (`/login`, `/signup`, real routes). Verified: 0 dead links
- [x] Copy is now openly generic — `hello@example.com`, `+1 (000) 000 0000`, a
      placeholder description. The invented San Francisco address, the
      `studio@floor-visual.com` address and "Est. 2016" are gone: details that look
      real are the ones that ship unnoticed
- [x] Uses the shared `Logo` component, so navbar and footer can never drift

## 9b. Brand logo

- [x] Supplied `public/assets/website_logo.png` replaces the old inline SVG glyph in
      `ui/Logo.jsx`, so it appears in **both** the navbar and the footer
- [x] Confirmed the PNG carries real transparency (61.4% fully-clear pixels, alpha-0
      corners) before shipping it — it has to sit on the navy footer, the light auth
      bar and the hero video
- [x] **Served at 128px, not 1192px.** The original is 342kB for a mark that renders
      at 28px. `website_logo-128.png` is 13.6kB — a 96% reduction. The original is
      kept as the source; regenerate the derivative when the logo changes

## 10. Animations

- [x] Every section has its own signature move (no repeated treatment)
- [x] Masked heading reveals, clip-path image reveals, staggers, parallax
- [x] Scroll-driven progress, sticky story sequence, hover micro-interactions
- [x] All GSAP scoped via `useGSAP` — auto cleanup
- [x] `fromTo` everywhere (a bare `from` once stranded the hero invisible)
- [x] `prefers-reduced-motion` honoured globally
- [x] `ScrollTrigger.refresh()` after fonts + load

## 10b. Heading rule

Every section heading uses **one size** — About, How It Works, Why Choose Us,
Team, FAQ and Contact are identical: `clamp(3rem, 6.2vw, 6rem)` at ≥1024px
(63px at 1024, 89px at 1440, 96px at 1920).

Each holds **one line** on desktop/laptop (`white-space: nowrap` at ≥1024px).
**FAQ is the only exception** — `FREQUENTLY / ASKED / QUESTIONS` stays a
three-line stack via `.display-lg--stack`, which now changes stacking only, not
size.

Headings sit in full-width rows so they have room. This matters: at the shared
size, `WHY CHOOSE US` measured 532px inside a 501px five-column rail and was
being **silently clipped** — `Section` uses `overflow-x-clip`, so an
overflowing nowrap heading never triggers page overflow. It was moved to a
full-width row. Verified by measuring real text width (via `Range`) against
available width at 1024 / 1280 / 1440 / 1920 — all six sections fit at every
breakpoint.

The intro paragraph sits **under the heading on the left** in every section.

## 10c. Section backdrop

`BlueprintBackdrop` is shared by About, Why Choose Us, FAQ and Contact so the
light bands read as one family: blueprint grid, dot grid, dimension strings,
registration marks and crosshairs, all inheriting `currentColor` at very low
opacity. Layers carry `data-bp-layer` and parallax at different rates. A
`compass` variant adds a rosette and an axonometric wireframe floor.

## 11. Responsive — verified by measurement

Measured in headless Chrome over CDP against the **production build**, at every
required width. Each pass scrolls the whole document so lazy media and every
ScrollTrigger fire, then reports overflow, clipped text and undersized targets.

| Width | scrollWidth / clientWidth | Overflow | Clipped headings | Console |
|---|---|---|---|---|
| 1440 | 1440 / 1440 | none | none | clean |
| 1280 | 1280 / 1280 | none | none | clean |
| 1024 | 1024 / 1024 | none | none | clean |
| 768 | 768 / 768 | none | none | clean |
| 430 | 430 / 430 | none | none | clean |
| 390 | 390 / 390 | none | none | clean |
| 375 | 375 / 375 | none | none | clean |
| 320 | 320 / 320 | none | none | clean |

- [x] Fluid type via `clamp()`
- [x] Pinning/sticky disabled below 1024px
- [x] Touch targets ≥ 44px **on touch devices** — measured with CDP touch emulation:
      at 320 / 390 / 768 the only sub-44px control left is the `sr-only` skip link,
      which expands on focus. At 1440 with a mouse the bar is byte-identical to before.
- [x] Mobile menu at 320/390: opens, 28px items, 70px rows, fits the viewport,
      nothing clipped, no page overflow
- [x] Reduced motion: full scroll-through at 1440 and 390 leaves **zero** elements
      under full opacity — content always lands final, never invisible
- [ ] Real-device testing (verified in Chromium headless only)

## 11b. Responsive + performance audit

### Defects found and fixed

**1. Section-heading size overrides were silently ignored (the big one).**
`.display-*` are hand-written in `@layer utilities`, so Tailwind emits them after its
generated utilities and they win at equal specificity. Three components carried
`display-lg` **plus** a `text-[clamp(…)]` override, and every one of those overrides did
nothing:

| Where | Intended | Actually rendered @1440 | Result |
|---|---|---|---|
| Process step titles | ~46px | **89.28px**, `nowrap` | `scrollWidth` 821 in a 614px rail — "Download Floor Plans" was **cut off mid-word** |
| Auth page `h1` | ~44px | **89.28px** | wrapped to 2 lines / 161px inside the card |
| Mobile menu items | ~30px | **44px** | seven oversized rows crowding the panel |

All three now use `.display-sm`, the sub-display tier that already existed in the scale
(and was previously dead code). Verified after: step titles 48px @1440 / 28px mobile,
all four `fits: true`; auth `h1` 48px @1440 on a single 46px line.

This is the **only intentional change to desktop appearance** — the previous rendering
was losing text off the edge of the screen.

**2. Hero headline clipped at 320px.** `.display-xl`'s `2.75rem` floor stops shrinking
below 667px while the column keeps narrowing: "FROM FLOOR PLANS" measured 317px inside a
280px column and the hero's `overflow-hidden` clipped it. A `max-width: 400px` rule takes
over at `11vw`, which resolves to exactly `2.75rem` at 400px — continuous with the clamp,
so **nothing changes at ≥400px**.

**3. Footer section links did nothing on the auth routes.** `Footer` called
`scrollToSection` directly; off `/` there is no such element and it returned silently.
Navbar already solved this, so the logic moved into `useSectionNavigate()` and both use
it. Verified: from all three auth routes, footer "Team" now lands on `/` at scrollY 6215
with Team at the top of the viewport.

**4. Sub-44px touch targets.** The wordmark (22.5px) and all 13 footer link/contact rows
(22.5 / 19px). Fixed with a new `touch:` variant (`@media (pointer: coarse)`) so desktop
is untouched.

### Performance work

- **Responsive images.** Every hotlinked photo now ships a `srcSet` built by `USet()` in
  `content.js`, plus a `sizes` string.

  | | Before | After |
  |---|---|---|
  | 390px, cold cache | 5 requests at desktop resolution (1920w poster, 1400w photos) | **5 requests, 86kB** (640w poster, 420w photos) |
  | 1440px | 698kB | **364kB** |

  The desktop sticky image and the inline tablet/mobile image deliberately share one
  `sizes` string (`PROCESS_SIZES`), so they still resolve to the same candidate and the
  pair costs **one** request, not two — confirmed at 5 total requests, not 9.

- **Scrub tweens gated to ≥1024px** via `gsap.matchMedia`, with `mm.revert()` on cleanup:
  the blueprint backdrop drift (4 sections), the Team column drift, and the Why Us image
  parallax — which was scrubbing a transform on a `display:none` element on every mobile
  scroll frame. Verified: at 1280/1440 all 3 backdrop layers and all 4 team members carry
  a live transform; at 768/390 **zero** do. Desktop motion is unchanged.

- **Duplicate code removed.** The backdrop-parallax block was byte-identical in About,
  Why Us, FAQ and Contact; it is now `useBackdropParallax(scope)`. `Home` chunk
  86.9kB → 84.7kB.

- **Duplicate listener churn.** `Navbar` passed `onClose={() => setMenuOpen(false)}`, a
  new identity every render, and the Navbar re-renders on every scroll-spy change —
  tearing down and rebuilding `MobileMenu`'s Escape listener and scroll lock each time.
  Now a stable `useCallback`.

- **Dead CSS removed:** `.no-scrollbar` (the deleted plan gallery) and `@keyframes nudge`
  (the removed hero scroll cue).

### Checked and deliberately left alone

- **No horizontal overflow existed at any width**, before or after — the earlier work
  holds up. Nothing needed restructuring for tablet or mobile.
- **The FAQ `h3` reports 7px of `scrollWidth` overrun at every width.** It is the open
  item's plus icon: a 32px box rotated 45° has a 45.25px *bounding box*. The 18px glyph
  stays well inside, nothing is visible, and it causes no page overflow. Left as is.
- **`Figure.jsx` and `useSectionReveal.js` are currently unimported.** They are the shared
  vocabulary CLAUDE.md mandates for new sections, and Vite tree-shakes unimported modules
  out of the bundle, so they cost nothing at runtime. Kept.
- **`gsap.registerPlugin(ScrollTrigger)` repeats across seven files.** It is idempotent,
  and a module-level call is what guarantees registration before `useGSAP` runs.
  Centralising it would add an import-order hazard for no gain.
- **Desktop nav links are 40px tall**, not 44. They are `hidden lg:flex` chrome and the
  underline is positioned against the button box, so growing it would shift the
  underline. Left at the approved appearance.

## 12. QA

- [x] `npm run lint` clean
- [x] `npm run build` succeeds
- [x] Dev server verified over HTTP
- [x] Zero console errors, zero failed/4xx requests
- [x] All 11 external media URLs verified 200 before shipping
- [x] Rendered and visually inspected at all four widths
- [ ] Safari / iOS pass
- [ ] Lighthouse / performance budget

### Post-audit regression pass (production build, headless Chrome over CDP)

| Check | Result |
|---|---|
| `npm run lint` | clean |
| `npm run build` | succeeds |
| Horizontal overflow at 1440/1280/1024/768/430/390/375/320 | none |
| Console errors or warnings, every width and route | none |
| Clipped headings | none (was 4 per width at ≥1024) |
| Reveals stranded below full opacity after settling | none |
| Reduced motion — content lands final | pass |
| Desktop backdrop + team parallax still live at 1280/1440 | pass |
| Parallax fully reverted at 768/390 | pass |
| Touch targets on emulated touch (320/390/768) | pass |
| All 4 routes, exactly one navbar + one footer each | pass |
| PageLoader faded out: `opacity 0`, `pointer-events none`, `aria-hidden` | pass |
| Footer section link from each auth route | routes to `/`, Team at viewport top |
| FAQ: one panel open at a time, aria wired, focus on native button | pass |
| Calendar: 31 days, 24 enabled, `aria-pressed` on every day | pass |
| Booking submit → modal labelled, body locked, focus inside; Escape restores | pass |
| Mobile menu at 320/390: fits viewport, no clipping, no overflow | pass |

### Display typography change — Anton removed (applied)

Client rejected the condensed/poster heading face. **Typography only** — no layout,
colour, spacing, media, animation or component change.

- [x] `--font-display` is now `'Inter Variable', 'Archivo Variable', ui-sans-serif, sans-serif`
- [x] Anton removed from the stack **and** its `@fontsource/anton` import dropped, so it
      no longer ships (~74kB of woff/woff2 gone from `dist`). The npm package is still in
      `package.json` and can be uninstalled
- [x] Display weight **400 → 700** across `.display-xl` / `.display-lg` / `.display-sm`
- [x] Tracking flipped positive → negative (`-0.03em` xl/lg, `-0.02em` sm); line-heights
      opened very slightly (0.94→0.95, 0.9→0.95, 0.96→1)
- [x] Sizes re-capped because Inter sets ~⅓ wider than Anton:
      `.display-lg` desktop `clamp(3rem, 6.2vw, 6rem)` → `clamp(2.75rem, 5vw, 4.5rem)`;
      base floor `2.75rem` → `2.5rem`; `.display-sm` `clamp(1.75rem, 3.4vw, 3rem)` →
      `clamp(1.5rem, 3.1vw, 2.75rem)`. **`.display-xl` kept its original size**
- [x] `.display-md` deliberately untouched — still Archivo 800, the sentence-case tier
- [x] All copy unchanged; hero still two lines, FAQ still three, Contact still two
- [x] 176/176 heading-fit checks across 11 widths, every heading ≥24px clear of its box

### Production build + deploy readiness

Clean build from an empty `dist`: **1.4 MB total, 4608 modules, ~1.6s.**
`npm run lint` clean. Route chunks split as intended (Home 84.8kB / Signup 15.7kB /
ForgotPassword 4.2kB / Login 2.5kB; vendor 380kB → **126kB gzipped**).

**Blocker found and fixed — SPA deep links returned 404.** The app uses
`createBrowserRouter`, so `/login`, `/signup` and `/forgot-password` have no file on
disk. `vite preview` adds an SPA fallback automatically, which hid this for every test
run so far; served from a plain static server all three returned a hard 404. Added:

- `public/_redirects` — Netlify / Cloudflare Pages / Render (`/* /index.html 200`)
- `vercel.json` — Vercel, with `/assets/` excluded so a missing asset still 404s
  instead of silently returning HTML

Re-verified against a server that applies the rewrite: all routes 200, a genuinely
missing asset still 404s. For nginx use `try_files $uri $uri/ /index.html;`; for Apache
an equivalent `mod_rewrite` fallback.

**Full suite re-run against the production `dist` (not `vite preview`): 220/220** —
92/92 responsive, 98/98 client content/typography, 30/30 scroll-spy/navbar. No console
errors or warnings.

**Security:** `npm audit --omit=dev` → **0 vulnerabilities**. One high-severity `nanoid`
advisory exists in *dev* dependencies only (Vite tooling); it does not ship. `npm audit
fix` clears it when convenient.

#### Still open before a real launch

| Item | Impact |
|---|---|
| `public/assets/website_logo.png` (344kB) is the 1192×1192 **source** original, referenced only in comments, but `public/` ships it — **~25% of the bundle** | move it out of `public/` |
| 4 unused drawings ship: `hero-poster.svg`, `plan-2d-detail.svg`, `plan-2d-primary.svg`, `plan-3d-primary.svg` (~28kB) | minor |
| `@fontsource-variable/archivo`, `@fontsource-variable/jetbrains-mono`, `@fontsource/anton` still in `package.json`, imported by nothing | slows `npm ci`, not the bundle |
| `site.email` / `site.phone` are still the deliberate dummies and are **visible** in the footer and mobile menu | launch blocker |
| Hero video + 3 images are hotlinked from Pexels/Unsplash | third-party CDN dependency in production |
| No OG / Twitter card meta | link previews are bare |

### Two-font cleanup + Kraios favicon (applied)

- [x] **Site is now a single typeface, Inter Variable**, in two roles: display (700,
      uppercase, negative tracking) and body (400/500/600). Approved heading look
      unchanged — same family, weight and sizes as the previous pass
- [x] **JetBrains Mono removed.** `.label-mono` → **`.label-ui`** in Inter (52 usages
      renamed across 18 files, 0 left). Weight 500→600 and tracking 0.2em→0.16em to
      compensate for Inter's wider caps
- [x] **Archivo removed.** It was reachable only from `.display-md`, which had zero
      usages; both are gone
- [x] Four `font-mono` utility usages (About stats, Process step numbers ×2, backdrop
      coordinates) now use **`tabular-nums`** — same figure alignment, no second family
- [x] `--font-mono: initial` deletes Tailwind's `font-mono` utility as a guardrail
- [x] Bundle: **15 font files → 7**, Inter only
- [x] **Favicon = the Navbar's own Kraios mark** (`/assets/website_logo-128.png`), plus
      `apple-touch-icon`. Old Floor `favicon.svg` deleted. Verified legible at 16/24/32px
      on light and dark tab strips
- [x] Navbar clearance at 1024px **improved 5px → 15px** as a side effect of the tracking

### Client V2 content audit — verified against the live production build

**98/98 checks passed.** Every string compared to the client's approved copy
character-for-character (curly vs straight apostrophes normalised).

| Area | Result |
|---|---|
| Title / meta description / theme-color | exact match |
| Favicon = navbar logo asset, loads 200 | pass |
| Nav labels + LOG IN / SIGN UP | exact |
| Hero eyebrow, 2 headline lines, paragraph, both CTAs | exact |
| About label, heading, paragraph, 4 stats | exact |
| How It Works heading, intro, 4 × (title, chips, body) | exact |
| Why Kraios heading, intro, 4 × (title, body) | exact |
| Team heading, intro, 3 members + Build Team slot | exact |
| FAQ 3-line heading, intro, **all 12 Q&A pairs** | exact |
| Final CTA 2 headline lines, paragraph, both CTAs, no form | exact |
| Footer strap renders `KRAIOS \| FROM BRIEF TO ESTIMATE` | pass |
| No "Floor"/"Floor Studio" brand in rendered DOM (all routes) | pass |
| "floor plan" product term preserved | pass |
| No photoreal / "send us" / "share your files" / agency wording | pass |
| Every text element computes to Inter Variable | pass |
| Media unchanged (video, poster, 2 plan SVGs, 3 Unsplash, 4 team plates) | pass |

Regression suites re-run green after the change: **92/92** responsive, **30/30**
scroll-spy/navbar, **176/176** heading-fit across 11 widths. No console errors or
warnings.

### Content v2 verification (production build, headless Chrome over CDP)

`npm run lint` clean · `npm run build` succeeds · **92/92 automated checks pass.**

| Check | Result |
|---|---|
| Horizontal overflow at 1440/1280/1024/768/430/390/375/320 | none |
| Clipped `display-*` headings, every width | none |
| Reveals stranded below full opacity after settling | none |
| Console errors, every width and route | none |
| Failed / 4xx requests | none; all 16 images load |
| Hero headline holds two lines at every width | pass |
| Contact headline holds two lines at every width | pass |
| 12 FAQ items render; one panel open at a time; aria wired | pass |
| Navbar labels + one h1 / one navbar / one footer per route | pass |
| `SEE HOW IT WORKS` → `#process` at the navbar offset | pass (top 76px) |
| `WHY KRAIOS` nav → `#why` | pass (top 76px) |
| Hero `SIGN UP` → `/signup` · navbar `LOG IN`/`SIGN UP` | pass |
| Contact CTAs are two real links, section carries no form | pass |
| Footer "Why Kraios" from `/login` routes home then scrolls | pass |
| `/signup` fields = Name, Firm, Email, Country | pass |
| `/signup` submit → "Booked. A calendar invitation is on its way." | pass |
| How It Works sticky visual in sync with the active step (all 4) | pass |
| Reduced motion — content lands final | pass |

Measured, not estimated: at **1024px the primary nav clears the auth buttons by
5px**. "Why Kraios" is a wider label than "Why Us", so this is the tightest the
bar has been. No overlap and no overflow, but it is the first thing to re-measure
if another nav item is ever added.

### Remaining performance concerns

- **The hero video is still a 1080p MP4 on every device.** It is by far the largest
  asset on the page and a phone downloads the full desktop encode. Left alone
  deliberately: the video *is* the hero, and swapping in a mobile encode or dropping to
  the poster below a breakpoint is a visual decision, not a safe optimisation. Ship a
  720p/540p source alongside it when the placeholder media is replaced.
- Placeholder photos are still hotlinked from Unsplash — now correctly sized, but
  third-party and uncacheable by us.
- No Lighthouse run yet; the numbers above are direct measurements, not a score.

---

## Known trade-offs

- **Placeholder media is hotlinked** (Unsplash images, Pexels video). Verified live, but
  it means no offline dev and no control over the CDN. Replace before launch.
- **Forms are frontend-only.** Signup/booking and password reset each simulate a
  900ms request; there is no backend.
- **Team portraits do not depict the named people**, and the fourth portrait is a
  single person standing in for the collective "The Build Team" entry.
- **Headless Chrome cannot composite `<video>` into screenshots**, so the hero video is
  absent from the captures. It was verified playing by inspecting the element directly.

## Next up

### Awaiting client assets — nothing below was changed in the content v2 pass

- [ ] Hero video + hero poster (poster must be regenerated from the new film)
- [ ] How It Works ×4 — real 2D plan, 3D model view, materials/quantities view,
      exported BoQ
- [ ] Why Kraios visual (currently an Unsplash interior standing in for a product view)
- [ ] Team ×4 portraits
- [ ] Final Kraios logo — `website_logo.png` and its 128px derivative
- [ ] **"FLOOR STUDIO" in the plan SVG title blocks** — `plan-2d-light.svg:126`,
      `plan-3d-light.svg:95`, plus the three unused `plan-*-primary/detail.svg`.
      Left alone deliberately: editing baked-in brand art was out of scope for
      the content pass. One `<text>` node per file
- [ ] Real `site.email` / `site.phone` — still the obvious dummies

### Product / engineering

- [ ] Give `Sign Up` and `Schedule a Session` separate destinations once an
      account-creation flow exists
- [ ] Wire signup/booking + password reset to a backend
- [ ] OG / Twitter card meta (title + description are done)
- [ ] Safari + real-device pass
- [ ] Lighthouse / performance budget
- [ ] Projects/Portfolio route (explicitly out of scope for now)

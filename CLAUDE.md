# Kraios — Project Rules

Marketing site for **Kraios** — an AI design partner for architecture and
fit-out firms that takes a 2D floor plan through a 3D model, identified
materials, estimated quantities and a priced Bill of Quantities. Premium
**dark-blue** architectural landing page. These rules are permanent and apply to
every change.

## Brand and positioning — read before writing any copy

**The brand is KRAIOS.** The site previously shipped as "Floor" / "FLOOR STUDIO";
that name is dead. Never reintroduce it. `site.name` in `content.js` is the only
place the wordmark is defined.

**The browser tab uses the Kraios mark.** `index.html` points `rel="icon"` at
`/assets/website_logo-128.png` — the same asset `ui/Logo.jsx` renders in the Navbar and
Footer, so the tab icon cannot drift from the brand. The old `/favicon.svg` (the retired
Floor plan-icon) was deleted. If the logo is replaced, that one path updates both.

The word "floor" is *not* banned — **floor plan, 2D floor plan, 3D floor plan**
are product terminology and must stay. Only the standalone brand use is retired.

**Kraios is a self-serve SaaS platform on a subscription.** Users hold their own
credentials and do the work themselves, inside the product. This governs every
line of copy:

| Never write | Because |
|---|---|
| "send us your plans", "share your files with us" | the user uploads into the platform |
| "our team creates your model", "we'll build it for you" | the user builds it, iterating with the software |
| "contact us to process your project" | there is nothing to hand off |
| **"photoreal" / "photorealistic" / "photorealism"** | output is technical / SketchUp-style 3D, not a render |

The closing section is a **final CTA, not an enquiry form**: Sign Up first, with
"Schedule a Session" as the secondary path. The landing page carries no contact
form — the only form a visitor should meet is the one inside the flow they
picked, on `/signup`. Both CTAs point at `/signup` today because that is the
only account/session route that exists; they diverge as soon as a separate
account-creation flow does.

**Client copy is final copy.** Where a brief supplies wording, ship it verbatim —
do not shorten it, re-tone it, or "improve" it, and never invent statistics,
customers, pricing or testimonials to fill a slot.

### Navigation naming (final)

`Home · About · How It Works · Why Kraios · Team · FAQ · Contact`, plus
`Log In` / `Sign Up`. Labels are stored in title case in `navLinks` and
uppercased by `label-ui` / `display-sm`; the footer renders them as authored.
**The section ids never change** — `home about process why team faq contact` are
what scroll-spy, smooth scroll and cross-route navigation all key off. Renaming
"Why Choose Us" to "Why Kraios" was a label change only; the id stayed `why`.

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Build | Vite 8 | `npm run dev` / `build` / `preview` |
| UI | React 19, **JavaScript only** | No TypeScript. `.jsx` for components |
| Styling | Tailwind CSS v4 | Config lives in CSS via `@theme`. **No `tailwind.config.js`** |
| Animation | GSAP + ScrollTrigger + `@gsap/react` | Always `useGSAP` — never bare `gsap` in `useEffect` |
| Icons | `@phosphor-icons/react` | Never emoji as icons |
| Fonts | `@fontsource-variable/inter` (self-hosted) | **Inter only.** No CDN, no second family |

## Design direction (from ui-ux-pro-max)

**Swiss Modernism 2.0 + Editorial Grid.** The database rates Swiss Modernism as
best-in-class for *architecture, editorial, professional services* — strict grid,
mathematical spacing, asymmetric balance, a single accent, zero decoration.

Deliberate deviations from the generated design system, and why:

- **Palette is brand dark-blue, not the generated purple** (`#7C3AED`). The generator's
  own anti-pattern list flags "AI purple/pink gradients."
- **Glassmorphism rejected.** The generated "Cinema Mobile" style leans on frosted glass,
  glow and ambient blobs. All three are banned here — they read as generic SaaS.
- **Pattern overridden.** Generator suggested "Interactive 3D Configurator" (e-commerce).
  This is a studio landing page, so it uses an editorial narrative structure.

### Non-negotiable visual rules

- **Never pure black.** The darkest surface is `#071426`. Black reads cheap and flat.
- **Light/dark rhythm.** Bands alternate: Hero dark → About light → Process dark →
  Why light → Team deep → FAQ light → Contact light → Footer dark.
- **No cards.** No `rounded-xl bg-white/5 border shadow` boxes. Structure comes from the
  grid, hairline rules, whitespace and type scale. The auth card in `AuthShell` is
  the single deliberate exception.
- **No glow, no glassmorphism, no decorative gradients.** The only permitted gradients are
  neutral navy scrims over media for legibility.
- **Blue is strategic.** Accent appears on: primary CTA, active nav, focus rings, step
  numbers, rule accents. Never as a background wash.
- **Sharp geometry.** `border-radius: 0` everywhere. Architecture is orthogonal.

### Tokens (`src/styles/index.css` → `@theme`)

| Token | Value | Use |
|---|---|---|
| `--color-navy` | `#071426` | Primary dark background |
| `--color-navy-2` | `#0B1C32` | Secondary dark band (Team) |
| `--color-elevated` | `#102944` | Media placeholder / recessed fills |
| `--color-brand` | `#1677FF` | Brand blue — rules, marks |
| `--color-accent` | `#3B91FF` | Accent on dark: CTA, focus, active |
| `--color-brand-deep` | `#0B5ED7` | AA-safe brand tint for **light** bands |
| `--color-light` | `#F4F6F8` | Light band background |
| `--color-ink` | `#F7FAFC` | Text on dark |
| `--color-ink-dark` | `#0B1624` | Text on light |
| `--color-muted` | `#9FB2CB` | Secondary text on dark |
| `--color-muted-dark` | `#4A5A6E` | Secondary text on light |

### The tone system — read this before styling anything

A section declares a tone (`tone-dark` / `tone-deep` / `tone-light`) and children read
`--tone-*` vars. This is why the same `Button`, `Field` and `Logo` work on both bands.

**Never hardcode a colour in a component.** Use `text-[var(--tone-ink)]`,
`border-[var(--tone-line)]`, `text-[var(--tone-accent)]`, etc.

Each tone also defines `--btn-bg` / `--btn-ink` so buttons stay accessible per band.

### Verified contrast (WCAG AA) — measured, not estimated

| Pair | Ratio | Verdict |
|---|---|---|
| ink on navy | 17.62:1 | PASS |
| muted on navy | 8.53:1 | PASS |
| accent on navy | 5.87:1 | PASS |
| dark-ink on light | 16.79:1 | PASS |
| muted-dark on light | 6.51:1 | PASS |
| brand-deep on light | 5.39:1 | PASS |
| **brand `#1677FF` as text on light** | **3.79:1** | **FAIL — use `--color-brand-deep`** |
| **white on brand `#1677FF`** | **3.92:1** | **FAIL — never** |
| **dark ink on brand `#1677FF`** | **4.43:1** | **FAIL — never** |
| accent fill + dark ink (dark band button) | 5.79:1 | PASS |
| navy fill + white ink (light band button) | 17.62:1 | PASS |

Brand blue is a **graphic** colour, not a text colour on light. For text on light, use
`--color-brand-deep`.

### Typography

### ONE typeface ships. Two roles. Never add a third.

**The whole site is Inter Variable.** The roles are separated by weight, size, case and
tracking — not by a second family:

| Role | Token | How it is set |
|---|---|---|
| Display / headings | `--font-display` | Inter **700**, uppercase, negative tracking (`.display-*`) |
| Everything else | `--font-body` | Inter 400/500/600, sentence case, normal tracking |

Both tokens resolve to the same stack on purpose. `--font-sans` mirrors them so the
Tailwind `font-sans` utility can never disagree with the token.

**Every non-heading string uses the body font** — paragraphs, nav links, LOG IN / SIGN UP,
buttons and CTA labels, eyebrows, section numbers, chips, form labels, inputs and
placeholders, FAQ questions and answers, team roles and bios, footer, modal, calendar,
mobile menu, PageLoader.

**Removed and not to return:** Anton (condensed display), JetBrains Mono (technical
labels), Archivo (was already dead). `--font-mono` is pinned to `initial`, which deletes
Tailwind's `font-mono` utility so a monospace face cannot be reintroduced by reflex. For
figure alignment use **`tabular-nums`**, never a monospace family — that is what the About
stats, the Process step numbers and the booking time slots do.

`ui-sans-serif` / `system-ui` / `sans-serif` tails are generic fallbacks, not third fonts.
- **All display headings are Inter Variable weight 700, uppercase, with negative tracking**
  (`--font-display`). The brief is normal-width, formal, professional, premium, modern
  SaaS — not poster typography.
- **Anton is banned.** The display stack used to be Anton 400: condensed, narrow, tall,
  poster-like. It was removed at the client's request and must not come back. Do not
  reach for any condensed or display face for headings.
- **Inter is not condensed, so headings set ~⅓ wider than they used to.** Every
  `.display-*` size is therefore capped by the narrowest box its tier must survive in,
  and the sizes came down accordingly. They are measured values, not taste — see the
  comments in `index.css` before changing one.
- Tracking is **negative** at display size (`-0.03em` on xl/lg, `-0.02em` on sm). Inter's
  default side bearings leave big caps looking loose; this pulls the word into a block.
- `.display-xl` — hero only, the single largest thing on the page.
- `.display-lg` — **every** section heading (About, Process, Why, Team, FAQ, Contact) is
  deliberately identical so the page reads as one system. Do not vary per section.
- `.display-sm` — the sub-display tier: Process step titles, mobile-menu items and
  auth page titles. Anything that is "a heading below the section heading."
- `.display-md` was deleted. It had no usages and was the last thing holding Archivo in
  the build. Sentence-case sub-headings are plain Inter utilities.
- **`.label-ui`** — uppercase Inter 600 at 11px, `+0.16em` tracking. The architectural
  drafting-annotation voice: eyebrows, indices, metadata, nav links, button labels, form
  labels. **Never body copy.** It was `.label-mono` in JetBrains Mono; the class was
  renamed with the font so no name implies a monospace family survives. The 0.16em
  tracking (down from 0.2em) is load-bearing: Inter's caps are wider than JetBrains
  Mono's fixed advance, and the seven nav labels have to clear the auth buttons at
  1024px. Measured clearance there is 15px.

### The display classes own their font-size — never override one with `text-[…]`

`.display-*` are hand-written in `@layer utilities`, so Tailwind emits them **after**
its generated utilities. At equal specificity the later rule wins, which means
`class="display-lg text-[clamp(1.75rem,3.4vw,2.875rem)]"` silently renders at the
**full `display-lg` size** and the override does nothing.

This was not theoretical: the Process step titles, the auth page titles and the mobile
menu items all carried such an override and all rendered at 89px instead of ~46px. The
step titles then overflowed their 614px rail and, because `Section` uses
`overflow-x-clip`, were **clipped mid-word without ever triggering page overflow**.

Pick the tier that is already the right size. If no tier fits, add one to the scale.

### What actually caps each display size

Measured against real rendered text, not estimated. Every heading currently clears its
box by at least 24px at 320 / 375 / 390 / 430 / 768 / 900 / 1024 / 1280 / 1440 / 1600 /
1920. The binding constraints:

| Tier | Capped by | Why |
|---|---|---|
| `.display-lg` ≥1024 | **"FREQUENTLY"** in FAQ's 5-of-12 rail (~355px @1024) | Longest unbreakable word on the site, in the narrowest heading column |
| `.display-lg` <1024 | "FREQUENTLY" in the 280px column at 320px wide | Sets the `2.5rem` floor |
| `.display-sm` | "Export Your BoQ" / "Materials, Quantities &" in the 244px step rail at 320px | Sets the `1.5rem` floor |
| `.display-xl` | "TO ESTIMATE." in the 52rem hero column | Comfortable — this tier kept its original size |

Contact's "SEE IT ON YOUR" in its 48rem box is the runner-up constraint on `.display-lg`
and clears easily. Re-run the measurement if any heading copy gets longer.

## Animation rules

- **Always `useGSAP({ scope })`.** It reverts every tween on unmount.
- **Prefer `fromTo` over `from`.** `from` can strand elements in their start state if the
  timeline is interrupted or re-created; `fromTo` always resolves to a visible end state.
  (This caused a real bug where the entire hero was invisible.)
- **`prefers-reduced-motion` gates every animation** via `usePrefersReducedMotion()`.
  When reduced, content renders final — never invisible.
- **Parallax on media only** — never text or controls. Keep `yPercent` within 5–15.
- Each section gets its own signature move; the shared vocabulary lives in
  `useSectionReveal`. Do not repeat one animation everywhere.
- Durations: micro 150–300ms; reveals 700–1200ms. Easing `expo.out` / `power3.out`.
- `ScrollTrigger.refresh()` after fonts + load (done in `LandingPage`).
- **`scrub` tweens are desktop-only.** A scrubbed tween runs on every scroll frame for
  the life of the page. Wrap continuous/parallax work in
  `gsap.matchMedia().add('(min-width: 1024px)', …)` and return `() => mm.revert()` so it
  is torn down below the breakpoint. `once: true` entrance reveals are cheap and stay on
  every size. Never scrub an element that is `display:none` at that width.
- The shared backdrop drift lives in `useBackdropParallax(scope)` — do not paste it into
  a section again.

### Hero rules

- **The video is the subject.** Overlays stay light (0.14–0.5). Legibility comes from the
  **left** scrim (`.scrim-left`) under left-aligned copy, never from darkening the frame.
  An 0.8+ blanket overlay makes the footage look like a flat navy block — this happened.
- The navbar is **fully transparent** over the hero; its veil is capped at 30% so it never
  reads as a solid strip.
- **Transparent only while it is actually over the hero.** The bar has exactly two
  states, driven by `overHero = onHome && !scrolled`: transparent + `tone-dark` over the
  video, and the light `tone-light` surface with dark ink everywhere else — scrolled on
  the landing page *and* on every auth route. There is no third, navy-on-scroll state;
  the whole site shares one scrolled bar.
- The headline is sized to its column, not the viewport. Oversized centred type hides the
  video, which defeats having one.

### Two hard-won layout rules

1. **`overflow-hidden` on a section breaks `position: sticky` in every descendant.**
   `Section` uses `overflow-x-clip` for this reason. Do not change it back.
2. **Images in a sticky/swapped stack must be `loading="eager"`.** A lazy image that is
   scrolled into view *by a state change* rather than by the viewport may never fetch,
   leaving the active layer blank.

## Accessibility (hard requirements)

- Visible focus ring on every interactive element.
- Touch targets ≥44px. Text-sized links (footer rows, the wordmark) use the **`touch:`**
  variant — `@custom-variant touch (@media (pointer: coarse))` — so they grow only on
  devices that are actually tapped and the mouse-driven desktop layout never shifts. A
  width breakpoint cannot express this: a 1024px tablet is touch, a 1024px laptop is not.
- Every input has a real `<label for>`. Placeholder is never the label.
- Validate on **blur**; errors sit next to the field, use `role="alert"` + `aria-invalid`,
  and are prefixed "Error —" so state never depends on colour alone.
- Focus moves to the first invalid field on submit. Submit shows loading → success.
- Icon-only buttons carry `aria-label`; decorative SVG is `aria-hidden`.
- One `h1` (hero); sections use `h2`. Touch targets ≥ 44px.
- Hero video is `muted playsInline loop`, `aria-hidden`, and fades in only on `canplay`
  so a blocked CDN degrades to the poster rather than a black box.

## Routing architecture

**`createBrowserRouter` only.** Never `<BrowserRouter>` + `<Routes>` + `<Route>`.

```
src/router/router.jsx     the single router — the only place routes are declared
src/layouts/AppLayout.jsx the single parent route: <Navbar /> + <Suspense><Outlet /></Suspense>
src/pages/*.jsx           Home, Login, ForgotPassword, Signup — all CHILD routes
```

| Route | Page |
|---|---|
| `/` (index) | `Home` — the landing page, a child route like any other |
| `/login` | `Login` |
| `/forgot-password` | `ForgotPassword` |
| `/signup` | `Signup` — account request + session booking. No password fields |

Hard rules:

- **The Navbar is mounted once, in `AppLayout`.** No page renders its own. Adding
  `<Navbar />` to a page is a bug — it would double-render and break scroll-spy.
- **Suspense wraps the Outlet**, not each route, so one `PageLoader` covers every page.
- **Only whole pages are `React.lazy`.** Never lazy-load small shared components —
  the extra request costs more than the split saves.
- The landing page must stay a child of the same layout. Do not give it its own tree.

### Every navigation starts at the top

`useScrollToTop()` runs once in `AppLayout`. React Router keeps the window's scroll
position across routes, so "Sign Up" from halfway down the landing page used to drop
you into the middle of the auth page. Two deliberate exceptions, both load-bearing:

- **Skips the first render**, so a refresh keeps the browser's own scroll restoration.
- **Skips when the navigation carries `state.scrollTo`** — that is the Navbar or Footer
  routing home to reach a section, and `Home` is about to scroll there.

It uses `behavior: 'instant'`. `html` sets `scroll-behavior: smooth`, so a plain
`scrollTo(0, 0)` animates the entire page height on every route change.

### Landing-section links from other routes

Nav links like About/Team scroll on `/`, but from an auth page they must route
home *and then* scroll. The Navbar sends the target in `location.state.scrollTo`;
`Home` reads it and scrolls after two animation frames, once the sections have
mounted and laid out. It then clears the state so a refresh doesn't re-scroll.

Scroll-spy is passed an empty id list off `/` — there are no sections to observe.

## Shared component rules

These exist so forms never diverge. Use them; do not restyle inputs or buttons inline.

| Component | Purpose |
|---|---|
| `ui/FormInput.jsx` | Every input and textarea, site-wide. Boxed, tone-aware |
| `ui/PrimaryButton.jsx` | Every CTA — Contact, Login, Forgot Password, Signup |
| `ui/Modal.jsx` | Every dialog. Escape, focus trap, focus restore, scroll lock |
| `ui/CalendarPicker.jsx` | Date selection |
| `ui/AuthShell.jsx` | Shared auth frame: light blueprint background + centred card |
| `ui/PageLoader.jsx` | Suspense fallback — a blueprint plan that draws itself |
| `ui/Logo.jsx` | The brand lockup — mark + wordmark. Navbar and Footer both use it |

### Logo

- **One component.** The Navbar and the Footer both render `ui/Logo.jsx`, so the lockup
  cannot drift between them. Never inline a second copy.
- The mark is `site.logo` in `content.js`, pointing at a **downscaled** copy of the
  supplied art. The original `website_logo.png` is 1192×1192 / 342kB for a glyph that
  renders at 28px — shipping it directly would cost more than the hero poster. Keep the
  original as the source and serve a small derivative.
- The PNG must keep **real transparency**. The same file sits on the navy footer, on the
  light auth bar and over the hero video; a baked-in white background shows as a white
  tile on all three.

### Footer links must resolve to something real

Every footer link points at a section that exists or a route that exists. The footer
once carried a "Services" column of four links that all scrolled to `#about` — four
links that looked real and went nowhere. Add a column back only when it has real
targets.

- **Never `alert()`.** Success and error states use `Modal` or inline `role="alert"`.
- Booking availability lives in `content.js` → `booking.timeSlots`; each slot supports
  `disabled`, so swapping in API data needs no component change.
- `aria-pressed` must be a real boolean (`Boolean(...)`). `value && …` yields `null`
  when nothing is selected and React drops null attributes, silently removing the
  toggle semantics — this happened in `CalendarPicker`.

### The CTA never turns white

`--btn-bg` / `--btn-bg-hover` are set per tone and both stay blue:

| Tone | Fill | Ink | Hover | Ratios |
|---|---|---|---|---|
| light | `#0B5ED7` | white | `#0E4FA8` | 5.57 → 7.41 |
| dark | `#3B91FF` | `#0B1624` | `#5CA5FF` | 5.79 → 7.17 |

**`--color-brand` (#1677FF) is never a button fill** — white on it is 3.92:1 and dark
ink on it is 4.43:1, so both directions fail AA.

## Code rules

- **Components stay small.** A section over ~150 lines gets split.
- Page in `src/pages/`. Sections in `src/components/sections/`. Primitives in
  `src/components/ui/`. Chrome in `src/components/layout/`.
- **All copy and media live in `src/lib/content.js`** — never inline in JSX.
- Import via the `@/` alias.
- Images need explicit `aspect-ratio` (or width/height) to prevent CLS.
- **Every hotlinked photo ships a `srcSet` + `sizes`.** Unsplash resizes on its `w`
  parameter, so `USet(id, [w, …])` in `content.js` builds a candidate set from one id.
  Without it a phone downloads the full desktop render.
- **Two `<img>` tags sharing a `src` must share their `sizes` string.** The Process
  visual is rendered twice (desktop sticky + inline tablet/mobile); different `sizes`
  would resolve to different candidates and split one request into two. That is what
  `PROCESS_SIZES` exists for.

## Placeholder media — all temporary, and currently FROZEN

**Every image, the hero video, the logo and the plan SVGs are placeholders, and
the client is preparing the real assets.** Do not swap, re-crop or "improve" any
of them, and never fetch replacements from the internet, unless the task
explicitly delivers client media. Copy changes must fit the media that is there.

Two consequences of that freeze worth knowing:

- **"FLOOR STUDIO" is still baked into the title block of the hand-authored plan
  SVGs** — `plan-2d-light.svg`, `plan-3d-light.svg` (both live, in How It Works
  steps 01–02) and the three unused `plan-*-primary/detail.svg`. It is a plain
  `<text>` node, so it is a one-line fix per file whenever editing the drawings
  is authorised.
- Team portraits do not depict the named people, and the fourth slot is a single
  portrait standing in for the collective "The Build Team" entry.

Images are hotlinked from **Unsplash**, the hero video from **Pexels**. Every URL was
verified to return 200 before shipping. Local SVG drawings in `public/assets/` are
hand-authored (a real measured 2D plan and a 3D axonometric).

Trade-off: hotlinking means no offline dev and no control over the CDN. Accepted because
these are explicitly placeholders.

**To replace:** change the string in `src/lib/content.js`, or drop a file into
`public/assets/` and point to it. No component edits.

**Placeholder copy is deliberately generic, not plausible.** `site` carries
`hello@example.com` and `+1 (000) 000 0000` on purpose — an invented address and phone
number that *look* real are worse than obvious dummies, because they ship unnoticed.

| Slot | Currently |
|---|---|
| Logo | `website_logo.png` (source) → `website_logo-128.png` (served) |
| Hero video | Pexels: architect's desk, 3D model + 2D plans in one frame |
| Hero poster | **Local `hero-poster-*.jpg`, captured from the video's own frame at t=0.4s** |
| Process 01 | Local `plan-2d-light.svg` — light drafting sheet |
| Process 02 | Local `plan-3d-light.svg` — furnished 3D of the **same** unit |
| Process 03 | Unsplash furnished interior (customization) |
| Process 04 | Unsplash printed plan sheets (the delivered set) |
| Why Kraios | Unsplash 3D visualization (lg and up only) |
| Team | 4 Unsplash portraits |

About, FAQ and Contact carry no imagery — all three are type-only bands over
`BlueprintBackdrop`.

The four How It Works visuals are awaiting, in order: a real 2D plan output, a
real 3D model view, a real materials/quantities view, and a real exported BoQ.

**The hero poster is cut from the hero video.** Poster and first frame are the same
image, so the hand-off is invisible rather than a jump cut between two unrelated
pictures. If the video is replaced, regenerate the poster from the new one.

### Each Process step's visual must match its own heading

The step images are not decoration, they are the step. Step 04 once showed a
finished interior — a near-duplicate of step 03's photo — under the heading
"Download Floor Plans"; it now shows the printed set.

Steps 01 and 02 are **the same apartment**, drawn twice: `plan-2d-light.svg` is the
measured plan, `plan-3d-light.svg` is that plan extruded and furnished. The copy
promises step 02 "transform[s] your 2D plan into a 3D floor plan", so the two
drawings have to stay the same unit — if either is replaced, the other has to be
replaced with it.

`plan-3d-light.svg` is generated, not hand-typed — it projects the 2D drawing's own
room and wall coordinates through a dimetric transform. Walls are kept low (76 plan
units) on purpose: at full height the render becomes a field of blank slabs and
hides every room's contents.

### Drawing assets are authored at 4:3

The Process media box is `aspect-4/3` with `object-cover`. A drawing at any other
ratio gets centre-cropped — at its native 1.6:1 the 2D plan lost ~133px off each
side, taking the left dimension string with it. Author plan SVGs at 4:3 and make the
sheet background cover the **whole** viewBox, or the margins fall through to the
navy media box behind the image.

/**
 * Single source of truth for all landing-page copy and media.
 *
 * PLACEHOLDER MEDIA: images are hotlinked from Unsplash and the hero video from
 * Pexels — every URL below was verified to return 200 before shipping. They are
 * temporary. To swap in client assets, drop files into `public/assets/` and
 * change the strings here; no component edits are required.
 */

const U = (id, w = 1600, extra = '') =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80${extra}`

/**
 * Candidate widths for the same photo. Unsplash resizes on the `w` parameter,
 * so one id yields a whole `srcset` for free — a phone fetches ~40kB where it
 * used to pull the full desktop render.
 *
 * `src` stays the largest candidate: it is the fallback, and browsers without
 * srcset support must still get a sharp image.
 */
const USet = (id, widths) => widths.map((w) => `${U(id, w)} ${w}w`).join(', ')

/**
 * `sizes` for the Process visuals. The desktop sticky column and the inline
 * tablet/mobile image share one string deliberately: different `sizes` would
 * resolve to different candidates and the two <img> tags — which carry the same
 * src — would stop sharing a request.
 */
export const PROCESS_SIZES = '(min-width: 1024px) 46vw, 92vw'

/**
 * Brand + contact details.
 *
 * These are deliberately GENERIC PLACEHOLDERS, not invented-but-plausible
 * details — an address and phone number that look real are worse than obvious
 * dummies, because they ship unnoticed. Replace every value here before launch.
 *
 * `logo` is a 128px downscale of the supplied `public/assets/website_logo.png`
 * (1192×1192, 342kB — far too heavy for a 28px mark). To swap the logo: drop the
 * new file in as `website_logo.png` and regenerate the 128px copy, or point this
 * at whatever file you want and keep it small.
 */
export const site = {
  name: 'FLOOR',
  logo: '/assets/website_logo-128.png',
  tagline: '2D & 3D Floor Plan Visualizations',
  email: 'hello@example.com',
  phone: '+1 (000) 000 0000',
}

// Labels are kept short so seven items plus the auth buttons still fit at 1280px.
export const navLinks = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'process', label: 'How It Works' },
  { id: 'why', label: 'Why Us' },
  { id: 'team', label: 'Team' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
]

/** Auth routes. Both are real pages; neither is wired to a backend yet. */
export const authLinks = {
  login: { label: 'Log In', to: '/login' },
  signup: { label: 'Sign Up', to: '/signup' },
}

export const hero = {
  eyebrow: '2D & 3D Floor Plan Visualization',
  headlineLines: ['From Blueprints', 'To Real Spaces'],
  body:
    'We turn architectural drawings into measured 2D plans and photoreal 3D visualization — so a space can be understood, and sold, long before it is built.',
  primaryCta: { label: 'Start a Project', target: 'contact' },
  secondaryCta: { label: 'See the Process', target: 'process' },
  // Verified playing on the real page (readyState 4, currentTime advancing).
  // Fallback plays if the primary fails to load.
  video: 'https://videos.pexels.com/video-files/3773486/3773486-hd_1920_1080_30fps.mp4',
  videoFallback: 'https://videos.pexels.com/video-files/7578541/7578541-hd_1920_1080_30fps.mp4',
  /**
   * A frame captured from the video itself at t=1.2s, so the hand-off from
   * poster to footage is invisible instead of a jump cut between two unrelated
   * images. Local, so it is not a third-party dependency.
   *
   * If the video is swapped, regenerate this from the new clip.
   */
  poster: '/assets/hero-poster-1600.jpg',
  posterSrcSet: '/assets/hero-poster-768.jpg 768w, /assets/hero-poster-1600.jpg 1600w',
  meta: [
    { label: 'Projects Delivered', value: '480+' },
    { label: 'Average Turnaround', value: '72 HRS' },
    { label: 'Markets Served', value: '19' },
  ],
}

export const about = {
  index: '01',
  eyebrow: 'About Us',
  // One authored line = one visual line on desktop (see .display-lg).
  headingLines: ['About Us'],
  paragraph:
    'Floor works at the intersection of architectural documentation and visual communication. Every deliverable begins with the rigour a construction set demands — accurate scale, correct wall assemblies, honest sightlines. We do not decorate plans. We resolve them.',
  // Mono credential rows that sit opposite the intro paragraph.
  meta: [
    { label: 'Established', value: '2016' },
    { label: 'Studio', value: 'San Francisco' },
    { label: 'Plans Delivered', value: '480+' },
    { label: 'Markets Served', value: '19' },
  ],
}

export const whyUs = {
  index: '03',
  eyebrow: 'Why Choose Us',
  headingLines: ['Why Choose Us'],
  intro:
    'Visualization is easy to buy and hard to trust. These are the four things we hold ourselves to on every drawing that leaves the studio.',
  // 3D architectural visualization — the output side of the studio's work.
  image: {
    src: U('1503174971373-b1f69850bded', 1400),
    srcSet: USet('1503174971373-b1f69850bded', [640, 900, 1400]),
    // Only rendered at lg and up, inside the 6-column left rail.
    sizes: '(min-width: 1024px) 46vw, 92vw',
    alt: 'Three-dimensional architectural visualization of a furnished interior floor',
  },
  imageCaption: 'Ref. 3D-210 — Level 02, Unit B',
  // `icon` is a key, mapped to a Phosphor component in the section.
  reasons: [
    {
      number: '01',
      icon: 'eye',
      title: "See It Before It's Built",
      body:
        'Transform a 2D floor plan into a detailed 3D visualization, so the layout and spatial relationships are easier to understand.',
    },
    {
      number: '02',
      icon: 'sliders',
      title: 'Fully Customizable',
      body:
        'Refine the visualization according to project requirements and adjust elements until the space feels right.',
    },
    {
      number: '03',
      icon: 'layers',
      title: 'From Plan to Visual, Simplified',
      body:
        'Move from an existing 2D plan to a polished visualization through a clear and simple process.',
    },
    {
      number: '04',
      icon: 'download',
      title: 'Ready to Share & Download',
      body:
        'Receive clean, presentation-ready floor-plan visuals that can easily be downloaded and shared.',
    },
  ],
}

export const faq = {
  index: '05',
  eyebrow: 'FAQ',
  // Deliberate exception: this heading stays a three-line stack.
  headingLines: ['Frequently', 'Asked', 'Questions'],
  intro:
    'The things clients ask most, before a project starts. Anything else — send it over and we answer within one business day.',
  items: [
    {
      q: 'How do I upload my 2D floor plan?',
      a: 'Send it however you have it — DWG, DXF, RVT, IFC, SKP, PDF or a plain image. Even a photograph of a hand sketch works. We audit the drawing, flag anything ambiguous and confirm scale with you before a single line is redrawn.',
    },
    {
      q: 'When do I receive the 3D version?',
      a: 'A first 3D pass on a single residential floor is typically ready in 3–4 working days from approved scope. You get a proof to review before anything is finalised, so nothing is delivered as a surprise.',
    },
    {
      q: 'Can I customize the 3D floor?',
      a: 'Yes. Finishes and materials, furniture placement, fixtures, daylight and camera framing can all be adjusted. Objects can be moved or removed entirely until the space reads the way you intend to present it.',
    },
    {
      q: 'How many revisions are included?',
      a: 'Two full revision rounds come as standard on every project. You annotate directly on the proof and we resolve every note before moving to final output. Any further rounds are quoted transparently up front.',
    },
    {
      q: 'What formats can I download?',
      a: 'Final files ship as layered source, print-resolution raster and web-optimized exports together. Full commercial usage rights are included — no per-use licensing and no expiry.',
    },
    {
      q: 'How long does a full project take?',
      a: 'A single-unit 2D set is usually 48–72 hours. A complete 2D plus 3D package runs 4–6 working days. Multi-unit developments are scheduled per phase, with dates confirmed in writing before we begin.',
    },
  ],
}

/**
 * The single process section — the 2D → 3D → customize → download story.
 *
 * Each step's visual is matched to what the step actually describes:
 *   01 the uploaded 2D plan   → a real measured plan drawing
 *   02 the generated 3D floor → an axonometric cutaway of the same plan
 *   03 customization          → a furnished space (objects to edit / remove)
 *   04 the delivered output   → the finished photoreal visualization
 */
export const process = {
  index: '02',
  eyebrow: 'How It Works',
  headingLines: ['How It Works'],
  intro:
    'One continuous pipeline, from the drawing you already have to the files you ship. You always know which stage a project sits in, and what comes next.',
  steps: [
    {
      number: '01',
      title: 'Upload 2D Floor Plan',
      body:
        'Send us the plan you already have — CAD, PDF, a Revit export, or a photograph of a hand sketch. We audit the drawing, flag anything ambiguous, and confirm scale before a single line is redrawn.',
      meta: 'DWG · PDF · RVT · JPG',
      // Light drafting sheet — this is the drawing the client arrives with, so
      // it reads as paper, not as a rendered output.
      image: {
        src: '/assets/plan-2d-light.svg',
        alt: 'Measured two-dimensional floor plan on a white drafting sheet, with dimension strings, door swings and room labels',
      },
    },
    {
      number: '02',
      title: 'Get Your 3D Floor',
      body:
        'We rebuild the geometry to true dimension and extrude it into a full three-dimensional floor — walls, openings, levels and circulation, all derived from your original plan so the two never disagree.',
      meta: 'Axonometric · Cutaway · Walkthrough',
      // Deliberately the SAME unit as step 01, extruded and furnished: the copy
      // promises the 3D is derived from the original plan, so the two drawings
      // have to be the same apartment.
      image: {
        src: '/assets/plan-3d-light.svg',
        alt: 'Three-dimensional furnished floor plan of the same unit, with extruded walls, room labels and furniture',
      },
    },
    {
      number: '03',
      title: 'Customize Your Space',
      body:
        'Refine the visualization with us. Edit finishes and materials, move or remove furniture and fixtures, adjust daylight — until the space reads exactly the way you intend to present it.',
      meta: 'Materials · Furniture · Daylight',
      image: {
        src: U('1600210492486-724fe5c67fb0', 1400),
        srcSet: USet('1600210492486-724fe5c67fb0', [420, 640, 900, 1400]),
        alt: 'Furnished interior with movable furniture and fixtures being refined',
      },
    },
    {
      number: '04',
      title: 'Download Floor Plans',
      body:
        'Take the finished set away in every format you need — layered source, print-resolution raster and web-optimized exports — with full commercial usage rights included.',
      meta: 'Layered · Print · Web',
      // The delivered set itself. This step previously showed a finished
      // interior — a near-duplicate of step 03's photo, and nothing to do with
      // downloading plans.
      image: {
        src: U('1762146828422-50a8bd416d3c', 1400),
        srcSet: USet('1762146828422-50a8bd416d3c', [420, 640, 900, 1400]),
        alt: 'Printed architectural floor plan sheets spread out as the delivered set',
      },
    },
  ],
}

export const team = {
  index: '04',
  eyebrow: 'The Team',
  headingLines: ['Meet The Team'],
  intro:
    'Every member of the studio has worked in practice. That background is why our drawings survive contact with a real construction set.',
  // Portraits render at ~404px wide on desktop and ~340px on a phone, so the
  // 900w file was roughly double what any viewport needed.
  members: [
    { name: 'Elena Marchetti', role: 'Founder & Design Director', image: U('1580489944761-15a19d654956', 900), srcSet: USet('1580489944761-15a19d654956', [360, 540, 900]), meta: 'M.Arch — Politecnico di Milano' },
    { name: 'Julian Vance', role: 'Head of 3D Visualization', image: U('1500648767791-00dcc994a43e', 900), srcSet: USet('1500648767791-00dcc994a43e', [360, 540, 900]), meta: 'Formerly Foster + Partners' },
    { name: 'Clara Béranger', role: 'Lead Technical Drafter', image: U('1438761681033-6461ffad8d80', 900), srcSet: USet('1438761681033-6461ffad8d80', [360, 540, 900]), meta: 'RIBA Part II' },
    { name: 'Tomas Lindqvist', role: 'Client & Project Lead', image: U('1472099645785-5658abf4ff4e', 900), srcSet: USet('1472099645785-5658abf4ff4e', [360, 540, 900]), meta: '12 years in practice' },
  ],
  // 4-up at lg, 2-up at sm, 1-up below.
  imageSizes: '(min-width: 1024px) 23vw, (min-width: 640px) 46vw, 92vw',
}

export const contact = {
  index: '06',
  eyebrow: 'Start a Project',
  headingLines: ['Contact Us'],
  body:
    'Share your floor plan or project requirements and we come back within one business day with scope, timeline and a fixed quote — no discovery call needed to get a number.',
  availability: 'Taking on projects for Q3',
  responseNote: 'Average first reply — under 6 working hours.',
  formTitle: 'Project Enquiry',
  // `icon` is a key, mapped to a Phosphor component in the section.
  details: [
    { label: 'Phone', icon: 'phone', value: '+1 (415) 555 0148', href: 'tel:+14155550148' },
    {
      label: 'Email',
      icon: 'mail',
      value: 'studio@floor-visual.com',
      href: 'mailto:studio@floor-visual.com',
    },
    {
      label: 'Office',
      icon: 'pin',
      value: 'Suite 1200, 88 Meridian Avenue,\nSan Francisco, CA',
      link: { label: 'See on Google Map', href: 'https://maps.google.com/?q=San+Francisco' },
    },
  ],
  fields: {
    name: { label: 'Name', placeholder: 'Elena Marchetti', autoComplete: 'name' },
    email: { label: 'Email', placeholder: 'you@studio.com', autoComplete: 'email' },
    details: {
      label: 'Project Details',
      placeholder: 'Unit count, the drawing formats you have, deliverables and target date.',
    },
  },
  submitLabel: 'Send Project',
}

/**
 * Booking availability for /signup. Placeholder slots — replace `timeSlots`
 * with whatever the scheduling API returns; `disabled` is already honoured.
 */
export const booking = {
  timeSlots: [
    { value: '09:00 AM', label: '09:00 AM' },
    { value: '10:30 AM', label: '10:30 AM' },
    { value: '12:00 PM', label: '12:00 PM' },
    { value: '02:00 PM', label: '02:00 PM' },
    { value: '03:30 PM', label: '03:30 PM' },
    { value: '05:00 PM', label: '05:00 PM' },
  ],
}

/**
 * Footer.
 *
 * Every link here points at something that actually exists. The old "Services"
 * column listed four services that were not sections, and all four scrolled to
 * `#about` — four links that looked real and went nowhere. If a services page
 * is built later, add the column back with real targets.
 */
export const footer = {
  note: 'Placeholder description — replace with a short line about the studio.',
  // landing-page sections, resolved from the same list the navbar uses
  sections: navLinks.map((l) => ({ label: l.label, id: l.id })),
  // real routes
  account: [authLinks.login, authLinks.signup],
  legalNote: 'All rights reserved',
}

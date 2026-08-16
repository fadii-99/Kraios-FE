/**
 * Single source of truth for all landing-page copy and media.
 *
 * BRAND: Kraios. PRODUCT: a self-serve, subscription SaaS platform — the user
 * uploads, iterates and exports inside the software. Copy here must never read
 * as an agency ("send us your plans", "our team builds it for you"), and must
 * never use "photoreal"/"photorealistic" — the 3D output is technical, not a
 * photographic render.
 *
 * PLACEHOLDER MEDIA: images are hotlinked from Unsplash and the hero video from
 * Pexels — every URL below was verified to return 200 before shipping. They are
 * temporary and are DELIBERATELY UNCHANGED while the client prepares the final
 * imagery. To swap in client assets, drop files into `public/assets/` and change
 * the strings here; no component edits are required.
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
 * `sizes` for the How It Works visuals. The desktop sticky column and the
 * inline tablet/mobile image share one string deliberately: different `sizes`
 * would resolve to different candidates and the two <img> tags — which carry
 * the same src — would stop sharing a request.
 */
export const PROCESS_SIZES = '(min-width: 1024px) 46vw, 92vw'

/**
 * Brand + contact details.
 *
 * `email` and `phone` are deliberately GENERIC PLACEHOLDERS, not
 * invented-but-plausible details — an address and phone number that look real
 * are worse than obvious dummies, because they ship unnoticed. Replace both
 * before launch.
 *
 * `logo` is a 128px downscale of the supplied `public/assets/website_logo.png`
 * (1192×1192, 342kB — far too heavy for a 40px mark) and is itself still a
 * placeholder awaiting the final Kraios mark. To swap it: drop the new file in
 * as `website_logo.png` and regenerate the 128px copy, or point this at
 * whatever file you want and keep it small.
 */
export const site = {
  name: 'KRAIOS',
  logo: '/assets/website_logo-128.png',
  tagline: 'From Brief to Estimate',
  email: 'hello@example.com',
  phone: '+1 (000) 000 0000',
}

/**
 * Labels are stored in title case; `label-ui` and `display-sm` uppercase them
 * where the design calls for caps, while the footer keeps them as authored.
 * The ids are the section anchors and must not change — scroll-spy, smooth
 * scroll and cross-route navigation all key off them.
 */
export const navLinks = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'process', label: 'How It Works' },
  { id: 'why', label: 'Why Kraios' },
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
  eyebrow: 'The AI Design Partner for Architecture Firms',
  // Two lines by design — the composition depends on the break landing here.
  headlineLines: ['From Brief', 'To Estimate.'],
  body:
    'In hours, not weeks. Upload your floor plan and work with Kraios to a 3D model, identified materials, estimated quantities, and a full priced BoQ — so your team takes on more projects without adding headcount.',
  // Routes to the account/session flow; the button renders its own arrow.
  primaryCta: { label: 'Sign Up', to: authLinks.signup.to },
  secondaryCta: { label: 'See How It Works', target: 'process' },
  // Verified playing on the real page (readyState 4, currentTime advancing).
  // Fallback plays if the primary fails to load. PLACEHOLDER — the client will
  // supply the final hero film.
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
}

export const about = {
  index: '01',
  eyebrow: 'About Us',
  // One authored line = one visual line on desktop (see .display-lg).
  headingLines: ['About Us'],
  paragraph:
    'Kraios was built on a job site, not in a lab. Inside a working fit-out business, every project meant weeks of grind — 2D plans, 3D models, material lists, quantities, then a price. Kraios brings that production work into one platform, while your team keeps the judgment. We don’t decorate workflows. We resolve them.',
  // Mono credential rows that sit opposite the intro paragraph.
  meta: [
    { label: 'Established', value: '2026' },
    { label: 'Headquarters', value: 'Dubai, UAE' },
    { label: 'Labor Recovered — Per Project', value: '$5,000+' },
    { label: 'Markets Served', value: '5+' },
  ],
}

export const whyUs = {
  index: '03',
  eyebrow: 'Why Kraios',
  headingLines: ['Why Kraios'],
  intro:
    'Professional-grade project intelligence without the traditional complexity. Bring drawings, project information, quantities, and costs together in one place, moving from concept to an actionable estimate faster and with fewer handoffs.',
  // PLACEHOLDER — 3D architectural visualization standing in for a product
  // screen. Unchanged pending client assets.
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
      icon: 'cursor',
      title: 'No Specialist Software Required',
      body:
        'Work directly through an intuitive interface without needing to learn complex design, estimating, or modeling tools.',
    },
    {
      number: '02',
      icon: 'iterate',
      title: 'Iterate in Real Time',
      body:
        'Make changes, test assumptions, and refine your project as you go, without sending revisions back and forth or waiting for someone else to update the model.',
    },
    {
      number: '03',
      icon: 'layers',
      title: 'One Source of Truth',
      body:
        'Keep the 3D model, project documents, material requirements, quantities, and costs connected, reducing the disconnect between drawings and estimates.',
    },
    {
      number: '04',
      icon: 'speed',
      title: 'Move Faster with Confidence',
      body:
        'Get to a usable project estimate earlier, so you can evaluate costs, identify issues, and make informed decisions before committing time and money.',
    },
  ],
}

export const faq = {
  index: '05',
  eyebrow: 'FAQ',
  // Deliberate exception: this heading stays a three-line stack.
  headingLines: ['Frequently', 'Asked', 'Questions'],
  intro:
    'The things firms ask most, before their first project. Everything below happens inside the platform, with your own login.',
  items: [
    {
      q: 'What do I need to get started?',
      a: 'Upload your existing 2D floor plan and add supporting project information as needed.',
    },
    {
      q: 'Can I upload supporting documents such as MEP drawings?',
      a: 'Yes. MEP drawings, specifications, schedules, and other supporting documents can be used to better inform your project and BoQ.',
    },
    {
      q: 'Do I need 3D modeling or estimating experience?',
      a: 'No. The platform is designed to guide you through the process without requiring specialized modeling or estimating software expertise.',
    },
    {
      q: 'Can I refine the 3D floor plan after it is generated?',
      a: 'Yes. You can work iteratively with the platform to review and refine the 3D model.',
    },
    {
      q: 'How are required materials identified?',
      a: 'Materials are identified using information from your 3D floor plan, supporting documents, and any additional project inputs you provide.',
    },
    {
      q: 'How are quantities estimated?',
      a: 'The model uses industry standards to estimate quantities, while allowing you to provide project-specific inputs and assumptions that are taken into account.',
    },
    {
      q: 'Can I use my own estimating assumptions or standards?',
      a: 'Yes. Project- and company-specific inputs can be incorporated to tailor estimates to the way you work.',
    },
    {
      q: 'How is pricing determined?',
      a: "Pricing can reflect dynamic market rates based on project location, your company's own vendor pricing, or a combination of both.",
    },
    {
      q: 'Can I use my preferred vendors and negotiated rates?',
      a: 'Yes. Your existing vendor and pricing information can be incorporated into your project estimates.',
    },
    {
      q: 'What happens if my project changes?',
      a: 'Update your project information and refine the model, quantities, and costs as the project evolves.',
    },
    {
      q: 'What does the final BoQ include?',
      a: 'Your BoQ brings together the identified materials, estimated quantities, and associated pricing in a structured, ready-to-use output.',
    },
    {
      q: 'Can I export my work?',
      a: 'Yes. Your project outputs can be exported for use across your broader project workflow.',
    },
  ],
}

/**
 * The product workflow, start to finish: upload → 3D model → materials,
 * quantities and pricing → exported BoQ. Every step happens inside the
 * platform, performed by the user.
 *
 * The four visuals are PLACEHOLDERS and deliberately unchanged. The client will
 * supply: (01) a real 2D plan, (02) a real 3D model view, (03) a real
 * materials/quantities view, (04) a real exported BoQ.
 */
export const process = {
  index: '02',
  eyebrow: 'How It Works',
  headingLines: ['How It Works'],
  intro:
    'One continuous workflow inside the platform, from the plan you already have to the BoQ you use. You always know which stage a project sits in, and what comes next.',
  steps: [
    {
      number: '01',
      title: 'Upload Your 2D Plan',
      body:
        'Upload your existing 2D floor plan directly into the chatbot. This becomes the starting point for building and refining your project within the software.',
      meta: '2D Plan · Upload',
      image: {
        src: '/assets/plan-2d-light.svg',
        alt: 'Measured two-dimensional floor plan on a white drafting sheet, with dimension strings, door swings and room labels',
      },
    },
    {
      number: '02',
      title: 'Build Your 3D Model',
      body:
        'Work iteratively with the software to transform your 2D plan into a 3D floor plan. Refine the layout and key details until the model accurately reflects your project.',
      meta: '3D Model · Iterate · Refine',
      // Deliberately the SAME unit as step 01, extruded and furnished: the copy
      // promises the 3D is built from the original plan, so the two drawings
      // have to be the same apartment.
      image: {
        src: '/assets/plan-3d-light.svg',
        alt: 'Three-dimensional furnished floor plan of the same unit, with extruded walls, room labels and furniture',
      },
    },
    {
      number: '03',
      title: 'Materials, Quantities & Pricing',
      body:
        'Using your 3D floor plan and supporting documents, identify the materials required, estimate quantities, and determine associated pricing, creating the foundation for your Bill of Quantities.',
      meta: 'Materials · Quantities · Pricing',
      image: {
        src: U('1600210492486-724fe5c67fb0', 1400),
        srcSet: USet('1600210492486-724fe5c67fb0', [420, 640, 900, 1400]),
        alt: 'Interior with materials and fixtures being reviewed against the project',
      },
    },
    {
      number: '04',
      title: 'Export Your BoQ',
      body:
        'Turn your finalized project into a ready-to-use Bill of Quantities. Your material selections, quantities, and pricing are organized into a clear BoQ you can use for procurement and project planning.',
      meta: 'BoQ · Export · Use',
      image: {
        src: U('1762146828422-50a8bd416d3c', 1400),
        srcSet: USet('1762146828422-50a8bd416d3c', [420, 640, 900, 1400]),
        alt: 'Printed project documents spread out as a delivered, ready-to-use set',
      },
    },
  ],
}

/**
 * PLACEHOLDER PORTRAITS.
 *
 * Each member points at a local drafted plate in `public/assets/` rather than a
 * stock portrait of an unrelated person — the slot reads as deliberately empty
 * instead of quietly wrong, and there is no third-party CDN in the way.
 *
 * The plates are authored at the same 3:4 the Team grid renders, so they drop
 * straight into the existing layout, crop and reveal animation.
 *
 * TO REPLACE: swap `image` for the real photograph (3:4, ~900px wide is plenty
 * at the largest breakpoint) and add a `srcSet` if you ship multiple widths —
 * `Team.jsx` already passes both through. Nothing else needs touching.
 */
const teamPlaceholder = (slot) => `/assets/team-placeholder-${slot}.svg`

export const team = {
  index: '04',
  eyebrow: 'The Team',
  headingLines: ['The Team'],
  intro:
    'Strategy consulting, construction delivery, and applied AI on one team. We lived this problem before we built the product.',
  members: [
    {
      name: 'Michel Abourizk',
      role: 'Co-founder & CEO',
      image: teamPlaceholder('01'),
      meta: "Ex-strategy consultant at Strategy& Middle East and Business Development Director at Dynamic Motion, one of the GCC's leading fast-track construction and fit-out firms. Economics at AUB; Master in Management, IE Business School, Madrid.",
    },
    {
      name: 'Hammad Rizwan',
      role: 'Head of AI Development',
      image: teamPlaceholder('03'),
      meta: 'Leads the build team — four civil engineers and four developers combining construction domain knowledge with applied AI, building the product every day.',
    },
    // Collective third slot, not an invented individual.
    {
      name: 'The Build Team',
      role: 'Engineering & AI',
      image: teamPlaceholder('04'),
    },
  ],
  // 3-up at lg, 2-up at sm, 1-up below.
  imageSizes: '(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw',
}

/**
 * Final CTA, not a project enquiry. Kraios is self-serve: the section drives
 * account creation first, with a scheduled walkthrough as the secondary path.
 *
 * Both actions land on `/signup`, which is the only account/session route that
 * exists today. They diverge as soon as a separate account-creation flow does.
 */
export const contact = {
  index: '06',
  eyebrow: 'Get Started',
  // Two lines by design.
  headingLines: ['See It On Your', 'Next Project.'],
  body:
    'Create your account and start your first project today — or schedule a session with our team for a walkthrough of the platform, pricing, and how Kraios fits your workflow.',
  primaryCta: { label: 'Sign Up', to: authLinks.signup.to },
  secondaryCta: { label: 'Schedule a Session', to: authLinks.signup.to },
}

/**
 * The scheduled-session request on /signup. Placeholder slots — replace
 * `timeSlots` with whatever the scheduling API returns; `disabled` is already
 * honoured.
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
  note: 'Kraios turns your 2D floor plan into a 3D model, identified materials, estimated quantities, and a priced, ready-to-use BoQ — in one platform.',
  // landing-page sections, resolved from the same list the navbar uses
  sections: navLinks.map((l) => ({ label: l.label, id: l.id })),
  // real routes
  account: [authLinks.login, authLinks.signup],
  legalNote: 'All rights reserved',
}

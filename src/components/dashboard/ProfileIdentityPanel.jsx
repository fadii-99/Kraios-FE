import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * ProfileIdentityPanel — Clean, Modern Architectural Profile Identity Mark
 *
 * Visual & Motion Design:
 * - Precision CAD corner registration brackets on an architectural drafting plate
 * - Clean, proportioned modern user avatar glyph (head & curved shoulders)
 * - Soft ambient breathing blue aura behind the avatar
 * - Liquid stroke-drawing entrance and calm, subtle idle floating micro-motion
 */
export default function ProfileIdentityPanel() {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      // 1. Calculate path lengths for drawable strokes
      gsap.utils.toArray('[data-draw]').forEach((node) => {
        let length
        try {
          length = node.getTotalLength()
        } catch {
          length = 0
        }
        if (!length) return

        gsap.set(node, {
          strokeDasharray: length,
          strokeDashoffset: reduced ? 0 : length,
        })
      })

      if (reduced) return

      // ── ENTRANCE TIMELINE ──────────────────────────────────────────
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })

      // Plate & corner registration brackets reveal
      tl.fromTo(
        '[data-profile-plate]',
        { scale: 0.94, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6 },
        0,
      )

      // Outer Corner L-Brackets draw in
      tl.to('[data-bracket]', { strokeDashoffset: 0, duration: 0.6, stagger: 0.04 }, 0.05)

      // Corner Pins pop in
      tl.fromTo(
        '[data-corner-pin]',
        { scale: 0, opacity: 0, transformOrigin: 'center' },
        { scale: 1, opacity: 1, duration: 0.35, stagger: 0.03 },
        0.15,
      )

      // Avatar strokes draw with liquid precision
      tl.to(
        '[data-avatar-stroke]',
        {
          strokeDashoffset: 0,
          duration: 0.75,
          stagger: 0.1,
        },
        0.2,
      )

      // Soft backglow aura fades in
      tl.fromTo(
        '[data-avatar-aura]',
        { opacity: 0, scale: 0.85, transformOrigin: 'center' },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' },
        0.3,
      )

      // ── SIMPLE & CALM CONTINUOUS IDLE MOTION ───────────────────────

      // 1. Gentle ambient breathing aura
      gsap.to('[data-avatar-aura]', {
        scale: 1.08,
        opacity: 0.75,
        duration: 3.2,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        transformOrigin: 'center',
      })

      // 2. Subtle, silky smooth vertical micro-float
      gsap.to('[data-avatar-glyph]', {
        y: -2.5,
        duration: 2.8,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      })
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <div
      ref={scope}
      className="group relative flex aspect-square h-64 w-64 items-center justify-center select-none sm:h-72 sm:w-72 md:h-80 md:w-80 lg:h-[21rem] lg:w-[21rem] xl:h-[23rem] xl:w-[23rem]"
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        className="h-full w-full overflow-visible transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-[1.02]"
      >
        <defs>
          {/* Main User Avatar Blue Gradient */}
          <linearGradient id="cleanUserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#0b5ed7" />
          </linearGradient>

          {/* Soft Luminous Backglow Gradient */}
          <radialGradient id="cleanAvatarAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#0b5ed7" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#0b5ed7" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── 1. Architectural Drafting Base Plate ───────────────────── */}
        <g data-profile-plate>
          {/* Outer Rounded Plate */}
          <rect
            x="20"
            y="20"
            width="160"
            height="160"
            rx="12"
            fill="#0b5ed7"
            fillOpacity="0.02"
            stroke="#0b5ed7"
            strokeOpacity="0.16"
            strokeWidth="1"
          />

          {/* Subtle Outer Enclosing Circle */}
          <circle
            cx="100"
            cy="100"
            r="68"
            stroke="#0b5ed7"
            strokeOpacity="0.12"
            strokeWidth="1"
            strokeDasharray="4 6"
            vectorEffect="non-scaling-stroke"
          />
        </g>

        {/* ── 2. Precision CAD Registration Corner Brackets ───────── */}
        <g className="transition-colors duration-300">
          <path
            data-draw
            data-bracket
            d="M20 38 V 20 H 38"
            stroke="#0b5ed7"
            strokeOpacity="0.6"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            data-draw
            data-bracket
            d="M162 20 H 180 V 38"
            stroke="#0b5ed7"
            strokeOpacity="0.6"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            data-draw
            data-bracket
            d="M180 162 V 180 H 162"
            stroke="#0b5ed7"
            strokeOpacity="0.6"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            data-draw
            data-bracket
            d="M38 180 H 20 V 162"
            stroke="#0b5ed7"
            strokeOpacity="0.6"
            strokeWidth="1.75"
            strokeLinecap="round"
          />

          {/* Corner Registration Node Pins */}
          <circle data-corner-pin cx="20" cy="20" r="2" fill="#0b5ed7" />
          <circle data-corner-pin cx="180" cy="20" r="2" fill="#0b5ed7" />
          <circle data-corner-pin cx="180" cy="180" r="2" fill="#0b5ed7" />
          <circle data-corner-pin cx="20" cy="180" r="2" fill="#0b5ed7" />
        </g>

        {/* ── 3. Soft Ambient Backglow Aura ─────────────────────────── */}
        <circle
          data-avatar-aura
          cx="100"
          cy="100"
          r="52"
          fill="url(#cleanAvatarAura)"
        />

        {/* ── 4. Clean Modern User Avatar Glyph ──────────────────────── */}
        <g data-avatar-glyph>
          {/* User Head Circle */}
          <circle
            data-draw
            data-avatar-stroke
            cx="100"
            cy="76"
            r="23"
            stroke="url(#cleanUserGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Inner Optical Core */}
          <circle
            cx="100"
            cy="76"
            r="4.5"
            fill="#0b5ed7"
            fillOpacity="0.25"
          />

          {/* User Shoulders: Architectural Smooth Parabolic Arc */}
          <path
            data-draw
            data-avatar-stroke
            d="M56 146 C 58 120, 76 110, 100 110 C 124 110, 142 120, 144 146"
            stroke="url(#cleanUserGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Subtle Base Datum Line */}
          <path
            d="M74 156 H 126"
            stroke="#0b5ed7"
            strokeOpacity="0.22"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  )
}

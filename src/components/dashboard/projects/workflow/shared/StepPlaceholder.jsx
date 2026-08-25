/**
 * Stage container — the middle zone's content wrapper.
 *
 * `flex-1` fills the height the workspace has left over between the stepper and
 * the bottom navigation. There is deliberately NO `min-h-0` here: a flex item
 * with `min-height: 0` refuses to grow past its flex share, which on a phone
 * would clip a genuinely tall stage instead of letting the middle zone scroll.
 * Default `min-height: auto` gives both behaviours — fill when there is room,
 * grow when there is not.
 */
export default function StepPlaceholder({ children }) {
  return <div className="flex w-full flex-1 flex-col">{children}</div>
}

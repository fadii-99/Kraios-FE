/**
 * Stage Container — Clean, empty content area ready for future stage components.
 */
export default function StepPlaceholder({ children }) {
  return (
    <div className="flex-1 w-full min-h-0">
      {children}
    </div>
  )
}

import NotFoundModal from '@/components/ui/NotFoundModal'

/**
 * Dedicated page for invalid / non-existing routes outside dashboard.
 * Renders the blue informational Page Not Found modal without exposing broken UI.
 */
export default function NotFoundPage() {
  return (
    <div className="tone-light flex h-dvh w-full items-center justify-center bg-[var(--color-light)]">
      <NotFoundModal open={true} />
    </div>
  )
}

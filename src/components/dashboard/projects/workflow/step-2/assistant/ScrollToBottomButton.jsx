import { ArrowDown } from '@phosphor-icons/react'

import { cn } from '@/lib/cn'

/**
 * "Jump to the latest" — the one answer to a transcript that has been scrolled
 * up. A Step 2 module, reused by the Step 1 and Step 3 assistants, because all
 * three scroll the same way and the control must not be drawn three times.
 *
 * It floats over the foot of the conversation rather than sitting in the layout,
 * so appearing and leaving costs the transcript no reflow. It is kept MOUNTED in
 * both states — that is what lets it fade and lift rather than pop — and while
 * hidden it is out of the tab order, hidden from assistive tech and inert to the
 * pointer, so an invisible control can never be reached.
 *
 * The arrow's bounce is the only motion, and it runs only while the button is
 * actually offered; it says which direction the control travels in. Reduced
 * motion drops it, and the fade with it.
 */
export default function ScrollToBottomButton({
  visible = false,
  onClick,
  label = 'Scroll to the latest message',
  className,
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center sm:bottom-5',
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        tabIndex={visible ? 0 : -1}
        aria-hidden={visible ? undefined : 'true'}
        aria-label={label}
        title={label}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border sm:h-10 sm:w-10',
          'border-[var(--tone-line-strong)] bg-white text-[var(--color-brand-deep)]',
          'shadow-[0_2px_10px_rgba(7,20,38,0.10)]',
          'transition-all duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
          'hover:border-[var(--color-brand-deep)] hover:bg-[var(--color-brand-deep)] hover:text-white',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
          visible
            ? 'pointer-events-auto translate-y-0 cursor-pointer opacity-100'
            : 'pointer-events-none translate-y-1.5 opacity-0',
        )}
      >
        <ArrowDown
          size={16}
          weight="bold"
          aria-hidden="true"
          className={cn('shrink-0', visible && 'animate-bounce motion-reduce:animate-none')}
        />
      </button>
    </div>
  )
}

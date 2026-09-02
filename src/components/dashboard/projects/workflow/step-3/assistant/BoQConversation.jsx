import { useCallback, useEffect, useRef, useState } from 'react'

import BoQAssistantEmptyState from '@/components/dashboard/projects/workflow/step-3/assistant/BoQAssistantEmptyState'
import BoQMessage from '@/components/dashboard/projects/workflow/step-3/assistant/BoQMessage'
import BoQResultHeaderControls from '@/components/dashboard/projects/workflow/step-3/assistant/BoQResultHeaderControls'
import AssistantTurnCard from '@/components/dashboard/projects/workflow/step-2/assistant/AssistantTurnCard'
import ScrollToBottomButton from '@/components/dashboard/projects/workflow/step-2/assistant/ScrollToBottomButton'
import {
  groupIntoTurns,
  isTurnSettled,
} from '@/components/dashboard/projects/workflow/step-2/assistant/assistantTurns'
import {
  ASSISTANT_GRID,
  ASSISTANT_GUTTER,
} from '@/components/dashboard/projects/workflow/step-2/assistant/assistantGrid'
import { MESSAGE_KINDS } from '@/lib/dashboard/workflow/step-3/boqAssistantState'
import { cn } from '@/lib/cn'

/** How close to the foot still counts as "following the transcript". */
const FOLLOW_THRESHOLD_PX = 96

/** How far up counts as "scrolled away", and so offers the jump control. */
const JUMP_THRESHOLD_PX = 220

/**
 * The BoQ Assistant conversation scroll region.
 *
 * Renders the centered onboarding empty state when no turns have occurred yet,
 * and seamlessly switches to the auto-scrolling message transcript once messages exist.
 */
export default function BoQConversation({
  state,
  busy,
  approvedResultId,
  onApprove,
  onRetry,
  onDeleteTurn,
  deletingTurnId = null,
  className,
}) {
  const scrollRef = useRef(null)
  const endRef = useRef(null)
  const followRef = useRef(true)
  const [showJump, setShowJump] = useState(false)

  const messages = state?.messages || []
  const count = messages.length
  const turns = groupIntoTurns(messages)

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
    endRef.current?.scrollIntoView({
      block: 'end',
      behavior: smooth ? 'smooth' : 'auto',
    })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const distanceFromFoot = el.scrollHeight - el.scrollTop - el.clientHeight
    followRef.current = distanceFromFoot <= FOLLOW_THRESHOLD_PX
    // Same measurement, one more reader. React bails out on an unchanged
    // value, so this does not re-render on every scroll event.
    setShowJump(distanceFromFoot > JUMP_THRESHOLD_PX)
  }, [])

  /**
   * Automatically scroll down to the bottom as soon as a new message is posted
   * or a generation run starts/updates.
   */
  useEffect(() => {
    followRef.current = true
    scrollToBottom(true)

    const timer = setTimeout(() => {
      scrollToBottom(true)
    }, 80)

    return () => clearTimeout(timer)
  }, [count, busy, scrollToBottom])

  // Centered empty state when no message has been sent
  if (count === 0) {
    return (
      <div className={cn('relative min-h-0 flex-1 overflow-y-auto', className)}>
        <div className={cn(ASSISTANT_GUTTER, 'flex min-h-full items-center justify-center py-8')}>
          <BoQAssistantEmptyState className={ASSISTANT_GRID} />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      {/* Top Faded Edge Gradient (Light & Subtle) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-6 sm:h-7 bg-gradient-to-b from-white/70 via-white/30 to-transparent"
      />

      {/* Scrollable Conversation Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn('flex h-full min-h-0 flex-col overflow-y-auto', className)}
      >
        <div
          className={cn(
            ASSISTANT_GUTTER,
            ASSISTANT_GRID,
            'flex flex-1 flex-col pb-0 pt-4 sm:pt-5',
          )}
        >
          {/* The transcript's outer boundary: two setting-out lines that run the
              WHOLE transcript, top to bottom, and no fill of its own.

              Transparent on purpose — the workspace backdrop reads through the
              conversation, and the only surface in here is the block the pointer
              is on (`AssistantTurnCard`). A panel fill made the first turns sit
              on white while later ones sat on the backdrop.

              `flex-1` and NOTHING ELSE for the height. `flex-1` is
              `flex: 1 1 0%`, so the item fills the scroller when the transcript
              is short, while the column flex item's automatic `min-height: auto`
              clamps it to its own content when the transcript is long. Adding
              `min-h-full` here OVERRIDES that automatic minimum: the panel then
              measures exactly one scroller height and the rest of the transcript
              overflows outside it, which is what cut these lines off partway
              down. Do not put a min-height back on this element or its parent. */}
          <div className="flex flex-1 flex-col gap-6 rounded-t-lg rounded-b-none border-x border-t border-blue-400/40 p-3.5 shadow-[0_-4px_20px_rgba(22,119,255,0.04)] sm:gap-7 sm:p-5">
            {turns.map((turn) => (
              <AssistantTurnCard
                key={turn.id}
                settled={isTurnSettled(turn)}
                onDelete={onDeleteTurn && (() => onDeleteTurn(turn))}
                deleting={deletingTurnId === turn.prompt?.id}
                prompt={
                  turn.prompt && (
                    <BoQMessage message={turn.prompt} busy={busy} onRetry={onRetry} />
                  )
                }
              >
                {turn.replies.map((message) => {
                  const result =
                    message.kind === MESSAGE_KINDS.result
                      ? (state.results[message.resultId] ?? null)
                      : null

                  const approved = Boolean(result) && approvedResultId === result.id

                  return (
                    <BoQMessage
                      key={message.id}
                      message={message}
                      busy={busy}
                      onRetry={onRetry}
                      headerActions={
                        result && (
                          <BoQResultHeaderControls
                            approved={approved}
                            busy={busy}
                            onApprove={() => onApprove(result)}
                          />
                        )
                      }
                    />
                  )
                })}
              </AssistantTurnCard>
            ))}

            <div ref={endRef} aria-hidden="true" />
          </div>
        </div>
      </div>

      <ScrollToBottomButton visible={showJump} onClick={() => scrollToBottom(true)} />
    </div>
  )
}



import { useCallback, useEffect, useRef } from 'react'

import BoQAssistantEmptyState from '@/components/dashboard/projects/workflow/step-3/assistant/BoQAssistantEmptyState'
import BoQMessage from '@/components/dashboard/projects/workflow/step-3/assistant/BoQMessage'
import BoQResult from '@/components/dashboard/projects/workflow/step-3/assistant/BoQResult'
import BoQResultHeaderControls from '@/components/dashboard/projects/workflow/step-3/assistant/BoQResultHeaderControls'
import AssistantTurnCard from '@/components/dashboard/projects/workflow/step-2/assistant/AssistantTurnCard'
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
  onAddRow,
  onDeleteRow,
  onRetry,
  onDeleteTurn,
  deletingTurnId = null,
  className,
}) {
  const scrollRef = useRef(null)
  const endRef = useRef(null)
  const followRef = useRef(true)

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
        className="h-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-6"
      >
        <div className="mx-auto w-full max-w-[56rem] flex flex-col gap-6">
          {/* Message stream, grouped into turns — the same sheet the 2D and
              3D assistants use, so one workspace family reads one way. */}
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
                  >
                    {result && (
                      <BoQResult
                        result={result}
                        onAddRow={onAddRow}
                        onDeleteRow={onDeleteRow}
                      />
                    )}
                  </BoQMessage>
                )
              })}
            </AssistantTurnCard>
          ))}

          <div ref={endRef} className="h-2" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}



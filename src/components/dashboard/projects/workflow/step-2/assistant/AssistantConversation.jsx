import { useCallback, useEffect, useRef } from 'react'

import AssistantEmptyState from '@/components/dashboard/projects/workflow/step-2/assistant/AssistantEmptyState'
import AssistantMessage from '@/components/dashboard/projects/workflow/step-2/assistant/AssistantMessage'
import AssistantResult from '@/components/dashboard/projects/workflow/step-2/assistant/AssistantResult'
import AssistantTurnCard from '@/components/dashboard/projects/workflow/step-2/assistant/AssistantTurnCard'
import ResultHeaderControls from '@/components/dashboard/projects/workflow/step-2/assistant/ResultHeaderControls'
import {
  groupIntoTurns,
  isTurnSettled,
} from '@/components/dashboard/projects/workflow/step-2/assistant/assistantTurns'
import {
  ASSISTANT_GRID,
  ASSISTANT_GUTTER,
} from '@/components/dashboard/projects/workflow/step-2/assistant/assistantGrid'
import { MESSAGE_KINDS } from '@/lib/dashboard/workflow/step-2/designAssistantState'
import { cn } from '@/lib/cn'

/** How close to the foot still counts as "following the transcript". */
const FOLLOW_THRESHOLD_PX = 96

/**
 * The conversation — the ONLY scrolling region in the workspace.
 *
 * The header and the composer are fixed siblings in a full-height column, so a
 * long transcript never pushes the composer off screen and the page itself
 * never scrolls.
 *
 * TWO states, and the empty one is a real layout rather than a first message.
 * There used to be a permanent greeting turn that stayed at the top of the
 * transcript forever, which meant an untouched workspace opened looking used,
 * with one small box pinned to the top-left of a very large white area. Empty
 * now centres its onboarding in the region; the moment a turn exists, the
 * transcript takes over.
 *
 * Both states sit on the shared content grid, so the transcript's left edge is
 * the same left edge as the back action above it and the prompt field below.
 */
export default function AssistantConversation({
  state,
  busy,
  approvedResultId,
  /** The one render marked Active — an explicit selection, else the newest. */
  baseResultId,
  onQuickPrompt,
  onExpand,
  onEdit,
  onSelect,
  onApprove,
  onRetry,
  onViewAngleChange,
  onDeleteTurn,
  deletingTurnId = null,
  className,
}) {
  const scrollRef = useRef(null)
  const endRef = useRef(null)
  const followRef = useRef(true)
  const count = state.messages.length
  const turns = groupIntoTurns(state.messages)

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

  if (count === 0) {
    return (
      <div className={cn('relative min-h-0 flex-1 overflow-y-auto', className)}>
        <div className={cn(ASSISTANT_GUTTER, 'flex min-h-full items-center justify-center py-8')}>
          <AssistantEmptyState
            busy={busy}
            onQuickPrompt={onQuickPrompt}
            className={ASSISTANT_GRID}
          />
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
        className={cn('h-full min-h-0 overflow-y-auto', className)}
      >
        <div
          className={cn(
            ASSISTANT_GUTTER,
            ASSISTANT_GRID,
            'flex flex-col gap-6 py-6 sm:gap-7 sm:py-7',
          )}
        >
          {turns.map((turn) => (
            <AssistantTurnCard
              key={turn.id}
              settled={isTurnSettled(turn)}
              onDelete={onDeleteTurn && (() => onDeleteTurn(turn))}
              deleting={deletingTurnId === turn.prompt?.id}
              prompt={
                turn.prompt && (
                  <AssistantMessage message={turn.prompt} busy={busy} onRetry={onRetry} />
                )
              }
            >
              {turn.replies.map((message) => {
                /* A result turn is the message AND the render it points at.
                   Both the header controls and the figure are handed the same
                   object, so they cannot disagree about which render they act
                   on. */
                const result =
                  message.kind === MESSAGE_KINDS.result
                    ? (state.results[message.resultId] ?? null)
                    : null

                const approved = Boolean(result) && approvedResultId === result.id

                return (
                  <AssistantMessage
                    key={message.id}
                    message={message}
                    busy={busy}
                    onRetry={onRetry}
                    headerActions={
                      result && (
                        <ResultHeaderControls
                          viewAngleId={result.viewAngleId || state.viewAngleId}
                          onViewAngleChange={onViewAngleChange}
                          approved={approved}
                          busy={busy}
                          onApprove={() => onApprove(result)}
                          onEdit={() => onEdit(result)}
                        />
                      )
                    }
                  >
                    {result && (
                      <AssistantResult
                        result={result}
                        approved={approved}
                        isBase={baseResultId === result.id}
                        onExpand={() => onExpand(result)}
                        onSelect={() => onSelect(result)}
                      />
                    )}
                  </AssistantMessage>
                )
              })}
            </AssistantTurnCard>
          ))}

          <div ref={endRef} aria-hidden="true" />
        </div>
      </div>

      {/* Bottom Faded Edge Gradient (Light & Subtle) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-6 sm:h-7 bg-gradient-to-t from-white/70 via-white/30 to-transparent"
      />
    </div>
  )
}

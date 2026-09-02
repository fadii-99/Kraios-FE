import { useCallback, useEffect, useRef, useState } from 'react'

import FloorPlanAssistantEmptyState from '@/components/dashboard/projects/workflow/step-1/assistant/FloorPlanAssistantEmptyState'
import FloorPlanAssistantResult from '@/components/dashboard/projects/workflow/step-1/assistant/FloorPlanAssistantResult'
import AssistantMessage from '@/components/dashboard/projects/workflow/step-2/assistant/AssistantMessage'
import AssistantTurnCard from '@/components/dashboard/projects/workflow/step-2/assistant/AssistantTurnCard'
import ScrollToBottomButton from '@/components/dashboard/projects/workflow/step-2/assistant/ScrollToBottomButton'
import ResultHeaderControls from '@/components/dashboard/projects/workflow/step-2/assistant/ResultHeaderControls'
import {
  groupIntoTurns,
  isTurnSettled,
} from '@/components/dashboard/projects/workflow/step-2/assistant/assistantTurns'
import {
  ASSISTANT_GRID,
  ASSISTANT_GUTTER,
} from '@/components/dashboard/projects/workflow/step-2/assistant/assistantGrid'
import { MESSAGE_KINDS } from '@/lib/dashboard/workflow/step-1/floorPlanAssistantState'
import { cn } from '@/lib/cn'

const FOLLOW_THRESHOLD_PX = 96

/** How far up counts as "scrolled away", and so offers the jump control. */
const JUMP_THRESHOLD_PX = 220

/**
 * 2D Floor Plan Assistant Conversation Workspace.
 */
export default function FloorPlanAssistantConversation({
  state,
  busy,
  approvedResultId,
  baseResultId,
  onQuickPrompt,
  onExpand,
  onEdit,
  onSelect,
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

  if (count === 0) {
    return (
      <div className={cn('relative min-h-0 flex-1 overflow-y-auto', className)}>
        <div className={cn(ASSISTANT_GUTTER, 'flex min-h-full items-center justify-center py-8')}>
          <FloorPlanAssistantEmptyState
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
      {/* Top Faded Edge Gradient */}
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
                    <AssistantMessage message={turn.prompt} busy={busy} onRetry={onRetry} />
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
                    <AssistantMessage
                      key={message.id}
                      message={message}
                      busy={busy}
                      onRetry={onRetry}
                      headerActions={
                        result && (
                          <ResultHeaderControls
                            approved={approved}
                            busy={busy}
                            onApprove={() => onApprove(result)}
                            onEdit={() => onEdit(result)}
                          />
                        )
                      }
                    >
                      {result && (
                        <FloorPlanAssistantResult
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
      </div>

      {/* Bottom Faded Edge Gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-6 sm:h-7 bg-gradient-to-t from-white/70 via-white/30 to-transparent"
      />

      <ScrollToBottomButton visible={showJump} onClick={() => scrollToBottom(true)} />
    </div>
  )
}

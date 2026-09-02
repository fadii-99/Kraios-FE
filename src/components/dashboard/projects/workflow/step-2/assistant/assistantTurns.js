/**
 * Grouping a flat transcript into TURNS.
 *
 * The reducers and the adapters both speak in a flat list of messages, which is
 * the right shape for hydration: one server record becomes one entry, in order.
 * The workspace, though, reads in pairs — an instruction and whatever it
 * produced — and that pair is what the user acts on as a unit, and now deletes
 * as a unit.
 *
 * So the grouping lives HERE, in the view layer, rather than in the state: a
 * turn is derived on render and owns no truth of its own. A user message opens
 * a turn; every assistant block that follows — the pending line, the failure
 * notice, the result — belongs to it until the next user message.
 *
 * A transcript may legitimately open with assistant blocks (a job resumed from
 * a previous session, say). Those become a LEADING turn with no prompt, which
 * is why `prompt` is nullable and why both the sheet and the delete control are
 * bound to a settled, prompt-bearing turn.
 *
 * All three assistants spell their message kinds identically (`text`, `result`,
 * `pending`, `notice`), so this module reads the literals and stays usable by
 * Steps 1, 2 and 3 without being handed a kind map.
 */

const PENDING = 'pending'
const NOTICE = 'notice'

export function groupIntoTurns(messages = []) {
  const turns = []

  messages.forEach((message) => {
    if (message.role === 'user') {
      turns.push({ id: `turn-${message.id}`, prompt: message, replies: [] })
      return
    }

    const current = turns[turns.length - 1]

    if (!current) {
      turns.push({ id: `turn-lead-${message.id}`, prompt: null, replies: [message] })
      return
    }

    current.replies.push(message)
  })

  return turns
}

/**
 * Whether a turn ANSWERED — the test the sheet and the delete control both use.
 *
 * Only a settled turn gets a surface of its own. While a job runs there is
 * nothing to keep yet, and a run that failed produced nothing to delete; giving
 * either a card would draw a finished-looking container around work that is not
 * finished, and offering delete on them would point the endpoint at a block the
 * backend may still be writing.
 *
 * Settled therefore means: the turn has replies, none of them is a pending
 * block, and none is a failure notice (a notice carrying a `retry` payload).
 * That covers all three assistants — a 2D/3D result, a BOQ table, and the BoQ
 * assistant's own text answers alike.
 */
export function isTurnSettled(turn) {
  if (!turn?.prompt) return false
  if (!turn.replies?.length) return false

  return turn.replies.every(
    (reply) => reply.kind !== PENDING && !(reply.kind === NOTICE && reply.retry),
  )
}

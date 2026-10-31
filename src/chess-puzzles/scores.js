// Sends finished runs to the laptop's leaderboard (POST /api/chess/scores). If the network is down,
// the score waits in this phone's storage and is sent later; the game never depends on it.
const KEY = 'chess-ladder:pending'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-20)))
  } catch {
    /* storage full / private mode: the score is simply not retried */
  }
}

/** Queue a result and try to send everything waiting. */
export function submitScore({ nickname, level, time }) {
  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  save([...load(), { nickname, level, time, runId }])
  return flushScores()
}

let flushing = null
/** Try to send queued scores; resolves to true when nothing is left waiting. */
export function flushScores() {
  if (flushing) return flushing
  flushing = (async () => {
    let list = load()
    for (const entry of [...list]) {
      try {
        const res = await fetch('/api/chess/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
        if (!res.ok && res.status !== 400) break // server trouble: keep it for later
        list = list.filter((e) => e.runId !== entry.runId) // sent (or rejected for good)
        save(list)
      } catch {
        break // offline: try again later
      }
    }
    return list.length === 0
  })().finally(() => {
    flushing = null
  })
  return flushing
}

export const hasPending = () => load().length > 0

// Today's best results, kept in localStorage on the booth laptop (reset automatically each day).
const KEY = 'india-football:records'
const today = () => new Date().toISOString().slice(0, 10)
const empty = () => ({ date: today(), matches: 0, biggestWin: null, mostGoals: null })

export function getTodayRecords() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return r?.date === today() ? r : empty()
  } catch {
    return empty()
  }
}

/**
 * Store a finished match. Returns the record names it broke, e.g. ['biggestWin'].
 * @param {{ score: {p1:number,p2:number}, winnerName: string|null, names: {p1:string,p2:string} }} m
 */
export function recordMatch({ score, winnerName, names }) {
  const r = getTodayRecords()
  const broken = []
  r.matches++
  const margin = Math.abs(score.p1 - score.p2)
  const total = score.p1 + score.p2
  if (winnerName && (!r.biggestWin || margin > r.biggestWin.margin)) {
    r.biggestWin = { margin, score, winnerName, names }
    broken.push('biggestWin')
  }
  if (total > 0 && (!r.mostGoals || total > r.mostGoals.total)) {
    r.mostGoals = { total, score, names }
    broken.push('mostGoals')
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(r))
  } catch {
    /* storage unavailable */
  }
  return broken
}

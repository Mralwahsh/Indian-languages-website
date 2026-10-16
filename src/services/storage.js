// localStorage wrapper that never throws (private mode, blocked storage, etc.)
function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function getTodaysHighScore() {
  try {
    const raw = JSON.parse(localStorage.getItem('india-speaks:highscore') ?? 'null')
    return raw?.date === todayKey() ? raw.score : 0
  } catch {
    return 0
  }
}

/** Saves the score if it beats today's best. Returns true when it's a new record. */
export function submitScore(score) {
  const best = getTodaysHighScore()
  if (score <= best) return false
  try {
    localStorage.setItem('india-speaks:highscore', JSON.stringify({ date: todayKey(), score }))
  } catch {
    /* ignore */
  }
  return true
}

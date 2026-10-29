// Best scores and settings, kept on this phone only (localStorage may be unavailable: never fail).
const KEY = 'raga-tiles:v1'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* private mode or storage full: scores just aren't kept */
  }
}

export function getBest(songId, difficulty) {
  return read().best?.[`${songId}:${difficulty}`] ?? null // { score, stars }
}

/** @returns true if this is a new best */
export function saveBest(songId, difficulty, score, stars) {
  const data = read()
  data.best ??= {}
  const key = `${songId}:${difficulty}`
  const old = data.best[key]
  if (old && old.score >= score) return false
  data.best[key] = { score, stars: Math.max(stars, old?.stars ?? 0) }
  write(data)
  return true
}

export const getSetting = (name, fallback) => read().settings?.[name] ?? fallback

export function setSetting(name, value) {
  const data = read()
  data.settings ??= {}
  data.settings[name] = value
  write(data)
}

import { EASY_MIN_GAP, HOLD_MIN, LANES, SCORE, TILE_SEC } from './config.js'
import { assignLanes } from './lanes.js'

/**
 * Loads public/songs/index.json and every song in it, all at once (the game must work offline afterwards).
 * Song file: { id, title, titleAr?, titleNative?, mode: 'respectful'|'classic', tempo, about?, notes: [{pitch, time, dur, lane?, onBeat?, hold?}] }
 */
export async function loadSongs(onProgress = () => {}) {
  const getJson = async (url) => {
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
    return res.json()
  }
  const index = await getJson('/songs/index.json')
  let done = 0
  const songs = await Promise.all(
    index.songs.map(async (file) => {
      const song = await getJson(`/songs/${file}`)
      onProgress(++done / index.songs.length)
      return song
    }),
  )
  // the national anthem (respectful songs) always comes first
  return songs.filter(Boolean).sort((a, b) => (a.mode === 'respectful' ? 0 : 1) - (b.mode === 'respectful' ? 0 : 1))
}

const isOnBeat = (time, tempo) => {
  const beats = time / (60 / (tempo || 100))
  const frac = beats - Math.floor(beats)
  return frac < 0.08 || frac > 0.92
}

/**
 * Turns a song into tiles for one difficulty.
 * Normal: one tile per melody note. Easy: only notes on the beat, spaced out; the notes in between
 * become "fillers" that the game plays after the tile before them, so the melody stays complete.
 */
export function buildChart(song, difficulty = 'normal') {
  const notes = [...song.notes].sort((a, b) => a.time - b.time)
  let tileNotes
  if (difficulty === 'easy') {
    tileNotes = []
    let last = -Infinity
    for (const n of notes) {
      const onBeat = n.onBeat ?? isOnBeat(n.time, song.tempo)
      if (onBeat && n.time - last >= EASY_MIN_GAP) {
        tileNotes.push(n)
        last = n.time
      }
    }
    // a song with few notes on the beat: fall back to every other note
    if (tileNotes.length < notes.length * 0.3) tileNotes = notes.filter((_, i) => i % 2 === 0)
    tileNotes = assignLanes(tileNotes, { lanes: LANES, tileSec: TILE_SEC, holdMin: HOLD_MIN })
  } else {
    tileNotes = notes.every((n) => Number.isInteger(n.lane) && n.lane >= 0 && n.lane < LANES) ? notes : assignLanes(notes, { lanes: LANES, tileSec: TILE_SEC, holdMin: HOLD_MIN })
  }

  const tiles = tileNotes.map((n) => ({ t: n.time, d: n.dur, pitch: n.pitch, lane: n.lane, hold: n.hold ?? n.dur >= HOLD_MIN, fillers: [] }))
  if (difficulty === 'easy') {
    const kept = new Set(tileNotes.map((n) => n.time))
    let k = -1
    for (const n of notes) {
      while (k + 1 < tiles.length && tiles[k + 1].t <= n.time + 1e-6) k++
      if (k >= 0 && !kept.has(n.time)) tiles[k].fillers.push({ pitch: n.pitch, dt: n.time - tiles[k].t, dur: n.dur })
    }
  }

  const end = notes.reduce((m, n) => Math.max(m, n.time + n.dur), 0)
  return { tiles, notes, end, maxScore: maxScore(tiles) }
}

export const comboMult = (combo) => Math.min(SCORE.comboMaxMult, 1 + Math.floor(combo / SCORE.comboStep) * SCORE.comboBonus)

function maxScore(tiles) {
  let total = 0
  tiles.forEach((t, i) => {
    total += SCORE.perfect * comboMult(i + 1)
    if (t.hold) total += SCORE.holdPerSecond * t.d
  })
  return Math.round(total)
}

/** Every pitch any loaded song uses (the piano is synthesized only for those). */
export const pitchesOf = (songs) => [...new Set(songs.flatMap((s) => s.notes.map((n) => n.pitch)))].sort((a, b) => a - b)

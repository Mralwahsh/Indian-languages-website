// Spreads a melody over the lanes so it is fun and always playable.
// Used by the MIDI converter (scripts/midi-to-song.js) and by the game for Easy charts.
//
// Rules:
//   • a tile never lands in a lane that is still busy (a hold tile, or a tile that is still passing)
//   • fast notes move at most one lane, medium-fast ones at most two (no impossible jumps)
//   • the lane moves in the direction of the melody (higher note → further right) when it can
//   • a repeated note may stay in its lane only if there is time; never three times in a row
//   • all four lanes get used (a gentle pull towards the lanes used least so far)
//   • a little seeded randomness, so patterns don't feel mechanical but stay the same every time

/** Small deterministic random generator (mulberry32). */
function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * @param {{time:number, dur:number, pitch:number}[]} notes melody, one note at a time, sorted by time
 * @param {{lanes?:number, seed?:number, tileSec?:number, holdMin?:number}} [opts]
 * @returns the same notes (copies) with a `lane` (0 … lanes-1)
 */
export function assignLanes(notes, { lanes = 4, seed = 7, tileSec = 0.3, holdMin = 0.55 } = {}) {
  const rand = seeded(seed)
  const busyUntil = new Array(lanes).fill(-Infinity)
  const used = new Array(lanes).fill(0)
  const out = []
  let prev = null
  let prevLane = Math.floor(lanes / 2) - (rand() < 0.5 ? 1 : 0)
  let run = 0

  for (const n of notes) {
    const free = (l) => busyUntil[l] <= n.time - 0.06
    let lane = prevLane
    if (prev) {
      const gap = n.time - prev.time
      const maxStep = gap < 0.22 ? 1 : gap < 0.45 ? 2 : lanes - 1
      const dir = Math.sign(n.pitch - prev.pitch)
      let best = null
      for (let l = 0; l < lanes; l++) {
        const step = l - prevLane
        if (!free(l) || Math.abs(step) > maxStep) continue
        if (step === 0 && (dir !== 0 || gap < 0.32 || run >= 2)) continue
        let cost = Math.abs(step) // small moves are easier to play
        if (dir !== 0 && Math.sign(step) !== dir) cost += 3 // follow the melody up/down
        if (dir === 0 && step !== 0) cost += 0.5
        cost += Math.max(-1, Math.min(1.5, (used[l] - out.length / lanes) * 0.3))
        cost += rand() * 0.9
        if (!best || cost < best.cost) best = { cost, l }
      }
      if (best) lane = best.l
      else {
        // nothing fits the rules: take the free lane closest to the last one, else the one that frees up first
        const byDistance = [...Array(lanes).keys()].filter((l) => l !== prevLane && free(l)).sort((a, b) => Math.abs(a - prevLane) - Math.abs(b - prevLane))
        lane = byDistance[0] ?? busyUntil.indexOf(Math.min(...busyUntil))
      }
    }
    run = prev && lane === prevLane ? run + 1 : 0
    busyUntil[lane] = n.time + Math.max(tileSec, (n.hold ?? n.dur >= holdMin) ? n.dur : 0)
    used[lane]++
    out.push({ ...n, lane })
    prev = n
    prevLane = lane
  }
  return out
}

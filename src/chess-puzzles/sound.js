// Tiny generated sounds (Web Audio, no files): move, correct, wrong, level up. Muting is remembered.
const KEY = 'chess-ladder:muted'
let ctx = null
let muted = (() => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
})()

export const isMuted = () => muted
export function setMuted(m) {
  muted = m
  try {
    localStorage.setItem(KEY, m ? '1' : '0')
  } catch {
    /* not saved */
  }
}

/** Call from a tap: browsers only allow sound after a user gesture. */
export function unlockSound() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {})
}

function tone(freq, start, dur, { type = 'sine', vol = 0.18, glide = 0 } = {}) {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, start)
  if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, start + dur)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(vol, start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.connect(g).connect(ctx.destination)
  o.start(start)
  o.stop(start + dur + 0.02)
}

function click(start, vol = 0.35) {
  const len = Math.floor(ctx.sampleRate * 0.05)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.12))
  const src = ctx.createBufferSource()
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 1800
  const g = ctx.createGain()
  g.gain.value = vol
  src.buffer = buf
  src.connect(f).connect(g).connect(ctx.destination)
  src.start(start)
}

export function play(kind) {
  if (muted || !ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  if (kind === 'move') click(t)
  else if (kind === 'correct') {
    tone(660, t, 0.18)
    tone(990, t + 0.1, 0.3)
  } else if (kind === 'wrong') tone(220, t, 0.32, { type: 'triangle', vol: 0.22, glide: 0.6 })
  else if (kind === 'level') [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.08, 0.28, { vol: 0.14 }))
  else if (kind === 'lost') [392, 330, 262].forEach((f, i) => tone(f, t + i * 0.18, 0.4, { type: 'triangle', vol: 0.14 }))
}

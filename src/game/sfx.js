// Tiny synthesised sound effects (Web Audio API): no audio files, works offline.
// Browsers only allow sound after a click/key press on the laptop page, so the booth
// operator should click once (e.g. the fullscreen button) before the first match.
const KEY = 'india-football:muted'
let ctx = null
let muted = (() => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
})()

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    const unlock = () => ctx.state === 'suspended' && ctx.resume()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
  }
  return ctx
}

function tone({ type = 'sine', from, to = from, duration = 0.15, gain = 0.25, delay = 0 }) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(g).connect(a.destination)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

function noise({ duration = 0.1, gain = 0.3, freq = 800, q = 0.8, sweepTo, delay = 0 }) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + delay
  const len = Math.ceil(a.sampleRate * duration)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = a.createBufferSource()
  src.buffer = buf
  const filter = a.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = q
  filter.frequency.setValueAtTime(freq, t)
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + duration)
  const g = a.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  src.connect(filter).connect(g).connect(a.destination)
  src.start(t)
}

const SOUNDS = {
  whoosh: () => noise({ duration: 0.1, gain: 0.08, freq: 700, sweepTo: 2200, q: 1.2 }),
  kick: () => {
    tone({ type: 'sine', from: 150, to: 50, duration: 0.14, gain: 0.55 })
    noise({ duration: 0.06, gain: 0.3, freq: 1200 })
  },
  header: () => tone({ type: 'sine', from: 220, to: 120, duration: 0.1, gain: 0.35 }),
  bounce: () => tone({ type: 'sine', from: 180, to: 90, duration: 0.08, gain: 0.2 }),
  post: () => {
    tone({ type: 'triangle', from: 980, to: 900, duration: 0.35, gain: 0.12 })
    tone({ type: 'triangle', from: 1480, to: 1400, duration: 0.25, gain: 0.06 })
  },
  goal: () => {
    noise({ duration: 1.6, gain: 0.18, freq: 900, sweepTo: 1600, q: 0.5 }) // crowd roar
    ;[523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', from: f, duration: 0.3, gain: 0.12, delay: i * 0.1 }))
  },
  whistle: () => {
    tone({ type: 'square', from: 2600, to: 2500, duration: 0.18, gain: 0.05 })
    tone({ type: 'square', from: 2600, to: 2450, duration: 0.45, gain: 0.05, delay: 0.22 })
  },
  beep: () => tone({ type: 'square', from: 660, duration: 0.12, gain: 0.08 }),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', from: f, duration: 0.25, gain: 0.12, delay: i * 0.12 })),
}

export const sfx = {
  play(name) {
    if (muted) return
    try {
      SOUNDS[name]?.()
    } catch {
      /* audio not available */
    }
  },
  isMuted: () => muted,
  toggle() {
    muted = !muted
    try {
      localStorage.setItem(KEY, muted ? '1' : '0')
    } catch {
      /* ignore */
    }
    return muted
  },
}

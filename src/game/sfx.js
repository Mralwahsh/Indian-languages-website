// Tiny synthesised sound effects (Web Audio API): no audio files, works offline.
// Browsers only allow sound after a click/key press on the laptop page, so the booth
// operator should click once (e.g. the fullscreen button) before the first match.
const KEY = 'india-fighters:muted'
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
  whoosh: () => noise({ duration: 0.12, gain: 0.12, freq: 600, sweepTo: 2400, q: 1.2 }),
  punch: () => {
    tone({ type: 'sine', from: 160, to: 60, duration: 0.12, gain: 0.5 })
    noise({ duration: 0.07, gain: 0.35, freq: 900 })
  },
  kick: () => {
    tone({ type: 'sine', from: 120, to: 40, duration: 0.18, gain: 0.6 })
    noise({ duration: 0.1, gain: 0.35, freq: 600 })
  },
  block: () => {
    tone({ type: 'square', from: 900, to: 700, duration: 0.07, gain: 0.08 })
    tone({ type: 'triangle', from: 1400, to: 1200, duration: 0.1, gain: 0.08 })
  },
  special: () => tone({ type: 'sawtooth', from: 220, to: 880, duration: 0.3, gain: 0.08 }),
  ko: () => {
    tone({ type: 'sine', from: 90, to: 30, duration: 0.7, gain: 0.7 })
    noise({ duration: 0.5, gain: 0.3, freq: 300, sweepTo: 80 })
  },
  beep: () => tone({ type: 'square', from: 660, duration: 0.12, gain: 0.08 }),
  go: () => {
    tone({ type: 'square', from: 523, duration: 0.12, gain: 0.08 })
    tone({ type: 'square', from: 784, duration: 0.3, gain: 0.09, delay: 0.12 })
  },
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

import { PIANO } from './config.js'

const SR = PIANO.sampleRate

/**
 * A piano-like note, synthesized (no recordings): a sum of slightly stretched harmonics
 * (real strings are a little inharmonic), each fading at its own rate, two strings a hair apart,
 * a quick first drop then a long tail, and a short soft "hammer" tap at the start.
 * Oscillators are advanced by rotation instead of Math.sin, so a note takes a few milliseconds.
 * @returns {Float32Array} mono samples at PIANO.sampleRate
 */
export function synthPiano(pitch) {
  const f0 = 440 * 2 ** ((pitch - 69) / 12)
  const len = Math.floor(SR * (pitch < 60 ? 2.4 : pitch < 74 ? 2.0 : 1.5))
  const out = new Float32Array(len)
  const B = 0.0003 * 2 ** ((pitch - 60) / 18) // inharmonicity grows with pitch
  const harmonics = Math.max(3, Math.min(12, Math.floor(7000 / f0)))
  const tau0 = 1.5 * 0.5 ** ((pitch - 60) / 30) // high notes ring shorter

  for (let h = 1; h <= harmonics; h++) {
    const fh = f0 * h * Math.sqrt(1 + B * h * h)
    if (fh > SR * 0.45) break
    // uneven partial strengths (where the hammer strikes the string)
    const amp = h ** -1.1 * (1 + 0.35 * Math.sin(h * 2.1)) * 0.5
    const tau = tau0 / (1 + 0.5 * (h - 1))
    for (const detune of [1, 1.0009]) {
      const w = (2 * Math.PI * fh * detune) / SR
      const c = Math.cos(w)
      const s = Math.sin(w)
      const r = Math.exp(-1 / (tau * SR))
      let x = 1
      let y = 0
      let a = amp
      for (let i = 0; i < len; i++) {
        out[i] += a * y
        const nx = x * c - y * s
        y = x * s + y * c
        x = nx
        a *= r
      }
    }
  }

  // envelope: 3 ms attack, fast first drop then a long tail; hammer noise in the first ~15 ms
  const attack = Math.floor(SR * 0.003)
  let noise = 0
  let peak = 0
  for (let i = 0; i < len; i++) {
    const t = i / SR
    const env = (i < attack ? i / attack : 1) * (0.5 * Math.exp(-t / 0.22) + 0.5)
    noise = noise * 0.7 + (Math.random() * 2 - 1) * 0.3 // soft low-passed noise
    out[i] = out[i] * env + noise * 0.12 * Math.exp(-t / 0.006)
    peak = Math.max(peak, Math.abs(out[i]))
  }
  const gain = 0.9 / (peak || 1)
  for (let i = 0; i < len; i++) out[i] *= gain
  // fade the very end so cutting it off never clicks
  const tail = Math.floor(SR * 0.05)
  for (let i = 0; i < tail; i++) out[len - 1 - i] *= i / tail
  return out
}

/** Short low "thud" for a lost round in classic mode (never used in respectful mode). */
function synthThud() {
  const len = Math.floor(SR * 0.45)
  const out = new Float32Array(len)
  let noise = 0
  for (let i = 0; i < len; i++) {
    const t = i / SR
    noise = noise * 0.92 + (Math.random() * 2 - 1) * 0.08
    out[i] = (0.5 * Math.sin(2 * Math.PI * 73 * t) + 0.35 * Math.sin(2 * Math.PI * 77.8 * t) + noise * 1.5) * Math.exp(-t / 0.12) * 0.8
  }
  return out
}

/**
 * The game's piano. Samples are synthesized while the page loads (no AudioContext yet, so no
 * autoplay warnings); the AudioContext is created by the player's first tap.
 * All timing uses the AudioContext clock (`now`).
 */
export class Piano {
  constructor() {
    this.samples = new Map() // pitch → Float32Array
    this.buffers = new Map() // pitch → AudioBuffer (after unlock)
    this.thudSamples = synthThud()
    this.ctx = null
  }

  /** Synthesize every pitch the songs need, yielding between notes so the loading bar can move. */
  async prepare(pitches, onProgress = () => {}) {
    let done = 0
    for (const p of pitches) {
      if (!this.samples.has(p)) this.samples.set(p, synthPiano(p))
      onProgress(++done / pitches.length)
      await new Promise((r) => setTimeout(r, 0))
    }
  }

  /** Must run inside a tap handler (browsers only allow sound after a user gesture). */
  async unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      this.ctx = new AC({ latencyHint: 'interactive' })
      const comp = this.ctx.createDynamicsCompressor()
      comp.threshold.value = -14
      comp.ratio.value = 4
      this.master = this.ctx.createGain()
      this.master.gain.value = PIANO.volume
      this.master.connect(comp).connect(this.ctx.destination)
      for (const [p, data] of this.samples) this.buffers.set(p, this.toBuffer(data))
      this.thud = this.toBuffer(this.thudSamples)
    }
    if (this.ctx.state !== 'running') await this.ctx.resume().catch(() => {})
    // iOS: play one silent sample inside the gesture to fully unlock output
    const src = this.ctx.createBufferSource()
    src.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate)
    src.connect(this.ctx.destination)
    src.start()
  }

  toBuffer(data) {
    const buf = this.ctx.createBuffer(1, data.length, SR)
    buf.copyToChannel(data, 0)
    return buf
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000
  }

  /** How late sound comes out of the speaker (the tiles are shifted by this in respectful mode). */
  get latency() {
    if (!this.ctx) return 0
    return Math.min(0.3, (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0))
  }

  /**
   * Play a note at audio time `when`. With `dur` it lets go after that long; without, it rings
   * until `stop()` (or fades out by itself, like a held piano key).
   */
  play(pitch, when = this.now, { dur = null, vel = 0.9 } = {}) {
    if (!this.ctx) return { stop() {} }
    let buf = this.buffers.get(pitch)
    if (!buf) {
      // a pitch nobody prepared (shouldn't happen): make it now
      this.samples.set(pitch, synthPiano(pitch))
      buf = this.toBuffer(this.samples.get(pitch))
      this.buffers.set(pitch, buf)
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vel, when)
    src.connect(g).connect(this.master)
    src.start(when)
    const release = (at) => {
      if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(at)
      else {
        g.gain.cancelScheduledValues(at)
        g.gain.setValueAtTime(vel, at)
      }
      g.gain.setTargetAtTime(0, at, 0.07)
      try {
        src.stop(at + 0.5)
      } catch {
        /* already stopped */
      }
    }
    if (dur != null) release(when + Math.max(0.12, dur))
    return { stop: (at = this.now) => release(Math.max(at, when)) }
  }

  playThud() {
    if (!this.ctx) return
    const src = this.ctx.createBufferSource()
    src.buffer = this.thud
    src.connect(this.master)
    src.start()
  }

  suspend() {
    return this.ctx?.suspend().catch(() => {})
  }

  resume() {
    return this.ctx?.resume().catch(() => {})
  }
}

import { LOOK, MOVE, STICKS, ZOOM } from '../config.js'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
// ?timer=1 drives the loop with setTimeout (for testing in a background tab, where animation frames pause)
const useTimer = typeof location !== 'undefined' && new URLSearchParams(location.search).has('timer')
const nextFrame = (fn) => (useTimer ? setTimeout(() => fn(performance.now()), 16) : requestAnimationFrame(fn))
const cancelFrame = (id) => (useTimer ? clearTimeout(id) : cancelAnimationFrame(id))
/** Smallest signed difference between two angles in degrees (-180..180]. */
export const angleDiff = (a, b) => ((((a - b) % 360) + 540) % 360) - 180
const shape = (v) => {
  const m = Math.abs(v)
  if (m < STICKS.deadZone) return 0
  const t = (m - STICKS.deadZone) / (1 - STICKS.deadZone)
  return Math.sign(v) * Math.pow(t, LOOK.curve)
}

/**
 * Base class for tour providers (local 360° photos, Google Street View).
 * It owns the "feel": smoothed look velocity, hold-to-zoom, smooth turn-around and
 * link-based walking. Subclasses only implement the primitives below.
 *
 * Subclass primitives:
 *   async mount(el, place)       create the viewer and show `place`
 *   async loadPlace(place)       switch to another place
 *   getView() → {yaw, pitch}     degrees; yaw clockwise
 *   setView({yaw, pitch})
 *   getZoom() / setZoom(level)   0..100
 *   getLinks() → [{ id, yaw }]   walkable neighbours, yaw in degrees
 *   async goTo(link) → boolean   walk along a link
 *   viewpointName() → string|null name of the current viewpoint (optional)
 *   viewLimits() → {minYaw, maxYaw, minPitch, maxPitch, minZoom}|null  for photos that don't cover 360° (optional)
 *   destroyViewer()
 */
export class TourProvider {
  constructor() {
    this.look = { x: 0, y: 0, vx: 0, vy: 0, at: 0 }
    this.zoomDir = 0
    this.turn = null // { from, to, start }
    this.walking = false
    this.raf = 0
    this.last = 0
    this.loop = this.loop.bind(this)
  }

  startLoop() {
    this.last = performance.now()
    this.raf = nextFrame(this.loop)
  }

  /** Analog look stick: x, y in -1..1 (sent ~30×/s while touched, {0,0} on release). */
  setLookVelocity(x, y) {
    this.look.x = clamp(x, -1, 1)
    this.look.y = clamp(y, -1, 1)
    this.look.at = performance.now()
  }

  /** Hold-to-zoom: +1 in, -1 out, 0 stop. */
  setZoomVelocity(dir) {
    this.zoomDir = Math.sign(dir)
  }

  /** Smooth 180° turn. */
  turnAround() {
    if (this.turn) return
    const { yaw } = this.getView()
    this.turn = { from: yaw, to: yaw + 180, start: performance.now() }
  }

  /**
   * Walk to the neighbour closest to 'forward' (view direction), 'left' or 'right'.
   * @returns {Promise<boolean>} true if we moved, false if there is no path that way
   */
  async step(direction) {
    if (this.walking || this.turn) return false
    const { yaw } = this.getView()
    const target = yaw + (direction === 'left' ? -90 : direction === 'right' ? 90 : 0)
    const tolerance = direction === 'forward' ? MOVE.forwardTolerance : MOVE.sideTolerance
    let best = null
    for (const link of this.getLinks()) {
      const d = Math.abs(angleDiff(link.yaw, target))
      if (d <= tolerance && (!best || d < best.d)) best = { link, d }
    }
    if (!best) return false
    this.walking = true
    try {
      // never stay stuck "walking" if a photo fails to load or a transition never ends
      const giveUp = new Promise((resolve) => setTimeout(() => resolve(false), MOVE.stepTimeoutMs))
      return await Promise.race([this.goTo(best.link), giveUp])
    } finally {
      this.walking = false
    }
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    // a lost "release" packet must not leave the camera spinning
    const stale = now - this.look.at > STICKS.staleMs
    const tx = stale ? 0 : shape(this.look.x)
    const ty = stale ? 0 : shape(this.look.y) * (LOOK.invertY ? 1 : -1)
    // ease towards the stick (frame-rate independent)
    const k = 1 - Math.pow(1 - LOOK.smoothing, dt * 60)
    this.look.vx += (tx - this.look.vx) * k
    this.look.vy += (ty - this.look.vy) * k
    if (Math.abs(this.look.vx) < 0.001) this.look.vx = 0
    if (Math.abs(this.look.vy) < 0.001) this.look.vy = 0

    if (!this.walking) {
      const view = this.getView()
      let { yaw, pitch } = view
      if (this.turn) {
        const t = Math.min(1, (now - this.turn.start) / MOVE.turnAroundMs)
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 // ease in-out
        yaw = this.turn.from + (this.turn.to - this.turn.from) * e
        if (t >= 1) this.turn = null
      } else {
        yaw += this.look.vx * LOOK.maxYawSpeed * dt
      }
      pitch = clamp(pitch + this.look.vy * LOOK.maxPitchSpeed * dt, LOOK.minPitch, LOOK.maxPitch)
      const lim = this.viewLimits?.()
      if (lim) {
        // partial panorama: keep the view inside the photo (yaw measured around its centre)
        if (Number.isFinite(lim.maxYaw)) {
          yaw = clamp(angleDiff(yaw, 0), lim.minYaw, lim.maxYaw)
          this.turn = null // no turning around in a photo that doesn't go all the way round
        }
        pitch = clamp(pitch, lim.minPitch, lim.maxPitch)
        if (this.getZoom() < lim.minZoom - 0.5) this.setZoom(lim.minZoom)
      }
      if (yaw !== view.yaw || pitch !== view.pitch) this.setView({ yaw, pitch })
      if (this.zoomDir) this.setZoom(clamp(this.getZoom() + this.zoomDir * ZOOM.speedPerSecond * dt, Math.max(ZOOM.min, lim?.minZoom ?? 0), ZOOM.max))
    }
    this.raf = nextFrame(this.loop)
  }

  destroy() {
    cancelFrame(this.raf)
    this.destroyViewer?.()
  }
}

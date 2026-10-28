import { MOVE, STICKS } from './config.js'

/**
 * Turns the analog "move" stick into discrete actions:
 *   up    → forward (immediately, then every MOVE.walkIntervalMs while held)
 *   left  → left / right → right (repeat every MOVE.sideRepeatMs while held)
 *   down  → back (once per push: turn around)
 * Call set(x, y) whenever a stick value arrives and tick() regularly (e.g. every 40 ms).
 */
export class MoveInterpreter {
  constructor(handlers) {
    this.handlers = handlers // { forward, left, right, back }
    this.x = 0
    this.y = 0
    this.at = 0
    this.dir = null
    this.nextAt = 0
  }

  set(x, y) {
    this.x = x
    this.y = y
    this.at = performance.now()
    this.tick(this.at) // react at once, so a quick tap isn't lost between ticks
  }

  reset() {
    this.x = this.y = 0
    this.dir = null
  }

  tick(now = performance.now()) {
    const stale = now - this.at > STICKS.staleMs
    const x = stale ? 0 : this.x
    const y = stale ? 0 : this.y
    const ax = Math.abs(x)
    const ay = Math.abs(y)
    const th = MOVE.pushThreshold
    let dir = null
    if (ay >= th && ay >= ax) dir = y < 0 ? 'forward' : 'back'
    else if (ax >= th) dir = x < 0 ? 'left' : 'right'

    if (dir !== this.dir) {
      this.dir = dir
      this.nextAt = 0
      if (dir === 'back') {
        this.handlers.back?.()
        this.nextAt = Infinity // once per push
      }
    }
    if (dir && dir !== 'back' && now >= this.nextAt) {
      this.handlers[dir]?.()
      this.nextAt = now + (dir === 'forward' ? MOVE.walkIntervalMs : MOVE.sideRepeatMs)
    }
  }
}

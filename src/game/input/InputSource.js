import { BUTTONS } from '../../../shared/protocol.js'

const emptyButtons = () => Object.fromEntries(BUTTONS.map((b) => [b, false]))

/**
 * Abstract input for one player slot. The game calls poll() once per frame and gets
 *   { held: {left, right, …}, pressed: {…} }
 * `pressed` = went down since the previous poll. Presses are latched, so a quick tap that is
 * pressed AND released between two frames (common with phones) is never lost.
 */
export class InputSource {
  constructor() {
    this.held = emptyButtons()
    this.latched = new Set()
  }

  setButton(button, down) {
    if (!(button in this.held)) return
    if (down && !this.held[button]) this.latched.add(button)
    this.held[button] = down
  }

  poll() {
    const pressed = emptyButtons()
    for (const b of this.latched) pressed[b] = true
    this.latched.clear()
    return { held: { ...this.held }, pressed }
  }

  releaseAll() {
    this.held = emptyButtons()
    this.latched.clear()
  }

  destroy() {}
}

/** Merges several sources (e.g. phone + keyboard for the same player). */
export class CombinedInputSource extends InputSource {
  constructor(sources) {
    super()
    this.sources = sources
  }

  poll() {
    const out = { held: emptyButtons(), pressed: emptyButtons() }
    for (const s of this.sources) {
      const p = s.poll()
      for (const b of BUTTONS) {
        out.held[b] ||= p.held[b]
        out.pressed[b] ||= p.pressed[b]
      }
    }
    return out
  }

  releaseAll() {
    this.sources.forEach((s) => s.releaseAll())
  }

  destroy() {
    this.sources.forEach((s) => s.destroy())
  }
}

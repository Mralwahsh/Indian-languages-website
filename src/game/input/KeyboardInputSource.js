import { InputSource } from './InputSource.js'

/** Laptop keyboard (for testing without a phone). Uses KeyboardEvent.code, so it works with any layout (incl. Arabic). */
export const KEYMAPS = {
  p1: { KeyA: 'left', KeyD: 'right', KeyW: 'jump', KeyS: 'kick' },
  p2: { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'jump', ArrowDown: 'kick' },
}

export class KeyboardInputSource extends InputSource {
  constructor(keymap = KEYMAPS.p1, target = window) {
    super()
    this.keymap = keymap
    this.target = target
    this.onDown = (e) => {
      const b = keymap[e.code]
      if (!b) return
      e.preventDefault()
      if (!e.repeat) this.setButton(b, true)
    }
    this.onUp = (e) => {
      const b = keymap[e.code]
      if (b) this.setButton(b, false)
    }
    this.onBlur = () => this.releaseAll()
    target.addEventListener('keydown', this.onDown)
    target.addEventListener('keyup', this.onUp)
    window.addEventListener('blur', this.onBlur)
  }

  destroy() {
    this.target.removeEventListener('keydown', this.onDown)
    this.target.removeEventListener('keyup', this.onUp)
    window.removeEventListener('blur', this.onBlur)
  }
}

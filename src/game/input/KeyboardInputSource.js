import { InputSource } from './InputSource.js'

/** Laptop keyboard (for testing without a phone). Uses KeyboardEvent.code, so it works with any layout (incl. Arabic). */
export const KEYMAPS = {
  p1: { KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', KeyJ: 'punch', KeyK: 'kick', KeyL: 'block', KeyI: 'special' },
  p2: {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    Numpad1: 'punch',
    Numpad2: 'kick',
    Numpad3: 'block',
    Numpad5: 'special',
  },
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

import { InputSource } from './InputSource.js'

/**
 * Tiny pub/sub that the fight page feeds with Socket.IO `input` events ({ slot, button, pressed }).
 * Keeping the socket out of the game means the game never knows about networking.
 */
export function createInputBus() {
  const listeners = new Set()
  return {
    emit(msg) {
      listeners.forEach((fn) => fn(msg))
    },
    on(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

/** Input for one slot, coming from a phone controller via the input bus. */
export class NetworkInputSource extends InputSource {
  constructor(bus, slot) {
    super()
    this.off = bus.on((msg) => {
      if (msg.slot === slot) this.setButton(msg.button, msg.pressed)
    })
  }

  destroy() {
    this.off()
  }
}

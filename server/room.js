import { P2_MODE, SLOTS } from '../shared/protocol.js'

const emptySlot = () => ({ type: 'empty', socketId: null, clientId: null, connected: false, ping: null })
const cpuSlot = () => ({ type: 'cpu', socketId: null, clientId: null, connected: true, ping: null })

/**
 * The single game room: one laptop screen + up to two player slots.
 * A slot is 'empty', 'cpu', or 'human' (a phone). A human slot whose phone dropped stays
 * reserved (connected: false) during a match so the same phone can reclaim it.
 */
export class Room {
  constructor({ p2Mode = P2_MODE } = {}) {
    this.p2Mode = p2Mode
    this.screenId = null
    this.phase = 'lobby'
    this.slots = { p1: emptySlot(), p2: p2Mode === 'cpu' ? cpuSlot() : emptySlot() }
  }

  /** Slots a phone may take (P2 only when Phase 2 is switched on). */
  humanSlots() {
    return SLOTS.filter((s) => this.slots[s].type !== 'cpu')
  }

  slotOfSocket(socketId) {
    return SLOTS.find((s) => this.slots[s].socketId === socketId) ?? null
  }

  /**
   * Give a phone a slot. Priority: its own previous slot (same clientId) → an empty slot →
   * a slot whose phone disconnected (takeover, so "scan again" always works).
   * @returns slot name or null when full
   */
  claim(clientId, socketId) {
    const candidates = this.humanSlots()
    const slot =
      candidates.find((s) => this.slots[s].clientId === clientId) ??
      candidates.find((s) => this.slots[s].type === 'empty') ??
      candidates.find((s) => this.slots[s].type === 'human' && !this.slots[s].connected)
    if (!slot) return null
    this.slots[slot] = { type: 'human', socketId, clientId, connected: true, ping: null }
    return slot
  }

  /** A phone disconnected. Outside a match the slot is freed; during a match it stays reserved. */
  release(socketId) {
    const slot = this.slotOfSocket(socketId)
    if (!slot) return null
    if (this.phase === 'lobby' || this.phase === 'result') this.slots[slot] = emptySlot()
    else this.slots[slot] = { ...this.slots[slot], socketId: null, connected: false, ping: null }
    return slot
  }

  setPing(socketId, ms) {
    const slot = this.slotOfSocket(socketId)
    if (slot) this.slots[slot].ping = Math.round(ms)
    return slot
  }

  setPhase(phase) {
    this.phase = phase
    // back in the lobby: drop reservations of phones that never came back
    if (phase === 'lobby') {
      for (const s of SLOTS) if (this.slots[s].type === 'human' && !this.slots[s].connected) this.slots[s] = emptySlot()
    }
  }

  publicState() {
    const slots = {}
    for (const s of SLOTS) {
      const { type, connected, ping } = this.slots[s]
      slots[s] = { type, connected, ping }
    }
    return { phase: this.phase, slots, screenConnected: !!this.screenId }
  }
}

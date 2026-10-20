import { CHARACTER_IDS, DEFAULT_PICKS, SLOTS } from '../shared/protocol.js'

const emptySlot = () => ({ type: 'empty', socketId: null, clientId: null, connected: false, ping: null })

/**
 * The single game room: one laptop screen + two player slots.
 * A slot is 'empty' (P2 empty = the CPU plays) or 'human' (a phone). A human slot whose phone
 * dropped stays reserved (connected: false) during a match so the same phone can reclaim it.
 */
export class Room {
  constructor() {
    this.screenId = null
    this.phase = 'lobby'
    this.score = { p1: 0, p2: 0 }
    this.slots = { p1: emptySlot(), p2: emptySlot() }
    this.picks = { ...DEFAULT_PICKS }
  }

  slotOfSocket(socketId) {
    return SLOTS.find((s) => this.slots[s].socketId === socketId) ?? null
  }

  /**
   * Give a phone a slot. Priority: its own previous slot (same clientId) → P1 → P2 (only in
   * the lobby, so a match in progress against the CPU isn't hijacked) → a slot whose phone
   * disconnected (takeover, so "scan again" always works).
   * @returns slot name or null when full
   */
  claim(clientId, socketId) {
    const own = SLOTS.find((s) => this.slots[s].clientId === clientId)
    const empty = SLOTS.find((s) => this.slots[s].type === 'empty' && (s === 'p1' || this.phase === 'lobby' || this.phase === 'result'))
    const orphan = SLOTS.find((s) => this.slots[s].type === 'human' && !this.slots[s].connected)
    const slot = own ?? empty ?? orphan
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

  /** Character choice; two players can't have the same character. */
  pick(slot, characterId) {
    if (!SLOTS.includes(slot) || !CHARACTER_IDS.includes(characterId)) return false
    const other = slot === 'p1' ? 'p2' : 'p1'
    if (this.picks[other] === characterId) {
      // a CPU (empty slot) politely moves to another character; a human keeps theirs
      if (this.slots[other].type === 'human') return false
      this.picks[other] = CHARACTER_IDS.find((c) => c !== characterId && c !== this.picks[other]) ?? this.picks[slot]
    }
    this.picks[slot] = characterId
    return true
  }

  setPing(socketId, ms) {
    const slot = this.slotOfSocket(socketId)
    if (slot) this.slots[slot].ping = Math.round(ms)
    return slot
  }

  setPhase(phase, score) {
    this.phase = phase
    if (score) this.score = { p1: score.p1 | 0, p2: score.p2 | 0 }
    if (phase === 'lobby') {
      this.score = { p1: 0, p2: 0 }
      // back in the lobby: drop reservations of phones that never came back
      for (const s of SLOTS) if (this.slots[s].type === 'human' && !this.slots[s].connected) this.slots[s] = emptySlot()
    }
  }

  publicState() {
    const slots = {}
    for (const s of SLOTS) {
      const { type, connected, ping } = this.slots[s]
      slots[s] = { type, connected, ping, character: this.picks[s] }
    }
    return { phase: this.phase, score: this.score, slots, screenConnected: !!this.screenId }
  }
}

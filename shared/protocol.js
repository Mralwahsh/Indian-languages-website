// Socket.IO protocol shared by the Node server (server/) and the browser (src/).
// Keep this file dependency-free: it is imported on both sides.

export const EV = {
  // laptop screen → server
  SCREEN_JOIN: 'screen:join', // ack: room state
  SCREEN_STATE: 'screen:state', // { phase, score? }   phase: lobby | playing | paused | result
  SCREEN_BUZZ: 'screen:buzz', // { slot, pattern }   make a phone vibrate (e.g. after a goal)
  SCREEN_PICK: 'screen:pick', // { slot, characterId }  pick for a CPU / keyboard player

  // phone controller → server
  CONTROLLER_JOIN: 'controller:join', // { clientId } → ack { ok, slot, phase } | { ok:false, reason:'full' }
  CONTROLLER_PICK: 'controller:pick', // { characterId } choose a character in the lobby
  CONTROLLER_PING: 'controller:ping', // { ms } measured round-trip time
  INPUT: 'input', // { button, pressed } (server adds the slot) → relayed to screen as { slot, button, pressed }

  // anyone → server
  PING: 'ping:check', // ack only, used to measure latency

  // server → screen AND phones
  ROOM_UPDATE: 'room:update', // full public room state (slots, picks, phase, score)

  // server → screen
  PLAYER_CONNECTED: 'player:connected', // { slot }
  PLAYER_DISCONNECTED: 'player:disconnected', // { slot }

  // server → phone
  GAME_STATE: 'game:state', // { phase, slot, score }
  BUZZ: 'buzz', // { pattern } vibrate
}

export const SLOTS = ['p1', 'p2']
export const BUTTONS = ['left', 'right', 'jump', 'kick']
export const PHASES = ['lobby', 'playing', 'paused', 'result']

/** Character ids (see src/game/football/characters). Default picks per slot. */
export const CHARACTER_IDS = ['kabir', 'meera', 'arjun', 'tara']
export const DEFAULT_PICKS = { p1: 'kabir', p2: 'meera' }

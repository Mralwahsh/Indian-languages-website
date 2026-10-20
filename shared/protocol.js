// Socket.IO protocol shared by the Node server (server/) and the browser (src/).
// Keep this file dependency-free: it is imported on both sides.

export const EV = {
  // laptop screen → server
  SCREEN_JOIN: 'screen:join', // ack: room state
  SCREEN_STATE: 'screen:state', // { phase }   lobby | fighting | paused | result
  SCREEN_HIT: 'screen:hit', // { slot }    a player got hit → their phone vibrates

  // phone controller → server
  CONTROLLER_JOIN: 'controller:join', // { clientId } → ack { ok, slot, phase } | { ok:false, reason:'full' }
  CONTROLLER_PING: 'controller:ping', // { ms } measured round-trip time
  INPUT: 'input', // { button, pressed } (server adds the slot) → relayed to screen as { slot, button, pressed }

  // anyone → server
  PING: 'ping:check', // ack only, used to measure latency

  // server → screen
  ROOM_UPDATE: 'room:update', // full public room state
  PLAYER_CONNECTED: 'player:connected', // { slot }
  PLAYER_DISCONNECTED: 'player:disconnected', // { slot }

  // server → phone
  GAME_STATE: 'game:state', // { phase, slot }
  HIT: 'hit', // {}
}

export const SLOTS = ['p1', 'p2']
export const BUTTONS = ['left', 'right', 'up', 'down', 'punch', 'kick', 'block', 'special']
export const PHASES = ['lobby', 'fighting', 'paused', 'result']

/**
 * Phase 1: P2 is always the CPU. Phase 2: set to 'human' and a second phone can take P2.
 * (Used by the server when creating the room.)
 */
export const P2_MODE = 'cpu'

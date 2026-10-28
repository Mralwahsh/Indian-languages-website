// Socket.IO protocol for virtual tours. Separate namespace from the football game,
// so tour events can never interfere with a match.

export const TOUR_NAMESPACE = '/tour'

export const TEV = {
  // laptop tour screen → server
  SCREEN_JOIN: 'tour:screen-join', // ack: controller status
  STATE: 'tour:state', // { mode: 'map'|'tour', placeId, placeName } → relayed to the phone
  FEEDBACK: 'tour:feedback', // { type: 'stepped'|'no-path' } → relayed to the phone (vibration)

  // phone → server (→ relayed to the screen)
  JOIN: 'tour:join', // { clientId } → ack { ok, controlling, state }
  STICK: 'tour:stick', // { stick: 'move'|'look', x, y }   x, y ∈ [-1, 1]
  ZOOM: 'tour:zoom', // { dir: 'in'|'out', pressed }
  INFO: 'tour:info', // {}
  NEXT: 'tour:next', // {}
  EXIT: 'tour:exit', // {}  back to the map
  PING: 'tour:ping', // ack only

  // server → screen + phones
  CONTROLLER_STATUS: 'tour:controller-status', // { connected, controlling (phones only) }
}

export const STICK_NAMES = ['move', 'look']

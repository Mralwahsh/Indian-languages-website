import { STICK_NAMES, TEV, TOUR_NAMESPACE } from '../shared/tourProtocol.js'

const RECLAIM_MS = 15000 // a dropped phone keeps the controls this long so it can reconnect
const clamp1 = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0)

/**
 * Tour namespace: one laptop screen, ONE controlling phone at a time.
 * Other phones wait ("someone is controlling the tour") and take over automatically
 * when the controller leaves.
 */
export function setupTour(io) {
  const nsp = io.of(TOUR_NAMESPACE)
  const state = {
    screenId: null,
    controller: null, // { socketId, clientId, connected }
    releaseTimer: null,
    tourState: { mode: 'map', placeId: null, placeName: null },
  }

  const isController = (socket) => state.controller?.socketId === socket.id
  const toScreen = (ev, data) => state.screenId && nsp.to(state.screenId).emit(ev, data)

  function broadcastStatus() {
    const connected = !!state.controller?.connected
    toScreen(TEV.CONTROLLER_STATUS, { connected })
    for (const [id, s] of nsp.sockets) {
      if (id !== state.screenId) s.emit(TEV.CONTROLLER_STATUS, { connected, controlling: id === state.controller?.socketId })
    }
  }

  function takeControl(socket, clientId) {
    clearTimeout(state.releaseTimer)
    state.releaseTimer = null
    state.controller = { socketId: socket.id, clientId, connected: true }
    broadcastStatus()
  }

  nsp.on('connection', (socket) => {
    socket.on(TEV.PING, (ack) => typeof ack === 'function' && ack())

    // ---- laptop
    socket.on(TEV.SCREEN_JOIN, (ack) => {
      state.screenId = socket.id
      if (typeof ack === 'function') ack({ connected: !!state.controller?.connected })
    })
    socket.on(TEV.STATE, (s = {}) => {
      if (socket.id !== state.screenId) return
      state.tourState = { mode: s.mode === 'tour' ? 'tour' : 'map', placeId: s.placeId ?? null, placeName: s.placeName ?? null }
      nsp.except(socket.id).emit(TEV.STATE, state.tourState)
    })
    socket.on(TEV.FEEDBACK, ({ type } = {}) => {
      if (socket.id === state.screenId && state.controller?.socketId && (type === 'stepped' || type === 'no-path')) {
        nsp.to(state.controller.socketId).emit(TEV.FEEDBACK, { type })
      }
    })

    // ---- phone
    socket.on(TEV.JOIN, ({ clientId } = {}, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {}
      if (typeof clientId !== 'string' || clientId.length > 64) return reply({ ok: false })
      socket.data.clientId = clientId
      const c = state.controller
      const free = !c || !c.connected || c.clientId === clientId
      // a different phone may only take over a dropped controller after the reclaim window
      if (!c || c.clientId === clientId) takeControl(socket, clientId)
      else if (free && !state.releaseTimer) takeControl(socket, clientId)
      reply({ ok: true, controlling: isController(socket), state: state.tourState })
      broadcastStatus()
    })

    const relay = (ev, sanitize) =>
      socket.on(ev, (data = {}) => {
        if (isController(socket)) toScreen(ev, sanitize(data))
      })
    relay(TEV.STICK, ({ stick, x, y }) => ({ stick: STICK_NAMES.includes(stick) ? stick : 'move', x: clamp1(x), y: clamp1(y) }))
    relay(TEV.ZOOM, ({ dir, pressed }) => ({ dir: dir === 'out' ? 'out' : 'in', pressed: !!pressed }))
    relay(TEV.INFO, () => ({}))
    relay(TEV.NEXT, () => ({}))
    relay(TEV.EXIT, () => ({}))

    socket.on('disconnect', () => {
      if (socket.id === state.screenId) {
        state.screenId = null
        return
      }
      if (!isController(socket)) return
      // stop any movement right away, keep the seat for a moment so the same phone can come back
      toScreen(TEV.STICK, { stick: 'move', x: 0, y: 0 })
      toScreen(TEV.STICK, { stick: 'look', x: 0, y: 0 })
      toScreen(TEV.ZOOM, { dir: 'in', pressed: false })
      state.controller.connected = false
      state.controller.socketId = null
      broadcastStatus()
      clearTimeout(state.releaseTimer)
      state.releaseTimer = setTimeout(() => {
        state.releaseTimer = null
        if (state.controller && !state.controller.connected) state.controller = null
        broadcastStatus() // waiting phones see the seat is free and re-join
      }, RECLAIM_MS)
    })
  })
}

import { io } from 'socket.io-client'
import { TEV, TOUR_NAMESPACE } from '../../shared/tourProtocol.js'

/** Connection to the tour namespace (separate from the football game). */
export function connectTourSocket() {
  return io(TOUR_NAMESPACE, {
    transports: ['websocket', 'polling'],
    reconnectionDelay: 400,
    reconnectionDelayMax: 2000,
    timeout: 5000,
  })
}

/** Round-trip time in ms (null on timeout). */
export function tourPing(socket, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const t0 = performance.now()
    const timer = setTimeout(() => resolve(null), timeoutMs)
    socket.emit(TEV.PING, () => {
      clearTimeout(timer)
      resolve(performance.now() - t0)
    })
  })
}

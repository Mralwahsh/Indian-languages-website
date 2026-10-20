import { io } from 'socket.io-client'
import { EV } from '../../../shared/protocol.js'

/**
 * Socket.IO connection to the booth server. Same origin: in production the Node server serves
 * the page; in development Vite proxies /socket.io to it.
 */
export function connectSocket() {
  return io({
    transports: ['websocket', 'polling'],
    reconnectionDelay: 400,
    reconnectionDelayMax: 2000,
    timeout: 5000,
  })
}

/** Round-trip time to the server in ms (resolves null on timeout). */
export function measurePing(socket, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const t0 = performance.now()
    const timer = setTimeout(() => resolve(null), timeoutMs)
    socket.emit(EV.PING, () => {
      clearTimeout(timer)
      resolve(performance.now() - t0)
    })
  })
}

/** Laptop's LAN address as seen by the server (for the QR code). */
export async function getConnectionInfo() {
  try {
    const res = await fetch('/api/connection-info')
    if (!res.ok) throw new Error(String(res.status))
    return await res.json()
  } catch {
    return null // server not running
  }
}

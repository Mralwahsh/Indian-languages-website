// India Speaks booth server: serves the built site and relays phone-controller input to the
// laptop screen over Socket.IO. Fully offline: no database, no auth, no internet calls.
//
//   node server/index.js          → API + sockets only (dev: Vite serves the site and proxies to us)
//   node server/index.js --prod   → also serves dist/ (booth mode)
import express from 'express'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Server } from 'socket.io'
import { BUTTONS, EV, PHASES, SLOTS } from '../shared/protocol.js'
import { getLanIp, listIPv4 } from './network.js'
import { Room } from './room.js'
import { setupTour } from './tour.js'
import { setupChess } from './chess.js'

// SERVER_PORT, not PORT: tools and hosting setups often set PORT for other programs
const PORT = Number(process.env.SERVER_PORT) || 3000
const PROD = process.argv.includes('--prod') || process.env.NODE_ENV === 'production'
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dist = path.join(root, 'dist')

const app = express()
const http = createServer(app)
const io = new Server(http, { pingInterval: 5000, pingTimeout: 8000 })
const room = new Room()

// ---------------------------------------------------------------- HTTP
// chess Puzzle Challenge: today's top solvers (before the page routes below)
setupChess(app, root)

app.get('/api/connection-info', (_req, res) => {
  res.json({ ip: getLanIp(), port: PORT, addresses: listIPv4() })
})

if (PROD) {
  if (!existsSync(dist)) {
    console.error('\n  dist/ not found. Run "npm run build" first (or use "npm start").\n')
    process.exit(1)
  }
  // the phone piano game is a separate small page, not part of the single-page app
  app.get(['/tiles', '/tiles/'], (_req, res) => res.sendFile(path.join(dist, 'tiles.html')))
  app.get(['/chess/puzzles', '/chess/puzzles/'], (_req, res) => res.sendFile(path.join(dist, 'chess-puzzles.html')))
  app.use(express.static(dist, { index: false }))
  // single-page app: every other GET (e.g. /controller, /football) gets index.html
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()))
}

// ---------------------------------------------------------------- sockets
// virtual tours live in their own namespace (/tour) so they never interfere with the game
setupTour(io)

// screen + phones all get the room state (phones show both players' character picks)
const broadcastRoom = () => {
  const state = room.publicState()
  io.to('screen').emit(EV.ROOM_UPDATE, state)
  io.to('controllers').emit(EV.ROOM_UPDATE, state)
}
const tellPhones = () => {
  for (const s of SLOTS) {
    const { socketId } = room.slots[s]
    if (socketId) io.to(socketId).emit(EV.GAME_STATE, { phase: room.phase, slot: s, score: room.score })
  }
}

io.on('connection', (socket) => {
  socket.on(EV.PING, (ack) => typeof ack === 'function' && ack())

  // ---- laptop screen
  socket.on(EV.SCREEN_JOIN, (ack) => {
    // only one screen at a time: the newest one wins
    if (room.screenId && room.screenId !== socket.id) io.sockets.sockets.get(room.screenId)?.leave('screen')
    room.screenId = socket.id
    socket.join('screen')
    if (typeof ack === 'function') ack(room.publicState())
    broadcastRoom()
  })

  socket.on(EV.SCREEN_STATE, ({ phase, score } = {}) => {
    if (socket.id !== room.screenId || !PHASES.includes(phase)) return
    room.setPhase(phase, score)
    broadcastRoom()
    tellPhones()
  })

  socket.on(EV.SCREEN_BUZZ, ({ slot, pattern } = {}) => {
    const target = room.slots[slot]?.socketId
    if (socket.id === room.screenId && target) io.to(target).emit(EV.BUZZ, { pattern: Array.isArray(pattern) ? pattern.slice(0, 8) : 80 })
  })

  // keyboard / CPU players have no phone: the screen picks their character
  socket.on(EV.SCREEN_PICK, ({ slot, characterId } = {}) => {
    if (socket.id === room.screenId && room.slots[slot]?.type !== 'human' && room.pick(slot, characterId)) broadcastRoom()
  })

  // ---- phone controller
  socket.on(EV.CONTROLLER_JOIN, ({ clientId } = {}, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {}
    if (typeof clientId !== 'string' || clientId.length > 64) return reply({ ok: false, reason: 'bad-request' })
    const slot = room.claim(clientId, socket.id)
    if (!slot) return reply({ ok: false, reason: 'full' })
    socket.data.slot = slot
    socket.join('controllers')
    reply({ ok: true, slot, phase: room.phase, room: room.publicState() })
    io.to('screen').emit(EV.PLAYER_CONNECTED, { slot })
    broadcastRoom()
    console.log(`  📱 phone joined as ${slot.toUpperCase()}`)
  })

  socket.on(EV.INPUT, ({ button, pressed } = {}) => {
    const slot = room.slotOfSocket(socket.id)
    if (!slot || !BUTTONS.includes(button)) return
    io.to('screen').volatile.emit(EV.INPUT, { slot, button, pressed: !!pressed })
  })

  socket.on(EV.CONTROLLER_PICK, ({ characterId } = {}) => {
    const slot = room.slotOfSocket(socket.id)
    if (!slot || room.phase === 'playing' || room.phase === 'paused') return
    room.pick(slot, characterId)
    broadcastRoom() // also when refused, so the phone snaps back to the real pick
  })

  socket.on(EV.CONTROLLER_PING, ({ ms } = {}) => {
    if (typeof ms === 'number' && room.setPing(socket.id, ms)) broadcastRoom()
  })

  socket.on('disconnect', () => {
    if (socket.id === room.screenId) {
      room.screenId = null
      return
    }
    const slot = room.release(socket.id)
    if (slot) {
      io.to('screen').emit(EV.PLAYER_DISCONNECTED, { slot })
      broadcastRoom()
      console.log(`  📴 ${slot.toUpperCase()} disconnected`)
    }
  })
})

http.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ⚠️  Port ${PORT} is already in use: the server is probably already running in another window.`)
    console.error('     Close that window (or stop it with Ctrl+C) and start again.\n')
    process.exit(1)
  }
  throw err
})

http.listen(PORT, '0.0.0.0', () => {
  const ip = getLanIp()
  console.log(`\n  🇮🇳 India Speaks server (${PROD ? 'booth / production' : 'development API'}) on port ${PORT}`)
  if (PROD) {
    console.log(`     Laptop:  http://localhost:${PORT}/football`)
    console.log(`     Phones:  http://${ip}:${PORT}/controller`)
    console.log(`     Tours:   http://localhost:${PORT}/tour  (phone: http://${ip}:${PORT}/tour-controller)`)
  } else {
    console.log('     (open the Vite URL printed by "vite"; it proxies /socket.io and /api here)')
  }
  console.log(`     LAN addresses: ${listIPv4().map((a) => `${a.address} (${a.name})`).join(', ') || 'none'}\n`)
})

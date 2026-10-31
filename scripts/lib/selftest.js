#!/usr/bin/env node
// Checks the fast move generator against chess.js: same legal moves (UCI) and the same check / mate
// status in thousands of positions reached by random play, including castling, en passant and promotion.
//   node scripts/lib/selftest.js [games]
import { Chess } from 'chess.js'
import { Position } from './fastchess.js'

const START_FENS = [
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', // castling / pins
  '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', // en passant tricks
  'n1n5/PPPk4/8/8/8/8/4Kppp/5N1N b - - 0 1', // promotions
  'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
]

export function selftest(games = 300) {
  let positions = 0
  let rng = 12345
  const rand = (n) => {
    rng = (rng * 1103515245 + 12345) & 0x7fffffff
    return rng % n
  }
  for (let g = 0; g < games; g++) {
    const chess = new Chess(START_FENS[g % START_FENS.length])
    for (let ply = 0; ply < 120 && !chess.isGameOver(); ply++) {
      const fen = chess.fen()
      const pos = new Position(fen)
      const ref = chess.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? '')).sort()
      const mine = pos.legal().map((m) => pos.uci(m)).sort()
      if (ref.join() !== mine.join()) throw new Error(`move mismatch in ${fen}\n chess.js: ${ref}\n fast:     ${mine}`)
      if (pos.inCheck() !== chess.inCheck()) throw new Error(`check mismatch in ${fen}`)
      positions++
      const list = chess.moves()
      chess.move(list[rand(list.length)])
    }
  }
  return positions
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/lib/selftest.js')) {
  const t = performance.now()
  const n = selftest(Number(process.argv[2]) || 300)
  console.log(`  fast move generator matches chess.js in ${n} positions (${((performance.now() - t) / 1000).toFixed(1)} s)`)
}

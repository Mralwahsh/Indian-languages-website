#!/usr/bin/env node
// Finds mate puzzles in REAL games (PGN files you put in puzzle-sources/) and adds them to the puzzle list,
// with their source for the "Did you know?" card. Nothing is invented: the position is taken from the game
// and the forced mate is found by brute force.
//
//   node scripts/pgn-to-puzzle.js puzzle-sources/anand.pgn --move 31            White to move, before move 31
//   node scripts/pgn-to-puzzle.js puzzle-sources/anand.pgn --move 31 --side b   Black to move
//   node scripts/pgn-to-puzzle.js puzzle-sources/gukesh.pgn --scan              every position of every game
//   … add --add to save what it finds to puzzle-sources/puzzles.json (then run: npm run puzzles)
//
// Other options: --game <n> (which game in a multi-game file, from 1), --max <1-3> (longest mate to look for,
// default 3), --note "..." (extra line for the card).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'
import { Position } from './lib/fastchess.js'
import { buildTree, mainLine, mateLength } from './lib/mate.js'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SRC = path.join(ROOT, 'puzzle-sources', 'puzzles.json')

function fail(msg) {
  console.error(`\n  ✖ ${msg}\n`)
  process.exit(1)
}

function args() {
  const a = process.argv.slice(2)
  const get = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined)
  return {
    file: a.find((x) => !x.startsWith('--') && !['--move', '--side', '--game', '--max', '--note'].includes(a[a.indexOf(x) - 1])),
    move: get('--move') ? Number(get('--move')) : null,
    side: get('--side') === 'b' ? 'b' : 'w',
    game: get('--game') ? Number(get('--game')) : null,
    max: Math.min(3, Math.max(1, Number(get('--max') ?? 3))),
    note: get('--note'),
    scan: a.includes('--scan'),
    add: a.includes('--add'),
  }
}

/** Splits a PGN file into games and reads each one with chess.js. */
function readGames(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n(?=\[Event\s)/)
    .map((g) => g.trim())
    .filter((g) => /\d\./.test(g))
    .map((pgn, i) => {
      const chess = new Chess()
      try {
        chess.loadPgn(pgn)
      } catch (e) {
        return { index: i + 1, error: e.message }
      }
      return { index: i + 1, headers: chess.getHeaders(), moves: chess.history({ verbose: true }) }
    })
}

/** Forced mate (≤ max) for the side to move, with the main line, or null. */
function findMate(fen, max) {
  const pos = new Position(fen)
  if (pos.attacked(pos.kings[pos.side ^ 1], pos.side)) return null
  const n = mateLength(pos, max)
  if (!n) return null
  const tree = buildTree(new Position(fen), n)
  return { n, line: mainLine(tree) }
}

function sourceOf(game, side, moveNo, note) {
  const h = game.headers
  const year = (h.Date ?? '').match(/\d{4}/)?.[0]
  const player = (side === 'w' ? h.White : h.Black) ?? '?'
  const opponent = (side === 'w' ? h.Black : h.White) ?? '?'
  return {
    player: player.replace(/,\s*/, ' '),
    opponent: opponent.replace(/,\s*/, ' '),
    event: h.Event && h.Event !== '?' ? h.Event : undefined,
    year: year ? Number(year) : undefined,
    note: note ?? `${h.White ?? '?'} – ${h.Black ?? '?'}، النقلة ${moveNo}`,
  }
}

function main() {
  const o = args()
  if (!o.file) fail('usage: node scripts/pgn-to-puzzle.js <file.pgn> (--move N [--side b] | --scan) [--add]')
  if (!fs.existsSync(o.file)) fail(`file not found: ${o.file}`)
  const games = readGames(fs.readFileSync(o.file, 'utf8'))
  if (!games.length) fail('no games found in the file')
  const found = []

  for (const g of games) {
    if (o.game && g.index !== o.game) continue
    if (g.error) {
      console.log(`  ⚠ game ${g.index}: could not read it (${g.error})`)
      continue
    }
    const title = `${g.headers.White ?? '?'} – ${g.headers.Black ?? '?'} (${g.headers.Event ?? '?'}, ${g.headers.Date ?? '?'})`
    // positions to look at: before the chosen move, or before every move
    const plies = o.scan ? g.moves.map((_, i) => i) : [(o.move - 1) * 2 + (o.side === 'b' ? 1 : 0)]
    if (!o.scan && (o.move == null || plies[0] >= g.moves.length)) {
      console.log(`  ⚠ game ${g.index} ${title}: has no move ${o.move}${o.side === 'b' ? ' for Black' : ''}`)
      continue
    }
    for (const ply of plies) {
      const fen = g.moves[ply].before
      const side = ply % 2 === 0 ? 'w' : 'b'
      const moveNo = Math.floor(ply / 2) + 1
      const mate = findMate(fen, o.max)
      if (!mate) {
        if (!o.scan) console.log(`  game ${g.index}, move ${moveNo}${side === 'b' ? ' (Black)' : ''}: no forced mate in ${o.max} or less\n    ${fen}`)
        continue
      }
      const played = g.moves[ply].lan
      console.log(`  ✔ game ${g.index}, move ${moveNo}${side === 'b' ? ' (Black)' : ''}: mate in ${mate.n}  ${mate.line.join(' ')}${played === mate.line[0] ? '  (played in the game)' : `  (the game went ${played})`}\n    ${title}\n    ${fen}`)
      found.push({ fen, n: mate.n, line: mate.line, source: sourceOf(g, side, moveNo, o.note), id: `game-${path.basename(o.file, '.pgn')}-${g.index}-${moveNo}${side}` })
    }
  }

  if (!found.length) return console.log('\n  no puzzles found\n')
  if (!o.add) return console.log(`\n  ${found.length} found. Add --add to save them to ${path.relative(ROOT, SRC)}\n`)
  const data = fs.existsSync(SRC) ? JSON.parse(fs.readFileSync(SRC, 'utf8')) : { puzzles: [] }
  const have = new Set(data.puzzles.map((p) => p.fen.split(' ').slice(0, 2).join(' ')))
  let added = 0
  for (const f of found) {
    if (have.has(f.fen.split(' ').slice(0, 2).join(' '))) continue
    data.puzzles.push({ id: f.id, fen: f.fen, type: `mate${f.n}`, solution: f.line, source: f.source })
    added++
  }
  fs.writeFileSync(SRC, JSON.stringify(data, null, 1) + '\n')
  console.log(`\n  ✔ added ${added} puzzle(s) to ${path.relative(ROOT, SRC)}. Now run: npm run puzzles\n`)
}

main()

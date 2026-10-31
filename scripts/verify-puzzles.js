#!/usr/bin/env node
// Verifies every chess puzzle, measures how hard it is, puts it on a level, and writes the game's file.
//
//   node scripts/verify-puzzles.js          (also runs as part of `npm run build`)
//
// Reads  puzzle-sources/puzzles.json   [{ id, fen, type: "mate1"|"mate2"|"mate3", solution?, source?, levelOverride? }]
// Writes public/puzzles/puzzles.json   (generated: don't edit by hand)
//
// For every puzzle it checks, by brute force against ALL defences:
//   • the FEN is legal (chess.js), and the side that is not to move is not in check
//   • there is a forced mate in exactly the stated number of moves (and no shorter one)
//   • the given solution (if any) is legal and forces that mate
//   • every OTHER move that also forces mate in time is accepted as correct (the answer tree)
//   • every line of the answer tree is replayed with chess.js, and each final position is checkmate there too
// Any failure stops the build.
//
// Levels: 15, in five tiers of three (see TIERS). Difficulty is measured (scripts/lib/mate.js → measure),
// then each puzzle goes to its tier by the rules below, and within a tier the easiest third gets the
// first level, and so on. "levelOverride": 1-15 in the source pins a puzzle to a level.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess, validateFen } from 'chess.js'
import { Position } from './lib/fastchess.js'
import { buildTree, canMate, mainLine, measure, winningMoves } from './lib/mate.js'
import { selftest } from './lib/selftest.js'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SRC = path.join(ROOT, 'puzzle-sources', 'puzzles.json')
const OUT = path.join(ROOT, 'public', 'puzzles', 'puzzles.json')
const MATE = { mate1: 1, mate2: 2, mate3: 3 }

export const TIERS = [
  { levels: [1, 2, 3], label: 'mate in 1, few pieces, an easy check' },
  { levels: [4, 5, 6], label: 'mate in 1 with more pieces / a capture / less obvious' },
  { levels: [7, 8, 9], label: 'mate in 2, the first move is a check' },
  { levels: [10, 11, 12], label: 'mate in 2, the first move is quiet or a sacrifice' },
  { levels: [13, 14, 15], label: 'mate in 3' },
]

function fail(msg) {
  console.error(`\n  ✖ ${msg}\n`)
  process.exit(1)
}

/** Replays every line of the answer tree in chess.js: all moves legal, every end position checkmate. */
function crossCheck(fen, tree) {
  const walk = (chess, node) => {
    for (const [move, next] of Object.entries(node)) {
      const c = new Chess(chess.fen())
      c.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] }) // throws if illegal
      if (next === null) {
        if (!c.isCheckmate()) throw new Error(`${move} should mate but chess.js disagrees`)
      } else {
        c.move({ from: next.reply.slice(0, 2), to: next.reply.slice(2, 4), promotion: next.reply[4] })
        walk(c, next.next)
      }
    }
  }
  walk(new Chess(fen), tree)
}

/** The solution written in the source must be legal and force the mate (other correct moves are fine too). */
function checkSolution(fen, n, solution) {
  const pos = new Position(fen)
  for (let i = 0; i < solution.length; i++) {
    const m = pos.fromUci(solution[i])
    if (!m) throw new Error(`solution move ${i + 1} (${solution[i]}) is not legal`)
    if (i % 2 === 0) {
      const left = n - i / 2
      if (!winningMoves(pos, left).includes(m)) throw new Error(`solution move ${solution[i]} does not force mate in ${left}`)
    }
    pos.make(m)
  }
  if (!pos.isCheckmate()) throw new Error('the solution does not end in checkmate')
}

export function verifyAll(puzzles) {
  const errors = []
  const out = []
  const ids = new Set()
  for (const p of puzzles) {
    const where = `puzzle "${p.id ?? '?'}"`
    try {
      if (!p.id || ids.has(p.id)) throw new Error('missing or duplicate id')
      ids.add(p.id)
      const n = MATE[p.type]
      if (!n) throw new Error(`type must be mate1, mate2 or mate3 (got ${p.type})`)
      const v = validateFen(p.fen)
      if (!v.ok) throw new Error(`illegal FEN: ${v.error}`)
      const pos = new Position(p.fen)
      if (pos.attacked(pos.kings[pos.side ^ 1], pos.side)) throw new Error('the side that is not to move is in check')
      if (n > 1 && canMate(pos, n - 1)) throw new Error(`there is a shorter mate (in ${n - 1} or less): this is not a ${p.type}`)
      if (!canMate(pos, n)) throw new Error(`no forced mate in ${n}`)
      if (p.solution?.length) checkSolution(p.fen, n, p.solution)
      const tree = buildTree(new Position(p.fen), n)
      crossCheck(p.fen, tree)
      const solution = mainLine(tree, p.solution?.[0])
      const difficulty = measure(p.fen, n, tree, solution[0])
      out.push({
        id: p.id,
        fen: p.fen,
        type: p.type,
        toMove: pos.side === 0 ? 'w' : 'b',
        solution,
        tree,
        difficulty,
        ...(p.source ? { source: p.source } : {}),
        ...(p.levelOverride ? { levelOverride: p.levelOverride } : {}),
      })
    } catch (e) {
      errors.push(`${where}: ${e.message}`)
    }
  }
  return { out, errors }
}

/** Puts every puzzle on a level (see TIERS); returns the per-level lists. */
export function assignLevels(list) {
  const tiers = TIERS.map(() => [])
  const mate1 = list.filter((p) => p.type === 'mate1' && !p.levelOverride).sort((a, b) => a.difficulty.score - b.difficulty.score)
  // mate in 1: captures are never "easy"; of the rest, the easier half goes to tier 1
  const plain = mate1.filter((p) => !p.difficulty.capture)
  const easyCount = Math.min(plain.length, Math.ceil(mate1.length / 2))
  const easy = new Set(plain.slice(0, easyCount))
  for (const p of list) {
    if (p.levelOverride) continue
    const d = p.difficulty
    const tier = p.type === 'mate1' ? (easy.has(p) ? 0 : 1) : p.type === 'mate2' ? (d.kind === 'check' && !d.sacrifice ? 2 : 3) : 4
    tiers[tier].push(p)
  }
  tiers.forEach((group, t) => {
    group.sort((a, b) => a.difficulty.score - b.difficulty.score)
    group.forEach((p, i) => (p.level = TIERS[t].levels[Math.min(2, Math.floor((i * 3) / group.length))]))
  })
  for (const p of list) if (p.levelOverride) p.level = p.levelOverride
  const byLevel = Array.from({ length: 15 }, (_, i) => list.filter((p) => p.level === i + 1))
  return byLevel
}

function main() {
  const t = performance.now()
  // the fast mate search must agree with chess.js before we trust it
  selftest(12)
  if (!fs.existsSync(SRC)) fail(`${path.relative(ROOT, SRC)} not found`)
  const { puzzles } = JSON.parse(fs.readFileSync(SRC, 'utf8'))
  const { out, errors } = verifyAll(puzzles)
  if (errors.length) fail(`${errors.length} invalid puzzle(s):\n    ${errors.join('\n    ')}`)

  const byLevel = assignLevels(out)
  console.log(`\n  ♟  ${out.length} puzzles verified (forced mate against every defence, cross-checked with chess.js)\n`)
  console.log('  level  puzzles  type / tier                                             difficulty')
  let empty = 0
  byLevel.forEach((group, i) => {
    const tier = TIERS[Math.floor(i / 3)]
    const scores = group.map((p) => p.difficulty.score)
    const range = scores.length ? `${Math.min(...scores)}–${Math.max(...scores)}` : '—'
    const warn = group.length === 0 ? '  ✖ EMPTY' : group.length < 3 ? '  ⚠ fewer than 3' : ''
    if (!group.length) empty++
    console.log(`  ${String(i + 1).padStart(5)}  ${String(group.length).padStart(7)}  ${(i % 3 === 0 ? tier.label : '').padEnd(56)}${range.padEnd(12)}${warn}`)
  })
  const real = out.filter((p) => p.source).length
  console.log(`\n  ${real} from real games, ${out.length - real} original positions  (${((performance.now() - t) / 1000).toFixed(1)} s)`)
  if (empty) fail(`${empty} level(s) have no puzzles: add puzzles (scripts/generate-puzzles.js or scripts/pgn-to-puzzle.js)`)

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  const data = { generated: 'by scripts/verify-puzzles.js from puzzle-sources/puzzles.json: do not edit', levels: 15, puzzles: out.sort((a, b) => a.level - b.level || a.difficulty.score - b.difficulty.score) }
  fs.writeFileSync(OUT, JSON.stringify(data) + '\n')
  console.log(`  ✔ wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)\n`)
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/verify-puzzles.js')) main()

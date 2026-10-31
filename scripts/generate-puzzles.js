#!/usr/bin/env node
// Constructs ORIGINAL mate puzzles (no positions from memory or from famous games) and adds them to
// puzzle-sources/puzzles.json, so every level has enough puzzles. scripts/verify-puzzles.js then checks them.
//
//   node scripts/generate-puzzles.js                  fill every tier up to --per-tier (default 11)
//   node scripts/generate-puzzles.js --tier 4 --count 5 --seed 99
//
// It places a few pieces in natural-looking setups (a king behind its pawns on the back rank, an exposed
// king, a king driven into a corner), searches every line, and keeps only positions with an exact forced
// mate and a unique first move (mate in 3: at most two good first moves). About a third are mirrored so
// Black is the side to move.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateFen } from 'chess.js'
import { Position } from './lib/fastchess.js'
import { buildTree, mainLine, mateLength, measure } from './lib/mate.js'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SRC = path.join(ROOT, 'puzzle-sources', 'puzzles.json')

const args = process.argv.slice(2)
const opt = (k, d) => (args.includes(k) ? Number(args[args.indexOf(k) + 1]) : d)
const PER_TIER = opt('--per-tier', 11)
const ONLY_TIER = opt('--tier', 0) // 1-5, 0 = all
const COUNT = opt('--count', 0)
let seed = opt('--seed', 20261110)

const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (a) => a[Math.floor(rand() * a.length)]
const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1))

// ---------------------------------------------------------------- building positions
function fenOf(board, side) {
  const rows = []
  for (let r = 7; r >= 0; r--) {
    let row = ''
    let empty = 0
    for (let f = 0; f < 8; f++) {
      const p = board[r * 8 + f]
      if (!p) empty++
      else {
        if (empty) row += empty
        empty = 0
        row += p
      }
    }
    rows.push(row + (empty || ''))
  }
  return `${rows.join('/')} ${side} - - 0 1`
}

/** Mirror colours and board, so Black is the side to move. */
function flipColours(fen) {
  const [place, side] = fen.split(' ')
  const swapped = place
    .split('/')
    .reverse()
    .map((r) => [...r].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join(''))
    .join('/')
  return `${swapped} ${side === 'w' ? 'b' : 'w'} - - 0 1`
}

function mirrorFiles(fen) {
  const [place, ...rest] = fen.split(' ')
  return [place.split('/').map((r) => [...r.replace(/\d/g, (d) => '.'.repeat(Number(d)))].reverse().join('').replace(/\.+/g, (m) => m.length)).join('/'), ...rest].join(' ')
}

function setup(template) {
  const board = new Array(64).fill(null)
  const free = (s) => s >= 0 && s < 64 && !board[s]
  const put = (p, s) => {
    if (!free(s)) return false
    board[s] = p
    return true
  }
  const near = (s, d) => {
    const out = []
    for (let r = -d; r <= d; r++) for (let f = -d; f <= d; f++) {
      const rr = (s >> 3) + r
      const ff = (s & 7) + f
      if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && (r || f)) out.push(rr * 8 + ff)
    }
    return out
  }
  const anywhere = (p, ranks = [0, 7]) => {
    for (let i = 0; i < 40; i++) if (put(p, int(ranks[0], ranks[1]) * 8 + int(0, 7))) return true
    return false
  }

  if (template === 'backrank') {
    const kf = int(1, 6)
    put('k', 56 + kf)
    for (const df of pick([[-1, 0, 1], [0, 1], [-1, 0], [-1, 1], [-1, 0, 1]])) if (rand() < 0.85) put('p', 48 + kf + df)
    if (rand() < 0.5) anywhere(pick(['r', 'b', 'n', 'q', 'r']), [4, 7])
    if (rand() < 0.35) anywhere('p', [3, 5])
    const attackers = pick([['R'], ['Q'], ['R', 'R'], ['Q', 'N'], ['R', 'B'], ['Q', 'B'], ['R', 'N'], ['Q', 'R']])
    for (const a of attackers) anywhere(a, [0, 5])
    put('K', int(0, 1) * 8 + int(0, 7)) || anywhere('K', [0, 2])
    for (let i = int(0, 3); i > 0; i--) anywhere('P', [1, 3])
  } else if (template === 'open') {
    const k = int(4, 7) * 8 + int(0, 7)
    put('k', k)
    for (let i = int(0, 2); i > 0; i--) put('p', pick(near(k, 1).filter((s) => s >> 3 >= 1 && s >> 3 <= 6)))
    if (rand() < 0.45) anywhere(pick(['r', 'b', 'n']), [3, 7])
    for (const a of pick([['Q', 'N'], ['Q', 'B'], ['R', 'B'], ['R', 'N'], ['Q'], ['R', 'R'], ['Q', 'R'], ['B', 'N', 'R']])) put(a, pick(near(k, 3))) || anywhere(a)
    put('K', pick(near(k, 3).filter((s) => !near(k, 1).includes(s) && s !== k))) || anywhere('K', [0, 3])
    for (let i = int(0, 2); i > 0; i--) anywhere('P', [1, 5])
  } else {
    // corner: the king is already pushed to an edge; few pieces
    const k = pick([56, 63, 0, 7, 57, 62, 48, 55, 58, 61])
    put('k', k)
    if (rand() < 0.4) put(pick(['p', 'p', 'n', 'b']), pick(near(k, 2).filter((s) => s >> 3 >= 1 && s >> 3 <= 6)))
    for (const a of pick([['Q'], ['R'], ['R', 'B'], ['Q', 'N'], ['R', 'N'], ['B', 'N'], ['R', 'R'], ['Q', 'B']])) put(a, pick(near(k, 4))) || anywhere(a)
    put('K', pick(near(k, 3).filter((s) => !near(k, 1).includes(s) && s !== k))) || anywhere('K')
    if (rand() < 0.3) anywhere('P', [1, 5])
  }
  if (!board.includes('K') || !board.includes('k')) return null
  if (board.some((p, s) => (p === 'P' || p === 'p') && ((s >> 3) === 0 || (s >> 3) === 7))) return null
  let fen = fenOf(board, 'w')
  if (rand() < 0.5) fen = mirrorFiles(fen)
  return fen
}

// ---------------------------------------------------------------- choosing good puzzles
function classify(fen) {
  if (!validateFen(fen).ok) return null
  const pos = new Position(fen)
  if (pos.inCheck() || pos.attacked(pos.kings[1], 0)) return null // nobody starts in check
  const n = mateLength(pos, 3)
  if (!n) return null
  const tree = buildTree(new Position(fen), n)
  const key = mainLine(tree)[0]
  const d = measure(fen, n, tree, key)
  const keys = d.acceptedFirstMoves
  if (n === 1) {
    if (keys !== 1) return null
    return { n, tier: !d.capture && d.pieces <= 7 ? 1 : 2, d }
  }
  if (n === 2) {
    if (keys !== 1 || d.firstReplies < 1) return null
    return { n, tier: d.kind === 'check' && !d.sacrifice ? 3 : 4, d }
  }
  if (keys > 2) return null
  return { n, tier: 5, d }
}

const TEMPLATES = { 1: ['backrank', 'open', 'corner'], 2: ['backrank', 'open'], 3: ['backrank', 'open', 'corner'], 4: ['backrank', 'open', 'corner'], 5: ['corner', 'corner', 'open'] }

function main() {
  const data = fs.existsSync(SRC) ? JSON.parse(fs.readFileSync(SRC, 'utf8')) : { puzzles: [] }
  const have = new Set(data.puzzles.map((p) => p.fen.split(' ').slice(0, 2).join(' ')))
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const p of data.puzzles) if (p.genTier) counts[p.genTier]++
  const want = (t) => (ONLY_TIER ? (t === ONLY_TIER ? COUNT || PER_TIER : 0) : Math.max(0, PER_TIER - counts[t]))
  const target = { 1: want(1), 2: want(2), 3: want(3), 4: want(4), 5: want(5) }
  const added = []
  const start = performance.now()
  let tries = 0
  while (Object.values(target).some((v) => v > 0) && performance.now() - start < 15 * 60 * 1000) {
    const tier = pick(Object.keys(target).filter((t) => target[t] > 0).map(Number))
    const fen = setup(pick(TEMPLATES[tier]))
    tries++
    if (!fen) continue
    const key = fen.split(' ').slice(0, 2).join(' ')
    if (have.has(key)) continue
    const c = classify(fen)
    if (!c || target[c.tier] <= 0) continue
    // about a third: Black to move (the board turns around in the game)
    const finalFen = rand() < 0.34 ? flipColours(fen) : fen
    have.add(key)
    target[c.tier]--
    counts[c.tier]++
    const id = `orig-t${c.tier}-${String(counts[c.tier]).padStart(2, '0')}-${(seed >>> 0).toString(36).slice(-4)}`
    added.push({ id, fen: finalFen, type: `mate${c.n}`, genTier: c.tier, origin: 'original position, constructed by scripts/generate-puzzles.js' })
    process.stdout.write(`  + tier ${c.tier}  mate in ${c.n}  ${finalFen}  (${c.d.kind}${c.d.sacrifice ? ', sacrifice' : ''}, score ${c.d.score})\n`)
  }
  data.puzzles.push(...added)
  fs.mkdirSync(path.dirname(SRC), { recursive: true })
  fs.writeFileSync(SRC, JSON.stringify(data, null, 1) + '\n')
  console.log(`\n  added ${added.length} puzzles after ${tries} tries (${((performance.now() - start) / 1000).toFixed(0)} s) → ${path.relative(ROOT, SRC)}`)
  const left = Object.entries(target).filter(([, v]) => v > 0)
  if (left.length) console.log(`  ⚠ not filled in time: ${left.map(([t, v]) => `tier ${t} needs ${v} more`).join(', ')}`)
}

main()

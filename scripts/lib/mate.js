// Forced-mate search, solution trees and measured difficulty for the chess puzzles (build time only).
import { Position, VALUE, mFlag, mFrom, mPromo, mTo, pieceColor, pieceType } from './fastchess.js'

/** Can the side to move force mate within n of its own moves, whatever the other side does? */
export function canMate(pos, n) {
  for (const m of pos.legal()) {
    pos.make(m)
    const ok = n === 1 ? pos.isCheckmate() : defenderLost(pos, n - 1)
    pos.unmake()
    if (ok) return true
  }
  return false
}

/** The defender is to move: does every reply still lose to a mate within n? (mate now: yes; stalemate: no) */
export function defenderLost(pos, n) {
  const replies = pos.legal()
  if (!replies.length) return pos.inCheck()
  for (const r of replies) {
    pos.make(r)
    const ok = canMate(pos, n)
    pos.unmake()
    if (!ok) return false
  }
  return true
}

/** Shortest forced mate for the side to move, up to `max` moves (0 = none). */
export function mateLength(pos, max) {
  for (let n = 1; n <= max; n++) if (canMate(pos, n)) return n
  return 0
}

/** Every move of the side to move that forces mate within n (all of them count as correct). */
export function winningMoves(pos, n) {
  const out = []
  for (const m of pos.legal()) {
    pos.make(m)
    const ok = n === 1 ? pos.isCheckmate() : pos.isCheckmate() || defenderLost(pos, n - 1)
    pos.unmake()
    if (ok) out.push(m)
  }
  return out
}

/**
 * The defender's reply the game will play: the most stubborn one (longest mate),
 * then the one that leaves the solver the fewest winning moves.
 */
function bestDefence(pos, n) {
  let best = null
  for (const r of pos.legal()) {
    pos.make(r)
    const len = mateLength(pos, n)
    const options = winningMoves(pos, len).length
    pos.unmake()
    if (!best || len > best.len || (len === best.len && options < best.options)) best = { r, len, options }
  }
  return best
}

/**
 * Answer tree: { "<solver uci>": null (that move mates) | { reply: "<defender uci>", next: <tree> } }.
 * Every solver move that still forces mate in time is accepted; the defender always plays bestDefence.
 */
export function buildTree(pos, n) {
  const tree = {}
  for (const m of winningMoves(pos, n)) {
    pos.make(m)
    if (pos.isCheckmate()) tree[pos.uci(m)] = null
    else {
      const d = bestDefence(pos, n - 1)
      pos.make(d.r)
      tree[pos.uci(m)] = { reply: pos.uci(d.r), next: buildTree(pos, n - 1) }
      pos.unmake()
    }
    pos.unmake()
  }
  return tree
}

/** One line through the tree (preferring the given first move, then quick mates). */
export function mainLine(tree, first) {
  const line = []
  let node = tree
  let pick = first && first in tree ? first : null
  while (node) {
    const keys = Object.keys(node)
    const move = pick ?? keys.find((k) => node[k] === null) ?? keys[0]
    pick = null
    line.push(move)
    const next = node[move]
    if (!next) break
    line.push(next.reply)
    node = next.next
  }
  return line
}

// ---------------------------------------------------------------- difficulty

/** Cheapest piece of colour `by` attacking square s (Infinity if none). */
function cheapestAttacker(pos, s, by) {
  const b = pos.b
  let best = Infinity
  const ok = (t) => !(t & 0x88)
  const look = (t, types) => {
    if (!ok(t)) return
    const pc = b[t]
    if (pc && pieceColor(pc) === by && types.includes(pieceType(pc))) best = Math.min(best, pieceType(pc) === 6 ? 100 : VALUE[pieceType(pc)])
  }
  for (const d of by === 0 ? [-15, -17] : [15, 17]) look(s + d, [1])
  for (const d of [33, 31, 18, 14, -33, -31, -18, -14]) look(s + d, [2])
  for (const d of [1, -1, 16, -16, 17, 15, -17, -15]) look(s + d, [6])
  for (const [dirs, types] of [
    [[17, 15, -17, -15], [3, 5]],
    [[1, -1, 16, -16], [4, 5]],
  ]) {
    for (const d of dirs) {
      for (let t = s + d; ok(t); t += d) {
        if (b[t]) {
          look(t, types)
          break
        }
      }
    }
  }
  return best
}

/**
 * Measures how hard a puzzle is, from the position and the key (first) move:
 * mate length, how many moves the solver can choose from, how many pieces are on the board,
 * whether the key is a check / capture / quiet move, whether it gives up material, and how many
 * defender replies the solution has to answer.
 */
export function measure(fen, n, tree, key) {
  const pos = new Position(fen)
  const solver = pos.side
  const solverMoves = pos.legal().length
  const pieces = pos.pieceCount()
  const m = pos.fromUci(key)
  const capturedBefore = pos.b[mTo(m)]
  const movedType = mPromo(m) || pieceType(pos.b[mFrom(m)])
  pos.make(m)
  const check = pos.inCheck()
  const capture = !!capturedBefore || (mFlag(m) & 1) === 1 // en passant also captures
  // a sacrifice: the moved piece can be taken, and it is worth more than what takes it (or nothing protects it)
  const to = mTo(m)
  const attacker = cheapestAttacker(pos, to, solver ^ 1)
  const protectedBy = pos.attacked(to, solver)
  const given = VALUE[movedType] - (capturedBefore ? VALUE[pieceType(capturedBefore)] : 0)
  const sacrifice = movedType !== 6 && attacker !== Infinity && attacker < 100 && (!protectedBy || VALUE[movedType] > attacker) && given >= 2
  const firstReplies = pos.legal().length
  pos.unmake()
  // defender replies along the main line (after each solver move)
  let replies = 0
  const line = mainLine(tree, key)
  const walk = new Position(fen)
  for (let i = 0; i < line.length; i++) {
    walk.make(walk.fromUci(line[i]))
    if (i % 2 === 0 && i + 1 < line.length) replies += walk.legal().length
  }
  const kind = check ? 'check' : capture ? 'capture' : 'quiet'
  const accepted = Object.keys(tree).length
  const score =
    25 * (n - 1) + // longer mates are harder
    0.5 * solverMoves + // more choices to search through
    1.0 * pieces + // a busier board
    (kind === 'quiet' ? 12 : kind === 'capture' ? 5 : 0) + // checks are the first thing people try
    (sacrifice ? 10 : 0) + // giving up material is counter-intuitive
    0.6 * replies - // defences to see through
    4 * (accepted - 1) // several correct first moves make it easier
  return { score: Math.round(score * 10) / 10, mateIn: n, solverMoves, pieces, kind, capture, sacrifice, defenderReplies: replies, firstReplies, acceptedFirstMoves: accepted }
}

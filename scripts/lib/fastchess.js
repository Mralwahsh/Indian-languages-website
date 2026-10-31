// A small, fast legal-move generator for the puzzle scripts (build time only, never shipped).
// chess.js is the reference for rules; this exists because brute-forcing mate in 3 against every
// defence with chess.js takes minutes per puzzle. scripts/lib/selftest.js checks that both agree.
//
// 0x88 board: square = rank * 16 + file (a1 = 0, h8 = 119). Pieces: 1 P, 2 N, 3 B, 4 R, 5 Q, 6 K;
// black pieces have bit 8 set (9 … 14). Moves are packed numbers: from | to << 7 | promo << 14 | flag << 18.

export const WHITE = 0
export const BLACK = 1
const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6
const FL_EP = 1, FL_CASTLE = 2, FL_DOUBLE = 4

const N_OFF = [33, 31, 18, 14, -33, -31, -18, -14]
const K_OFF = [1, -1, 16, -16, 17, 15, -17, -15]
const B_OFF = [17, 15, -17, -15]
const R_OFF = [1, -1, 16, -16]
export const VALUE = [0, 1, 3, 3, 5, 9, 0]

const ok = (s) => !(s & 0x88)
export const sqName = (s) => 'abcdefgh'[s & 7] + ((s >> 4) + 1)
const sqFrom = (n) => (Number(n[1]) - 1) * 16 + 'abcdefgh'.indexOf(n[0])
const PIECE_CHARS = ' pnbrqk'

export const mFrom = (m) => m & 127
export const mTo = (m) => (m >> 7) & 127
export const mPromo = (m) => (m >> 14) & 7
export const mFlag = (m) => m >> 18

export class Position {
  constructor(fen) {
    this.b = new Int8Array(128)
    this.kings = [-1, -1]
    this.hist = []
    const [place, side, castle, ep] = fen.trim().split(/\s+/)
    let rank = 7
    let file = 0
    for (const ch of place) {
      if (ch === '/') {
        rank--
        file = 0
      } else if (/\d/.test(ch)) file += Number(ch)
      else {
        const t = PIECE_CHARS.indexOf(ch.toLowerCase())
        const pc = t | (ch === ch.toLowerCase() ? 8 : 0)
        const s = rank * 16 + file
        this.b[s] = pc
        if (t === K) this.kings[pc >> 3] = s
        file++
      }
    }
    this.side = side === 'b' ? BLACK : WHITE
    this.castle = (castle.includes('K') ? 1 : 0) | (castle.includes('Q') ? 2 : 0) | (castle.includes('k') ? 4 : 0) | (castle.includes('q') ? 8 : 0)
    this.ep = ep && ep !== '-' ? sqFrom(ep) : -1
  }

  attacked(s, by) {
    const b = this.b
    const pawn = (by << 3) | P
    if (by === WHITE) {
      if ((ok(s - 15) && b[s - 15] === pawn) || (ok(s - 17) && b[s - 17] === pawn)) return true
    } else if ((ok(s + 15) && b[s + 15] === pawn) || (ok(s + 17) && b[s + 17] === pawn)) return true
    const kn = (by << 3) | N
    const kg = (by << 3) | K
    for (const d of N_OFF) if (ok(s + d) && b[s + d] === kn) return true
    for (const d of K_OFF) if (ok(s + d) && b[s + d] === kg) return true
    const bi = (by << 3) | B
    const ro = (by << 3) | R
    const qu = (by << 3) | Q
    for (const d of B_OFF) {
      for (let t = s + d; ok(t); t += d) {
        const pc = b[t]
        if (pc) {
          if (pc === bi || pc === qu) return true
          break
        }
      }
    }
    for (const d of R_OFF) {
      for (let t = s + d; ok(t); t += d) {
        const pc = b[t]
        if (pc) {
          if (pc === ro || pc === qu) return true
          break
        }
      }
    }
    return false
  }

  inCheck() {
    return this.attacked(this.kings[this.side], this.side ^ 1)
  }

  pseudo() {
    const b = this.b
    const side = this.side
    const out = []
    const enemy = (pc) => pc && pc >> 3 !== side
    for (let s = 0; s < 128; s++) {
      if (!ok(s)) {
        s += 7
        continue
      }
      const pc = b[s]
      if (!pc || pc >> 3 !== side) continue
      const t = pc & 7
      if (t === P) {
        const dir = side === WHITE ? 16 : -16
        const startRank = side === WHITE ? 1 : 6
        const lastRank = side === WHITE ? 7 : 0
        const push = (to, flag) => {
          if (to >> 4 === lastRank) for (const pr of [Q, R, B, N]) out.push(s | (to << 7) | (pr << 14) | (flag << 18))
          else out.push(s | (to << 7) | (flag << 18))
        }
        const one = s + dir
        if (ok(one) && !b[one]) {
          push(one, 0)
          if (s >> 4 === startRank && !b[one + dir]) out.push(s | ((one + dir) << 7) | (FL_DOUBLE << 18))
        }
        for (const c of [dir + 1, dir - 1]) {
          const to = s + c
          if (!ok(to)) continue
          if (enemy(b[to])) push(to, 0)
          else if (to === this.ep) out.push(s | (to << 7) | (FL_EP << 18))
        }
      } else if (t === N || t === K) {
        for (const d of t === N ? N_OFF : K_OFF) {
          const to = s + d
          if (ok(to) && (!b[to] || enemy(b[to]))) out.push(s | (to << 7))
        }
        if (t === K) this.castles(s, out)
      } else {
        const dirs = t === B ? B_OFF : t === R ? R_OFF : K_OFF
        for (const d of dirs) {
          for (let to = s + d; ok(to); to += d) {
            if (!b[to]) out.push(s | (to << 7))
            else {
              if (enemy(b[to])) out.push(s | (to << 7))
              break
            }
          }
        }
      }
    }
    return out
  }

  castles(s, out) {
    const b = this.b
    const side = this.side
    const them = side ^ 1
    const base = side === WHITE ? 0 : 112
    const rook = (side << 3) | R
    if (s !== base + 4) return
    const kBit = side === WHITE ? 1 : 4
    const qBit = side === WHITE ? 2 : 8
    if (this.castle & kBit && !b[base + 5] && !b[base + 6] && b[base + 7] === rook && !this.attacked(base + 4, them) && !this.attacked(base + 5, them) && !this.attacked(base + 6, them))
      out.push(s | ((base + 6) << 7) | (FL_CASTLE << 18))
    if (this.castle & qBit && !b[base + 3] && !b[base + 2] && !b[base + 1] && b[base] === rook && !this.attacked(base + 4, them) && !this.attacked(base + 3, them) && !this.attacked(base + 2, them))
      out.push(s | ((base + 2) << 7) | (FL_CASTLE << 18))
  }

  make(m) {
    const b = this.b
    const from = m & 127
    const to = (m >> 7) & 127
    const promo = (m >> 14) & 7
    const flag = m >> 18
    const pc = b[from]
    const side = this.side
    let capSq = to
    if (flag & FL_EP) capSq = to + (side === WHITE ? -16 : 16)
    const cap = b[capSq]
    this.hist.push({ m, cap, capSq, castle: this.castle, ep: this.ep, king: this.kings[side] })
    b[capSq] = 0
    b[to] = promo ? (side << 3) | promo : pc
    b[from] = 0
    if (flag & FL_CASTLE) {
      if (to === from + 2) {
        b[from + 1] = b[from + 3]
        b[from + 3] = 0
      } else {
        b[from - 1] = b[from - 4]
        b[from - 4] = 0
      }
    }
    if ((pc & 7) === K) {
      this.kings[side] = to
      this.castle &= side === WHITE ? ~3 : ~12
    }
    for (const s of [from, to]) {
      if (s === 0) this.castle &= ~2
      else if (s === 7) this.castle &= ~1
      else if (s === 112) this.castle &= ~8
      else if (s === 119) this.castle &= ~4
    }
    this.ep = flag & FL_DOUBLE ? (from + to) >> 1 : -1
    this.side = side ^ 1
  }

  unmake() {
    const h = this.hist.pop()
    const b = this.b
    const m = h.m
    const from = m & 127
    const to = (m >> 7) & 127
    const promo = (m >> 14) & 7
    const flag = m >> 18
    const side = this.side ^ 1
    this.side = side
    const moved = b[to]
    b[from] = promo ? (side << 3) | P : moved
    b[to] = 0
    b[h.capSq] = h.cap
    if (flag & FL_CASTLE) {
      if (to === from + 2) {
        b[from + 3] = b[from + 1]
        b[from + 1] = 0
      } else {
        b[from - 4] = b[from - 1]
        b[from - 1] = 0
      }
    }
    this.kings[side] = h.king
    this.castle = h.castle
    this.ep = h.ep
  }

  /** Legal moves for the side to move. */
  legal() {
    const out = []
    const me = this.side
    for (const m of this.pseudo()) {
      this.make(m)
      if (!this.attacked(this.kings[me], me ^ 1)) out.push(m)
      this.unmake()
    }
    return out
  }

  hasLegal() {
    const me = this.side
    for (const m of this.pseudo()) {
      this.make(m)
      const legal = !this.attacked(this.kings[me], me ^ 1)
      this.unmake()
      if (legal) return true
    }
    return false
  }

  isCheckmate() {
    return this.inCheck() && !this.hasLegal()
  }

  uci(m) {
    const promo = (m >> 14) & 7
    return sqName(m & 127) + sqName((m >> 7) & 127) + (promo ? ' pnbrq'[promo] : '')
  }

  /** The legal move written as UCI (e2e4, e7e8q), or 0. */
  fromUci(u) {
    return this.legal().find((m) => this.uci(m) === u) ?? 0
  }

  pieceCount() {
    let n = 0
    for (let s = 0; s < 128; s++) if (ok(s) && this.b[s]) n++
    return n
  }

  pieceAt(s) {
    return this.b[s]
  }
}

export const pieceType = (pc) => pc & 7
export const pieceColor = (pc) => pc >> 3

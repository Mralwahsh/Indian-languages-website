import { useLayoutEffect, useRef, useState } from 'react'
import { PIECES } from '../chess-shared/pieces.js'

const FILES = 'abcdefgh'

/**
 * Chess board for the puzzles: tap a piece then a square, or drag it (touch and mouse use the same
 * pointer events). Legal moves are shown as dots/rings. `animate` slides a piece from one square to
 * another (the opponent's automatic reply); `shakeKey` shakes the board after a wrong move.
 */
export default function Board({ chess, version, orientation = 'w', interactive = true, onMove, lastMove, animate, shakeKey = 0 }) {
  const ref = useRef(null)
  const [selected, setSelected] = useState(null)
  const [drag, setDrag] = useState(null) // { from, x, y, dx0, dy0, moved, pointerId }
  const [promo, setPromo] = useState(null) // { from, to }
  const [lastVersion, setLastVersion] = useState(version)

  // a new position (move played, new puzzle) clears any selection
  if (version !== lastVersion) {
    setLastVersion(version)
    setSelected(null)
    setDrag(null)
    setPromo(null)
  }

  const turn = chess.turn()
  const targets = selected ? chess.moves({ square: selected, verbose: true }) : []
  const targetSet = new Map(targets.map((m) => [m.to, m]))
  const checkSquare = chess.inCheck() ? findKing(chess, turn) : null

  const rows = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]
  const cols = orientation === 'w' ? [...FILES] : [...FILES].reverse()

  const squareAt = (clientX, clientY) => {
    const r = ref.current.getBoundingClientRect()
    const c = Math.floor(((clientX - r.left) / r.width) * 8)
    const row = Math.floor(((clientY - r.top) / r.height) * 8)
    if (c < 0 || c > 7 || row < 0 || row > 7) return null
    return cols[c] + rows[row]
  }

  const tryMove = (from, to) => {
    const options = chess.moves({ square: from, verbose: true }).filter((m) => m.to === to)
    if (!options.length) return false
    if (options.some((m) => m.promotion)) setPromo({ from, to })
    else onMove(from + to)
    setSelected(null)
    return true
  }

  const onPointerDown = (e) => {
    if (!interactive || promo) return
    e.preventDefault()
    const sq = squareAt(e.clientX, e.clientY)
    if (!sq) return
    if (selected && targetSet.has(sq)) {
      tryMove(selected, sq)
      return
    }
    const p = chess.get(sq)
    if (p && p.color === turn) {
      setSelected(sq)
      const r = ref.current.getBoundingClientRect()
      setDrag({ from: sq, x: e.clientX, y: e.clientY, size: r.width / 8, moved: false, pointerId: e.pointerId })
      try {
        ref.current.setPointerCapture(e.pointerId)
      } catch {
        /* synthetic pointer (tests) */
      }
    } else setSelected(null)
  }

  const onPointerMove = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    const moved = drag.moved || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8
    setDrag({ ...drag, cx: e.clientX, cy: e.clientY, moved })
  }

  const onPointerUp = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    if (drag.moved) {
      const to = squareAt(e.clientX, e.clientY)
      if (to && to !== drag.from) tryMove(drag.from, to)
    }
    setDrag(null)
  }

  // slide the opponent's piece from its old square
  useLayoutEffect(() => {
    if (!animate || !ref.current) return
    const el = ref.current.querySelector(`[data-sq="${animate.to}"]`)
    if (!el) return
    const [fx, fy] = cellOf(animate.from, orientation)
    const [tx, ty] = cellOf(animate.to, orientation)
    el.style.transition = 'none'
    el.style.transform = `translate(${(fx - tx) * 100}%, ${(fy - ty) * 100}%)`
    void el.offsetWidth
    el.style.transition = 'transform 320ms cubic-bezier(.3,.8,.3,1)'
    el.style.transform = ''
  }, [animate, orientation])

  const grid = chess.board() // [rank 8 … 1][a … h]
  const pieceAt = (sq) => grid[8 - Number(sq[1])][FILES.indexOf(sq[0])]

  return (
    <div className="relative w-full select-none" dir="ltr">
      <div
        key={shakeKey}
        ref={ref}
        className={`board relative grid aspect-square w-full touch-none grid-cols-8 overflow-hidden rounded-xl shadow-[0_18px_40px_-12px_rgba(0,0,40,0.55)] ring-4 ring-[#7a4a21] ${shakeKey ? 'shake' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {rows.map((rank, r) =>
          cols.map((file, c) => {
            const sq = file + rank
            const light = (FILES.indexOf(file) + rank) % 2 === 1
            const p = pieceAt(sq)
            const target = targetSet.get(sq)
            const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq)
            const dragging = drag?.moved && drag.from === sq
            return (
              <div key={sq} className={`relative ${light ? 'bg-[#f6e7c8]' : 'bg-[#c98d55]'}`}>
                {isLast && <div className="absolute inset-0 bg-[#ffb000]/45" />}
                {selected === sq && <div className="absolute inset-0 bg-[#000080]/30" />}
                {checkSquare === sq && <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(220,30,30,0.85)_0%,rgba(220,30,30,0.25)_60%,transparent_75%)]" />}
                {c === 0 && <span className={`absolute top-0.5 left-1 text-[clamp(8px,1.6vmin,13px)] font-bold ${light ? 'text-[#c98d55]' : 'text-[#f6e7c8]'}`}>{rank}</span>}
                {r === 7 && <span className={`absolute right-1 bottom-0 text-[clamp(8px,1.6vmin,13px)] font-bold ${light ? 'text-[#c98d55]' : 'text-[#f6e7c8]'}`}>{file}</span>}
                {p && (
                  <img
                    data-sq={sq}
                    src={PIECES[p.color + p.type.toUpperCase()]}
                    alt=""
                    draggable={false}
                    className={`pointer-events-none absolute inset-0 h-full w-full p-[4%] ${dragging ? 'opacity-25' : ''}`}
                  />
                )}
                {target &&
                  (p ? (
                    <div className="pointer-events-none absolute inset-[3%] rounded-full border-[0.45rem] border-[#000080]/45" />
                  ) : (
                    <div className="pointer-events-none absolute top-1/2 left-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#000080]/40" />
                  ))}
              </div>
            )
          }),
        )}
      </div>

      {/* the piece under a dragging finger */}
      {drag?.moved && drag.cx != null && (
        <img
          src={PIECES[pieceAt(drag.from).color + pieceAt(drag.from).type.toUpperCase()]}
          alt=""
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_8px_8px_rgba(0,0,0,0.4)]"
          style={{ left: drag.cx, top: drag.cy, width: drag.size * 1.25, height: drag.size * 1.25 }}
        />
      )}

      {/* promotion picker */}
      {promo && (
        <div className="absolute inset-0 z-20 grid place-items-center rounded-xl bg-black/45">
          <div className="flex gap-2 rounded-2xl bg-[#fffdf8] p-3 shadow-xl">
            {['q', 'r', 'b', 'n'].map((t) => (
              <button
                key={t}
                className="h-16 w-16 rounded-xl bg-[#f6e7c8] p-1 active:scale-95"
                onClick={() => {
                  onMove(promo.from + promo.to + t)
                  setPromo(null)
                }}
              >
                <img src={PIECES[turn + t.toUpperCase()]} alt={t} className="h-full w-full" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function findKing(chess, color) {
  for (const row of chess.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square
  return null
}

/** Column / row of a square on screen for the given orientation. */
function cellOf(sq, orientation) {
  const f = FILES.indexOf(sq[0])
  const r = Number(sq[1])
  return orientation === 'w' ? [f, 8 - r] : [7 - f, r - 1]
}

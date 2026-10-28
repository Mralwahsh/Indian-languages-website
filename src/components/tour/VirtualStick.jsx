import { useRef, useState } from 'react'

/**
 * Virtual analog stick (custom, no library). The knob follows one finger inside the base and
 * springs back to the centre on release. Reports x, y in -1..1 (y: up = negative).
 * Each stick tracks its own finger, so two sticks + buttons work at the same time.
 */
export default function VirtualStick({ onMove, onRelease, color = '#ff9933', label, icon }) {
  const baseRef = useRef(null)
  const pointerId = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 0, active: false })

  const update = (e) => {
    const r = baseRef.current.getBoundingClientRect()
    const radius = r.width / 2
    let dx = e.clientX - (r.left + radius)
    let dy = e.clientY - (r.top + radius)
    const d = Math.hypot(dx, dy)
    const max = radius * 0.62 // how far the knob may travel
    if (d > max) {
      dx = (dx / d) * max
      dy = (dy / d) * max
    }
    const v = { x: dx / max, y: dy / max }
    setPos({ ...v, active: true })
    onMove(v.x, v.y)
  }

  const down = (e) => {
    if (pointerId.current !== null) return
    pointerId.current = e.pointerId
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* pointer already gone */
    }
    update(e)
  }
  const move = (e) => e.pointerId === pointerId.current && update(e)
  const up = (e) => {
    if (e.pointerId !== pointerId.current) return
    pointerId.current = null
    setPos({ x: 0, y: 0, active: false })
    onRelease()
  }

  const mag = Math.min(1, Math.hypot(pos.x, pos.y))
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={baseRef}
        className="relative aspect-square h-[min(52vh,26vw)] touch-none rounded-full bg-white/[0.07] ring-2 ring-white/15"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
      >
        {/* direction glow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-100"
          style={{
            opacity: mag,
            background: `radial-gradient(circle at ${50 + pos.x * 38}% ${50 + pos.y * 38}%, ${color}cc 0%, ${color}33 32%, transparent 62%)`,
          }}
        />
        {/* tick marks */}
        {[0, 90, 180, 270].map((a) => (
          <span
            key={a}
            className="pointer-events-none absolute top-1/2 left-1/2 h-[10%] w-[3%] -translate-x-1/2 rounded-full bg-white/25"
            style={{ transform: `translate(-50%, -50%) rotate(${a}deg) translateY(-410%)` }}
          />
        ))}
        {/* knob */}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 grid aspect-square w-[42%] place-items-center rounded-full text-[4.5vh] shadow-[0_8px_18px_rgba(0,0,0,0.45)]"
          style={{
            background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${color} 55%, ${color} 100%)`,
            // translate % is relative to the knob (42% of the base); full travel = 0.31 base widths ≈ 73.8% of the knob
            transform: `translate(calc(-50% + ${pos.x * 73.8}%), calc(-50% + ${pos.y * 73.8}%))`,
            // spring back with a little overshoot
            transition: pos.active ? 'none' : 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {icon}
        </div>
      </div>
      {label && <span className="text-[3vh] font-bold text-white/70">{label}</span>}
    </div>
  )
}

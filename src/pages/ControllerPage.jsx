import { useCallback, useEffect, useRef, useState } from 'react'
import { EV } from '../../shared/protocol.js'
import { connectSocket, measurePing } from '../game/net/socket.js'
import { SLOT_CHARACTER, SLOT_COLOR, SLOT_LABEL_AR } from '../game/characters/index.js'

// A short-lived id so a phone that drops (screen lock, Wi-Fi hiccup, reload) gets its slot back.
// Not crypto.randomUUID(): that only exists on HTTPS pages, and the booth runs on plain HTTP.
function clientId() {
  const KEY = 'india-fighters:client-id'
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return `tmp-${Math.random().toString(36).slice(2, 10)}`
  }
}

const PHASE_TEXT = {
  lobby: 'اضغط أي زر للبدء',
  fighting: 'قاتل!',
  paused: 'المباراة متوقفة',
  result: 'اضغط أي زر للعب مجددًا',
}

const ACTIONS = [
  { button: 'punch', label: 'لكمة', icon: '👊', color: '#ff9933', area: 'punch' },
  { button: 'kick', label: 'ركلة', icon: '🦶', color: '#138808', area: 'kick' },
  { button: 'block', label: 'صدّ', icon: '🛡️', color: '#3b4bc4', area: 'block' },
  { button: 'special', label: 'خاصة', icon: '✨', color: '#c2185b', area: 'special' },
]

/** Phone controller: /controller. Landscape, multitouch, no zoom/scroll/selection. */
export default function ControllerPage() {
  const socketRef = useRef(null)
  const [status, setStatus] = useState('connecting') // connecting | connected | reconnecting | full | error
  const [slot, setSlot] = useState(null)
  const [phase, setPhase] = useState('lobby')
  const [ping, setPing] = useState(null)
  const [hitFlash, setHitFlash] = useState(0)
  const [held, setHeld] = useState({})
  const heldRef = useRef({})

  // ---------------------------------------------------------- button state → server
  const setButton = useCallback((button, pressed) => {
    if (!!heldRef.current[button] === pressed) return
    heldRef.current = { ...heldRef.current, [button]: pressed }
    setHeld(heldRef.current)
    socketRef.current?.emit(EV.INPUT, { button, pressed })
  }, [])

  const releaseAll = useCallback(() => {
    Object.keys(heldRef.current).forEach((b) => heldRef.current[b] && setButton(b, false))
  }, [setButton])

  // ---------------------------------------------------------- socket
  useEffect(() => {
    const id = clientId()
    const socket = connectSocket()
    socketRef.current = socket
    const join = () =>
      socket.emit(EV.CONTROLLER_JOIN, { clientId: id }, (res) => {
        if (res?.ok) {
          setSlot(res.slot)
          setPhase(res.phase)
          setStatus('connected')
        } else setStatus(res?.reason === 'full' ? 'full' : 'error')
      })
    socket.on('connect', join)
    socket.on('disconnect', () => setStatus((s) => (s === 'full' ? s : 'reconnecting')))
    socket.io.on('reconnect_attempt', () => setStatus((s) => (s === 'full' ? s : 'reconnecting')))
    socket.on(EV.GAME_STATE, ({ phase: p }) => setPhase(p))
    socket.on(EV.HIT, () => {
      setHitFlash((n) => n + 1)
      try {
        navigator.vibrate?.(70)
      } catch {
        /* not supported (iPhone) */
      }
    })
    const pingTimer = setInterval(async () => {
      if (!socket.connected) return
      const ms = await measurePing(socket)
      if (ms != null) {
        setPing(Math.round(ms))
        socket.emit(EV.CONTROLLER_PING, { ms })
      }
    }, 2000)
    return () => {
      clearInterval(pingTimer)
      socket.disconnect()
    }
  }, [])

  // release everything if the app is backgrounded (otherwise a button could stay "stuck")
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && releaseAll()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('blur', releaseAll)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('blur', releaseAll)
    }
  }, [releaseAll])

  // block pinch-zoom, double-tap zoom, scrolling and the long-press menu (iOS + Android)
  useEffect(() => {
    const stop = (e) => e.preventDefault()
    document.addEventListener('touchmove', stop, { passive: false })
    document.addEventListener('gesturestart', stop)
    document.addEventListener('dblclick', stop)
    document.addEventListener('contextmenu', stop)
    document.body.classList.add('controller-mode')
    return () => {
      document.removeEventListener('touchmove', stop)
      document.removeEventListener('gesturestart', stop)
      document.removeEventListener('dblclick', stop)
      document.removeEventListener('contextmenu', stop)
      document.body.classList.remove('controller-mode')
    }
  }, [])

  const color = SLOT_COLOR[slot] ?? '#ff9933'
  const character = SLOT_CHARACTER[slot]

  return (
    <div
      dir="ltr"
      className="fixed inset-0 flex touch-none flex-col overflow-hidden bg-[#0b0f3a] text-white select-none"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
    >
      <div className="tricolor-band h-1.5 shrink-0" />

      {/* top bar */}
      <header
        className="flex shrink-0 items-center justify-between gap-3 py-2"
        dir="rtl"
        style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
      >
        <div className="flex items-center gap-2">
          <span className="rounded-full px-3 py-1 text-base font-extrabold text-[#0b0f3a]" style={{ backgroundColor: color }}>
            {slot ? SLOT_LABEL_AR[slot] : '…'}
          </span>
          {character && <span className="text-lg font-bold">{character.nameAr}</span>}
        </div>
        <span className="text-base font-bold text-white/80">{status === 'connected' ? PHASE_TEXT[phase] : ''}</span>
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-3 w-3 rounded-full ${status === 'connected' ? 'bg-[#2ecc40]' : 'animate-pulse bg-[#ffb000]'}`} />
          <span className="text-white/70">{status === 'connected' ? `${ping ?? '–'} ms` : 'إعادة الاتصال…'}</span>
          <FullscreenButton />
        </div>
      </header>

      {/* pad */}
      <main
        className="relative grid min-h-0 flex-1 grid-cols-2 items-center gap-4 pb-[3vh]"
        // keep the pad clear of the notch / rounded corners in landscape
        style={{ paddingLeft: 'max(4vw, env(safe-area-inset-left))', paddingRight: 'max(4vw, env(safe-area-inset-right))' }}
      >
        <DPad onChange={setButton} held={held} />
        <div className="grid justify-self-end" style={{ gridTemplateAreas: '". special ." "block . kick" ". punch ."', gap: '1.2vh' }}>
          {ACTIONS.map((a) => (
            <ActionButton key={a.button} {...a} pressed={!!held[a.button]} onChange={setButton} />
          ))}
        </div>
      </main>

      {/* hit flash */}
      {hitFlash > 0 && <div key={hitFlash} className="pointer-events-none absolute inset-0 animate-[hitflash_250ms_ease-out_forwards] bg-[#ff3b30]" />}

      {/* status screens */}
      {status !== 'connected' && status !== 'reconnecting' && (
        <div className="absolute inset-0 grid place-items-center bg-[#0b0f3a]/95 p-6 text-center" dir="rtl">
          <div>
            <p className="text-3xl font-extrabold">
              {status === 'connecting' && 'جارٍ الاتصال…'}
              {status === 'full' && 'اللعبة ممتلئة الآن'}
              {status === 'error' && 'تعذّر الاتصال'}
            </p>
            {status === 'full' && <p className="mt-2 text-lg text-white/70">انتظر انتهاء المباراة ثم امسح الرمز مجددًا</p>}
          </div>
        </div>
      )}

      {/* portrait → ask to rotate */}
      <div className="rotate-hint absolute inset-0 bg-[#0b0f3a] p-8 text-center" dir="rtl">
        <div>
          <p className="text-7xl">📱↻</p>
          <p className="mt-4 text-3xl font-extrabold">أدر هاتفك بالعرض</p>
          <p className="mt-2 text-lg text-white/70">Turn your phone sideways</p>
        </div>
      </div>
    </div>
  )
}

// Keep receiving a finger's events even if it slides off the element (ignore if the browser refuses)
function capture(e) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch {
    /* pointer already gone */
  }
}

/** Left side: one touch zone; the thumb's position decides left/right/up/down (slide between them freely). */
function DPad({ onChange, held }) {
  const ref = useRef(null)
  const pointers = useRef(new Map()) // pointerId → {x, y}

  const recompute = useCallback(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const dead = r.width * 0.14
    const dirs = { left: false, right: false, up: false, down: false }
    for (const { x, y } of pointers.current.values()) {
      const dx = x - cx
      const dy = y - cy
      if (Math.abs(dx) > dead && Math.abs(dx) > Math.abs(dy) * 0.45) dirs[dx < 0 ? 'left' : 'right'] = true
      if (Math.abs(dy) > dead && Math.abs(dy) > Math.abs(dx) * 0.45) dirs[dy < 0 ? 'up' : 'down'] = true
    }
    Object.entries(dirs).forEach(([b, v]) => onChange(b, v))
  }, [onChange])

  const handlers = {
    onPointerDown: (e) => {
      capture(e)
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      recompute()
    },
    onPointerMove: (e) => {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      recompute()
    },
    onPointerUp: (e) => {
      pointers.current.delete(e.pointerId)
      recompute()
    },
  }
  handlers.onPointerCancel = handlers.onPointerUp
  handlers.onLostPointerCapture = handlers.onPointerUp

  const arrow = (b, cls, label) => (
    <span className={`absolute grid place-items-center rounded-2xl text-[7vh] font-black transition-colors duration-75 ${cls} ${held[b] ? 'bg-white text-[#0b0f3a]' : 'bg-white/10 text-white/80'}`}>
      {label}
    </span>
  )

  return (
    <div ref={ref} className="relative aspect-square h-[min(62vh,44vw)] touch-none rounded-full bg-white/5 ring-2 ring-white/10" {...handlers}>
      {arrow('up', 'left-1/3 top-0 h-1/3 w-1/3', '▲')}
      {arrow('down', 'bottom-0 left-1/3 h-1/3 w-1/3', '▼')}
      {arrow('left', 'top-1/3 left-0 h-1/3 w-1/3', '◀')}
      {arrow('right', 'top-1/3 right-0 h-1/3 w-1/3', '▶')}
      <span className="pointer-events-none absolute inset-[38%] rounded-full bg-white/10" />
    </div>
  )
}

/** Right side: big action buttons; each finger is tracked separately (multitouch). */
function ActionButton({ button, label, icon, color, area, pressed, onChange }) {
  const ids = useRef(new Set())
  const down = (e) => {
    capture(e)
    ids.current.add(e.pointerId)
    onChange(button, true)
  }
  const up = (e) => {
    ids.current.delete(e.pointerId)
    if (ids.current.size === 0) onChange(button, false)
  }
  return (
    <button
      type="button"
      className="grid h-[min(19vh,15vw)] w-[min(19vh,15vw)] touch-none place-items-center rounded-full font-extrabold shadow-lg transition-transform duration-75 select-none"
      style={{
        gridArea: area,
        backgroundColor: color,
        transform: pressed ? 'scale(0.9)' : 'scale(1)',
        boxShadow: pressed ? `0 0 0 6px #ffffff` : `0 6px 0 rgba(0,0,0,0.35)`,
      }}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
    >
      <span className="flex flex-col items-center leading-none">
        <span className="text-[5vh]">{icon}</span>
        <span className="mt-1 text-[3.2vh]">{label}</span>
      </span>
    </button>
  )
}

/** Android Chrome can go fullscreen + lock landscape; iPhone Safari can't, so the button hides there. */
function FullscreenButton() {
  if (!document.fullscreenEnabled) return null
  const go = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
      await screen.orientation?.lock?.('landscape')
    } catch {
      /* not allowed — ignore */
    }
  }
  return (
    <button type="button" onClick={go} className="ms-1 rounded-lg bg-white/10 px-2 py-1 text-base">
      ⛶
    </button>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { Info, Map as MapIcon, SkipForward, ZoomIn, ZoomOut } from 'lucide-react'
import { TEV } from '../../shared/tourProtocol.js'
import { STICKS } from '../tour/config.js'
import { connectTourSocket, tourPing } from '../tour/net.js'
import VirtualStick from '../components/tour/VirtualStick.jsx'

// Separate id from the football controller, so the two never mix.
function clientId() {
  const KEY = 'india-tour:client-id'
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

const vibrate = (pattern) => {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* not supported (iPhone) */
  }
}

/** Phone controller for virtual tours: /tour-controller. Two sticks + buttons, landscape. */
export default function TourControllerPage() {
  const socketRef = useRef(null)
  const [status, setStatus] = useState('connecting') // connecting | connected | reconnecting | error
  const [controlling, setControlling] = useState(false)
  const [tour, setTour] = useState({ mode: 'map', placeName: null })
  const [ping, setPing] = useState(null)
  const sticks = useRef({ move: { x: 0, y: 0, active: false, sentZero: true }, look: { x: 0, y: 0, active: false, sentZero: true } })

  // ---------------------------------------------------------- socket
  useEffect(() => {
    const id = clientId()
    const socket = connectTourSocket()
    socketRef.current = socket
    const join = () =>
      socket.emit(TEV.JOIN, { clientId: id }, (res) => {
        if (!res?.ok) return setStatus('error')
        setStatus('connected')
        setControlling(res.controlling)
        if (res.state) setTour(res.state)
      })
    socket.on('connect', join)
    socket.on('disconnect', () => setStatus('reconnecting'))
    socket.io.on('reconnect_attempt', () => setStatus('reconnecting'))
    socket.on(TEV.CONTROLLER_STATUS, ({ connected, controlling: me }) => {
      setControlling(!!me)
      if (!connected && !me) join() // the seat is free → try to take it
    })
    socket.on(TEV.STATE, setTour)
    socket.on(TEV.FEEDBACK, ({ type }) => vibrate(type === 'stepped' ? 35 : [45, 70, 45]))
    const pingTimer = setInterval(async () => {
      if (socket.connected) {
        const ms = await tourPing(socket)
        if (ms != null) setPing(Math.round(ms))
      }
    }, 2000)
    return () => {
      clearInterval(pingTimer)
      socket.disconnect()
    }
  }, [])

  // ---------------------------------------------------------- sticks: ~30 Hz while touched, final {0,0} on release
  useEffect(() => {
    const t = setInterval(() => {
      for (const [stick, s] of Object.entries(sticks.current)) {
        if (s.active) socketRef.current?.emit(TEV.STICK, { stick, x: +s.x.toFixed(3), y: +s.y.toFixed(3) })
      }
    }, 1000 / STICKS.sendHz)
    return () => clearInterval(t)
  }, [])

  const stickMove = (stick) => (x, y) => {
    Object.assign(sticks.current[stick], { x, y, active: true })
  }
  const stickRelease = (stick) => () => {
    Object.assign(sticks.current[stick], { x: 0, y: 0, active: false })
    socketRef.current?.emit(TEV.STICK, { stick, x: 0, y: 0 })
  }

  const releaseAll = useCallback(() => {
    for (const stick of ['move', 'look']) {
      if (sticks.current[stick].active) stickRelease(stick)()
    }
    socketRef.current?.emit(TEV.ZOOM, { dir: 'in', pressed: false })
  }, [])

  // background / lock screen: release everything
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && releaseAll()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('blur', releaseAll)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('blur', releaseAll)
    }
  }, [releaseAll])

  // no zoom / scroll / selection / long-press menus
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

  const send = (ev, data = {}) => socketRef.current?.emit(ev, data)
  const onMap = tour.mode !== 'tour'

  return (
    <div dir="ltr" className="fixed inset-0 flex touch-none flex-col overflow-hidden bg-[#0b0f3a] text-white select-none" style={{ WebkitTouchCallout: 'none' }}>
      <div className="tricolor-band h-1.5 shrink-0" />
      <header
        className="flex shrink-0 items-center justify-between gap-3 py-1.5"
        dir="rtl"
        style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
      >
        <span className="rounded-full bg-saffron px-3 py-0.5 text-base font-extrabold text-[#0b0f3a]">🧭 جولة</span>
        <span className="truncate font-display text-[4.2vh] font-extrabold">{onMap ? 'اختر مكانًا على الخريطة' : tour.placeName}</span>
        <span className="flex items-center gap-2 text-sm">
          <span className={`h-3 w-3 rounded-full ${status === 'connected' ? 'bg-[#2ecc40]' : 'animate-pulse bg-[#ffb000]'}`} />
          <span className="text-white/70">{status === 'connected' ? `${ping ?? '–'} ms` : 'إعادة الاتصال…'}</span>
        </span>
      </header>

      <main
        className="relative grid min-h-0 flex-1 grid-cols-[auto_1fr_auto] items-end gap-3 pb-[4vh]"
        style={{ paddingLeft: 'max(4vw, env(safe-area-inset-left))', paddingRight: 'max(4vw, env(safe-area-inset-right))' }}
      >
        <VirtualStick color="#ff9933" label={onMap ? 'اختر / ادخل' : 'مشي'} icon="🚶" onMove={stickMove('move')} onRelease={stickRelease('move')} />

        <div className="flex flex-col items-center justify-end gap-[3vh] pb-[6vh]">
          <div className="flex gap-[2.5vw]">
            <RoundButton label="معلومات" color="#000080" onTap={() => send(TEV.INFO)}>
              <Info size="5.5vh" />
            </RoundButton>
            <RoundButton label="المكان التالي" color="#138808" onTap={() => send(TEV.NEXT)}>
              <SkipForward size="5.5vh" />
            </RoundButton>
            <RoundButton label="الخريطة" color="#e5560c" onTap={() => send(TEV.EXIT)}>
              <MapIcon size="5.5vh" />
            </RoundButton>
          </div>
          <div className="flex gap-[2.5vw]">
            <RoundButton label="تصغير" color="#3b4bc4" small onHold={(p) => send(TEV.ZOOM, { dir: 'out', pressed: p })}>
              <ZoomOut size="4.5vh" />
            </RoundButton>
            <RoundButton label="تكبير" color="#3b4bc4" small onHold={(p) => send(TEV.ZOOM, { dir: 'in', pressed: p })}>
              <ZoomIn size="4.5vh" />
            </RoundButton>
          </div>
        </div>

        <VirtualStick color="#38bdf8" label="نظر" icon="👀" onMove={stickMove('look')} onRelease={stickRelease('look')} />
      </main>

      {/* someone else has the controls */}
      {status === 'connected' && !controlling && (
        <div className="absolute inset-0 grid place-items-center bg-[#0b0f3a]/95 p-8 text-center" dir="rtl">
          <div>
            <p className="text-6xl">⏳</p>
            <p className="mt-3 text-[5vh] font-extrabold">شخص آخر يتحكم بالجولة</p>
            <p className="mt-1 text-[3.5vh] text-white/70">انتظر دورك، ستنتقل إليك تلقائيًا</p>
          </div>
        </div>
      )}
      {(status === 'connecting' || status === 'error') && (
        <div className="absolute inset-0 grid place-items-center bg-[#0b0f3a]/95 text-center" dir="rtl">
          <p className="text-3xl font-extrabold">{status === 'error' ? 'تعذّر الاتصال' : 'جارٍ الاتصال…'}</p>
        </div>
      )}

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

/** Big round button. onTap = single press; onHold(pressed) = press + release (hold to repeat on the laptop). */
function RoundButton({ children, label, color, small, onTap, onHold }) {
  const ids = useRef(new Set())
  const [pressed, setPressed] = useState(false)
  const down = (e) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    if (ids.current.size === 0) {
      setPressed(true)
      onTap?.()
      onHold?.(true)
    }
    ids.current.add(e.pointerId)
  }
  const up = (e) => {
    if (!ids.current.delete(e.pointerId) || ids.current.size > 0) return
    setPressed(false)
    onHold?.(false)
  }
  const size = small ? 'h-[min(15vh,9vw)] w-[min(15vh,9vw)]' : 'h-[min(19vh,11vw)] w-[min(19vh,11vw)]'
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        className={`${size} grid touch-none place-items-center rounded-full shadow-lg transition-transform duration-75`}
        style={{ backgroundColor: color, transform: pressed ? 'scale(0.9)' : 'scale(1)', boxShadow: pressed ? '0 0 0 5px #fff' : '0 6px 0 rgba(0,0,0,0.35)' }}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
      >
        {children}
      </button>
      <span className="text-[2.6vh] font-bold text-white/75" dir="rtl">
        {label}
      </span>
    </div>
  )
}

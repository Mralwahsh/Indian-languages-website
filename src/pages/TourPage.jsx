import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TEV } from '../../shared/tourProtocol.js'
import { KEYS } from '../tour/config.js'
import { TOUR_PLACES, creditLine } from '../tour/places.js'
import { connectTourSocket } from '../tour/net.js'
import { MoveInterpreter } from '../tour/moveInterpreter.js'
import { getConnectionInfo } from '../game/net/socket.js'
import QrCode, { wifiQrText } from '../components/football/QrCode.jsx'
import TourMap from '../components/tour/TourMap.jsx'
import boothConfig from '../config/booth.json'

/**
 * Virtual tours on the laptop: map of places → 360° tour.
 * Driven by the phone (/tour-controller, own socket namespace) or the keyboard:
 * WASD move · arrows look · +/− zoom · I info · N next place · Esc back to the map.
 */
export default function TourPage() {
  const socketRef = useRef(null)
  const hostRef = useRef(null)
  const providerRef = useRef(null)
  const [info, setInfo] = useState(null)
  const [serverOk, setServerOk] = useState(null)
  const [phone, setPhone] = useState(false)
  const [mode, setMode] = useState('map') // map | loading | tour
  const [selected, setSelected] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [toast, setToast] = useState(null)
  const [viewpoint, setViewpoint] = useState(null)
  const [providerKind, setProviderKind] = useState(null)
  const live = useRef({})
  useLayoutEffect(() => {
    live.current = { mode, selected }
  })

  const place = TOUR_PLACES[selected]
  const controllerUrl = info ? `http://${info.ip}:${window.location.port || 80}/tour-controller` : null

  // ------------------------------------------------------------ provider lifecycle
  const enterTour = useCallback(async (index) => {
    if (live.current.mode !== 'map') return
    setSelected(index)
    setShowInfo(false)
    setMode('loading')
    try {
      const { createTourProvider } = await import('../tour/providers/index.js')
      const provider = await createTourProvider(hostRef.current, TOUR_PLACES[index])
      providerRef.current = provider
      if (import.meta.env.DEV) window.__tour = provider // debugging aid
      setProviderKind(provider.kind)
      setViewpoint(provider.viewpointName?.() ?? null)
      setMode('tour')
    } catch (e) {
      console.error('[tour] could not start', e)
      setMode('map')
    }
  }, [])

  const exitTour = useCallback(() => {
    providerRef.current?.destroy()
    providerRef.current = null
    if (hostRef.current) hostRef.current.innerHTML = ''
    setShowInfo(false)
    setMode('map')
  }, [])

  const nextPlace = useCallback(async () => {
    const { mode: m, selected: s } = live.current
    const next = (s + 1) % TOUR_PLACES.length
    if (m === 'map') return setSelected(next)
    if (m !== 'tour' || !providerRef.current) return
    setSelected(next)
    setShowInfo(false)
    setMode('loading')
    await providerRef.current.loadPlace(TOUR_PLACES[next])
    setViewpoint(providerRef.current.viewpointName?.() ?? null)
    setMode('tour')
  }, [])

  useEffect(() => () => providerRef.current?.destroy(), [])

  // ------------------------------------------------------------ walking (move stick → actions)
  const say = useCallback((text) => {
    setToast({ text, id: Date.now() })
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1400)
    return () => clearTimeout(t)
  }, [toast])

  const moveRef = useRef(null)
  if (!moveRef.current) {
    const walk = (dir) => async () => {
      const p = providerRef.current
      if (live.current.mode !== 'tour' || !p) return
      const ok = await p.step(dir)
      socketRef.current?.emit(TEV.FEEDBACK, { type: ok ? 'stepped' : 'no-path' })
      if (ok) setViewpoint(p.viewpointName?.() ?? null)
      else say('لا يوجد طريق في هذا الاتجاه')
    }
    moveRef.current = new MoveInterpreter({
      forward: () => (live.current.mode === 'map' ? enterTour(live.current.selected) : walk('forward')()),
      left: () => (live.current.mode === 'map' ? setSelected((s) => (s - 1 + TOUR_PLACES.length) % TOUR_PLACES.length) : walk('left')()),
      right: () => (live.current.mode === 'map' ? setSelected((s) => (s + 1) % TOUR_PLACES.length) : walk('right')()),
      back: () => live.current.mode === 'tour' && providerRef.current?.turnAround(),
    })
  }
  useEffect(() => {
    const t = setInterval(() => moveRef.current.tick(), 40)
    return () => clearInterval(t)
  }, [])

  const handleStick = useCallback(({ stick, x, y }) => {
    if (stick === 'move') moveRef.current.set(x, y)
    else providerRef.current?.setLookVelocity(x, y)
  }, [])
  const handleZoom = useCallback(({ dir, pressed }) => providerRef.current?.setZoomVelocity(pressed ? (dir === 'out' ? -1 : 1) : 0), [])
  const toggleInfo = useCallback(() => setShowInfo((v) => !v), [])

  // ------------------------------------------------------------ socket (tour namespace)
  useEffect(() => {
    getConnectionInfo().then((i) => {
      setInfo(i)
      setServerOk(!!i)
    })
    const socket = connectTourSocket()
    socketRef.current = socket
    socket.on('connect', () => {
      setServerOk(true)
      socket.emit(TEV.SCREEN_JOIN, (s) => setPhone(!!s?.connected))
    })
    socket.on('connect_error', () => setServerOk(false))
    socket.on(TEV.CONTROLLER_STATUS, ({ connected }) => setPhone(!!connected))
    socket.on(TEV.STICK, handleStick)
    socket.on(TEV.ZOOM, handleZoom)
    socket.on(TEV.INFO, toggleInfo)
    socket.on(TEV.NEXT, nextPlace)
    socket.on(TEV.EXIT, exitTour)
    return () => socket.disconnect()
  }, [handleStick, handleZoom, toggleInfo, nextPlace, exitTour])

  // tell the phone where we are (shown at the top of the controller)
  useEffect(() => {
    socketRef.current?.emit(TEV.STATE, { mode: mode === 'map' ? 'map' : 'tour', placeId: place.id, placeName: place.nameAr })
  }, [mode, place, phone])

  // ------------------------------------------------------------ keyboard fallback
  useEffect(() => {
    const held = new Set()
    const vec = (map) => {
      let x = 0
      let y = 0
      for (const code of held) if (map[code]) [x, y] = [x + map[code][0], y + map[code][1]]
      return [Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]
    }
    const push = () => {
      const [mx, my] = vec(KEYS.move)
      const [lx, ly] = vec(KEYS.look)
      if (mx || my || held.has('_moveWasActive')) moveRef.current.set(mx, my)
      if (lx || ly) providerRef.current?.setLookVelocity(lx * 0.8, ly * 0.8)
    }
    const t = setInterval(push, 1000 / 30) // keep refreshing while keys are held (sticks time out otherwise)
    const onDown = (e) => {
      if (e.repeat) return
      const c = e.code
      if (KEYS.move[c] || KEYS.look[c]) {
        held.add(c)
        e.preventDefault()
        push()
      } else if (KEYS.zoomIn.includes(c)) providerRef.current?.setZoomVelocity(1)
      else if (KEYS.zoomOut.includes(c)) providerRef.current?.setZoomVelocity(-1)
      else if (KEYS.info.includes(c)) toggleInfo()
      else if (KEYS.next.includes(c)) nextPlace()
    }
    const onUp = (e) => {
      const c = e.code
      if (held.delete(c)) {
        if (KEYS.move[c]) moveRef.current.set(...vec(KEYS.move))
        if (KEYS.look[c]) providerRef.current?.setLookVelocity(...vec(KEYS.look))
      }
      if (KEYS.zoomIn.includes(c) || KEYS.zoomOut.includes(c)) providerRef.current?.setZoomVelocity(0)
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      clearInterval(t)
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [toggleInfo, nextPlace])

  // ------------------------------------------------------------ render
  const inTour = mode !== 'map'
  return (
    <div className="relative h-full overflow-hidden">
      {/* 360° viewer host (kept mounted so the provider can render into it) */}
      <div ref={hostRef} className={`absolute inset-0 bg-[#0b0f3a] ${inTour ? '' : 'invisible'}`} />

      {!inTour && (
        <MapScreen
          selected={selected}
          setSelected={setSelected}
          onEnter={enterTour}
          controllerUrl={controllerUrl}
          serverOk={serverOk}
          phone={phone}
          showInfo={showInfo}
        />
      )}

      {inTour && (
        <>
          <div className="pointer-events-none absolute start-6 top-5 rounded-3xl bg-navy/80 px-6 py-3 text-white shadow-lg backdrop-blur">
            <p className="font-display text-4xl leading-tight font-extrabold">{place.nameAr}</p>
            <p className="text-xl text-white/80">
              {place.cityAr}
              {viewpoint ? ` · ${viewpoint}` : ''}
            </p>
          </div>
          <div className="pointer-events-none absolute end-6 top-5 flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-lg font-bold text-white">
            <span className={`h-3 w-3 rounded-full ${phone ? 'bg-[#2ecc40]' : 'bg-white/40'}`} />
            {phone ? 'الهاتف متصل' : 'لوحة المفاتيح'}
            {providerKind === 'google' && <span className="ms-2 rounded bg-white/20 px-2 text-sm">Street View</span>}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
            <p className="rounded-full bg-black/45 px-6 py-2 text-lg font-semibold text-white">
              🚶 العصا اليسرى: مشي · 👀 العصا اليمنى: نظر · ℹ️ معلومات · ⏭️ المكان التالي · 🗺️ الخريطة
            </p>
          </div>
        </>
      )}

      <AnimatePresence>
        {mode === 'loading' && (
          <motion.div key="loading" className="absolute inset-0 grid place-items-center bg-[#0b0f3a]/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="font-display text-4xl font-extrabold text-white">جارٍ الانتقال إلى {place.nameAr}…</p>
          </motion.div>
        )}
        {inTour && showInfo && <FactsCard key="facts" place={place} />}
        {toast && (
          <motion.div
            key={toast.id}
            className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="rounded-full bg-black/60 px-6 py-3 text-2xl font-bold text-white">{toast.text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MapScreen({ selected, setSelected, onEnter, controllerUrl, serverOk, phone, showInfo }) {
  const p = TOUR_PLACES[selected]
  const startNode = p.offline?.nodes?.find((n) => n.id === p.offline.start)
  const preview = startNode?.file
  // centre the preview on the start direction (matters for very wide strips like the Taj Mahal)
  const coverH = startNode?.fov?.h ?? 360
  const previewX = Math.min(100, Math.max(0, ((startNode?.startYaw ?? 0) / coverH + 0.5) * 100))
  return (
    <div className="mx-auto grid h-full max-w-[1800px] grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] gap-6 px-8 py-5">
      <section className="flex min-h-0 flex-col">
        <h1 className="font-display text-5xl leading-tight font-extrabold text-navy">
          جولات <span className="text-saffron-deep">افتراضية</span> 🧭
        </h1>
        <p className="text-2xl text-muted">تجوّل في أماكن من الهند بهاتفك، بزاوية 360°!</p>

        <motion.button
          key={p.id}
          onClick={() => onEnter(selected)}
          className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-[2rem] text-start shadow-lg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {preview && (
            <div
              className="absolute inset-0 bg-cover"
              style={{ backgroundImage: `url(${import.meta.env.BASE_URL}tours/${preview})`, backgroundPosition: `${previewX}% center` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <p className="text-xl font-bold text-saffron">{p.cityAr}</p>
            <p className="font-display text-5xl leading-tight font-extrabold">{p.nameAr}</p>
            <ul className="mt-2 space-y-1 text-lg leading-snug text-white/90">
              {(showInfo ? p.facts : p.facts.slice(0, 2)).map((f) => (
                <li key={f}>• {f.replace(/\s*TODO: verify.*$/i, '')}</li>
              ))}
            </ul>
            <p className="mt-3 inline-block rounded-full bg-saffron px-5 py-1.5 text-xl font-extrabold text-navy">ادفع عصا المشي للأمام للدخول ▲</p>
          </div>
        </motion.button>

        <div className="mt-4 flex items-center gap-5 rounded-3xl bg-paper p-4 shadow-sm ring-1 ring-ink/5">
          {serverOk === false ? (
            <p className="text-xl font-bold text-accent">الخادم غير متصل: شغّل npm start</p>
          ) : (
            <>
              {controllerUrl && <QrCode text={controllerUrl} size={150} />}
              <div className="min-w-0">
                <p className="font-display text-2xl font-extrabold text-navy">امسح للتحكم بالجولة</p>
                <p className="font-mono text-base text-muted" dir="ltr">
                  {controllerUrl ?? '…'}
                </p>
                <p className={`mt-1 text-lg font-bold ${phone ? 'text-green' : 'text-muted'}`}>{phone ? '✅ الهاتف متصل' : 'بانتظار هاتف…'}</p>
                <p className="text-sm text-muted" dir="ltr">
                  Keyboard: A/D choose · W enter · arrows look · +/− zoom · I info · N next · Esc map
                </p>
              </div>
              <div className="ms-auto flex items-center gap-3 rounded-2xl bg-green-soft p-2">
                <QrCode text={wifiQrText(boothConfig.wifi)} size={90} dark="#0d5c06" />
                <span className="text-sm font-bold text-green">الواي فاي</span>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="min-h-0 rounded-[2.5rem] bg-paper p-4 shadow-sm ring-1 ring-ink/5">
        <TourMap places={TOUR_PLACES} selected={selected} onSelect={(i) => (i === selected ? onEnter(i) : setSelected(i))} />
      </section>
    </div>
  )
}

function FactsCard({ place }) {
  return (
    <motion.div
      className="absolute end-6 top-28 w-[min(32rem,40vw)] rounded-[2rem] bg-paper/95 p-6 shadow-2xl backdrop-blur"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
    >
      <p className="text-lg font-bold text-saffron-deep">{place.cityAr}</p>
      <p className="font-display text-4xl leading-tight font-extrabold text-navy">{place.nameAr}</p>
      <ul className="mt-3 space-y-2 text-xl leading-relaxed">
        {place.facts.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-saffron">●</span>
            {f.replace(/\s*TODO: verify.*$/i, '')}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted" dir="ltr">
        {creditLine(place)}
      </p>
    </motion.div>
  )
}

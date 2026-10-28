import { useCallback, useEffect, useRef, useState } from 'react'
import { KEYS, TOUR } from '../tour/config.js'
import { TOUR_PLACES } from '../tour/places.js'
import { MoveInterpreter } from '../tour/moveInterpreter.js'
import { GoogleStreetViewProvider, findPanorama, loadGoogleMaps, onGoogleAuthFailure } from '../tour/providers/GoogleStreetViewProvider.js'

/**
 * /streetview-test: a page for the team to check Google Street View before the booth.
 * Is the key working? Is there Street View at a place? Which panorama id and heading to put in places.js?
 * The view is driven by the same provider as the tours, so the keyboard feel is the real one.
 */
const PRESETS = [
  { name: 'Taj Mahal', nameAr: 'تاج محل', lat: 27.1751, lng: 78.0421 },
  { name: 'Meenakshi Temple', nameAr: 'معبد ميناكشي', lat: 9.9195, lng: 78.1193 },
  { name: 'Kailasa Temple, Ellora', nameAr: 'معبد كايلاسا', lat: 20.0239, lng: 75.1794 },
  { name: 'Living Root Bridge, Nongriat', nameAr: 'الجسور الحية', lat: 25.2463, lng: 91.68 },
  { name: 'Golden Temple', nameAr: 'المعبد الذهبي', lat: 31.62, lng: 74.8765 },
  { name: 'Hawa Mahal', nameAr: 'هوا محل', lat: 26.9239, lng: 75.8267 },
  { name: 'Qutub Minar', nameAr: 'قطب منار', lat: 28.5245, lng: 77.1855 },
  ...TOUR_PLACES.map((p) => ({ name: p.name, nameAr: p.nameAr, lat: p.lat, lng: p.lng, tour: true })),
]

const haversine = (a, b) => {
  const r = (d) => (d * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

export default function StreetViewTestPage() {
  const hostRef = useRef(null)
  const providerRef = useRef(null)
  const [script, setScript] = useState('idle') // idle | loading | ready | error
  const [auth, setAuth] = useState(null)
  const [keyOk, setKeyOk] = useState(false) // true once a panorama was drawn and Google didn't object
  const [online, setOnline] = useState(navigator.onLine)
  const [form, setForm] = useState({ name: PRESETS[0].name, lat: PRESETS[0].lat, lng: PRESETS[0].lng, radius: 100, outdoor: false })
  const [result, setResult] = useState(null) // { status, data?, distance?, error? }
  const [busy, setBusy] = useState(false)
  const [pov, setPov] = useState(null)
  const [log, setLog] = useState([])
  const [copied, setCopied] = useState(false)

  const addLog = useCallback((text, kind = 'info') => {
    setLog((l) => [{ text, kind, at: new Date().toLocaleTimeString('en-GB') }, ...l].slice(0, 40))
  }, [])

  // ------------------------------------------------------------ status
  useEffect(() => {
    const up = () => setOnline(navigator.onLine)
    window.addEventListener('online', up)
    window.addEventListener('offline', up)
    const off = onGoogleAuthFailure((e) => {
      setAuth(e.message)
      addLog(e.message, 'error')
    })
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', up)
      off()
    }
  }, [addLog])

  useEffect(() => () => providerRef.current?.destroy(), [])

  // ------------------------------------------------------------ search + show
  const search = useCallback(
    async (f = form) => {
      setBusy(true)
      setResult(null)
      let found = null
      const lat = Number(f.lat)
      const lng = Number(f.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setResult({ status: 'BAD_INPUT', error: 'Latitude / longitude are not numbers' })
        setBusy(false)
        return
      }
      try {
        if (script !== 'ready') {
          setScript('loading')
          addLog('Loading Google Maps JavaScript API…')
          await loadGoogleMaps(TOUR.googleApiKey)
          setScript('ready')
          addLog('Google Maps loaded', 'ok')
        }
        addLog(`Searching within ${f.radius} m of ${lat.toFixed(5)}, ${lng.toFixed(5)}${f.outdoor ? ' (outdoor only)' : ''}`)
        const data = await findPanorama({ lat, lng, radius: Number(f.radius), outdoor: f.outdoor })
        const at = { lat: data.location.latLng.lat(), lng: data.location.latLng.lng() }
        const distance = haversine({ lat, lng }, at)
        found = { data, distance }
        addLog(`Found panorama ${data.location.pano} (${Math.round(distance)} m away)`, 'ok')

        const place = { id: 'test', name: f.name, lat, lng, google: { panoId: data.location.pano } }
        if (!providerRef.current) {
          const p = new GoogleStreetViewProvider()
          try {
            await p.mount(hostRef.current, place)
          } catch (e) {
            p.destroy()
            throw e
          }
          providerRef.current = p
          if (import.meta.env.DEV) window.__streetview = p // debugging aid
        } else {
          await providerRef.current.loadPlace(place)
        }
        setKeyOk(true)
        setResult({ status: 'OK', ...found })
      } catch (e) {
        const rejected = e.message === window.__gmapsAuthFailed || /rejected the API key/.test(e.message)
        const status = rejected ? 'GOOGLE_REFUSED' : (e.code ?? (/ZERO_RESULTS|not find/i.test(e.message) ? 'ZERO_RESULTS' : 'ERROR'))
        setResult({ status, error: rejected && found ? `${e.message}. (Google did find panorama ${found.data.location.pano}, but refused to show it.)` : e.message })
        if (rejected) {
          providerRef.current?.destroy()
          providerRef.current = null // its viewer shows Google's error page; start fresh next time
          if (hostRef.current) {
            hostRef.current.innerHTML = ''
            hostRef.current.removeAttribute('style') // Google paints the container grey
          }
        }
        if (!rejected && /key|load|Offline/i.test(e.message)) setScript('error')
        if (!rejected) addLog(e.message, 'error') // a rejected key is already logged by the listener above
      } finally {
        setBusy(false)
      }
    },
    [form, script, addLog],
  )

  const pick = (p) => {
    const f = { ...form, name: p.name, lat: p.lat, lng: p.lng }
    setForm(f)
    if (TOUR.googleApiKey) search(f)
  }

  // live heading / pitch / zoom / links readout
  useEffect(() => {
    const t = setInterval(() => {
      const p = providerRef.current
      if (!p?.sv) return
      const v = p.getView()
      setPov({ heading: v.yaw, pitch: v.pitch, zoom: p.getZoom(), links: p.getLinks(), pano: p.sv.getPano(), name: p.viewpointName() })
    }, 250)
    return () => clearInterval(t)
  }, [])

  // ------------------------------------------------------------ keyboard (same keys as the tour)
  useEffect(() => {
    const walk = (dir) => async () => {
      const p = providerRef.current
      if (!p) return
      const ok = await p.step(dir)
      addLog(ok ? `Walked ${dir}` : `No path ${dir}`, ok ? 'info' : 'warn')
    }
    const move = new MoveInterpreter({ forward: walk('forward'), left: walk('left'), right: walk('right'), back: () => providerRef.current?.turnAround() })
    const held = new Set()
    const vec = (map) => {
      let x = 0
      let y = 0
      for (const c of held) if (map[c]) [x, y] = [x + map[c][0], y + map[c][1]]
      return [Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]
    }
    const typing = (e) => /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
    const tick = setInterval(() => {
      const [mx, my] = vec(KEYS.move)
      const [lx, ly] = vec(KEYS.look)
      if (mx || my) move.set(mx, my)
      if (lx || ly) providerRef.current?.setLookVelocity(lx * 0.8, ly * 0.8)
      move.tick()
    }, 33)
    const onDown = (e) => {
      if (e.repeat || typing(e)) return
      const c = e.code
      if (KEYS.move[c] || KEYS.look[c]) {
        held.add(c)
        e.preventDefault()
        if (KEYS.move[c]) move.set(...vec(KEYS.move))
      } else if (KEYS.zoomIn.includes(c)) providerRef.current?.setZoomVelocity(1)
      else if (KEYS.zoomOut.includes(c)) providerRef.current?.setZoomVelocity(-1)
    }
    const onUp = (e) => {
      const c = e.code
      if (held.delete(c)) {
        if (KEYS.move[c]) move.set(...vec(KEYS.move))
        if (KEYS.look[c]) providerRef.current?.setLookVelocity(...vec(KEYS.look))
      }
      if (KEYS.zoomIn.includes(c) || KEYS.zoomOut.includes(c)) providerRef.current?.setZoomVelocity(0)
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      clearInterval(tick)
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [addLog])

  const snippet = pov?.pano ? `google: { panoId: '${pov.pano}', heading: ${Math.round(pov.heading)} },` : ''
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      addLog('Could not copy: select the text and copy it by hand', 'warn')
    }
  }

  const hasKey = !!TOUR.googleApiKey
  const d = result?.data
  return (
    <div className="flex h-full flex-col bg-cream text-ink">
      <div className="tricolor-band h-1.5 shrink-0" />
      <header className="flex flex-wrap items-center gap-3 border-b border-ink/10 bg-paper px-6 py-3">
        <h1 className="font-display text-3xl font-extrabold text-navy">اختبار Google Street View</h1>
        <div className="ms-auto flex flex-wrap gap-2" dir="ltr">
          <Chip ok={hasKey} label={hasKey ? 'API key: set' : 'API key: missing'} />
          <Chip ok={online} label={online ? 'Internet: online' : 'Internet: offline'} />
          <Chip ok={script === 'ready' ? true : script === 'error' ? false : null} label={`Maps script: ${script}`} />
          <Chip ok={auth ? false : keyOk ? true : null} label={auth ? 'Google: refused (see the reason)' : keyOk ? 'Key: accepted' : 'Key: not checked yet'} />
          <Chip ok={null} label={`Tour provider: ${TOUR.provider}`} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[22rem_minmax(0,1fr)]">
        {/* ------------------------------------------------ controls */}
        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-e border-ink/10 bg-paper p-4">
          {!hasKey && (
            <div className="rounded-2xl bg-saffron-soft p-4 text-base leading-relaxed">
              <p className="font-bold text-saffron-deep">لا يوجد مفتاح Google Maps بعد</p>
              <ol className="mt-2 list-decimal space-y-1 ps-5" dir="ltr">
                <li>
                  Google Cloud Console → enable <b>Maps JavaScript API</b> (billing must be on)
                </li>
                <li>Create an API key, restrict it to “HTTP referrers”: localhost and your booth address</li>
                <li>
                  Create <code>.env.local</code> in the project folder:
                  <pre className="mt-1 rounded bg-white/70 px-2 py-1 text-xs">VITE_GOOGLE_MAPS_API_KEY=your-key</pre>
                </li>
                <li>
                  Restart <code>npm run dev</code> and reload this page
                </li>
              </ol>
            </div>
          )}

          <section>
            <h2 className="mb-2 text-lg font-bold text-navy">أماكن جاهزة</h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={`${p.name}-${p.tour ? 't' : 'p'}`}
                  onClick={() => pick(p)}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 transition ${
                    form.name === p.name ? 'bg-navy text-white ring-navy' : p.tour ? 'bg-green-soft text-green ring-green/30' : 'bg-cream ring-ink/15 hover:ring-saffron'
                  }`}
                  title={p.name}
                >
                  {p.nameAr}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">الأخضر = أماكن الجولة الحالية</p>
          </section>

          <section className="space-y-2" dir="ltr">
            <h2 className="text-lg font-bold text-navy" dir="rtl">
              موقع مخصّص
            </h2>
            <label className="block text-sm">
              Name
              <input className="mt-0.5 w-full rounded-lg border border-ink/20 px-2 py-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                Latitude
                <input className="mt-0.5 w-full rounded-lg border border-ink/20 px-2 py-1 font-mono" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
              </label>
              <label className="block text-sm">
                Longitude
                <input className="mt-0.5 w-full rounded-lg border border-ink/20 px-2 py-1 font-mono" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
              </label>
            </div>
            <label className="block text-sm">
              Search radius: <b>{form.radius} m</b>
              <input type="range" min={25} max={5000} step={25} className="w-full accent-saffron" value={form.radius} onChange={(e) => setForm({ ...form, radius: Number(e.target.value) })} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.outdoor} onChange={(e) => setForm({ ...form, outdoor: e.target.checked })} />
              Google outdoor imagery only (no visitors’ photo spheres)
            </label>
            <button
              onClick={() => search()}
              disabled={busy || !hasKey}
              className="w-full rounded-full bg-saffron py-2 text-lg font-extrabold text-navy shadow-sm transition hover:bg-saffron-deep hover:text-white disabled:opacity-40"
            >
              {busy ? 'Searching…' : 'Find Street View'}
            </button>
          </section>

          {result && (
            <section className={`rounded-2xl p-3 text-sm ${result.status === 'OK' ? 'bg-green-soft' : 'bg-accent/10'}`} dir="ltr">
              <p className="font-bold">Status: {result.status}</p>
              {result.error && <p className="mt-1 break-words">{result.error}</p>}
              {result.status === 'ZERO_RESULTS' && <p className="mt-1">Try a bigger radius, or untick “outdoor only”.</p>}
              {d && (
                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                  <dt className="text-muted">Pano id</dt>
                  <dd className="font-mono break-all">{d.location.pano}</dd>
                  <dt className="text-muted">Place</dt>
                  <dd>{d.location.description || d.location.shortDescription || '—'}</dd>
                  <dt className="text-muted">Distance</dt>
                  <dd>{Math.round(result.distance)} m from the point</dd>
                  <dt className="text-muted">Date</dt>
                  <dd>{d.imageDate || '—'}</dd>
                  <dt className="text-muted">By</dt>
                  <dd>{d.copyright || '—'}</dd>
                  <dt className="text-muted">Links</dt>
                  <dd>{d.links?.length ?? 0} walkable neighbours</dd>
                </dl>
              )}
            </section>
          )}

          {snippet && (
            <section className="rounded-2xl bg-navy p-3 text-white" dir="ltr">
              <p className="text-sm text-white/70">For src/tour/places.js (current view):</p>
              <code className="mt-1 block font-mono text-sm break-all">{snippet}</code>
              <button onClick={copy} className="mt-2 rounded-full bg-white/15 px-3 py-1 text-sm font-bold hover:bg-white/25">
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </section>
          )}

          <section className="min-h-0" dir="ltr">
            <h2 className="mb-1 text-lg font-bold text-navy" dir="rtl">
              السجل
            </h2>
            <ul className="space-y-0.5 font-mono text-xs">
              {log.length === 0 && <li className="text-muted">Nothing yet.</li>}
              {log.map((l, i) => (
                <li key={i} className={l.kind === 'error' ? 'text-accent' : l.kind === 'ok' ? 'text-green' : l.kind === 'warn' ? 'text-saffron-deep' : 'text-ink/70'}>
                  <span className="text-muted">{l.at}</span> {l.text}
                </li>
              ))}
            </ul>
          </section>
        </aside>

        {/* ------------------------------------------------ viewer */}
        <main className="relative min-h-0 bg-[#0b0f3a]">
          <div ref={hostRef} className="absolute inset-0" />
          {!result?.data && (
            <div className="absolute inset-0 grid place-items-center p-8 text-center text-white/80">
              <div>
                <p className="text-5xl">🛰️</p>
                <p className="mt-3 text-2xl font-bold">{hasKey ? 'اختر مكانًا أو اضغط Find Street View' : 'أضف مفتاح Google Maps أولًا (انظر اليمين)'}</p>
                {result?.error && (
                  <p className="mt-2 text-base text-white/60" dir="ltr">
                    {result.error}
                  </p>
                )}
              </div>
            </div>
          )}
          {pov && result?.data && (
            <div className="pointer-events-none absolute start-4 bottom-4 rounded-2xl bg-black/60 px-4 py-2 font-mono text-sm text-white" dir="ltr">
              <div>
                heading {pov.heading.toFixed(0)}° · pitch {pov.pitch.toFixed(0)}° · zoom {pov.zoom.toFixed(0)}
              </div>
              <div className="text-white/70">links: {pov.links.length ? pov.links.map((l) => `${Math.round(l.yaw)}°`).join(' · ') : 'none'}</div>
              {pov.name && <div className="text-white/70">{pov.name}</div>}
            </div>
          )}
          {result?.data && (
            <p className="pointer-events-none absolute end-4 bottom-4 rounded-full bg-black/60 px-4 py-1.5 text-sm text-white" dir="ltr">
              W A S D walk · arrows look · + − zoom (same as the tour)
            </p>
          )}
        </main>
      </div>
    </div>
  )
}

function Chip({ ok, label }) {
  const color = ok === true ? 'bg-green-soft text-green ring-green/30' : ok === false ? 'bg-accent/10 text-accent ring-accent/30' : 'bg-cream text-ink/70 ring-ink/15'
  return <span className={`rounded-full px-3 py-1 text-sm font-bold ring-1 ${color}`}>{label}</span>
}

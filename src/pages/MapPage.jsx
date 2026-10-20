import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { geoMercator, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { MousePointerClick } from 'lucide-react'
import { getIndiaTopology, getLanguageFamilies, getLanguages, getNeighborsTopology, getStates } from '../services/dataService.js'
import { scriptDir, scriptFont } from '../config/scripts.js'
import StatePanel from '../components/StatePanel.jsx'
import NameMini from '../components/NameMini.jsx'
import { formatSpeakers } from '../utils/format.js'

const W = 760
const H = 860
const SMALL_AREA = 120 // px² — below this a state gets a clickable dot

// Labels for the gray neighbours and the seas, as [longitude, latitude]
const LABELS = [
  { text: 'باكستان', at: [69.4, 28.7] },
  { text: 'الصين', at: [86.5, 33.2] },
  { text: 'نيبال', at: [84.2, 28.3], small: true },
  { text: 'بوتان', at: [90.5, 27.45], small: true },
  { text: 'بنغلاديش', at: [90.2, 23.9], small: true },
  { text: 'ميانمار', at: [95.9, 21.6] },
  { text: 'سريلانكا', at: [80.7, 7.9], small: true },
  { text: 'بحر العرب', at: [70.6, 15.5], sea: true },
  { text: 'خليج البنغال', at: [88.6, 15], sea: true },
]

export default function MapPage() {
  const [map, setMap] = useState(null) // { shapes, neighbors, labels }
  const [error, setError] = useState(null)
  const [states, setStates] = useState({})
  const [languages, setLanguages] = useState({})
  const [families, setFamilies] = useState({})
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)
  const [legendFamily, setLegendFamily] = useState(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const wrapRef = useRef(null)

  useEffect(() => {
    getStates().then((ss) => setStates(Object.fromEntries(ss.map((s) => [s.id, s]))))
    getLanguages().then((ls) => setLanguages(Object.fromEntries(ls.map((l) => [l.id, l]))))
    getLanguageFamilies().then(setFamilies)
    Promise.all([getIndiaTopology(), getNeighborsTopology().catch(() => null)])
      .then(([topo, neighborTopo]) => {
        const fc = feature(topo, topo.objects[Object.keys(topo.objects)[0]])
        // The frame is fitted to India only; neighbours are simply cut off at the edges
        const projection = geoMercator().fitExtent(
          [
            [16, 16],
            [W - 16, H - 16],
          ],
          fc,
        )
        const path = geoPath(projection)
        const neighbors = neighborTopo
          ? feature(neighborTopo, neighborTopo.objects[Object.keys(neighborTopo.objects)[0]]).features.map((f) => ({
              id: f.properties.id,
              d: path(f),
            }))
          : []
        setMap({
          shapes: fc.features.map((f) => ({
            id: f.properties.id,
            d: path(f),
            centroid: path.centroid(f),
            area: path.area(f),
          })),
          neighbors,
          labels: neighborTopo ? LABELS.map((l) => ({ ...l, xy: projection(l.at) })) : [],
        })
      })
      .catch((e) => setError(e.message))
  }, [])

  const info = (id) => {
    const state = states[id]
    if (!state) return null
    return { state, language: languages[state.mainLanguageId], family: families[state.family] }
  }
  const hoveredInfo = hovered ? info(hovered) : null
  const selectedInfo = selected ? info(selected) : null

  const onMove = (e) => {
    const r = wrapRef.current?.getBoundingClientRect()
    if (r) setMouse({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width })
  }

  const shapes = useMemo(() => map?.shapes ?? [], [map])
  const sorted = useMemo(
    // draw hovered/selected last so their outline sits on top
    () => [...shapes].sort((a, b) => (a.id === hovered || a.id === selected) - (b.id === hovered || b.id === selected)),
    [shapes, hovered, selected],
  )

  return (
    <div className="mx-auto grid h-full max-w-[1800px] grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-8 px-10 py-5">
      {/* MAP */}
      <div className="flex min-h-0 flex-col">
        <div ref={wrapRef} className="relative min-h-0 flex-1" onMouseMove={onMove}>
          {error ? (
            <MapMissing message={error} />
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" onMouseLeave={() => setHovered(null)}>
              <defs>
                <clipPath id="map-frame">
                  <rect width={W} height={H} rx={36} />
                </clipPath>
                <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1b1b2f" floodOpacity="0.35" />
                </filter>
              </defs>

              {/* neighbouring countries (not interactive) */}
              <motion.g
                clipPath="url(#map-frame)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                onMouseEnter={() => setHovered(null)}
              >
                {map?.neighbors.map((n) => (
                  <path key={n.id} d={n.d} fill="#d9d5cf" stroke="#fbf7f0" strokeWidth={1.2} strokeLinejoin="round" />
                ))}
                {map?.labels.map((l) => (
                  <text
                    key={l.text}
                    x={l.xy[0]}
                    y={l.xy[1]}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={l.small ? 18 : 24}
                    fontWeight={700}
                    fill={l.sea ? '#9fb3c4' : '#9a948c'}
                    className="pointer-events-none select-none"
                  >
                    {l.text}
                  </text>
                ))}
              </motion.g>

              {sorted.map((s, i) => {
                const st = states[s.id]
                const color = families[st?.family]?.color ?? '#ccc'
                const isHover = hovered === s.id
                const isSel = selected === s.id
                const dimmed = legendFamily && st?.family !== legendFamily
                return (
                  <motion.g
                    key={s.id}
                    data-state={s.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: dimmed ? 0.2 : 1, scale: 1 }}
                    transition={{ delay: shapes.length && !hovered ? i * 0.012 : 0, duration: 0.4 }}
                    style={{ transformOrigin: `${s.centroid[0]}px ${s.centroid[1]}px` }}
                    className="cursor-pointer"
                    onMouseEnter={() => setHovered(s.id)}
                    onClick={() => setSelected(s.id)}
                  >
                    <path
                      d={s.d}
                      fill={color}
                      stroke={isSel ? '#000080' : '#fffdf8'}
                      strokeWidth={isSel ? 3 : isHover ? 2.5 : 1.2}
                      strokeLinejoin="round"
                      filter={isHover || isSel ? 'url(#lift)' : undefined}
                      style={{ filter: isHover && !isSel ? 'brightness(1.08)' : undefined, transition: 'stroke-width 150ms' }}
                    />
                    {s.area < SMALL_AREA && (
                      <circle
                        cx={s.centroid[0]}
                        cy={s.centroid[1]}
                        r={isHover || isSel ? 9 : 7}
                        fill={color}
                        stroke={isSel ? '#000080' : '#fff'}
                        strokeWidth={2.5}
                      />
                    )}
                  </motion.g>
                )
              })}
            </svg>
          )}

          {/* hover tooltip */}
          <AnimatePresence>
            {hoveredInfo && (
              <motion.div
                key="tip"
                className="pointer-events-none absolute z-10 w-80 rounded-3xl bg-paper p-5 shadow-2xl ring-1 ring-ink/10"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  left: mouse.x + (mouse.x > (mouse.w ?? 800) - 360 ? -340 : 24),
                  top: Math.max(0, mouse.y - 90),
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.6 }}
              >
                <p className="font-display text-2xl leading-snug font-extrabold">{hoveredInfo.state.nameAr}</p>
                <p className="mt-0.5 flex items-center gap-2 text-lg font-semibold text-muted">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: hoveredInfo.family?.color }} />
                  {hoveredInfo.language?.nameAr}
                </p>
                <p
                  dir={scriptDir(hoveredInfo.language?.script)}
                  className={`${scriptFont(hoveredInfo.language?.script)} mt-2 text-5xl leading-[1.5] font-bold text-navy`}
                >
                  {hoveredInfo.language?.helloNative}
                </p>
                <p className="text-xl text-ink/70">«{hoveredInfo.language?.helloPronunciationAr}» = مرحبا</p>
                <p className="mt-2 text-base text-muted">≈ {formatSpeakers(hoveredInfo.language?.speakersApprox)} متحدث</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* legend */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {Object.entries(families).map(([id, f]) => (
            <button
              key={id}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-base font-bold ring-1 ring-ink/10 transition ${legendFamily === id ? 'bg-ink text-white' : 'bg-paper'}`}
              onMouseEnter={() => setLegendFamily(id)}
              onMouseLeave={() => setLegendFamily(null)}
            >
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: f.color }} />
              {f.nameAr}
            </button>
          ))}
        </div>
      </div>

      {/* PANEL */}
      <div className="min-h-0">
        <AnimatePresence mode="wait">
          {selectedInfo ? (
            <StatePanel key={selected} {...selectedInfo} onClose={() => setSelected(null)} />
          ) : (
            <motion.div
              key="intro"
              className="flex h-full flex-col justify-center rounded-[2.5rem] bg-paper p-8 shadow-sm ring-1 ring-ink/5 2xl:p-10"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
            >
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                <MousePointerClick size={64} className="text-saffron" />
              </motion.div>
              <h2 className="mt-4 font-display text-4xl leading-snug font-extrabold 2xl:text-5xl">اضغط على أي ولاية لترى اسمك بخطّها!</h2>
              <p className="mt-4 text-2xl leading-relaxed text-ink/70">
                لغات الهند تنتمي إلى <b>4 عائلات مختلفة</b>، مختلفة عن بعضها كاختلاف العربية عن الإنجليزية.
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {Object.entries(families).map(([id, f]) => (
                  <li key={id} className="flex items-start gap-2 text-lg leading-snug">
                    <span className="mt-1.5 h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: f.color }} />
                    <span>
                      <b>{f.nameAr}</b>: <span className="text-muted">{f.blurb}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <NameMini />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function MapMissing({ message }) {
  return (
    <div className="grid h-full place-items-center rounded-[2rem] border-4 border-dashed border-ink/15 p-10 text-center">
      <div>
        <p className="text-3xl font-bold">لم يتم العثور على بيانات الخريطة</p>
        <p className="mt-2 text-xl text-muted" dir="ltr">
          public/data/india_states.topojson
        </p>
        <p className="mt-2 text-sm text-muted">{message}</p>
      </div>
    </div>
  )
}

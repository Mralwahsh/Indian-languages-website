import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { geoMercator, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { getIndiaTopology } from '../../services/dataService.js'

const W = 700
const H = 780

/** India outline with a pin per tour place; the selected one pulses. */
export default function TourMap({ places, selected, onSelect }) {
  const [geo, setGeo] = useState(null)

  useEffect(() => {
    getIndiaTopology()
      .then((topo) => {
        const fc = feature(topo, topo.objects[Object.keys(topo.objects)[0]])
        const projection = geoMercator().fitExtent(
          [
            [20, 20],
            [W - 20, H - 20],
          ],
          fc,
        )
        const path = geoPath(projection)
        setGeo({ states: fc.features.map((f) => path(f)), projection })
      })
      .catch(() => setGeo({ states: [], projection: null }))
  }, [])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      {geo?.states.map((d, i) => (
        <path key={i} d={d} fill={i % 3 === 0 ? '#ffe2bf' : i % 3 === 1 ? '#fff3e3' : '#dcf1d6'} stroke="#ffffff" strokeWidth={1.4} />
      ))}
      {geo?.projection &&
        places.map((p, i) => {
          const [px, py] = geo.projection([p.lng, p.lat])
          // places that are close together can be nudged apart (pin: { dx, dy }) with a leader line
          const x = px + (p.pin?.dx ?? 0)
          const y = py + (p.pin?.dy ?? 0)
          const on = i === selected
          return (
            <g key={p.id} className="cursor-pointer" onClick={() => onSelect?.(i)}>
              {p.pin && (
                <>
                  <line x1={px} y1={py} x2={x} y2={y} stroke="#000080" strokeWidth={2} strokeDasharray="4 3" />
                  <circle cx={px} cy={py} r={4} fill="#000080" />
                </>
              )}
              <g transform={`translate(${x} ${y})`}>
              {on && (
                <motion.circle r={18} fill="#ff9933" initial={{ opacity: 0.5, scale: 1 }} animate={{ opacity: 0, scale: 2.6 }} transition={{ duration: 1.4, repeat: Infinity }} />
              )}
              <path d="M0 0 C-14 -18 -14 -34 0 -40 C14 -34 14 -18 0 0 Z" fill={on ? '#e5560c' : '#000080'} stroke="#ffffff" strokeWidth={2.5} transform={on ? 'scale(1.35)' : undefined} />
              <circle cy={on ? -38 : -28} r={on ? 7 : 5.5} fill="#ffffff" />
              <text y={on ? 26 : 20} textAnchor="middle" fontSize={on ? 24 : 18} fontWeight={800} fill={on ? '#e5560c' : '#10123a'} stroke="#fffdf8" strokeWidth={5} paintOrder="stroke">
                {p.nameAr}
              </text>
              </g>
            </g>
          )
        })}
    </svg>
  )
}

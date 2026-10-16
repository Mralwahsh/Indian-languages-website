import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { shapeText } from '../services/glyphService.js'
import { scriptDir, scriptFont } from '../config/scripts.js'

/**
 * Text rendered from real font outlines (HarfBuzz) as SVG.
 * - mode="static": filled glyphs; `highlight` (Set of code point indices) recolours parts
 * - mode="write": each glyph's outline is traced, then filled ("handwriting")
 * Falls back to plain text if shaping isn't available.
 */
export default function GlyphText({
  text,
  script,
  height = 140,
  color = 'currentColor',
  highlight = null,
  highlightColor = '#e2700a',
  dimOthers = false,
  mode = 'static',
  speed = 1,
  onDone,
  className = '',
}) {
  const [shaped, setShaped] = useState(undefined) // undefined = loading, null = unavailable

  useEffect(() => {
    let alive = true
    setShaped(undefined)
    shapeText(text, script).then((r) => alive && setShaped(r))
    return () => {
      alive = false
    }
  }, [text, script])

  // Tell the parent when the writing animation should be finished
  useEffect(() => {
    if (mode !== 'write' || !onDone) return
    const n = shaped?.glyphs.length ?? [...text].length
    const t = setTimeout(onDone, (n * STAGGER + DRAW + 0.6) * 1000 * speed)
    return () => clearTimeout(t)
  }, [mode, shaped, text, speed, onDone])

  if (!shaped) {
    return <FallbackText text={text} script={script} height={height} color={color} mode={mode} className={className} />
  }

  // A character fused into a ligature (e.g. the ् and र inside ब्र) has no glyph of its own:
  // highlight the glyph it was merged into (the closest cluster at or before it).
  let effective = highlight
  if (highlight) {
    const clusters = [...new Set(shaped.glyphs.map((g) => g.cluster))].sort((a, b) => a - b)
    effective = new Set(
      [...highlight].map((idx) => (clusters.includes(idx) ? idx : clusters.filter((c) => c <= idx).pop() ?? idx)),
    )
  }

  const [, , vbW, vbH] = shaped.viewBox.split(' ').map(Number)
  const order = shaped.glyphs.map((_, i) => i)
  if (shaped.rtl) order.reverse() // glyphs come in visual order; Urdu is written right → left
  const rank = new Map(order.map((gi, k) => [gi, k]))

  return (
    <svg
      viewBox={shaped.viewBox}
      className={className}
      style={{ width: height * (vbW / vbH), maxWidth: '100%', height: 'auto', aspectRatio: `${vbW} / ${vbH}`, overflow: 'visible' }}
      role="img"
      aria-label={text}
    >
      {shaped.glyphs.map((g, i) => {
        const on = effective?.has(g.cluster)
        const fill = on ? highlightColor : color
        const opacity = effective && dimOthers && !on ? 0.25 : 1
        const transform = `translate(${g.x} ${-g.y}) scale(1 -1)`
        if (mode === 'write') {
          const delay = rank.get(i) * STAGGER * speed
          return (
            <motion.path
              key={`${i}-${g.cluster}`}
              d={g.d}
              transform={transform}
              stroke={fill}
              strokeWidth={shaped.upem * 0.03}
              strokeLinejoin="round"
              fill={fill}
              initial={{ pathLength: 0, fillOpacity: 0 }}
              animate={{ pathLength: 1, fillOpacity: 1 }}
              transition={{
                pathLength: { delay, duration: DRAW * speed, ease: 'easeInOut' },
                fillOpacity: { delay: delay + DRAW * speed, duration: 0.5 },
              }}
            />
          )
        }
        return (
          <path
            key={`${i}-${g.cluster}`}
            d={g.d}
            transform={transform}
            fill={fill}
            opacity={opacity}
            style={{ transition: 'fill 250ms, opacity 250ms' }}
          />
        )
      })}
    </svg>
  )
}

const STAGGER = 0.5
const DRAW = 1.1

function FallbackText({ text, script, height, color, mode, className }) {
  // CSS stroke-reveal: outline wipes in, then fills
  return (
    <span
      dir={scriptDir(script)}
      className={`${scriptFont(script)} inline-block font-bold whitespace-nowrap ${className}`}
      style={{ fontSize: height * 0.55, lineHeight: 1.6, color }}
    >
      {mode === 'write' ? (
        <motion.span
          className="inline-block"
          style={{ WebkitTextStroke: `2px ${color}` }}
          initial={{ clipPath: scriptDir(script) === 'rtl' ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)', color: 'rgba(0,0,0,0)' }}
          animate={{ clipPath: 'inset(0 0% 0 0%)', color }}
          transition={{ clipPath: { duration: 0.5 * [...text].length, ease: 'linear' }, color: { delay: 0.5 * [...text].length, duration: 0.5 } }}
        >
          {text}
        </motion.span>
      ) : (
        text
      )}
    </span>
  )
}

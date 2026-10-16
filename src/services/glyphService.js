// Shapes text with HarfBuzz (WASM) using the same local Noto TTFs the page uses,
// and returns real glyph outlines as SVG paths. Complex scripts (conjuncts,
// reordered vowel signs, Nastaliq joining) come out exactly as the browser shows them.
//
// Each glyph remembers which input code point(s) produced it (`cluster` = code point index),
// so the UI can colour the vowel sign inside "ली" separately from the consonant.
import { SCRIPTS } from '../config/scripts.js'

let hbPromise = null
const fontCache = new Map()
const shapeCache = new Map()

function loadHarfBuzz() {
  hbPromise ??= import('harfbuzzjs')
  return hbPromise
}

async function loadFont(fileName) {
  if (!fontCache.has(fileName)) {
    fontCache.set(
      fileName,
      (async () => {
        const hb = await loadHarfBuzz()
        const res = await fetch(`${import.meta.env.BASE_URL}fonts/${fileName}`)
        if (!res.ok) throw new Error(`Font not found: ${fileName}`)
        const face = new hb.Face(new hb.Blob(await res.arrayBuffer()), 0)
        const font = new hb.Font(face)
        return { hb, font, upem: face.upem }
      })(),
    )
  }
  return fontCache.get(fileName)
}

/**
 * @returns {Promise<null | {
 *   glyphs: {d: string, x: number, y: number, cluster: number}[],
 *   viewBox: string, width: number, height: number, rtl: boolean, codepoints: string[]
 * }>} null when shaping isn't available (caller falls back to plain text)
 */
export async function shapeText(text, script) {
  const fileName = SCRIPTS[script]?.fontFile
  if (!fileName || !text) return null
  const key = `${fileName}|${text}`
  if (shapeCache.has(key)) return shapeCache.get(key)

  try {
    const { hb, font, upem } = await loadFont(fileName)
    const codepoints = [...text]
    const buffer = new hb.Buffer()
    buffer.setClusterLevel(hb.ClusterLevel.CHARACTERS)
    codepoints.forEach((ch, i) => buffer.add(ch.codePointAt(0), i))
    buffer.guessSegmentProperties()
    hb.shape(font, buffer)
    const infos = buffer.getGlyphInfos()
    const positions = buffer.getGlyphPositions()

    let pen = 0
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    const glyphs = infos.map((info, i) => {
      const p = positions[i]
      const x = pen + p.xOffset
      const y = p.yOffset
      pen += p.xAdvance
      const ext = font.glyphExtents(info.codepoint)
      if (ext && ext.width) {
        minX = Math.min(minX, x + ext.xBearing)
        maxX = Math.max(maxX, x + ext.xBearing + ext.width)
        maxY = Math.max(maxY, y + ext.yBearing)
        minY = Math.min(minY, y + ext.yBearing + ext.height)
      }
      return { d: font.glyphToPath(info.codepoint), x, y, cluster: info.cluster }
    })
    if (!Number.isFinite(minX)) return null

    // Use a fixed vertical band so names with/without tall letters render at the same size
    maxY = Math.max(maxY, upem * 0.9)
    minY = Math.min(minY, -upem * 0.25)
    const pad = upem * 0.08
    const width = maxX - minX + pad * 2
    const height = maxY - minY + pad * 2
    const result = {
      glyphs: glyphs.filter((g) => g.d),
      viewBox: `${minX - pad} ${-maxY - pad} ${width} ${height}`,
      width,
      height,
      upem,
      rtl: SCRIPTS[script]?.dir === 'rtl',
      codepoints,
    }
    shapeCache.set(key, result)
    return result
  } catch (err) {
    console.warn('[glyphService] shaping unavailable, falling back to text', err)
    return null
  }
}

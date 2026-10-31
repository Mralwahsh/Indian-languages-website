// The cburnett piece set, bundled into the code (no extra downloads, works offline).
const files = import.meta.glob('./pieces/*.svg', { query: '?raw', import: 'default', eager: true })

/** 'wK', 'bQ', … → image URL */
export const PIECES = {}
for (const [file, svg] of Object.entries(files)) {
  const [, color, type] = file.match(/([wb])([kqrbnp])\.svg$/)
  PIECES[color + type.toUpperCase()] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export const PIECE_CREDIT = 'Chess pieces: Colin M.L. Burnett (Cburnett), CC BY-SA 3.0, via Wikimedia Commons'

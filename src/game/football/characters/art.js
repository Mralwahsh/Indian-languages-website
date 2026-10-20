// Vector "big head" art for the characters, as SVG strings.
// The same drawing is used by the game (turned into a texture) and by React (lobby, phone, result).
// Heads face RIGHT; the game mirrors them for the player on the right side.
// To use painted art instead, set `sprites.head` in a character file.

/** Geometry shared with the game (eyes are drawn there so they can look at the ball). */
export const HEAD = {
  size: 128, // SVG viewBox is 128×128
  cx: 64,
  cy: 70,
  r: 52, // radius of the face circle → matches the physics head
  eyes: [
    { x: 76, y: 64 },
    { x: 98, y: 64 },
  ],
  eyeRx: 8.5,
  eyeRy: 10.5,
  pupilR: 4.6,
  pupilRange: 4.2, // how far pupils can move inside the eye
}

const OUTLINE = '#2b1a12'

function headwear(c) {
  const k = c.colors
  switch (c.look.headwear) {
    case 'safa': // Rajasthani turban: big wrapped dome + a fan at the back
      return `
        <path d="M18 66 C10 30 40 6 70 8 C100 10 120 30 114 60 C100 50 40 46 18 66 Z" fill="${k.headwear}" stroke="${OUTLINE}" stroke-width="3"/>
        <path d="M24 52 C50 36 90 34 112 46" fill="none" stroke="${k.headwearTrim}" stroke-width="4" stroke-linecap="round"/>
        <path d="M30 34 C55 22 85 20 104 30" fill="none" stroke="${k.headwearTrim}" stroke-width="4" stroke-linecap="round"/>
        <path d="M22 40 C8 30 6 14 14 6 C22 18 26 26 30 34 Z" fill="${k.headwearTrim}" stroke="${OUTLINE}" stroke-width="2.5"/>
        <circle cx="96" cy="40" r="5" fill="#ffd23f" stroke="${OUTLINE}" stroke-width="2"/>`
    case 'bun': // hair with a side bun and jasmine flowers
      return `
        <path d="M14 76 C6 34 36 12 66 14 C96 16 116 34 112 54 C96 40 70 36 52 40 C36 44 26 58 24 80 Z" fill="${k.hair}" stroke="${OUTLINE}" stroke-width="3"/>
        <circle cx="20" cy="44" r="16" fill="${k.hair}" stroke="${OUTLINE}" stroke-width="3"/>
        ${[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const a = (i / 7) * Math.PI * 2
          return `<circle cx="${20 + Math.cos(a) * 15}" cy="${44 + Math.sin(a) * 15}" r="4" fill="${k.headwear}" stroke="#d8d8d8" stroke-width="1"/>`
        }).join('')}
        <circle cx="90" cy="47" r="2.8" fill="#d0103a"/>`
    case 'curly': // curly hair + headband
      return `
        ${[[24, 40], [36, 26], [52, 18], [70, 16], [88, 20], [102, 30], [110, 44], [18, 56], [28, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15" fill="${k.hair}" stroke="${OUTLINE}" stroke-width="3"/>`).join('')}
        ${[[24, 40], [36, 26], [52, 18], [70, 16], [88, 20], [102, 30], [110, 44], [18, 56], [28, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" fill="${k.hair}"/>`).join('')}
        <path d="M14 52 C40 40 90 38 116 50 L114 60 C90 48 40 50 16 62 Z" fill="${k.headwear}" stroke="${OUTLINE}" stroke-width="2.5"/>
        <path d="M30 50 L40 47 M60 44 L70 44 M90 45 L100 47" stroke="${k.headwearTrim}" stroke-width="3" stroke-linecap="round"/>`
    case 'bob': // bob haircut with fringe + headband
      return `
        <path d="M12 96 C2 40 30 12 66 12 C100 12 120 34 116 62 L104 62 C96 46 84 42 76 52 C60 40 40 42 30 60 L28 100 Z" fill="${k.hair}" stroke="${OUTLINE}" stroke-width="3"/>
        <path d="M22 44 C46 26 92 24 114 42" fill="none" stroke="${k.headwear}" stroke-width="9" stroke-linecap="round"/>
        <circle cx="34" cy="38" r="4" fill="${k.headwearTrim}"/>`
    default:
      return ''
  }
}

/**
 * @param {object} character
 * @param {{ pupils?: boolean, look?: {x:number,y:number} }} opts  pupils: draw pupils (React); the game draws its own
 * @returns {string} SVG markup (128×128)
 */
export function headSvg(character, { pupils = true, look = { x: 0.6, y: 0 } } = {}) {
  const k = character.colors
  const { cx, cy, r, eyes, eyeRx, eyeRy, pupilR, pupilRange } = HEAD
  const eyesSvg = eyes
    .map(
      (e) => `
      <ellipse cx="${e.x}" cy="${e.y}" rx="${eyeRx}" ry="${eyeRy}" fill="#ffffff" stroke="${OUTLINE}" stroke-width="2.5"/>
      ${pupils ? `<circle cx="${e.x + look.x * pupilRange}" cy="${e.y + look.y * pupilRange}" r="${pupilR}" fill="#1b1b2f"/>` : ''}`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${k.skin}" stroke="${OUTLINE}" stroke-width="3.5"/>
    <ellipse cx="22" cy="${cy + 4}" rx="9" ry="12" fill="${k.skin}" stroke="${OUTLINE}" stroke-width="3"/>
    <ellipse cx="80" cy="88" rx="7" ry="4" fill="#e0607a" opacity="0.35"/>
    ${headwear(character)}
    <path d="M70 52 Q78 48 86 52 M92 52 Q100 48 108 53" fill="none" stroke="${OUTLINE}" stroke-width="3.5" stroke-linecap="round"/>
    ${eyesSvg}
    <path d="M110 70 Q117 78 110 82" fill="none" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round"/>
    ${
      character.look.moustache
        ? `<path d="M88 92 C94 86 102 86 108 90 C112 86 116 86 118 90 C114 96 106 94 104 92 C100 96 92 98 88 92 Z" fill="${k.hair}" stroke="${OUTLINE}" stroke-width="2"/>`
        : ''
    }
    <path d="M90 100 Q100 108 112 98" fill="none" stroke="${OUTLINE}" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`
}

/** data: URL for <img src> and for turning the SVG into a game texture. */
export function headDataUrl(character, opts) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(headSvg(character, opts))}`
}

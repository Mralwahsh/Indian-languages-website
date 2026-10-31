// Original drawings of the Chaturanga pieces, in the style of carved ivory game pieces:
// raja (king), mantri (minister → queen), gaja (elephant → bishop), ashva (horse → knight),
// ratha (chariot → rook), padati (foot soldier → pawn).
const IVORY = '#f6e7c8'
const LINE = '#7a4a21'
const SAFFRON = '#ff9933'
const GREEN = '#138808'
const NAVY = '#000080'

const stroke = { stroke: LINE, strokeWidth: 2.4, strokeLinejoin: 'round', strokeLinecap: 'round' }

function Pedestal() {
  return (
    <g {...stroke}>
      <path d="M22 92 h56 a4 4 0 0 0 0 -8 h-56 a4 4 0 0 0 0 8z" fill={IVORY} />
      <path d="M28 84 h44 l-4 -7 h-36z" fill={IVORY} />
      <path d="M34 80 h32" stroke={SAFFRON} strokeWidth="2" />
    </g>
  )
}

const DRAW = {
  // the raja under a royal parasol (chhatra)
  king: (
    <>
      <path d="M50 8 v14" {...stroke} />
      <path d="M26 24 q24 -16 48 0 z" fill={SAFFRON} {...stroke} />
      <path d="M30 24 q4 4 8 0 q4 4 8 0 q4 4 8 0 q4 4 8 0 q4 4 8 0" fill="none" {...stroke} strokeWidth="1.6" />
      <circle cx="50" cy="38" r="8" fill={IVORY} {...stroke} />
      <path d="M43 31 l3 -5 l4 4 l4 -4 l3 5z" fill={SAFFRON} {...stroke} strokeWidth="1.6" />
      <path d="M36 77 q2 -24 14 -28 q12 4 14 28z" fill={IVORY} {...stroke} />
      <path d="M44 56 h12 M42 64 h16" {...stroke} stroke={GREEN} />
    </>
  ),
  // the minister (mantri) with a turban and a scroll
  queen: (
    <>
      <path d="M40 26 q10 -12 20 0 q2 6 -2 9 h-16 q-4 -3 -2 -9z" fill={SAFFRON} {...stroke} />
      <circle cx="58" cy="22" r="2.6" fill={GREEN} />
      <circle cx="50" cy="40" r="8" fill={IVORY} {...stroke} />
      <path d="M34 77 q2 -26 16 -29 q14 3 16 29z" fill={IVORY} {...stroke} />
      <rect x="54" y="54" width="14" height="9" rx="4" fill={IVORY} {...stroke} transform="rotate(-18 61 58)" />
      <path d="M44 60 q6 4 12 0" fill="none" {...stroke} stroke={NAVY} />
    </>
  ),
  // the elephant (gaja) with a decorated blanket and a little howdah
  bishop: (
    <>
      <path d="M36 30 h22 v-6 h-22z" fill={SAFFRON} {...stroke} />
      <path d="M38 24 l9 -8 l9 8" fill="none" {...stroke} />
      <path d="M24 60 q-2 -24 22 -28 q20 -2 26 12 q6 2 6 12 q0 14 -6 22 q-2 -10 -2 -16 v20 h-8 v-12 h-24 v12 h-8 v-12 q-6 -4 -6 -10z" fill={IVORY} {...stroke} />
      <path d="M72 44 q8 4 6 14 q-2 10 4 14" fill="none" {...stroke} />
      <path d="M58 36 q-4 10 4 16" fill="none" {...stroke} />
      <circle cx="66" cy="44" r="1.8" fill={LINE} />
      <path d="M34 38 h22 v14 q-11 6 -22 0z" fill={GREEN} {...stroke} strokeWidth="1.8" />
      <circle cx="40" cy="45" r="1.6" fill={IVORY} />
      <circle cx="45" cy="47" r="1.6" fill={IVORY} />
      <circle cx="50" cy="45" r="1.6" fill={IVORY} />
    </>
  ),
  // the horse (ashva) with a plume and a bridle
  knight: (
    <>
      <path d="M34 77 q-4 -18 6 -30 q-6 -4 -4 -12 q8 -14 24 -14 q12 4 14 18 q2 10 -4 14 l-8 -4 q-2 8 4 28z" fill={IVORY} {...stroke} />
      <path d="M48 22 q-4 -10 4 -14 q2 8 -2 14" fill={SAFFRON} {...stroke} strokeWidth="1.8" />
      <circle cx="60" cy="32" r="2" fill={LINE} />
      <path d="M50 26 q10 6 20 12 M52 40 q8 2 16 -2" fill="none" {...stroke} stroke={SAFFRON} strokeWidth="2.2" />
      <path d="M40 48 q-6 10 -2 22" fill="none" {...stroke} stroke={GREEN} />
    </>
  ),
  // the war chariot (ratha): a big spoked wheel and a canopy with a flag
  rook: (
    <>
      <path d="M50 10 v20" {...stroke} />
      <path d="M50 10 l14 5 l-14 5z" fill={SAFFRON} {...stroke} strokeWidth="1.8" />
      <path d="M30 34 q20 -10 40 0 v4 h-40z" fill={GREEN} {...stroke} />
      <path d="M32 38 v16 M68 38 v16" {...stroke} />
      <path d="M26 54 h48 v8 h-48z" fill={IVORY} {...stroke} />
      <circle cx="50" cy="66" r="12" fill={IVORY} {...stroke} />
      {[0, 45, 90, 135].map((a) => (
        <path key={a} d="M38 66 h24" {...stroke} strokeWidth="1.6" transform={`rotate(${a} 50 66)`} />
      ))}
      <circle cx="50" cy="66" r="3" fill={NAVY} />
    </>
  ),
  // the foot soldier (padati) with a round shield and a spear
  pawn: (
    <>
      <path d="M66 14 v62" {...stroke} />
      <path d="M66 8 l4 10 h-8z" fill={SAFFRON} {...stroke} strokeWidth="1.8" />
      <path d="M43 30 q7 -9 14 0 q1 4 -1 6 h-12 q-2 -2 -1 -6z" fill={SAFFRON} {...stroke} />
      <circle cx="50" cy="40" r="7" fill={IVORY} {...stroke} />
      <path d="M38 77 q2 -22 12 -26 q10 4 12 26z" fill={IVORY} {...stroke} />
      <circle cx="40" cy="62" r="9" fill={GREEN} {...stroke} />
      <circle cx="40" cy="62" r="3" fill={IVORY} />
    </>
  ),
}

export default function AncientPiece({ id, className = '' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {DRAW[id]}
      <Pedestal />
    </svg>
  )
}

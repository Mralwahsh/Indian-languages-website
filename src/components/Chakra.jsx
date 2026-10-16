import { motion } from 'framer-motion'

const SPOKES = Array.from({ length: 24 }, (_, i) => i * 15)

// One tapered spoke pointing up, rotated into place
const spoke = 'M -2 -9 L -0.7 -42 L 0 -44 L 0.7 -42 L 2 -9 Z'

/** The Ashoka Chakra from the Indian flag (24 spokes). `spin` = slow rotation. */
export default function Chakra({ size = 48, color = '#000080', spin = false, duration = 60, className = '', style }) {
  const Svg = spin ? motion.svg : 'svg'
  const anim = spin ? { animate: { rotate: 360 }, transition: { duration, repeat: Infinity, ease: 'linear' } } : {}
  return (
    <Svg viewBox="-50 -50 100 100" width={size} height={size} className={className} style={style} aria-hidden="true" {...anim}>
      <circle r="46" fill="none" stroke={color} strokeWidth="5" />
      <circle r="9" fill={color} />
      {SPOKES.map((deg) => (
        <path key={deg} d={spoke} fill={color} transform={`rotate(${deg})`} />
      ))}
      {SPOKES.map((deg) => (
        <circle key={`d${deg}`} cx="0" cy="-41.5" r="1.8" fill={color} transform={`rotate(${deg + 7.5})`} />
      ))}
    </Svg>
  )
}

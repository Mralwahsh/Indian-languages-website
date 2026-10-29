// A rangoli drawn as SVG: rings of petals and dots around a lotus, in marigold / saffron / kumkum.
const ring = (n, r, draw) => Array.from({ length: n }, (_, i) => draw((360 / n) * i, i, r))

// one petal pointing up from the centre, tip at -len
const petal = (w, len) => `M0 0 C ${w} ${-len * 0.35} ${w * 0.6} ${-len * 0.85} 0 ${-len} C ${-w * 0.6} ${-len * 0.85} ${-w} ${-len * 0.35} 0 0 Z`

export default function Rangoli({ size = 600, className = '', style, colors = ['#ffb000', '#ff7a00', '#c8102e', '#fff4e0'] }) {
  const [marigold, saffron, kumkum, ivory] = colors
  return (
    <svg viewBox="-100 -100 200 200" width={size} height={size} className={className} style={style} aria-hidden="true">
      {/* outer scalloped ring */}
      {ring(32, 92, (deg) => (
        <circle key={`o${deg}`} cx="0" cy="-92" r="5.5" fill="none" stroke={marigold} strokeWidth="1.4" transform={`rotate(${deg})`} />
      ))}
      <circle r="84" fill="none" stroke={saffron} strokeWidth="1" strokeDasharray="2 3" />
      {/* big saffron petals */}
      {ring(12, 0, (deg) => (
        <path key={`b${deg}`} d={petal(17, 80)} fill={saffron} opacity="0.9" transform={`rotate(${deg})`} />
      ))}
      {/* kumkum petals between them */}
      {ring(12, 0, (deg) => (
        <path key={`k${deg}`} d={petal(10, 62)} fill={kumkum} transform={`rotate(${deg + 15})`} />
      ))}
      {/* marigold inner petals */}
      {ring(12, 0, (deg) => (
        <path key={`m${deg}`} d={petal(9, 44)} fill={marigold} transform={`rotate(${deg})`} />
      ))}
      {ring(24, 0, (deg) => (
        <circle key={`d${deg}`} cx="0" cy="-52" r="1.8" fill={ivory} transform={`rotate(${deg + 7.5})`} />
      ))}
      <circle r="22" fill={kumkum} />
      {ring(8, 0, (deg) => (
        <path key={`l${deg}`} d={petal(7, 20)} fill={ivory} transform={`rotate(${deg + 22.5})`} />
      ))}
      <circle r="6" fill={marigold} />
    </svg>
  )
}

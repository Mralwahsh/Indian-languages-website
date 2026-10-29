// Raga Tiles visuals: warm ivory floor with faint rangoli, deep indigo tiles with a marigold flower,
// petal bursts on hits (classic) and soft golden glows (respectful).

export const C = {
  ivory: '#fff4e0',
  sand: '#ffe2bf',
  marigold: '#ffb000',
  saffron: '#ff7a00',
  kumkum: '#c8102e',
  pink: '#e8458b',
  indigo: '#2a1240',
  night: '#1b0a2c',
  teal: '#00897b',
}

const TAU = Math.PI * 2

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function petalPath(ctx, len, w) {
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(w, -len * 0.35, w * 0.6, -len * 0.85, 0, -len)
  ctx.bezierCurveTo(-w * 0.6, -len * 0.85, -w, -len * 0.35, 0, 0)
}

/** A rangoli flower: rings of petals and dots. */
export function drawMandala(ctx, cx, cy, r, { alpha = 1, colors = [C.saffron, C.kumkum, C.marigold], dots = C.ivory } = {}) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.globalAlpha *= alpha
  const rings = [
    [12, r, r * 0.21, colors[0], 0],
    [12, r * 0.78, r * 0.13, colors[1], Math.PI / 12],
    [12, r * 0.55, r * 0.11, colors[2], 0],
  ]
  for (const [n, len, w, color, off] of rings) {
    ctx.fillStyle = color
    for (let i = 0; i < n; i++) {
      ctx.save()
      ctx.rotate(off + (TAU / n) * i)
      petalPath(ctx, len, w)
      ctx.fill()
      ctx.restore()
    }
  }
  ctx.fillStyle = dots
  for (let i = 0; i < 24; i++) {
    const a = (TAU / 24) * i + Math.PI / 24
    ctx.beginPath()
    ctx.arc(Math.cos(a) * r * 0.64, Math.sin(a) * r * 0.64, r * 0.022, 0, TAU)
    ctx.fill()
  }
  ctx.fillStyle = colors[1]
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.26, 0, TAU)
  ctx.fill()
  ctx.fillStyle = colors[2]
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.08, 0, TAU)
  ctx.fill()
  ctx.restore()
}

/** The static floor, drawn once per screen size. */
export function makeBackground(W, H, laneW, hitY, dpr) {
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, C.ivory)
  g.addColorStop(1, C.sand)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // faint rangoli: a big one behind the top, a half one rising from below the hit line
  drawMandala(ctx, W / 2, H * 0.3, Math.min(W, H) * 0.46, { alpha: 0.07 })
  drawMandala(ctx, W / 2, H * 1.02, W * 0.62, { alpha: 0.1 })

  // lane dividers: dotted, like a rangoli grid
  ctx.fillStyle = 'rgba(200, 16, 46, 0.22)'
  for (let l = 1; l < 4; l++) {
    const x = l * laneW
    for (let y = 8 * dpr; y < H; y += 14 * dpr) {
      ctx.beginPath()
      ctx.arc(x, y, 1.6 * dpr, 0, TAU)
      ctx.fill()
    }
  }

  // below the hit line: a warmer band
  const band = ctx.createLinearGradient(0, hitY, 0, H)
  band.addColorStop(0, 'rgba(255, 122, 0, 0.18)')
  band.addColorStop(1, 'rgba(200, 16, 46, 0.16)')
  ctx.fillStyle = band
  ctx.fillRect(0, hitY, W, H - hitY)
  return cv
}

/** The hit line: a marigold garland of beads. */
export function drawHitLine(ctx, W, hitY, dpr, pulse = 0) {
  ctx.fillStyle = C.marigold
  ctx.fillRect(0, hitY - 2 * dpr, W, 4 * dpr)
  const step = 18 * dpr
  for (let x = step / 2; x < W; x += step) {
    ctx.fillStyle = (Math.round(x / step) % 2 ? C.saffron : C.marigold)
    ctx.beginPath()
    ctx.arc(x, hitY, (4.5 + pulse * 2) * dpr, 0, TAU)
    ctx.fill()
  }
}

/** Pre-rendered tile images (one per look), so each frame is just drawImage. */
export function makeTileSprites(laneW, tileH, dpr) {
  const pad = 4 * dpr
  const w = Math.round(laneW - pad * 2)
  const h = Math.round(tileH)
  const make = (paint) => {
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    paint(cv.getContext('2d'))
    return cv
  }
  const body = (ctx, top, bottom, border) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, top)
    g.addColorStop(1, bottom)
    ctx.fillStyle = g
    roundRect(ctx, 0, 0, w, h, 12 * dpr)
    ctx.fill()
    ctx.strokeStyle = border
    ctx.lineWidth = 2.5 * dpr
    roundRect(ctx, 4 * dpr, 4 * dpr, w - 8 * dpr, h - 8 * dpr, 9 * dpr)
    ctx.stroke()
  }
  const flower = (ctx, color, alpha = 1) => drawMandala(ctx, w / 2, h / 2, Math.min(w, h) * 0.3, { alpha, colors: [color, color, C.ivory], dots: color })
  return {
    pad,
    w,
    h,
    normal: make((ctx) => {
      body(ctx, C.indigo, C.night, C.marigold)
      flower(ctx, C.marigold, 0.9)
    }),
    hit: make((ctx) => {
      ctx.globalAlpha = 0.45
      body(ctx, C.marigold, C.saffron, C.ivory)
    }),
    missed: make((ctx) => {
      ctx.globalAlpha = 0.25
      body(ctx, C.indigo, C.night, C.indigo)
    }),
    fail: make((ctx) => {
      body(ctx, C.kumkum, '#8a0b20', C.ivory)
    }),
  }
}

/** A hold tile: indigo column with a marigold thread; the part already held glows saffron. */
export function drawHold(ctx, x, top, w, h, { held = 0, state = 'pending', dpr = 1 }) {
  const r = 12 * dpr
  ctx.save()
  roundRect(ctx, x, top, w, h, r)
  ctx.clip()
  const g = ctx.createLinearGradient(0, top, 0, top + h)
  if (state === 'missed') {
    ctx.globalAlpha = 0.25
    g.addColorStop(0, C.indigo)
    g.addColorStop(1, C.night)
  } else if (state === 'fail') {
    g.addColorStop(0, C.kumkum)
    g.addColorStop(1, '#8a0b20')
  } else {
    g.addColorStop(0, C.teal)
    g.addColorStop(0.35, C.indigo)
    g.addColorStop(1, C.night)
  }
  ctx.fillStyle = g
  ctx.fillRect(x, top, w, h)
  if (held > 0) {
    ctx.fillStyle = 'rgba(255, 176, 0, 0.75)'
    ctx.fillRect(x, top + h - held, w, held)
  }
  // the thread with beads
  ctx.fillStyle = C.marigold
  ctx.fillRect(x + w / 2 - 1.5 * dpr, top + 10 * dpr, 3 * dpr, h - 20 * dpr)
  for (let y = top + 22 * dpr; y < top + h - 18 * dpr; y += 26 * dpr) {
    ctx.beginPath()
    ctx.arc(x + w / 2, y, 4 * dpr, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
  ctx.strokeStyle = state === 'missed' ? 'rgba(42,18,64,0.3)' : C.marigold
  ctx.lineWidth = 2.5 * dpr
  roundRect(ctx, x + 4 * dpr, top + 4 * dpr, w - 8 * dpr, h - 8 * dpr, 9 * dpr)
  ctx.stroke()
}

/** Petal bursts (classic), soft lane glows (respectful), red flashes on a wrong tap. */
export class Effects {
  constructor(dpr) {
    this.dpr = dpr
    this.parts = []
    this.rings = []
    this.glows = []
    this.flashes = []
  }

  burst(x, y, big) {
    const colors = [C.marigold, C.saffron, C.kumkum, C.pink, C.ivory]
    const n = big ? 16 : 10
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU
      const v = (big ? 420 : 300) * this.dpr * (0.5 + Math.random() * 0.7)
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140 * this.dpr, life: 0.55, max: 0.55, rot: a, spin: (Math.random() - 0.5) * 10, size: (5 + Math.random() * 5) * this.dpr, color: colors[i % colors.length] })
    }
    this.rings.push({ x, y, life: 0.35, max: 0.35, big })
  }

  glow(x, w, y) {
    this.glows.push({ x, w, y, life: 0.6, max: 0.6 })
  }

  flash(x, w, y, h) {
    this.flashes.push({ x, w, y, h, life: 0.9, max: 0.9 })
  }

  update(dt) {
    for (const p of this.parts) {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 900 * this.dpr * dt
      p.rot += p.spin * dt
    }
    for (const list of [this.rings, this.glows, this.flashes]) for (const e of list) e.life -= dt
    this.parts = this.parts.filter((p) => p.life > 0)
    this.rings = this.rings.filter((e) => e.life > 0)
    this.glows = this.glows.filter((e) => e.life > 0)
    this.flashes = this.flashes.filter((e) => e.life > 0)
  }

  draw(ctx) {
    for (const g of this.glows) {
      const k = g.life / g.max
      const grad = ctx.createRadialGradient(g.x + g.w / 2, g.y, 0, g.x + g.w / 2, g.y, g.w * 0.9)
      grad.addColorStop(0, `rgba(255, 196, 80, ${0.45 * k})`)
      grad.addColorStop(1, 'rgba(255, 196, 80, 0)')
      ctx.fillStyle = grad
      ctx.fillRect(g.x - g.w * 0.4, g.y - g.w, g.w * 1.8, g.w * 2)
    }
    for (const r of this.rings) {
      const k = 1 - r.life / r.max
      ctx.strokeStyle = `rgba(255, 176, 0, ${1 - k})`
      ctx.lineWidth = 4 * this.dpr * (1 - k)
      ctx.beginPath()
      ctx.arc(r.x, r.y, (r.big ? 70 : 50) * this.dpr * (0.3 + k), 0, TAU)
      ctx.stroke()
    }
    for (const p of this.parts) {
      ctx.save()
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.6)
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      petalPath(ctx, p.size * 1.6, p.size * 0.7)
      ctx.fill()
      ctx.restore()
    }
    for (const f of this.flashes) {
      const on = Math.floor((1 - f.life / f.max) * 6) % 2 === 0
      if (!on) continue
      ctx.fillStyle = 'rgba(200, 16, 46, 0.55)'
      roundRect(ctx, f.x, f.y, f.w, f.h, 12 * this.dpr)
      ctx.fill()
    }
  }
}

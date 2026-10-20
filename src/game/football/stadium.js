import { GOAL, WORLD } from './config.js'

// Indian-themed stadium at sunset, drawn with shapes in parallax layers
// (scrollFactor < 1 = further away; the camera drifts a little with the ball).

const W = WORLD.width
const G = WORLD.groundY
const PAD = 120 // draw a bit beyond the screen so camera drift never shows an edge

/** Seeded random so the crowd looks the same every match. */
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function createStadium(scene) {
  const layers = {}

  // ---- sky (far)
  const sky = scene.add.graphics().setScrollFactor(0.1).setDepth(-100)
  sky.fillGradientStyle(0x1b1f63, 0x1b1f63, 0xb5487a, 0xb5487a, 1)
  sky.fillRect(-PAD, 0, W + PAD * 2, 220)
  sky.fillGradientStyle(0xb5487a, 0xb5487a, 0xffb25e, 0xffb25e, 1)
  sky.fillRect(-PAD, 220, W + PAD * 2, 200)
  for (const [r, a] of [[180, 0.1], [130, 0.18], [96, 0.35]]) {
    sky.fillStyle(0xffd27a, a)
    sky.fillCircle(W / 2, 330, r)
  }
  sky.fillStyle(0xffe6a8, 1)
  sky.fillCircle(W / 2, 330, 70)
  // a few kites in the sky (Makar Sankranti!)
  for (const [x, y, c] of [[180, 90, 0xff9933], [1080, 120, 0x138808], [930, 60, 0xffd23f]]) {
    sky.fillStyle(c, 1)
    sky.fillTriangle(x, y - 18, x + 14, y, x, y + 18)
    sky.fillTriangle(x, y - 18, x - 14, y, x, y + 18)
    sky.lineStyle(1.5, 0xffffff, 0.6)
    sky.lineBetween(x, y + 18, x + 30, y + 120)
  }
  layers.sky = sky

  // ---- stands with the crowd (mid)
  const stands = scene.add.container(0, 0).setScrollFactor(0.45).setDepth(-80)
  const st = scene.add.graphics()
  st.fillStyle(0x2a1f4a, 1)
  st.fillRect(-PAD, 300, W + PAD * 2, G - 300)
  // tiers
  for (let i = 0; i < 6; i++) {
    st.fillStyle(i % 2 ? 0x342a5c : 0x3b3068, 1)
    st.fillRect(-PAD, 310 + i * 48, W + PAD * 2, 44)
  }
  stands.add(st)
  // crowd: colourful heads + bodies
  const crowd = scene.add.graphics()
  const r = rng(7)
  const shirt = [0xff9933, 0xffffff, 0x138808, 0xffd23f, 0xd62828, 0x7b3fb8, 0x2b9be0, 0xff5fa2]
  const skin = [0x8d5a3b, 0xa86d47, 0xc68a5a, 0x7a4b30, 0xd9a77c]
  for (let row = 0; row < 6; row++) {
    for (let x = -PAD + 10; x < W + PAD; x += 22) {
      if (r() < 0.08) continue
      const y = 340 + row * 48 + (r() - 0.5) * 6
      const cx = x + (r() - 0.5) * 8
      crowd.fillStyle(shirt[Math.floor(r() * shirt.length)], 1)
      crowd.fillRoundedRect(cx - 9, y, 18, 18, 6)
      crowd.fillStyle(skin[Math.floor(r() * skin.length)], 1)
      crowd.fillCircle(cx, y - 6, 8)
      if (r() < 0.06) {
        // a waving flag in the crowd
        crowd.fillStyle(0xff9933, 1)
        crowd.fillRect(cx + 6, y - 34, 18, 5)
        crowd.fillStyle(0xffffff, 1)
        crowd.fillRect(cx + 6, y - 29, 18, 5)
        crowd.fillStyle(0x138808, 1)
        crowd.fillRect(cx + 6, y - 24, 18, 5)
        crowd.lineStyle(2, 0xdddddd, 1)
        crowd.lineBetween(cx + 6, y - 36, cx + 6, y)
      }
    }
  }
  stands.add(crowd)
  layers.crowd = crowd
  // bunting (festival flags) along the top of the stands
  const bunting = scene.add.graphics()
  const colors = [0xff9933, 0xffffff, 0x138808]
  for (let s = 0; s < 6; s++) {
    const x0 = -PAD + (s * (W + PAD * 2)) / 6
    const x1 = -PAD + ((s + 1) * (W + PAD * 2)) / 6
    const sag = (t) => 300 + Math.sin(t * Math.PI) * 26
    const step = (x1 - x0) / 12
    for (let i = 0; i < 12; i++) {
      const t = i / 12
      const xa = x0 + step * i + 2
      const xb = xa + step - 4
      bunting.fillStyle(colors[i % 3], 1)
      bunting.fillTriangle(xa, sag(t), xb, sag(t + 1 / 12), (xa + xb) / 2, sag(t + 0.5 / 12) + 24)
    }
    bunting.lineStyle(2, 0xffe2b0, 0.8)
    bunting.strokePoints(Array.from({ length: 13 }, (_, i) => ({ x: x0 + step * i, y: sag(i / 12) })))
  }
  stands.add(bunting)
  // floodlights
  const lights = scene.add.graphics()
  for (const x of [90, W - 90]) {
    lights.fillStyle(0x1b1f3a, 1)
    lights.fillRect(x - 6, 120, 12, 190)
    lights.fillStyle(0xfff3c4, 1)
    lights.fillRoundedRect(x - 40, 96, 80, 34, 6)
    lights.fillStyle(0xfff3c4, 0.15)
    lights.fillCircle(x, 112, 70)
  }
  stands.add(lights)
  layers.stands = stands

  // ---- advertising boards (near)
  const boards = scene.add.container(0, 0).setScrollFactor(0.85).setDepth(-60)
  const bg = scene.add.graphics()
  const boardTexts = ['الهند تتحدّث', 'HTU', 'भारत', 'International Week', 'الهند تتحدّث', 'HTU', 'भारत']
  const bw = (W + PAD * 2) / boardTexts.length
  boardTexts.forEach((t, i) => {
    const x = -PAD + i * bw
    bg.fillStyle(i % 2 ? 0x000080 : 0xff9933, 1)
    bg.fillRect(x + 2, G - 46, bw - 4, 46)
    const label = scene.add
      .text(x + bw / 2, G - 23, t, {
        fontFamily: '"IS Kufi", "IS Deva", "Bricolage Grotesque Variable", sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        rtl: /[؀-ۿ]/.test(t),
      })
      .setOrigin(0.5)
    boards.add(label)
  })
  boards.addAt(bg, 0)

  // ---- pitch (front)
  const pitch = scene.add.graphics().setDepth(-40)
  const stripe = 80
  for (let x = -PAD, i = 0; x < W + PAD; x += stripe, i++) {
    pitch.fillStyle(i % 2 ? 0x3f9b34 : 0x4bab3f, 1)
    pitch.fillRect(x, G, stripe, 52)
  }
  pitch.fillStyle(0xffffff, 0.85)
  pitch.fillRect(-PAD, G, W + PAD * 2, 4)
  // rangoli border along the bottom edge
  pitch.fillStyle(0x7a2d16, 1)
  pitch.fillRect(-PAD, G + 52, W + PAD * 2, WORLD.height - G - 52 + 40)
  const petal = [0xff9933, 0xffd23f, 0xd62828, 0x138808, 0xff5fa2, 0xffffff]
  for (let x = -PAD + 20, i = 0; x < W + PAD; x += 40, i++) {
    const cy = G + 66
    const c = petal[i % petal.length]
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      pitch.fillStyle(c, 1)
      pitch.fillCircle(x + Math.cos(a) * 8, cy + Math.sin(a) * 8, 5)
    }
    pitch.fillStyle(petal[(i + 2) % petal.length], 1)
    pitch.fillCircle(x, cy, 5)
  }
  layers.pitch = pitch

  return {
    layers,
    /** Crowd jumps for joy (after a goal). */
    cheer() {
      scene.tweens.add({ targets: crowd, y: -10, duration: 120, yoyo: true, repeat: 5, ease: 'Sine.easeInOut' })
    },
  }
}

/** Goal frames + nets, drawn in front of the pitch. Physics bodies are created by the scene. */
export function drawGoals(scene, barTop) {
  const g = scene.add.graphics().setDepth(20)
  const back = scene.add.graphics().setDepth(-30)
  for (const side of ['left', 'right']) {
    const mouthX = side === 'left' ? GOAL.width : W - GOAL.width
    const wallX = side === 'left' ? 0 : W
    const x0 = Math.min(mouthX, wallX)
    // net (behind the players)
    back.fillStyle(0xffffff, 0.12)
    back.fillRect(x0, barTop, GOAL.width, G - barTop)
    back.lineStyle(1.5, 0xffffff, 0.45)
    for (let x = x0; x <= x0 + GOAL.width; x += 14) back.lineBetween(x, barTop, x, G)
    for (let y = barTop; y <= G; y += 14) back.lineBetween(x0, y, x0 + GOAL.width, y)
    // post + crossbar (in front)
    const barX0 = side === 'left' ? 0 : W - GOAL.width - GOAL.barOverhang
    g.fillStyle(0xffffff, 1)
    g.fillRoundedRect(barX0, barTop, GOAL.width + GOAL.barOverhang, GOAL.barThickness, 6)
    g.fillRect(mouthX - 5, barTop, 10, G - barTop)
    g.lineStyle(3, 0xd0d0d0, 1)
    g.strokeRoundedRect(barX0, barTop, GOAL.width + GOAL.barOverhang, GOAL.barThickness, 6)
  }
}

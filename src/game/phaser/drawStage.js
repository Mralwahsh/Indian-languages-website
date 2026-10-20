import { WORLD } from '../config.js'

const hex = (s) => parseInt(s.replace('#', ''), 16)

/** Draws an Ashoka-Chakra-style wheel into a Graphics object (used for the disc projectile and HUD icons). */
export function drawChakra(g, x, y, r, color = 0x000080, lineWidth = Math.max(2, r * 0.12)) {
  g.lineStyle(lineWidth, color, 1)
  g.strokeCircle(x, y, r)
  g.fillStyle(color, 1)
  g.fillCircle(x, y, r * 0.2)
  g.lineStyle(Math.max(1, r * 0.06), color, 1)
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    g.lineBetween(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2, x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92)
  }
}

/**
 * India-themed stage: a palace courtyard at sunset, drawn with shapes (kept as a live WebGL
 * Graphics object so the gradients survive). To use a painted background instead, load an
 * image with the key 'stage-image' in the scene's preload — it is used automatically.
 */
export function createStage(scene) {
  const { width: W, height: H, floorY } = WORLD
  if (scene.textures.exists('stage-image')) {
    scene.add.image(0, 0, 'stage-image').setOrigin(0, 0).setDisplaySize(W, H).setDepth(-100)
  } else {
    const g = scene.add.graphics().setDepth(-100)
    const horizon = 470
    const wallTop = 478
    const floorTop = 560

    // sky: deep navy → rose → saffron
    g.fillGradientStyle(0x1b1f63, 0x1b1f63, 0xa8467a, 0xa8467a, 1)
    g.fillRect(0, 0, W, 260)
    g.fillGradientStyle(0xa8467a, 0xa8467a, 0xffb25e, 0xffb25e, 1)
    g.fillRect(0, 260, W, horizon - 260)

    // sun with glow
    for (const [r, a] of [[200, 0.08], [150, 0.15], [112, 0.3]]) {
      g.fillStyle(0xffd27a, a)
      g.fillCircle(W / 2, 400, r)
    }
    g.fillStyle(0xffe3a3, 1)
    g.fillCircle(W / 2, 400, 86)

    // distant palace silhouette
    const sil = 0x5a2550
    g.fillStyle(sil, 1)
    g.fillRect(500, 300, 280, horizon - 300) // main hall
    g.fillCircle(640, 300, 96) // great onion dome
    g.fillTriangle(600, 236, 680, 236, 640, 168)
    g.fillRect(637, 140, 6, 34) // finial
    for (const mx of [452, 828]) {
      g.fillRect(mx - 14, 236, 28, horizon - 236) // minarets
      g.fillCircle(mx, 236, 22)
      g.fillTriangle(mx - 12, 222, mx + 12, 222, mx, 190)
    }
    for (const [x0, x1, dome] of [[250, 452, 350], [828, 1030, 930]]) {
      g.fillRect(x0, 380, x1 - x0, horizon - 380) // wings
      g.fillCircle(dome, 380, 46)
      g.fillTriangle(dome - 26, 350, dome + 26, 350, dome, 314)
    }
    for (const cx of [120, 190, 1090, 1160]) {
      g.fillRect(cx - 22, 420, 44, horizon - 420) // chhatris (small domed pavilions)
      g.fillCircle(cx, 420, 22)
    }

    // courtyard wall (sandstone) with arches and battlements
    g.fillStyle(0xcf7f4f, 1)
    g.fillRect(0, wallTop, W, floorTop - wallTop)
    for (let x = 0; x < W; x += 24) g.fillRect(x, wallTop - 10, 14, 10)
    g.fillStyle(0x8c4429, 1)
    for (let x = 30; x < W; x += 110) {
      g.fillRect(x, 508, 54, floorTop - 508)
      g.fillCircle(x + 27, 508, 27)
    }
    g.fillStyle(0xe8a26a, 1)
    g.fillRect(0, wallTop + 6, W, 4) // carved band

    // marble floor with perspective tiles
    g.fillGradientStyle(0xf3e3c6, 0xf3e3c6, 0xe4cba3, 0xe4cba3, 1)
    g.fillRect(0, floorTop, W, H - floorTop)
    g.lineStyle(2, 0xd2b48a, 0.8)
    for (const y of [580, 604, 634, 672, 716]) g.lineBetween(0, y, W, y)
    for (let i = -14; i <= 14; i++) g.lineBetween(W / 2 + i * 44, floorTop, W / 2 + i * 150, H)
    // inlaid rangoli-like medallion in the centre of the floor (subtle)
    g.lineStyle(3, 0xd29a5c, 0.55)
    g.strokeEllipse(W / 2, floorY + 30, 420, 60)
    g.strokeEllipse(W / 2, floorY + 30, 300, 40)

    // marigold garlands (torans) across the top
    for (let s = 0; s < 3; s++) {
      const x0 = (s * W) / 3
      for (let i = 0; i <= 26; i++) {
        const t = i / 26
        const x = x0 + t * (W / 3)
        const y = 18 + Math.sin(t * Math.PI) * 60
        g.fillStyle(i % 2 ? 0xffb000 : 0xff7a00, 1)
        g.fillCircle(x, y, 9)
      }
      g.fillStyle(0x2f8f2f, 1)
      for (let i = 1; i < 6; i++) {
        const x = x0 + (i / 6) * (W / 3)
        const y = 18 + Math.sin((i / 6) * Math.PI) * 60
        g.fillTriangle(x - 7, y + 6, x + 7, y + 6, x, y + 30)
      }
    }

  }

  // diyas (oil lamps) with flickering flames
  for (const x of [40, W - 40]) {
    const lamp = scene.add.graphics().setDepth(-50)
    lamp.fillStyle(0x8a3b12, 1)
    lamp.fillEllipse(x, floorY - 70, 46, 18)
    lamp.fillRect(x - 6, floorY - 64, 12, 64)
    lamp.fillEllipse(x, floorY, 40, 10)
    const glow = scene.add.circle(x, floorY - 90, 30, 0xffb000, 0.25).setDepth(-51)
    const flame = scene.add.ellipse(x, floorY - 88, 14, 26, 0xffd23f).setDepth(-49)
    scene.tweens.add({ targets: [flame, glow], scaleY: 1.25, scaleX: 0.85, duration: 180, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: x })
  }
}

export { hex }

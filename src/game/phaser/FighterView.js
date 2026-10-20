import { WORLD } from '../config.js'
import { hex } from './drawStage.js'

// ------------------------------------------------------------------ poses
// Joints relative to the feet, facing right (x forward, y up = negative). Units: pixels.
const P = (o) => o
const POSES = {
  idle: P({ hip: [0, -92], neck: [4, -150], head: [8, -171], fKnee: [16, -48], fFoot: [26, 0], bKnee: [-14, -46], bFoot: [-26, 0], fElbow: [26, -124], fHand: [40, -146], bElbow: [10, -118], bHand: [26, -136] }),
  crouch: P({ hip: [0, -56], neck: [6, -104], head: [10, -125], fKnee: [26, -36], fFoot: [24, 0], bKnee: [-22, -30], bFoot: [-28, 0], fElbow: [28, -84], fHand: [40, -104], bElbow: [12, -80], bHand: [26, -96] }),
  jump: P({ hip: [0, -100], neck: [2, -156], head: [4, -177], fKnee: [22, -80], fFoot: [12, -48], bKnee: [-6, -74], bFoot: [-22, -50], fElbow: [22, -134], fHand: [34, -154], bElbow: [-8, -136], bHand: [-16, -154] }),
  block: P({ hip: [-2, -92], neck: [-2, -150], head: [2, -170], fKnee: [16, -48], fFoot: [24, 0], bKnee: [-16, -46], bFoot: [-30, 0], fElbow: [24, -128], fHand: [22, -166], bElbow: [20, -118], bHand: [28, -154] }),
  crouchBlock: P({ hip: [-2, -56], neck: [2, -104], head: [6, -125], fKnee: [26, -36], fFoot: [24, 0], bKnee: [-22, -30], bFoot: [-28, 0], fElbow: [26, -86], fHand: [24, -120], bElbow: [20, -80], bHand: [30, -110] }),
  punch: P({ hip: [4, -92], neck: [14, -150], head: [18, -170], fKnee: [20, -48], fFoot: [36, 0], bKnee: [-14, -46], bFoot: [-30, 0], fElbow: [50, -147], fHand: [86, -150], bElbow: [-4, -124], bHand: [10, -134] }),
  kick: P({ hip: [-4, -94], neck: [-16, -150], head: [-20, -169], fKnee: [46, -104], fFoot: [104, -110], bKnee: [-6, -48], bFoot: [-10, 0], fElbow: [10, -128], fHand: [24, -142], bElbow: [-28, -128], bHand: [-46, -118] }),
  airKick: P({ hip: [0, -100], neck: [-8, -156], head: [-10, -176], fKnee: [40, -96], fFoot: [96, -84], bKnee: [-8, -72], bFoot: [-24, -52], fElbow: [14, -134], fHand: [28, -146], bElbow: [-24, -134], bHand: [-40, -126] }),
  throwWindup: P({ hip: [-2, -92], neck: [-6, -150], head: [-4, -170], fKnee: [18, -48], fFoot: [30, 0], bKnee: [-16, -46], bFoot: [-32, 0], fElbow: [-14, -150], fHand: [-36, -162], bElbow: [18, -126], bHand: [34, -136] }),
  throwRelease: P({ hip: [6, -90], neck: [18, -148], head: [24, -167], fKnee: [24, -48], fFoot: [42, 0], bKnee: [-12, -46], bFoot: [-30, 0], fElbow: [48, -142], fHand: [80, -138], bElbow: [-8, -126], bHand: [-24, -116] }),
  dash: P({ hip: [0, -80], neck: [30, -130], head: [42, -147], fKnee: [30, -50], fFoot: [52, -8], bKnee: [-20, -40], bFoot: [-50, -10], fElbow: [58, -120], fHand: [88, -124], bElbow: [8, -110], bHand: [-22, -104] }),
  hit: P({ hip: [-4, -90], neck: [-16, -146], head: [-24, -163], fKnee: [14, -48], fFoot: [24, 0], bKnee: [-16, -46], bFoot: [-30, 0], fElbow: [4, -120], fHand: [18, -104], bElbow: [-28, -126], bHand: [-44, -110] }),
  win: P({ hip: [0, -94], neck: [2, -152], head: [4, -173], fKnee: [12, -48], fFoot: [18, 0], bKnee: [-12, -48], bFoot: [-18, 0], fElbow: [26, -176], fHand: [32, -208], bElbow: [-20, -176], bHand: [-26, -208] }),
}
const JOINTS = Object.keys(POSES.idle)

const lerp = (a, b, t) => a + (b - a) * t
const ease = (t) => 1 - (1 - t) * (1 - t)
function mix(a, b, t) {
  const out = {}
  for (const j of JOINTS) out[j] = [lerp(a[j][0], b[j][0], t), lerp(a[j][1], b[j][1], t)]
  return out
}

/** Pose for the fighter's current state (pure function of the simulation state). */
function poseFor(f, time) {
  const s = f.state
  const crouchish = f.crouching
  let pose = crouchish ? POSES.crouch : POSES.idle

  if (s === 'walk') {
    const ph = time * 0.012 * (f.vx * f.facing >= 0 ? 1 : -1)
    const sw = Math.sin(ph)
    pose = mix(POSES.idle, POSES.idle, 0)
    pose.fKnee = [16 + sw * 10, -48 - Math.max(0, sw) * 6]
    pose.fFoot = [26 + sw * 20, -Math.max(0, sw) * 10]
    pose.bKnee = [-14 - sw * 10, -46 - Math.max(0, -sw) * 6]
    pose.bFoot = [-26 - sw * 20, -Math.max(0, -sw) * 10]
  } else if (s === 'jump') pose = POSES.jump
  else if (s === 'block' || s === 'blockstun') pose = crouchish ? POSES.crouchBlock : POSES.block
  else if (s === 'hit') pose = POSES.hit
  else if (s === 'ko') pose = POSES.hit
  else if (s === 'win') pose = mix(POSES.win, POSES.idle, (Math.sin(time * 0.008) + 1) * 0.08)
  else if (s === 'attack' || s === 'special') {
    const m = f.moveData()
    if (m) {
      const fr = f.stateFrame
      let target
      if (f.move === 'punch') target = POSES.punch
      else if (f.move === 'kick') target = f.onGround ? POSES.kick : POSES.airKick
      else if (m.type === 'projectile') target = fr < m.startup ? POSES.throwWindup : POSES.throwRelease
      else target = POSES.dash
      const base = f.onGround ? POSES.idle : POSES.jump
      let t
      if (fr < m.startup) t = ease(fr / m.startup)
      else if (fr < m.startup + m.active) t = 1
      else t = 1 - ease((fr - m.startup - m.active) / Math.max(1, m.recovery))
      pose = m.type === 'projectile' && fr < m.startup ? mix(base, target, ease(fr / m.startup)) : mix(base, target, t)
    }
  }

  // breathing
  if (s === 'idle' || s === 'block' || s === 'crouch') {
    const b = Math.sin(time * 0.004) * 2
    pose = { ...pose }
    for (const j of ['neck', 'head', 'fElbow', 'fHand', 'bElbow', 'bHand']) pose[j] = [pose[j][0], pose[j][1] + b]
  }
  return pose
}

// ------------------------------------------------------------------ placeholder view
/** Clean placeholder fighter drawn with shapes. Same interface as SpriteFighterView. */
export class PlaceholderFighterView {
  constructor(scene, character) {
    this.char = character
    this.c = Object.fromEntries(Object.entries(character.colors).map(([k, v]) => [k, hex(v)]))
    this.shadow = scene.add.ellipse(0, WORLD.floorY + 4, 110, 18, 0x000000, 0.25).setDepth(5)
    this.container = scene.add.container(0, 0).setDepth(10)
    this.g = scene.add.graphics()
    this.container.add(this.g)
    this.koT = 0
  }

  update(f, time) {
    const pose = poseFor(f, time)
    const flash = f.flash > 0 && f.flash % 2 === 0
    const C = flash ? Object.fromEntries(Object.keys(this.c).map((k) => [k, 0xffffff])) : this.c
    const g = this.g
    g.clear()

    // KO: fall over backwards
    this.koT = f.state === 'ko' ? Math.min(1, this.koT + 0.06) : 0
    this.container.setPosition(f.x, f.y)
    this.container.setScale(f.facing, 1)
    this.container.setRotation(-f.facing * (Math.PI / 2) * ease(this.koT) * 0.92)

    const air = WORLD.floorY - f.y
    this.shadow.setPosition(f.x, WORLD.floorY + 4).setScale(Math.max(0.4, 1 - air / 300), 1).setAlpha(0.25 * Math.max(0.3, 1 - air / 300))

    const pt = (j) => pose[j]
    const limb = (a, b, c, w, colA, colB = colA) => {
      g.lineStyle(w + 5, C.outline, 1)
      g.lineBetween(a[0], a[1], b[0], b[1])
      g.lineBetween(b[0], b[1], c[0], c[1])
      g.fillStyle(C.outline, 1)
      g.fillCircle(b[0], b[1], (w + 5) / 2)
      g.lineStyle(w, colA, 1)
      g.lineBetween(a[0], a[1], b[0], b[1])
      g.lineStyle(w * 0.9, colB, 1)
      g.lineBetween(b[0], b[1], c[0], c[1])
      g.fillStyle(colA, 1)
      g.fillCircle(b[0], b[1], w / 2)
    }
    const hand = (p) => {
      g.fillStyle(C.outline, 1)
      g.fillCircle(p[0], p[1], 9)
      g.fillStyle(C.skin, 1)
      g.fillCircle(p[0], p[1], 7)
      g.lineStyle(3, C.accent, 1) // bangle
      g.strokeCircle(p[0], p[1], 8)
    }
    const foot = (p) => {
      g.fillStyle(C.outline, 1)
      g.fillEllipse(p[0] + 6, p[1] - 3, 26, 11)
      g.fillStyle(C.trim, 1)
      g.fillEllipse(p[0] + 6, p[1] - 4, 22, 8) // juttis
    }

    const neck = pt('neck')
    const hip = pt('hip')

    // back limbs
    limb(neck, pt('bElbow'), pt('bHand'), 15, C.main, C.skin)
    hand(pt('bHand'))
    limb(hip, pt('bKnee'), pt('bFoot'), 18, C.pants)
    foot(pt('bFoot'))

    // torso: kurta with a flared hem and a sash
    const torso = [
      { x: neck[0] - 19, y: neck[1] + 2 },
      { x: neck[0] + 19, y: neck[1] + 2 },
      { x: hip[0] + 25, y: hip[1] + 30 },
      { x: hip[0] - 25, y: hip[1] + 30 },
    ]
    g.fillStyle(C.outline, 1)
    g.fillPoints(torso.map((p, i) => ({ x: p.x + (i < 2 ? (i ? 3 : -3) : i === 2 ? 3 : -3), y: p.y + (i < 2 ? -3 : 3) })), true)
    g.fillStyle(C.main, 1)
    g.fillPoints(torso, true)
    g.lineStyle(7, C.trim, 1)
    g.lineBetween(hip[0] - 22, hip[1] + 4, hip[0] + 22, hip[1] + 4)
    g.lineStyle(4, C.trim, 1)
    g.lineBetween(hip[0] - 25, hip[1] + 29, hip[0] + 25, hip[1] + 29) // hem border

    // front leg
    limb(hip, pt('fKnee'), pt('fFoot'), 18, C.pants)
    foot(pt('fFoot'))

    // head
    const head = pt('head')
    g.fillStyle(C.skin, 1)
    g.fillRect(neck[0] - 6, neck[1] - 14, 12, 16)
    g.fillStyle(C.outline, 1)
    g.fillCircle(head[0], head[1], 20)
    g.fillStyle(C.skin, 1)
    g.fillCircle(head[0], head[1], 17)
    g.fillStyle(C.outline, 1)
    g.fillCircle(head[0] + 8, head[1] - 2, 2.6) // eye
    if (this.char.look?.headwear === 'turban') {
      g.fillStyle(C.trim, 1)
      g.fillEllipse(head[0] - 1, head[1] - 12, 42, 24)
      g.fillCircle(head[0] - 4, head[1] - 18, 13)
      g.fillStyle(C.accent, 1)
      g.fillCircle(head[0] + 6, head[1] - 20, 4) // jewel
      g.fillTriangle(head[0] + 4, head[1] - 22, head[0] + 10, head[1] - 22, head[0] + 2, head[1] - 42) // plume
      g.lineStyle(3, C.hair, 1)
      g.lineBetween(head[0] + 6, head[1] + 7, head[0] + 15, head[1] + 6) // moustache
    } else {
      g.fillStyle(C.hair, 1)
      g.fillEllipse(head[0] - 4, head[1] - 9, 38, 22)
      g.fillCircle(head[0] - 18, head[1] - 4, 10) // bun
      g.fillStyle(C.accent, 1)
      g.fillCircle(head[0] - 18, head[1] - 4, 3.5) // flower in the bun
      g.fillStyle(0xd0103a, 1)
      g.fillCircle(head[0] + 9, head[1] - 9, 2.2) // bindi
    }

    // front arm
    limb(neck, pt('fElbow'), pt('fHand'), 15, C.main, C.skin)
    hand(pt('fHand'))
  }

  destroy() {
    this.container.destroy()
    this.shadow.destroy()
  }
}

// ------------------------------------------------------------------ sprite-sheet view
const STATE_ANIM = { idle: 'idle', walk: 'walk', jump: 'jump', crouch: 'crouch', block: 'block', blockstun: 'block', hit: 'hit', ko: 'ko', win: 'win' }

/**
 * Uses a real sprite sheet from the character config (character.sprites). Animation names:
 * idle walk jump crouch block punch kick special hit ko win (missing ones fall back to idle).
 */
export class SpriteFighterView {
  static preload(scene, character) {
    const s = character.sprites
    scene.load.spritesheet(`${character.id}-sheet`, s.sheet, { frameWidth: s.frameWidth, frameHeight: s.frameHeight })
  }

  constructor(scene, character) {
    this.char = character
    const s = character.sprites
    const key = `${character.id}-sheet`
    for (const [name, a] of Object.entries(s.anims ?? {})) {
      const animKey = `${character.id}-${name}`
      if (scene.anims.exists(animKey)) continue
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(key, { start: a.frames[0], end: a.frames[1] }),
        frameRate: a.frameRate ?? 10,
        repeat: a.repeat ?? 0,
      })
    }
    this.shadow = scene.add.ellipse(0, WORLD.floorY + 4, 110, 18, 0x000000, 0.25).setDepth(5)
    this.sprite = scene.add.sprite(0, 0, key).setOrigin(0.5, s.anchorY ?? 1).setDepth(10).setScale(s.scale ?? 1)
    this.current = null
  }

  update(f) {
    const name = f.state === 'attack' || f.state === 'special' ? f.move ?? 'idle' : STATE_ANIM[f.state] ?? 'idle'
    const key = this.sprite.scene.anims.exists(`${this.char.id}-${name}`) ? `${this.char.id}-${name}` : `${this.char.id}-idle`
    if (key !== this.current && this.sprite.scene.anims.exists(key)) {
      this.sprite.play(key)
      this.current = key
    }
    this.sprite.setPosition(f.x, f.y).setFlipX(f.facing < 0)
    if (f.flash > 0) this.sprite.setTintFill(0xffffff)
    else this.sprite.clearTint()
    this.shadow.setPosition(f.x, WORLD.floorY + 4)
  }

  destroy() {
    this.sprite.destroy()
    this.shadow.destroy()
  }
}

export function createFighterView(scene, character) {
  return character.sprites ? new SpriteFighterView(scene, character) : new PlaceholderFighterView(scene, character)
}

import Phaser from 'phaser'
import { WORLD } from '../config.js'
import { Match } from '../engine/Match.js'
import { sfx } from '../sfx.js'
import { createStage, drawChakra } from './drawStage.js'
import { createFighterView, SpriteFighterView } from './FighterView.js'
import { Hud } from './Hud.js'

const STEP_MS = 1000 / 60

/**
 * Renders a Match and feeds it input. The simulation runs at a fixed 60 steps per second
 * (inputs read once per step); drawing happens every browser frame.
 * Scene data: { characters: {p1, p2}, sources: {p1, p2}, onEvent }
 */
export class FightScene extends Phaser.Scene {
  constructor() {
    super('fight')
  }

  init(data) {
    this.opts = data
    this.paused = false
    this.acc = 0
  }

  preload() {
    for (const c of Object.values(this.opts.characters)) if (c.sprites) SpriteFighterView.preload(this, c)
  }

  create() {
    const { characters, sources } = this.opts
    this.match = new Match(characters.p1, characters.p2)
    for (const [slot, src] of Object.entries(sources)) src.attach?.(this.match, slot)

    createStage(this)
    this.views = { p1: createFighterView(this, characters.p1), p2: createFighterView(this, characters.p2) }
    this.hud = new Hud(this, this.match)
    this.projectileViews = new Map()
    this.ensureDiscTexture()
    this.events.once('shutdown', () => this.cleanup())
  }

  ensureDiscTexture() {
    if (this.textures.exists('chakra-disc')) return
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(0xffd27a, 0.35)
    g.fillCircle(32, 32, 31)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(32, 32, 24)
    drawChakra(g, 32, 32, 22, 0x000080, 4)
    g.generateTexture('chakra-disc', 64, 64)
    g.destroy()
  }

  setPaused(paused) {
    if (this.paused && !paused) Object.values(this.opts.sources).forEach((s) => s.poll()) // drop presses made while paused
    this.paused = paused
  }

  update(_time, delta) {
    this.acc += Math.min(delta, 100)
    while (this.acc >= STEP_MS) {
      this.acc -= STEP_MS
      if (!this.paused) this.tick()
    }
    this.render()
  }

  tick() {
    const { sources } = this.opts
    const events = this.match.step({ p1: sources.p1.poll(), p2: sources.p2.poll() })
    for (const ev of events) this.handleEvent(ev)
  }

  handleEvent(ev) {
    const cam = this.cameras.main
    switch (ev.type) {
      case 'announce':
        this.hud.announce(ev.text, ev.kind)
        if (ev.sound) sfx.play(ev.sound)
        break
      case 'whoosh':
        sfx.play('whoosh')
        break
      case 'special':
        sfx.play('special')
        if (ev.move.type === 'dash') this.dashTrail(ev.slot)
        break
      case 'hit':
        sfx.play(ev.blocked ? 'block' : ev.heavy ? 'kick' : 'punch')
        this.spark(ev.x, ev.y, ev.blocked)
        if (!ev.blocked) cam.shake(ev.heavy ? 160 : 90, ev.heavy ? 0.008 : 0.004)
        break
      case 'ko':
        cam.shake(400, 0.014)
        cam.flash(250, 255, 255, 255)
        this.time.timeScale = 1
        break
      case 'clash':
        this.spark(ev.x, ev.y, true)
        sfx.play('block')
        break
      case 'matchEnd':
        if (ev.winner) sfx.play('win')
        break
      default:
        break
    }
    this.opts.onEvent?.(ev)
  }

  render() {
    const now = this.time.now
    for (const slot of ['p1', 'p2']) this.views[slot].update(this.match.fighters[slot], now)
    // keep the fighter in front who is attacking
    const { p1, p2 } = this.match.fighters
    this.views.p1.container?.setDepth(p1.state === 'attack' || p1.state === 'special' ? 11 : 10)
    this.views.p2.container?.setDepth(p2.state === 'attack' || p2.state === 'special' ? 11 : 10)

    // projectiles
    const alive = new Set(this.match.projectiles)
    for (const p of this.match.projectiles) {
      let img = this.projectileViews.get(p)
      if (!img) {
        img = this.add.image(p.x, p.y, 'chakra-disc').setDepth(12).setDisplaySize(p.size + 10, p.size + 10)
        this.projectileViews.set(p, img)
      }
      img.setPosition(p.x, p.y).setRotation(p.spin * Math.sign(p.vx))
    }
    for (const [p, img] of this.projectileViews) {
      if (!alive.has(p)) {
        img.destroy()
        this.projectileViews.delete(p)
      }
    }
    this.hud.update()
  }

  spark(x, y, blocked) {
    const g = this.add.graphics({ x, y }).setDepth(150)
    const color = blocked ? 0x9fd8ff : 0xffd23f
    g.fillStyle(color, 1)
    const pts = []
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? 10 : 34
      const a = (i / 16) * Math.PI * 2
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
    }
    g.fillPoints(pts, true)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(0, 0, 9)
    g.setScale(0.4)
    this.tweens.add({ targets: g, scale: blocked ? 1 : 1.5, alpha: 0, angle: 30, duration: 220, ease: 'Quad.easeOut', onComplete: () => g.destroy() })
  }

  dashTrail(slot) {
    const f = this.match.fighters[slot]
    for (let i = 0; i < 6; i++) {
      const line = this.add.rectangle(f.x - f.facing * (40 + i * 26), f.y - 60 - (i % 3) * 34, 70, 6, 0xff9933, 0.8).setDepth(9)
      this.tweens.add({ targets: line, alpha: 0, scaleX: 0.2, x: line.x - f.facing * 60, duration: 320, delay: i * 25, onComplete: () => line.destroy() })
    }
  }

  cleanup() {
    this.hud?.destroy()
    Object.values(this.views ?? {}).forEach((v) => v.destroy())
  }
}

export const GAME_SIZE = { width: WORLD.width, height: WORLD.height }

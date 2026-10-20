import Phaser from 'phaser'
import { BALL, GOAL, MATCH, WORLD } from './config.js'
import { CAT, Player } from './Player.js'
import { createStadium, drawGoals } from './stadium.js'
import { confetti, Hud } from './hud.js'
import { sfx } from '../sfx.js'

const M = Phaser.Physics.Matter.Matter
const STEP_MS = 1000 / 60
const EMPTY = { held: {}, pressed: {} }
const W = WORLD.width
const G = WORLD.groundY
const BAR_TOP = G - GOAL.height - GOAL.barThickness

/**
 * Big Head Football. Matter physics is stepped manually at a fixed 60 Hz; drawing happens every frame.
 * Scene data: { characters: {p1, p2}, sources: {p1, p2}, onEvent }
 * phases: countdown → play → goal (celebration) → countdown … → over
 */
export class FootballScene extends Phaser.Scene {
  constructor() {
    super('football')
  }

  init(data) {
    this.opts = data
    this.paused = false
    this.acc = 0
  }

  create() {
    const { characters, sources } = this.opts
    this.makeBallTexture()
    this.stadium = createStadium(this)

    // --- static world: ground, side walls, ceiling, crossbars
    const wall = (x, y, w, h, label, extra = {}) =>
      M.Bodies.rectangle(x, y, w, h, { isStatic: true, label, friction: 0.05, restitution: 0.5, collisionFilter: { category: CAT.world, mask: 0xffff }, ...extra })
    this.ground = wall(W / 2, G + 100, W * 3, 200, 'ground', { friction: 0.6, restitution: 0.4 })
    const barW = GOAL.width + GOAL.barOverhang
    const barY = BAR_TOP + GOAL.barThickness / 2
    this.bars = [
      wall(barW / 2, barY, barW, GOAL.barThickness, 'bar-left', { chamfer: { radius: 8 }, restitution: 0.6 }),
      wall(W - barW / 2, barY, barW, GOAL.barThickness, 'bar-right', { chamfer: { radius: 8 }, restitution: 0.6 }),
    ]
    this.matter.world.add([
      this.ground,
      wall(-100, WORLD.height / 2 - 400, 200, WORLD.height + 1000, 'wall-left'),
      wall(W + 100, WORLD.height / 2 - 400, 200, WORLD.height + 1000, 'wall-right'),
      wall(W / 2, -120, W * 3, 200, 'ceiling'),
      ...this.bars,
    ])
    drawGoals(this, BAR_TOP)

    // --- ball
    this.ball = M.Bodies.circle(W / 2, BALL.kickoffHeight, BALL.radius, {
      restitution: BALL.restitution,
      friction: BALL.friction,
      frictionAir: BALL.frictionAir,
      density: BALL.density,
      label: 'ball',
      collisionFilter: { category: CAT.ball, mask: CAT.world | CAT.player | CAT.shoe },
    })
    this.matter.world.add(this.ball)
    this.ballImg = this.add.image(W / 2, BALL.kickoffHeight, 'football').setDepth(15)
    this.ballShadow = this.add.ellipse(W / 2, G + 4, 44, 10, 0x000000, 0.25).setDepth(4)

    // --- players
    this.players = { p1: new Player(this, 'p1', characters.p1), p2: new Player(this, 'p2', characters.p2) }
    for (const [slot, src] of Object.entries(sources)) src.attach?.(this, slot)
    this.supports = [this.ground, ...this.bars, this.players.p1.body, this.players.p2.body]

    this.hud = new Hud(this, characters)
    this.cameras.main.setBounds(-60, 0, W + 120, WORLD.height)

    // match state
    this.score = { p1: 0, p2: 0 }
    this.timeLeftMs = MATCH.seconds * 1000
    this.golden = false
    this.onBarFrames = 0
    this.slowMoLeft = 0
    this.startKickoff(true)

    // collision sounds (ball bounces)
    this.matter.world.on('collisionstart', (e) => {
      for (const { bodyA, bodyB } of e.pairs) {
        const other = bodyA.label === 'ball' ? bodyB : bodyB.label === 'ball' ? bodyA : null
        if (!other) continue
        const speed = Math.hypot(this.ball.velocity.x, this.ball.velocity.y)
        if (other.label.startsWith('bar')) sfx.play('post')
        else if (speed > 4 && !other.label.startsWith('shoe')) sfx.play(other.label.startsWith('player') ? 'header' : 'bounce')
      }
    })
    this.events.once('shutdown', () => Object.values(this.players).forEach((p) => p.destroy()))
  }

  makeBallTexture() {
    if (this.textures.exists('football')) return
    const r = BALL.radius
    const g = this.make.graphics({ x: 0, y: 0 }, false)
    const c = r + 2
    g.fillStyle(0x1b1b2f, 1)
    g.fillCircle(c, c, r + 1.5)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(c, c, r)
    const pent = (cx, cy, s, rot) => {
      const pts = []
      for (let i = 0; i < 5; i++) {
        const a = rot + (i / 5) * Math.PI * 2 - Math.PI / 2
        pts.push({ x: cx + Math.cos(a) * s, y: cy + Math.sin(a) * s })
      }
      g.fillPoints(pts, true)
    }
    g.fillStyle(0x1b1b2f, 1)
    pent(c, c, r * 0.36, 0)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2
      pent(c + Math.cos(a) * r * 0.86, c + Math.sin(a) * r * 0.86, r * 0.3, Math.PI / 5 + a)
    }
    g.generateTexture('football', c * 2, c * 2)
    g.destroy()
  }

  // ------------------------------------------------------------------ flow
  setPaused(paused) {
    if (this.paused && !paused) Object.values(this.opts.sources).forEach((s) => s.poll()) // drop presses made while paused
    this.paused = paused
  }

  startKickoff(first) {
    this.phase = 'countdown'
    this.countdownMs = first ? 3200 : MATCH.kickoffPauseMs + 600
    this.countdownStep = first ? 3 : 0
    Object.values(this.players).forEach((p) => p.reset())
    this.holdBall()
    if (first) {
      this.hud.announce('3', { size: 150 })
      sfx.play('beep')
    }
  }

  holdBall() {
    M.Body.setPosition(this.ball, { x: W / 2, y: BALL.kickoffHeight })
    M.Body.setVelocity(this.ball, { x: 0, y: 0 })
    M.Body.setAngularVelocity(this.ball, 0)
  }

  goal(scorer) {
    this.score[scorer]++
    this.phase = 'goal'
    this.celebrationMs = MATCH.goalCelebrationMs
    this.slowMoLeft = MATCH.slowMoMs
    this.matter.world.engine.timing.timeScale = MATCH.slowMoScale
    this.cameras.main.shake(450, 0.012)
    this.cameras.main.flash(180, 255, 210, 120)
    confetti(this)
    this.stadium.cheer()
    const name = this.opts.characters[scorer].nameAr
    this.hud.announce('هدف!', { size: 170, color: '#ff9933', stroke: '#000080', hold: 1300, sub: `${name} يسجّل!` })
    sfx.play('goal')
    this.emit({ type: 'goal', scorer, score: { ...this.score } })
  }

  endMatch() {
    this.phase = 'over'
    const { p1, p2 } = this.score
    const winner = p1 === p2 ? null : p1 > p2 ? 'p1' : 'p2'
    this.hud.announce('انتهت المباراة!', { size: 96, hold: 1600 })
    sfx.play('whistle')
    this.emit({ type: 'matchEnd', winner, score: { ...this.score } })
  }

  emit(ev) {
    this.opts.onEvent?.(ev)
  }

  // ------------------------------------------------------------------ loop
  update(_time, delta) {
    this.acc += Math.min(delta, 100)
    while (this.acc >= STEP_MS) {
      this.acc -= STEP_MS
      if (!this.paused) this.tick()
    }
    this.draw()
  }

  tick() {
    const { sources } = this.opts
    const inputs = { p1: sources.p1.poll(), p2: sources.p2.poll() }
    const live = this.phase === 'play' || this.phase === 'goal'
    const events = []

    // slow motion runs on real time
    if (this.slowMoLeft > 0) {
      this.slowMoLeft -= STEP_MS
      if (this.slowMoLeft <= 0) this.matter.world.engine.timing.timeScale = 1
    }

    for (const slot of ['p1', 'p2']) this.players[slot].step(live ? inputs[slot] : EMPTY, this.supports, this.ball, events)
    if (this.phase === 'countdown') this.holdBall()

    this.matter.world.step(STEP_MS)
    this.afterPhysics()

    for (const ev of events) {
      if (ev.type === 'kick') {
        sfx.play('kick')
        this.cameras.main.shake(70, 0.003)
      } else if (ev.type === 'swing') sfx.play('whoosh')
    }

    // phase timers
    if (this.phase === 'countdown') {
      this.countdownMs -= STEP_MS
      const n = Math.ceil((this.countdownMs - 800) / 800)
      if (this.countdownStep > 0 && n < this.countdownStep && n > 0) {
        this.countdownStep = n
        this.hud.announce(String(n), { size: 150 })
        sfx.play('beep')
      }
      if (this.countdownMs <= 0) {
        this.phase = 'play'
        this.hud.announce('انطلق!', { size: 120, hold: 500 })
        sfx.play('whistle')
      }
    } else if (this.phase === 'play') {
      if (!this.golden) {
        this.timeLeftMs -= STEP_MS
        if (this.timeLeftMs <= 0) {
          this.timeLeftMs = 0
          if (this.score.p1 === this.score.p2) {
            this.golden = true
            this.hud.announce('الهدف الذهبي!', { size: 96, color: '#ffd23f', hold: 1400, sub: 'الهدف القادم يفوز' })
            sfx.play('whistle')
            this.emit({ type: 'goldenGoal' })
          } else this.endMatch()
        }
      }
    } else if (this.phase === 'goal') {
      this.celebrationMs -= STEP_MS
      if (this.celebrationMs <= 0) {
        if (this.golden || this.timeLeftMs <= 0) this.endMatch()
        else this.startKickoff(false)
      }
    }
  }

  afterPhysics() {
    const b = this.ball
    const r = BALL.radius
    // speed cap (also keeps the ball from tunnelling through the crossbar)
    const speed = Math.hypot(b.velocity.x, b.velocity.y)
    if (speed > BALL.maxSpeed) M.Body.setVelocity(b, { x: (b.velocity.x / speed) * BALL.maxSpeed, y: (b.velocity.y / speed) * BALL.maxSpeed })

    // resting on a crossbar for ~1 s → nudge it back into play
    const barW = GOAL.width + GOAL.barOverhang
    const onLeftBar = b.position.x < barW + r * 0.5
    const onRightBar = b.position.x > W - barW - r * 0.5
    const onBar = (onLeftBar || onRightBar) && b.position.y < BAR_TOP && b.position.y > BAR_TOP - r * 2.5 && speed < 1.5
    this.onBarFrames = onBar ? this.onBarFrames + 1 : 0
    if (this.onBarFrames > BALL.stuckOnBarFrames) {
      M.Body.setVelocity(b, { x: (onLeftBar ? 1 : -1) * BALL.nudge.x, y: BALL.nudge.y })
      this.onBarFrames = 0
    }

    // goals: ball (mostly) over the line and under the crossbar
    if (this.phase === 'play') {
      const under = b.position.y - r * 0.3 > BAR_TOP + GOAL.barThickness
      if (under && b.position.x < GOAL.width - r * 0.3) this.goal('p2')
      else if (under && b.position.x > W - GOAL.width + r * 0.3) this.goal('p1')
    }

    // safety net: ball escaped the world somehow
    if (b.position.y > WORLD.height + 60 || b.position.x < -80 || b.position.x > W + 80) this.holdBall()
  }

  draw() {
    const b = this.ball
    this.ballImg.setPosition(b.position.x, b.position.y).setRotation(b.angle)
    const air = Math.max(0, G - b.position.y - BALL.radius)
    this.ballShadow.setPosition(b.position.x, G + 4).setScale(Math.max(0.3, 1 - air / 300), 1).setAlpha(0.25 * Math.max(0.3, 1 - air / 400))
    for (const p of Object.values(this.players)) p.render(b)
    // camera drifts a little with the ball → parallax
    const cam = this.cameras.main
    const target = Phaser.Math.Clamp((b.position.x - W / 2) * WORLD.cameraDrift, -40, 40)
    cam.scrollX += (target - cam.scrollX) * 0.06
    this.hud.update({ score: this.score, timeLeftMs: this.timeLeftMs, golden: this.golden })
  }
}

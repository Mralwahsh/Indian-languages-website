import Phaser from 'phaser'
import { KICK, PLAYER, WORLD } from './config.js'
import { HEAD } from './characters/art.js'

const M = Phaser.Physics.Matter.Matter
export const CAT = { world: 0x0001, player: 0x0002, ball: 0x0004, shoe: 0x0008 }
const DEG = Math.PI / 180
const hex = (s) => parseInt(s.replace('#', ''), 16)

/**
 * One big-head player: a compound physics body (round head + small torso, never rotates) and a
 * separate shoe body that swings in an arc when kicking. P1 faces right, P2 faces left.
 */
export class Player {
  constructor(scene, slot, character) {
    this.scene = scene
    this.slot = slot
    this.char = character
    this.facing = slot === 'p1' ? 1 : -1
    this.stats = character.stats ?? { speed: 1, jump: 1, kick: 1 }
    const R = PLAYER.headRadius
    const x = PLAYER.startX[slot]
    const bodyTop = WORLD.groundY - PLAYER.bodyHeight
    const headY = bodyTop - R + 10

    // density goes on the parts: Matter derives a compound body's mass from them
    const head = M.Bodies.circle(x, headY, R, { density: PLAYER.density })
    const torso = M.Bodies.rectangle(x, bodyTop + PLAYER.bodyHeight / 2, PLAYER.bodyWidth, PLAYER.bodyHeight, { chamfer: { radius: 8 }, density: PLAYER.density })
    this.body = M.Body.create({
      parts: [head, torso],
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0,
      restitution: PLAYER.restitution,
      collisionFilter: { category: CAT.player, mask: CAT.world | CAT.player | CAT.ball },
      label: `player-${slot}`,
    })
    M.Body.setInertia(this.body, Infinity) // never tip over
    scene.matter.world.add(this.body)
    this.headOffset = { x: head.position.x - this.body.position.x, y: head.position.y - this.body.position.y }
    this.feetOffset = torso.bounds.max.y - this.body.position.y

    this.shoe = M.Bodies.circle(x, WORLD.groundY - 14, KICK.shoeRadius, {
      isSensor: false,
      density: 0.02,
      frictionAir: 0,
      restitution: 0.3,
      collisionFilter: { category: CAT.shoe, mask: CAT.ball },
      label: `shoe-${slot}`,
    })
    M.Body.setInertia(this.shoe, Infinity)
    scene.matter.world.add(this.shoe)

    this.kickFrame = -1
    this.kickCooldown = 0
    this.kickedThisSwing = false
    this.legAngle = KICK.restAngle
    this.grounded = false
    this.wasGrounded = true
    this.squash = 0

    // visuals
    this.shadow = scene.add.ellipse(x, WORLD.groundY + 4, 90, 14, 0x000000, 0.22).setDepth(4)
    this.g = scene.add.graphics().setDepth(10)
    const key = `head-${character.id}`
    this.headImg = scene.add.image(x, headY, key).setDepth(11)
    const scale = R / HEAD.r
    this.headScale = scale
    this.headImg.setScale(scale * this.facing, scale) // mirror for P2
    this.pupils = scene.add.graphics().setDepth(12)
    this.c = Object.fromEntries(Object.entries(character.colors).map(([k, v]) => [k, hex(v)]))
  }

  get x() {
    return this.body.position.x
  }

  get feetY() {
    return this.body.position.y + this.feetOffset
  }

  get headPos() {
    return { x: this.body.position.x + this.headOffset.x, y: this.body.position.y + this.headOffset.y }
  }

  get hip() {
    return { x: this.x + this.facing * 4, y: this.feetY - 18 }
  }

  reset() {
    const x = PLAYER.startX[this.slot]
    const y = WORLD.groundY - this.feetOffset - 1
    M.Body.setPosition(this.body, { x, y })
    M.Body.setVelocity(this.body, { x: 0, y: 0 })
    this.kickFrame = -1
    this.kickCooldown = 0
    this.legAngle = KICK.restAngle
    this.placeShoe(true)
  }

  /** Standing on the ground, a crossbar or the other player? */
  checkGrounded(supports) {
    const b = this.body.bounds
    const region = { min: { x: b.min.x + 10, y: this.feetY - 1 }, max: { x: b.max.x - 10, y: this.feetY + 4 } }
    const touching = M.Query.region(supports, region).filter((s) => s !== this.body)
    return touching.length > 0 && this.body.velocity.y > -0.5
  }

  /**
   * One physics step of control.
   * @param input {held, pressed}
   * @param supports bodies you can stand on
   * @param ball Matter body
   * @param events array to push sound/effect events into
   */
  step(input, supports, ball, events) {
    const held = input.held ?? {}
    const pressed = input.pressed ?? {}
    this.grounded = this.checkGrounded(supports)
    if (this.grounded && !this.wasGrounded) this.squash = 1
    this.wasGrounded = this.grounded

    // walk
    const dir = (held.right || pressed.right ? 1 : 0) - (held.left || pressed.left ? 1 : 0)
    const target = dir * PLAYER.speed * this.stats.speed
    const accel = this.grounded ? PLAYER.groundAccel : PLAYER.airAccel
    const v = this.body.velocity
    let vx = v.x + (target - v.x) * accel
    let vy = v.y
    // jump
    if ((pressed.jump || held.jump) && this.grounded) {
      vy = -PLAYER.jumpVelocity * this.stats.jump
      events.push({ type: 'jump', slot: this.slot })
    }
    M.Body.setVelocity(this.body, { x: vx, y: vy })

    // kick
    if (this.kickCooldown > 0) this.kickCooldown--
    if (pressed.kick && this.kickFrame < 0 && this.kickCooldown === 0) {
      this.kickFrame = 0
      this.kickedThisSwing = false
      events.push({ type: 'swing', slot: this.slot })
    }
    if (this.kickFrame >= 0) {
      this.kickFrame++
      if (this.kickFrame > KICK.frames) {
        this.kickFrame = -1
        this.kickCooldown = KICK.cooldownFrames
      }
    }
    this.legAngle = this.computeLegAngle()
    this.placeShoe(false)

    // the shoe launches the ball during the active part of the swing
    if (this.kickFrame >= KICK.activeFrom && this.kickFrame <= KICK.activeTo && !this.kickedThisSwing) {
      const s = this.shoe.position
      const dx = ball.position.x - s.x
      const dy = ball.position.y - s.y
      const reach = KICK.shoeRadius + ball.circleRadius + KICK.reach
      if (dx * dx + dy * dy < reach * reach && dx * this.facing > -ball.circleRadius) {
        this.kickedThisSwing = true
        const high = dy < -6
        const power = KICK.power * this.stats.kick
        M.Body.setVelocity(ball, {
          x: this.facing * power + this.body.velocity.x * 0.4,
          y: -(KICK.lift + (high ? KICK.liftBonusHigh : 0)) * this.stats.kick + Math.min(0, this.body.velocity.y) * 0.3,
        })
        events.push({ type: 'kick', slot: this.slot, x: ball.position.x, y: ball.position.y, power })
      }
    }
  }

  computeLegAngle() {
    if (this.kickFrame < 0) return KICK.restAngle
    const t = this.kickFrame / KICK.frames
    const ease = (u) => 1 - (1 - u) * (1 - u)
    if (t < 0.15) return KICK.restAngle + (KICK.backAngle - KICK.restAngle) * ease(t / 0.15) // wind-up
    if (t < 0.6) return KICK.backAngle + (KICK.forwardAngle - KICK.backAngle) * ease((t - 0.15) / 0.45) // swing
    return KICK.forwardAngle + (KICK.restAngle - KICK.forwardAngle) * ((t - 0.6) / 0.4) // return
  }

  /** Move the shoe body to the end of the leg; its velocity = how far it moved (so it can push the ball). */
  placeShoe(teleport) {
    const h = this.hip
    const a = this.legAngle * DEG
    const target = { x: h.x + Math.cos(a) * KICK.legLength * this.facing, y: h.y + Math.sin(a) * KICK.legLength }
    const prev = this.shoe.position
    M.Body.setPosition(this.shoe, target)
    M.Body.setVelocity(this.shoe, teleport ? { x: 0, y: 0 } : { x: target.x - prev.x, y: target.y - prev.y })
  }

  /** Draw at the current physics state. `ball` is used to aim the pupils. */
  render(ball) {
    const c = this.c
    const g = this.g
    const f = this.facing
    const p = this.body.position
    const feet = this.feetY
    const head = this.headPos
    this.squash *= 0.8
    const sq = this.squash * 0.12

    g.clear()
    // standing (back) leg
    const hip = this.hip
    g.lineStyle(9, c.skin, 1)
    g.lineBetween(p.x - f * 6, feet - 18, p.x - f * 8, feet - 4)
    g.fillStyle(c.shoe, 1)
    g.fillEllipse(p.x - f * 6, feet - 4, 22, 10)
    // torso: jersey + shorts (sized from config)
    const bw = PLAYER.bodyWidth
    const bh = PLAYER.bodyHeight
    const top = feet - bh
    g.fillStyle(0x2b1a12, 1)
    g.fillRoundedRect(p.x - bw / 2 - 2, top - 2, bw + 4, bh * 0.72 + 4, 8)
    g.fillStyle(c.jersey, 1)
    g.fillRoundedRect(p.x - bw / 2, top, bw, bh * 0.66, 7)
    g.fillStyle(c.jerseyTrim, 1)
    g.fillRect(p.x - bw / 2, top + bh * 0.3, bw, 3)
    g.fillStyle(c.shorts, 1)
    g.fillRoundedRect(p.x - bw / 2 + 1, top + bh * 0.6, bw - 2, bh * 0.36, 4)
    // kicking leg + big shoe (sized from the shoe's physics radius)
    const s = this.shoe.position
    const sr = KICK.shoeRadius
    g.lineStyle(sr * 0.65, c.skin, 1)
    g.lineBetween(hip.x, hip.y, s.x, s.y)
    g.fillStyle(0x2b1a12, 1)
    g.fillEllipse(s.x + f * 6, s.y + 2, sr * 2.8, sr * 1.45)
    g.fillStyle(c.shoe, 1)
    g.fillEllipse(s.x + f * 6, s.y, sr * 2.55, sr * 1.2)
    g.fillStyle(c.sole, 1)
    g.fillRect(s.x + f * 6 - sr * 1.1, s.y + sr * 0.35, sr * 2.2, 4)

    // head (squashes a little on landing)
    this.headImg.setPosition(head.x, head.y + sq * 20).setScale(this.headScale * f * (1 + sq), this.headScale * (1 - sq))

    // pupils follow the ball
    const pg = this.pupils
    pg.clear()
    pg.fillStyle(0x1b1b2f, 1)
    for (const e of HEAD.eyes) {
      const ex = head.x + (e.x - HEAD.cx) * this.headScale * f
      const ey = head.y + (e.y - HEAD.cy) * this.headScale + sq * 20
      const dx = ball.position.x - ex
      const dy = ball.position.y - ey
      const d = Math.hypot(dx, dy) || 1
      const k = HEAD.pupilRange * this.headScale
      pg.fillCircle(ex + (dx / d) * k, ey + (dy / d) * k, HEAD.pupilR * this.headScale)
    }

    // shadow shrinks when jumping
    const air = Math.max(0, WORLD.groundY - feet)
    this.shadow.setPosition(p.x, WORLD.groundY + 4).setScale(Math.max(0.35, 1 - air / 260), 1)
  }

  destroy() {
    this.g.destroy()
    this.headImg.destroy()
    this.pupils.destroy()
    this.shadow.destroy()
  }
}

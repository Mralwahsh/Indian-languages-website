import { PHYSICS, WORLD } from '../config.js'

const FREE_STATES = new Set(['idle', 'walk', 'crouch', 'block', 'jump'])
export const EMPTY_INPUT = Object.freeze({ held: {}, pressed: {} })

/**
 * One fighter in the simulation (no rendering here).
 * Coordinates: x = body centre, y = feet (screen pixels, y grows downwards).
 * States: idle walk crouch block jump attack special hit blockstun ko win
 */
export class Fighter {
  constructor(character, slot) {
    this.char = character
    this.slot = slot
    this.reset(WORLD.width / 2, 1)
  }

  reset(x, facing) {
    this.x = x
    this.y = WORLD.floorY
    this.vx = 0
    this.vy = 0
    this.facing = facing
    this.hp = this.char.stats.maxHp
    this.state = 'idle'
    this.stateFrame = 0
    this.move = null
    this.moveHasHit = false
    this.stun = 0
    this.specialCooldown = 0
    this.flash = 0
    this.crouching = false
  }

  get onGround() {
    return this.y >= WORLD.floorY - 0.01 && this.vy >= 0
  }

  get isFree() {
    return FREE_STATES.has(this.state)
  }

  get isKO() {
    return this.state === 'ko'
  }

  get isBlocking() {
    return this.state === 'block' || this.state === 'blockstun'
  }

  /** 0 → ready, 1 → just used */
  get specialCooldownRatio() {
    const cd = this.char.moves.special.cooldown
    return cd ? this.specialCooldown / cd : 0
  }

  setState(state) {
    this.state = state
    this.stateFrame = 0
  }

  hurtbox() {
    const s = this.char.stats
    let h = s.height
    if (this.crouching) h = s.crouchHeight
    if (this.state === 'ko') h = 46
    return { x: this.x - s.width / 2, y: this.y - h, w: s.width, h }
  }

  moveData() {
    return this.move ? this.char.moves[this.move] : null
  }

  /** 'startup' | 'active' | 'recovery' | null */
  movePhase() {
    const m = this.moveData()
    if (!m) return null
    const f = this.stateFrame
    if (f < m.startup) return 'startup'
    if (f < m.startup + m.active) return 'active'
    return 'recovery'
  }

  activeHitbox() {
    const m = this.moveData()
    if (!m?.hitbox || this.moveHasHit || this.movePhase() !== 'active') return null
    const hb = m.hitbox
    const x = this.facing === 1 ? this.x + hb.x : this.x - hb.x - hb.w
    return { x, y: this.y + hb.y, w: hb.w, h: hb.h }
  }

  startMove(name, events) {
    const m = this.char.moves[name]
    this.move = name
    this.moveHasHit = false
    this.crouching = false
    this.setState(name === 'special' ? 'special' : 'attack')
    if (this.onGround) this.vx = 0
    if (name === 'special') {
      this.specialCooldown = m.cooldown
      events.push({ type: 'special', slot: this.slot, move: m })
    } else {
      events.push({ type: 'whoosh', slot: this.slot, move: name })
    }
  }

  /** Called by the match when this fighter is hit. dir = direction the hit pushes (+1 right / -1 left). */
  takeHit(m, dir, blocked, damageFactor) {
    const damage = m.damage * (blocked ? damageFactor : 1)
    this.hp = Math.max(0, this.hp - damage)
    this.flash = 6
    this.move = null
    if (this.hp <= 0) {
      this.setState('ko')
      this.crouching = false
      this.vx = dir * 7
      this.vy = -9
      this.y -= 1 // leave the ground so gravity applies
      return damage
    }
    if (blocked) {
      this.setState('blockstun')
      this.stun = m.blockstun
      this.vx = dir * m.knockback * 0.5
    } else {
      this.setState('hit')
      this.crouching = false
      this.stun = m.hitstun
      this.vx = dir * m.knockback
      if (!this.onGround) this.vy = Math.min(this.vy, -5) // pop up a little when hit in the air
    }
    return damage
  }

  faceOpponent(opponent) {
    if (Math.abs(opponent.x - this.x) > 4) this.facing = opponent.x > this.x ? 1 : -1
  }

  update(input, opponent, events) {
    const held = input.held ?? {}
    const pressed = input.pressed ?? {}
    const s = this.char.stats
    this.stateFrame++
    if (this.specialCooldown > 0) this.specialCooldown--
    if (this.flash > 0) this.flash--

    switch (this.state) {
      case 'hit':
      case 'blockstun':
        this.stun--
        if (this.onGround) this.vx *= PHYSICS.hitKnockbackFriction
        if (this.stun <= 0) this.setState(this.onGround ? 'idle' : 'jump')
        break
      case 'attack':
      case 'special':
        this.updateMove(events)
        break
      case 'ko':
        if (this.onGround) this.vx *= 0.85
        break
      case 'win':
        this.vx = 0
        break
      default:
        break
    }

    if (this.isFree) {
      const fwdKey = this.facing === 1 ? 'right' : 'left'
      const backKey = this.facing === 1 ? 'left' : 'right'
      const fwd = held[fwdKey] || pressed[fwdKey]
      const back = held[backKey] || pressed[backKey]
      if (this.onGround) this.faceOpponent(opponent)

      if (pressed.special && this.specialCooldown === 0) this.startMove('special', events)
      else if (pressed.punch) this.startMove('punch', events)
      else if (pressed.kick) this.startMove('kick', events)
      else if (this.onGround) {
        this.crouching = !!held.down
        if (held.block) {
          if (this.state !== 'block') this.setState('block')
          this.vx = 0
        } else if (held.up || pressed.up) {
          this.crouching = false
          this.vy = -s.jumpVelocity
          this.vx = fwd ? this.facing * s.walkSpeed : back ? -this.facing * s.backSpeed : 0
          this.setState('jump')
          events.push({ type: 'jump', slot: this.slot })
        } else if (this.crouching) {
          if (this.state !== 'crouch') this.setState('crouch')
          this.vx = 0
        } else if (fwd || back) {
          if (this.state !== 'walk') this.setState('walk')
          this.vx = fwd ? this.facing * s.walkSpeed : -this.facing * s.backSpeed
        } else {
          if (this.state !== 'idle') this.setState('idle')
          this.vx = 0
        }
      }
    }

    this.integrate()
  }

  updateMove(events) {
    const m = this.moveData()
    if (!m) return this.setState('idle')
    const f = this.stateFrame
    if (this.move === 'special' && m.type === 'projectile' && f === m.startup) {
      events.push({ type: 'spawnProjectile', slot: this.slot, move: m })
    }
    if (this.move === 'special' && m.type === 'dash') {
      const phase = this.movePhase()
      this.vx = phase === 'active' ? this.facing * m.dashSpeed : this.onGround ? 0 : this.vx * 0.9
    } else if (this.onGround) {
      this.vx = 0
    }
    if (f >= m.startup + m.active + m.recovery) {
      this.move = null
      this.setState(this.onGround ? 'idle' : 'jump')
    }
  }

  integrate() {
    if (!this.onGround || this.vy < 0) this.vy += PHYSICS.gravity
    this.x += this.vx
    this.y += this.vy
    if (this.y >= WORLD.floorY) {
      const wasAir = this.vy > 0
      this.y = WORLD.floorY
      this.vy = 0
      if (wasAir && this.state === 'jump') this.setState('idle')
      if (wasAir && this.state === 'attack') {
        // landing cancels an air attack
        this.move = null
        this.setState('idle')
      }
    }
    this.x = Math.min(WORLD.rightBound, Math.max(WORLD.leftBound, this.x))
  }
}

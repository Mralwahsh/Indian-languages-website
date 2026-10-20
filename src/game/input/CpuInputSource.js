import { CPU } from '../config.js'
import { InputSource } from './InputSource.js'

const NONE = () => ({ left: false, right: false, up: false, down: false, punch: false, kick: false, block: false, special: false })

/**
 * Simple, beatable CPU. It "presses buttons" exactly like a player would, so the game can't
 * tell it apart from a phone. The game calls attach(match, slot) before the first frame.
 */
export class CpuInputSource extends InputSource {
  constructor(settings = CPU, random = Math.random) {
    super()
    this.cfg = settings
    this.random = random
    this.match = null
    this.slot = null
    this.timer = 0
    this.plan = 'idle'
    this.blockDecision = null // per opponent attack: block it or not
    this.lastOppMoveFrame = -1
  }

  attach(match, slot) {
    this.match = match
    this.slot = slot
  }

  poll() {
    const held = NONE()
    const pressed = NONE()
    const m = this.match
    if (!m || m.phase !== 'fight') return { held, pressed }

    const me = m.fighters[this.slot]
    const opp = m.fighters[this.slot === 'p1' ? 'p2' : 'p1']
    if (me.isKO || opp.isKO) return { held, pressed }

    const c = this.cfg
    const r = this.random
    const dist = Math.abs(opp.x - me.x)
    const toward = opp.x > me.x ? 'right' : 'left'
    const away = toward === 'right' ? 'left' : 'right'

    // --- react to the opponent's attacks (decide once per attack)
    const oppAttacking = (opp.state === 'attack' || opp.state === 'special') && opp.movePhase() !== 'recovery'
    if (oppAttacking) {
      if (this.blockDecision === null) this.blockDecision = r() < c.blockChance
      if (this.blockDecision && dist < 190 && me.isFree && me.onGround) {
        held.block = true
        return { held, pressed }
      }
    } else {
      this.blockDecision = null
    }

    // --- incoming disc: sometimes block or jump over it
    const disc = m.projectiles.find((p) => p.owner !== this.slot && Math.abs(p.x - me.x) < 220 && Math.sign(me.x - p.x) === Math.sign(p.vx))
    if (disc && me.onGround && me.isFree) {
      if (this.discReaction === undefined) this.discReaction = r()
      if (this.discReaction < c.blockChance) held.block = true
      else if (this.discReaction < c.blockChance + 0.2) {
        pressed.up = true
        held[toward] = true
      }
      if (held.block || pressed.up) return { held, pressed }
    } else {
      this.discReaction = undefined
    }

    // --- think every few frames
    this.timer--
    if (this.timer <= 0) {
      this.timer = c.reactionFrames + Math.floor(r() * 10)
      const specialReady = me.specialCooldown === 0
      if (r() < c.idleChance) this.plan = 'idle'
      else if (specialReady && r() < c.specialChance) this.plan = 'special'
      else if (dist > c.attackRange) {
        if (r() < c.jumpChance * 3) this.plan = 'jumpIn'
        else this.plan = r() < c.retreatChance ? 'retreat' : 'approach'
      } else if (r() < c.attackChance) this.plan = r() < c.kickRatio ? 'kick' : 'punch'
      else this.plan = r() < 0.5 ? 'retreat' : 'idle'
    }

    switch (this.plan) {
      case 'approach':
        if (dist > c.attackRange * 0.75) held[toward] = true
        else this.plan = r() < c.attackChance ? 'punch' : 'idle'
        break
      case 'retreat':
        held[away] = true
        break
      case 'jumpIn':
        pressed.up = true
        held[toward] = true
        this.plan = 'kick'
        this.timer = 22 // kick near the top of the jump
        break
      case 'punch':
      case 'kick':
      case 'special':
        if (me.isFree && (this.plan !== 'kick' || me.onGround || me.vy > -6)) {
          pressed[this.plan] = true
          this.plan = 'idle'
        }
        break
      default:
        break
    }
    return { held, pressed }
  }
}

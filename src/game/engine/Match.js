import { PHYSICS, RULES, WORLD } from '../config.js'
import { EMPTY_INPUT, Fighter } from './Fighter.js'

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const other = (slot) => (slot === 'p1' ? 'p2' : 'p1')

/**
 * A full best-of-3 match, stepped once per frame (60 FPS):
 *   const events = match.step({ p1: input, p2: input })
 * Pure logic, no Phaser: the renderer reads the public fields and reacts to `events`.
 * phase: intro → fight → roundOver → (intro …) → matchOver
 */
export class Match {
  constructor(p1Char, p2Char) {
    this.fighters = { p1: new Fighter(p1Char, 'p1'), p2: new Fighter(p2Char, 'p2') }
    this.wins = { p1: 0, p2: 0 }
    this.round = 0
    this.projectiles = []
    this.pending = []
    this.winner = undefined
    this.startRound()
  }

  get timeLeft() {
    return Math.ceil(this.timer / 60)
  }

  get isFinalRound() {
    return this.wins.p1 === RULES.roundsToWin - 1 && this.wins.p2 === RULES.roundsToWin - 1
  }

  startRound() {
    this.round++
    const c = WORLD.width / 2
    this.fighters.p1.reset(c - WORLD.startGap / 2, 1)
    this.fighters.p2.reset(c + WORLD.startGap / 2, -1)
    this.projectiles = []
    this.timer = RULES.roundSeconds * 60
    this.phase = 'intro'
    this.phaseFrame = 0
    this.hitstop = 0
    this.roundWinner = undefined
    this.pending.push({ type: 'roundStart', round: this.round })
  }

  step(inputs) {
    const events = this.pending
    this.pending = []
    this.phaseFrame++
    const f = this.phaseFrame

    if (this.phase === 'intro') {
      this.introScript(f, events)
      this.updateFighters({ p1: EMPTY_INPUT, p2: EMPTY_INPUT }, events)
      return events
    }

    if (this.phase === 'fight') {
      if (this.hitstop > 0) {
        this.hitstop--
        return events
      }
      this.updateFighters(inputs, events)
      this.updateProjectiles(events)
      this.checkHits(events)
      this.pushApart()
      this.timer--
      this.checkRoundEnd(events)
      return events
    }

    if (this.phase === 'roundOver') {
      this.updateFighters({ p1: EMPTY_INPUT, p2: EMPTY_INPUT }, events)
      this.updateProjectiles(events)
      if (f === 60) {
        const w = this.roundWinner
        if (w) this.fighters[w].setState('win')
        events.push({ type: 'announce', text: w ? `${this.fighters[w].char.nameAr} يفوز بالجولة!` : 'تعادل!', kind: 'medium' })
      }
      if (f >= RULES.roundOverFrames) this.endRoundOrMatch(events)
      return events
    }

    // matchOver: keep animating (KO'd fighter lies, winner celebrates)
    this.updateFighters({ p1: EMPTY_INPUT, p2: EMPTY_INPUT }, events)
    return events
  }

  introScript(f, events) {
    const say = (text, kind = 'big', sound) => events.push({ type: 'announce', text, kind, sound })
    if (this.round === 1) {
      if (f === 1) say('الجولة 1', 'big', 'beep')
      if (f === 60) say('3', 'count', 'beep')
      if (f === 100) say('2', 'count', 'beep')
      if (f === 140) say('1', 'count', 'beep')
      if (f === 180) this.beginFight(events)
    } else {
      if (f === 1) say(this.isFinalRound ? 'الجولة الحاسمة!' : `الجولة ${this.round}`, 'big', 'beep')
      if (f === 75) this.beginFight(events)
    }
  }

  beginFight(events) {
    this.phase = 'fight'
    this.phaseFrame = 0
    events.push({ type: 'announce', text: 'قاتل!', kind: 'big', sound: 'go' })
    events.push({ type: 'fightStart', round: this.round })
  }

  updateFighters(inputs, events) {
    const { p1, p2 } = this.fighters
    p1.update(inputs.p1 ?? EMPTY_INPUT, p2, events)
    p2.update(inputs.p2 ?? EMPTY_INPUT, p1, events)
    // fighters that asked for a projectile this frame
    for (const ev of events) {
      if (ev.type !== 'spawnProjectile' || ev.spawned) continue
      ev.spawned = true
      const f = this.fighters[ev.slot]
      const p = ev.move.projectile
      this.projectiles.push({
        owner: ev.slot,
        x: f.x + f.facing * 60,
        y: f.y + p.y,
        vx: f.facing * p.speed,
        size: p.size,
        life: p.life,
        move: ev.move,
        spin: 0,
      })
    }
  }

  updateProjectiles(events) {
    for (const p of this.projectiles) {
      p.x += p.vx
      p.spin += 0.35
      p.life--
    }
    // two discs cancel each other out
    for (const a of this.projectiles) {
      for (const b of this.projectiles) {
        if (a !== b && a.owner !== b.owner && Math.abs(a.x - b.x) < (a.size + b.size) / 2 && a.life > 0 && b.life > 0) {
          a.life = 0
          b.life = 0
          events.push({ type: 'clash', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
        }
      }
    }
    if (this.phase === 'fight') {
      for (const p of this.projectiles) {
        if (p.life <= 0) continue
        const target = this.fighters[other(p.owner)]
        if (target.isKO) continue
        const box = { x: p.x - p.size / 2, y: p.y - p.size / 2, w: p.size, h: p.size }
        if (overlap(box, target.hurtbox())) {
          p.life = 0
          this.applyHit(this.fighters[p.owner], target, p.move, Math.sign(p.vx), p.x, p.y, events)
        }
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0 && p.x > -100 && p.x < WORLD.width + 100)
  }

  checkHits(events) {
    for (const slot of ['p1', 'p2']) {
      const a = this.fighters[slot]
      const d = this.fighters[other(slot)]
      const hb = a.activeHitbox()
      if (!hb || d.isKO) continue
      if (overlap(hb, d.hurtbox())) {
        a.moveHasHit = true
        this.applyHit(a, d, a.moveData(), a.facing, hb.x + hb.w / 2, hb.y + hb.h / 2, events)
      }
    }
  }

  applyHit(attacker, defender, move, dir, x, y, events) {
    // blocking works when facing the attack
    const blocked = defender.isBlocking && defender.facing === -dir
    const damage = defender.takeHit(move, dir, blocked, RULES.blockDamageFactor)
    this.hitstop = blocked ? 2 : RULES.hitstopFrames
    events.push({ type: 'hit', slot: defender.slot, by: attacker.slot, blocked, damage, x, y, move: attacker.move ?? 'special', heavy: move.damage >= 9 })
    if (defender.isKO) events.push({ type: 'ko', slot: defender.slot, by: attacker.slot })
  }

  pushApart() {
    const { p1, p2 } = this.fighters
    if (p1.isKO || p2.isKO) return
    const a = p1.hurtbox()
    const b = p2.hurtbox()
    if (!overlap(a, b)) return
    const minDist = (a.w + b.w) / 2
    const dx = p2.x - p1.x || p1.facing
    const push = (minDist - Math.abs(dx)) * PHYSICS.pushApart
    const s = Math.sign(dx)
    p1.x = Math.min(WORLD.rightBound, Math.max(WORLD.leftBound, p1.x - s * push))
    p2.x = Math.min(WORLD.rightBound, Math.max(WORLD.leftBound, p2.x + s * push))
  }

  checkRoundEnd(events) {
    const { p1, p2 } = this.fighters
    let reason = null
    let winner
    if (p1.isKO || p2.isKO) {
      reason = 'ko'
      winner = p1.isKO && p2.isKO ? null : p1.isKO ? 'p2' : 'p1'
      events.push({ type: 'announce', text: 'ضربة قاضية!', kind: 'big', sound: 'ko' })
    } else if (this.timer <= 0) {
      reason = 'time'
      winner = p1.hp === p2.hp ? null : p1.hp > p2.hp ? 'p1' : 'p2'
      events.push({ type: 'announce', text: 'انتهى الوقت!', kind: 'big', sound: 'beep' })
    }
    if (!reason) return
    this.roundWinner = winner
    if (winner) this.wins[winner]++
    this.phase = 'roundOver'
    this.phaseFrame = 0
    for (const f of [p1, p2]) if (!f.isKO) f.setState('idle')
    events.push({ type: 'roundEnd', round: this.round, winner, reason, wins: { ...this.wins } })
  }

  endRoundOrMatch(events) {
    const done = this.wins.p1 >= RULES.roundsToWin || this.wins.p2 >= RULES.roundsToWin || this.round >= RULES.maxRounds
    if (!done) return this.startRound()
    this.phase = 'matchOver'
    this.phaseFrame = 0
    this.winner = this.wins.p1 === this.wins.p2 ? null : this.wins.p1 > this.wins.p2 ? 'p1' : 'p2'
    if (this.winner) this.fighters[this.winner].setState('win')
    events.push({ type: 'matchEnd', winner: this.winner, wins: { ...this.wins } })
  }
}

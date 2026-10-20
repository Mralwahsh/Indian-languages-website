import { RULES, WORLD } from '../config.js'
import { drawChakra, hex } from './drawStage.js'

const AR_FONT = '"IS Kufi", "Bricolage Grotesque Variable", sans-serif'
const NUM_FONT = '"Bricolage Grotesque Variable", sans-serif'
const BAR_W = 500
const BAR_H = 30

/** Health bars, names, round markers, special cooldown, timer and big announcements. */
export class Hud {
  constructor(scene, match) {
    this.scene = scene
    this.match = match
    this.g = scene.add.graphics().setDepth(100)
    this.shownHp = { p1: 1, p2: 1 } // trailing "damage" bar
    this.texts = {}
    for (const slot of ['p1', 'p2']) {
      const f = match.fighters[slot]
      const left = slot === 'p1'
      const x = left ? 40 : WORLD.width - 40
      this.texts[slot] = scene.add
        .text(x, 18, f.char.nameAr, { fontFamily: AR_FONT, fontSize: '30px', fontStyle: 'bold', color: '#ffffff', stroke: '#10123a', strokeThickness: 6, rtl: true })
        .setOrigin(left ? 0 : 1, 0)
        .setDepth(101)
      this.texts[`${slot}Special`] = scene.add
        .text(left ? 40 : WORLD.width - 40, 104, f.char.moves.special.nameAr, { fontFamily: AR_FONT, fontSize: '18px', fontStyle: 'bold', color: '#ffffff', stroke: '#10123a', strokeThickness: 4, rtl: true })
        .setOrigin(left ? 0 : 1, 0)
        .setDepth(101)
    }
    this.timerText = scene.add
      .text(WORLD.width / 2, 64, '60', { fontFamily: NUM_FONT, fontSize: '48px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(102)
    this.announceText = null
  }

  barX(slot) {
    return slot === 'p1' ? 40 : WORLD.width - 40 - BAR_W
  }

  update() {
    const g = this.g
    const m = this.match
    g.clear()

    for (const slot of ['p1', 'p2']) {
      const f = m.fighters[slot]
      const x = this.barX(slot)
      const y = 60
      const ratio = f.hp / f.char.stats.maxHp
      this.shownHp[slot] = Math.max(ratio, this.shownHp[slot] - 0.006)
      // bars are anchored next to the timer; damage eats them from the outer screen edge
      const fill = (r) => (slot === 'p1' ? [x + BAR_W * (1 - r), BAR_W * r] : [x, BAR_W * r])

      g.fillStyle(0x10123a, 0.85)
      g.fillRoundedRect(x - 5, y - 5, BAR_W + 10, BAR_H + 10, 10)
      g.fillStyle(0x3a1020, 1)
      g.fillRect(x, y, BAR_W, BAR_H)
      const [tx, tw] = fill(this.shownHp[slot])
      g.fillStyle(0xffffff, 0.9)
      g.fillRect(tx, y, tw, BAR_H)
      const [hx, hw] = fill(ratio)
      const color = ratio > 0.5 ? 0xffd23f : ratio > 0.25 ? 0xff9933 : 0xe5560c
      g.fillStyle(color, 1)
      g.fillRect(hx, y, hw, BAR_H)
      g.fillStyle(0xffffff, 0.25)
      g.fillRect(hx, y + 3, hw, 6) // shine

      // special cooldown bar
      const cd = 1 - f.specialCooldownRatio
      const sy = y + BAR_H + 10
      const sw = 220
      const sx = slot === 'p1' ? x + BAR_W - sw : x
      g.fillStyle(0x10123a, 0.8)
      g.fillRoundedRect(sx - 3, sy - 3, sw + 6, 14, 6)
      const ready = cd >= 1
      g.fillStyle(ready ? 0x7fd3ff : 0x3b6fd8, 1)
      const cw = sw * cd
      g.fillRect(slot === 'p1' ? sx + sw - cw : sx, sy, cw, 8)
      const label = this.texts[`${slot}Special`]
      label.setPosition(slot === 'p1' ? sx + sw : sx, sy + 12).setOrigin(slot === 'p1' ? 1 : 0, 0)
      label.setText(ready ? `${f.char.moves.special.nameAr} ✓` : f.char.moves.special.nameAr)
      label.setAlpha(ready ? 0.5 + 0.5 * Math.abs(Math.sin(this.scene.time.now / 250)) : 0.6)

      // round wins: little chakras under the name
      for (let i = 0; i < RULES.roundsToWin; i++) {
        const cx = slot === 'p1' ? x + 14 + i * 34 : x + BAR_W - 14 - i * 34
        const won = m.wins[slot] > i
        g.fillStyle(won ? 0xffffff : 0x10123a, won ? 1 : 0.5)
        g.fillCircle(cx, y + BAR_H + 52, 13)
        if (won) drawChakra(g, cx, y + BAR_H + 52, 11, 0x000080, 2)
      }
    }

    // timer medallion
    g.fillStyle(0x000080, 1)
    g.fillCircle(WORLD.width / 2, 64, 44)
    g.lineStyle(4, 0xff9933, 1)
    g.strokeCircle(WORLD.width / 2, 64, 44)
    g.lineStyle(3, 0x138808, 1)
    g.strokeCircle(WORLD.width / 2, 64, 50)
    const t = m.phase === 'intro' ? 60 : Math.max(0, m.timeLeft)
    this.timerText.setText(String(t)).setColor(t <= 10 && m.phase === 'fight' ? '#ff9933' : '#ffffff')
  }

  /** Big centred text, e.g. "الجولة 1", "3", "قاتل!", "ضربة قاضية!" */
  announce(text, kind = 'big') {
    this.announceText?.destroy()
    const size = kind === 'count' ? 170 : kind === 'medium' ? 64 : 104
    const t = this.scene.add
      .text(WORLD.width / 2, WORLD.height * 0.42, text, {
        fontFamily: kind === 'count' ? NUM_FONT : AR_FONT,
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000080',
        strokeThickness: kind === 'medium' ? 10 : 16,
        rtl: kind !== 'count',
        shadow: { offsetX: 0, offsetY: 8, color: '#000000', blur: 12, fill: true, stroke: true },
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setScale(1.8)
      .setAlpha(0)
    this.announceText = t
    this.scene.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' })
    this.scene.tweens.add({
      targets: t,
      alpha: 0,
      delay: kind === 'count' ? 380 : kind === 'medium' ? 1500 : 850,
      duration: 250,
      onComplete: () => t.destroy(),
    })
  }

  destroy() {
    this.g.destroy()
    Object.values(this.texts).forEach((t) => t.destroy())
    this.timerText.destroy()
    this.announceText?.destroy()
  }
}

export { hex }

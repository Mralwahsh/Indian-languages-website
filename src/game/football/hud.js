import { WORLD } from './config.js'

const AR = '"IS Kufi", "Bricolage Grotesque Variable", sans-serif'
const NUM = '"Bricolage Grotesque Variable", sans-serif'
const W = WORLD.width

/** Scoreboard (names, heads, score, timer) and big centred announcements. Fixed to the screen. */
export class Hud {
  constructor(scene, characters) {
    this.scene = scene
    const g = scene.add.graphics().setScrollFactor(0).setDepth(200)
    // board
    g.fillStyle(0x000080, 0.92)
    g.fillRoundedRect(W / 2 - 300, 12, 600, 78, 22)
    g.lineStyle(4, 0xff9933, 1)
    g.strokeRoundedRect(W / 2 - 300, 12, 600, 78, 22)
    g.fillStyle(0x138808, 1)
    g.fillRect(W / 2 - 300 + 22, 86, 600 - 44, 4)
    this.board = g

    const text = (x, y, s, size, font = AR, color = '#ffffff') =>
      scene.add
        .text(x, y, s, { fontFamily: font, fontSize: `${size}px`, fontStyle: 'bold', color, rtl: font === AR })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(201)

    this.heads = {
      p1: scene.add.image(W / 2 - 252, 51, `head-${characters.p1.id}`).setScale(0.48).setScrollFactor(0).setDepth(201),
      p2: scene.add.image(W / 2 + 252, 51, `head-${characters.p2.id}`).setScale(-0.48, 0.48).setScrollFactor(0).setDepth(201),
    }
    this.names = {
      p1: text(W / 2 - 160, 51, characters.p1.nameAr, 30),
      p2: text(W / 2 + 160, 51, characters.p2.nameAr, 30),
    }
    this.score = text(W / 2, 50, '0 - 0', 52, NUM)
    // timer pill
    this.timerBg = scene.add.graphics().setScrollFactor(0).setDepth(200)
    this.timer = text(W / 2, 112, '1:30', 28, NUM)
    this.golden = false
    this.announceText = null
  }

  update({ score, timeLeftMs, golden }) {
    this.score.setText(`${score.p1} - ${score.p2}`)
    if (golden !== this.golden || !this.timerDrawn) {
      this.golden = golden
      this.timerDrawn = true
      const w = golden ? 230 : 110
      this.timerBg.clear()
      this.timerBg.fillStyle(golden ? 0xffd23f : 0xffffff, 1)
      this.timerBg.fillRoundedRect(W / 2 - w / 2, 94, w, 38, 19)
      this.timer.setColor(golden ? '#000080' : '#000080').setFontFamily(golden ? AR : NUM).setFontSize(golden ? 24 : 28)
    }
    if (golden) this.timer.setText('الهدف الذهبي')
    else {
      const s = Math.max(0, Math.ceil(timeLeftMs / 1000))
      this.timer.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)
      this.timer.setColor(s <= 10 ? '#e5560c' : '#000080')
    }
  }

  /** Big centred text, e.g. "3", "انطلق!", "هدف!" */
  announce(textStr, { size = 120, color = '#ffffff', stroke = '#000080', hold = 700, sub } = {}) {
    this.announceText?.destroy()
    this.announceSub?.destroy()
    const isAr = /[؀-ۿ]/.test(textStr)
    const t = this.scene.add
      .text(W / 2, WORLD.height * 0.4, textStr, {
        fontFamily: isAr ? AR : NUM,
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        stroke,
        strokeThickness: Math.round(size / 7),
        rtl: isAr,
        shadow: { offsetX: 0, offsetY: 8, color: '#000000', blur: 14, fill: true, stroke: true },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(300)
      .setScale(2)
      .setAlpha(0)
    this.announceText = t
    this.scene.tweens.add({ targets: t, scale: 1, alpha: 1, angle: { from: -8, to: 0 }, duration: 260, ease: 'Back.easeOut' })
    this.scene.tweens.add({ targets: t, alpha: 0, scale: 1.15, delay: hold, duration: 260, onComplete: () => t.destroy() })
    if (sub) {
      const s = this.scene.add
        .text(W / 2, WORLD.height * 0.4 + size * 0.85, sub, { fontFamily: AR, fontSize: '40px', fontStyle: 'bold', color: '#ffffff', stroke: '#000080', strokeThickness: 8, rtl: true })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(300)
        .setAlpha(0)
      this.announceSub = s
      this.scene.tweens.add({ targets: s, alpha: 1, duration: 200, delay: 150 })
      this.scene.tweens.add({ targets: s, alpha: 0, delay: hold + 100, duration: 260, onComplete: () => s.destroy() })
    }
  }
}

/** Tricolour confetti burst over the whole screen. */
export function confetti(scene, count = 90) {
  const colors = [0xff9933, 0xffffff, 0x138808, 0xffd23f, 0x000080]
  for (let i = 0; i < count; i++) {
    const x = Math.random() * W
    const piece = scene.add
      .rectangle(x, -20 - Math.random() * 120, 8 + Math.random() * 8, 5 + Math.random() * 5, colors[i % colors.length])
      .setScrollFactor(0)
      .setDepth(290)
    scene.tweens.add({
      targets: piece,
      y: WORLD.height + 30,
      x: x + (Math.random() - 0.5) * 260,
      angle: (Math.random() - 0.5) * 1080,
      duration: 1600 + Math.random() * 1400,
      ease: 'Sine.easeIn',
      onComplete: () => piece.destroy(),
    })
  }
}

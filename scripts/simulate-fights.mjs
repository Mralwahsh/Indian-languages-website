// Balance check without a browser: plays many matches with the real engine and CPU.
//   npm run sim
import { Match } from '../src/game/engine/Match.js'
import { CpuInputSource } from '../src/game/input/CpuInputSource.js'
import { CHARACTERS } from '../src/game/characters/index.js'

const MAX_FRAMES = 60 * 60 * 6

function play(p1Input, p2Input, n) {
  const res = { p1: 0, p2: 0, draw: 0, seconds: 0, ko: 0, time: 0, broken: 0 }
  for (let i = 0; i < n; i++) {
    const m = new Match(CHARACTERS.veer, CHARACTERS.tara)
    const a = p1Input(m)
    const b = p2Input(m)
    let f = 0
    for (; f < MAX_FRAMES && m.phase !== 'matchOver'; f++) {
      for (const ev of m.step({ p1: a(), p2: b() })) if (ev.type === 'roundEnd') res[ev.reason]++
      for (const fi of Object.values(m.fighters)) if (!Number.isFinite(fi.x + fi.y + fi.hp)) res.broken++
    }
    if (m.phase !== 'matchOver') res.broken++
    res[m.winner ?? 'draw']++
    res.seconds += f / 60 / n
  }
  res.seconds = Math.round(res.seconds)
  return res
}

const cpu = (slot) => (m) => {
  const c = new CpuInputSource()
  c.attach(m, slot)
  return () => c.poll()
}
// an excited visitor: walks in and presses random attack buttons
const masher = (m) => () => {
  const me = m.fighters.p1
  const o = m.fighters.p2
  const pressed = {}
  if (Math.random() < 0.12) pressed[['punch', 'kick', 'punch', 'special'][Math.floor(Math.random() * 4)]] = true
  return { held: { [o.x > me.x ? 'right' : 'left']: Math.abs(o.x - me.x) > 90 }, pressed }
}
const idle = () => () => ({ held: {}, pressed: {} })

console.log('Veer (P1) vs Tara (P2) — wins, round endings, average match length\n')
console.table({
  'CPU vs CPU (200)': play(cpu('p1'), cpu('p2'), 200),
  'button masher vs CPU (100)': play(masher, cpu('p2'), 100),
  'idle player vs CPU (50)': play(idle, cpu('p2'), 50),
})
console.log('\n"broken" must be 0. A masher should win roughly half the time against the CPU.')

#!/usr/bin/env node
// Turns one melody line written in LilyPond \relative notation into a one-track MIDI file,
// so it can go through scripts/midi-to-song.js like any other song.
//
//   node scripts/lilypond-melody-to-midi.js <melody.ly> <out.mid> --relative "c''" --seconds 52
//
// Supports what simple melodies need: notes a–g with is/es (sharp/flat) and ! (natural reminder),
// octave marks ' and , durations 1 2 4 8 16 with dots, ties ~, rests r, and ignores beams [ ],
// slurs ( ), bar lines | and \commands. --seconds sets the tempo so the whole melody lasts that long.

import fs from 'node:fs'

const STEPS = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 }
const SEMIS = [0, 2, 4, 5, 7, 9, 11]
const PPQ = 480

/** "c''" → absolute staff step (octave*7 + step), with c' (middle C) = 4*7 */
function absoluteStep(spec) {
  const m = /^([a-g])([',]*)$/.exec(spec)
  if (!m) throw new Error(`bad --relative note: ${spec}`)
  const marks = m[2]
  return (3 + (marks.match(/'/g) ?? []).length - (marks.match(/,/g) ?? []).length) * 7 + STEPS[m[1]]
}

export function parseMelody(src, relative = "c''") {
  const notes = [] // { midi, beats, tieNext }
  let prevStep = absoluteStep(relative)
  let dur = 4
  let dots = 0
  const body = src
    .replace(/%.*$/gm, '') // comments
    .replace(/\\[a-zA-Z]+(\s+"[^"]*")?/g, ' ') // \commands (and their quoted argument)
    .replace(/[[\]()|{}<>]/g, ' ')
    .replace(/\s*~\s*/g, '~ ') // "g8[g]~g8": the tie belongs to the note before it
  // a note is a whole token, so letters inside words never count
  const tokenRe = /(?<=^|\s)([a-gr])((?:is|es|s)*)(!?)([',]*)(\d+)?(\.*)(~?)(?=\s|$)/g
  let m
  while ((m = tokenRe.exec(body))) {
    const [, name, acc, , marks, d, dotStr, tie] = m
    if (d) {
      dur = Number(d)
      dots = dotStr.length
    } else if (dotStr) dots = dotStr.length
    let beats = 4 / dur
    for (let i = 0, add = beats / 2; i < dots; i++, add /= 2) beats += add
    if (name === 'r') {
      notes.push({ rest: true, beats })
      continue
    }
    // \relative: pick the octave that puts the note within a fourth of the previous one
    const step = STEPS[name]
    let best = null
    for (let oct = 0; oct < 10; oct++) {
      const s = oct * 7 + step
      if (!best || Math.abs(s - prevStep) < Math.abs(best - prevStep)) best = s
    }
    best += ((marks.match(/'/g) ?? []).length - (marks.match(/,/g) ?? []).length) * 7
    prevStep = best
    const octave = Math.floor(best / 7)
    const sharps = (acc.match(/is/g) ?? []).length - (acc.match(/es|^s$/g) ?? []).length
    const midi = (octave + 1) * 12 + SEMIS[step] + sharps
    notes.push({ midi, beats, tieNext: tie === '~' })
  }
  // join tied notes
  const out = []
  for (const n of notes) {
    const last = out[out.length - 1]
    if (last && last.tieNext && !n.rest && last.midi === n.midi) {
      last.beats += n.beats
      last.tieNext = n.tieNext
    } else out.push({ ...n })
  }
  return out
}

const vlq = (n) => {
  const b = [n & 0x7f]
  while ((n >>= 7)) b.unshift((n & 0x7f) | 0x80)
  return b
}
const chunk = (type, data) => [...Buffer.from(type), (data.length >>> 24) & 255, (data.length >>> 16) & 255, (data.length >>> 8) & 255, data.length & 255, ...data]

export function melodyToMidi(notes, bpm, name = 'Melody') {
  const us = Math.round(60e6 / bpm)
  const ev = [0, 0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255, 0, 0xff, 0x03, ...vlq(name.length), ...Buffer.from(name)]
  let pending = 0
  for (const n of notes) {
    const ticks = Math.round(n.beats * PPQ)
    if (n.rest) {
      pending += ticks
      continue
    }
    const sound = Math.max(1, Math.round(ticks * 0.92)) // a little air between notes
    ev.push(...vlq(pending), 0x90, n.midi, 88, ...vlq(sound), 0x80, n.midi, 0)
    pending = ticks - sound
  }
  ev.push(...vlq(pending), 0xff, 0x2f, 0)
  return Buffer.from([...chunk('MThd', [0, 0, 0, 1, (PPQ >> 8) & 255, PPQ & 255]), ...chunk('MTrk', ev)])
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const [src, out, ...rest] = process.argv.slice(2)
  if (!src || !out) {
    console.log('usage: node scripts/lilypond-melody-to-midi.js <melody.ly> <out.mid> [--relative "c\'\'"] [--seconds 52 | --bpm 120]')
    process.exit(1)
  }
  const opt = (k, d) => (rest.includes(k) ? rest[rest.indexOf(k) + 1] : d)
  const notes = parseMelody(fs.readFileSync(src, 'utf8'), opt('--relative', "c''"))
  const beats = notes.reduce((s, n) => s + n.beats, 0)
  const bpm = rest.includes('--seconds') ? (beats * 60) / Number(opt('--seconds')) : Number(opt('--bpm', 100))
  fs.writeFileSync(out, melodyToMidi(notes, bpm))
  console.log(`  ${notes.filter((n) => !n.rest).length} notes, ${beats} beats, ${bpm.toFixed(1)} bpm (${((beats * 60) / bpm).toFixed(1)} s) → ${out}`)
}

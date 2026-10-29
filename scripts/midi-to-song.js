#!/usr/bin/env node
// Converts a MIDI file into a Raga Tiles song (public/songs/<id>.json) and adds it to the song list.
//
//   node scripts/midi-to-song.js path/to/song.mid --title "My song" [options]
//   node scripts/midi-to-song.js path/to/jana-gana-mana.mid --preset anthem
//
// Options
//   --preset anthem        id, titles, intro line and respectful mode for the National Anthem
//   --id <id>              file name / id (default: from the MIDI file name)
//   --title "..."          title (Latin letters)      --title-ar "..."  Arabic title
//   --title-native "..."   title in its own script     --about "..."     one line for the calm intro screen
//   --mode classic|respectful   (default classic; respectful = the music plays by itself, nothing can stop it)
//   --source "..."         where the music comes from (kept in the song file)
//   --track <n>            use only this track (see the list printed below); default: picks the melody
//   --channel <1-16>       use only this MIDI channel
//   --transpose <n>        shift by n semitones (default: whole octaves into a comfortable piano range)
//   --tempo-scale <x>      play x times faster (default 1 = as written)
//   --min-gap <seconds>    drop notes closer than this to the previous one (ornaments), default 0.12
//   --out <dir>            default public/songs        --no-index   don't add to index.json
//   --dry-run              print what would be written, write nothing
//
// Only use MIDI files you are allowed to use (public domain or your own arrangement).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assignLanes } from '../src/tiles/lanes.js'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const HOLD_MIN = 0.55 // shortest hold tile, as in src/tiles/config.js
const TILE_SEC = 0.3 // as in src/tiles/config.js

const PRESETS = {
  anthem: {
    id: 'jana-gana-mana',
    title: 'Jana Gana Mana',
    titleAr: 'جانا غانا مانا',
    titleNative: 'जन गण मन',
    about: 'النشيد الوطني للهند، من كلمات رابندراناث طاغور.',
    mode: 'respectful',
  },
}

// ---------------------------------------------------------------- command line
function parseArgs(argv) {
  const opts = { minGap: 0.12, tempoScale: 1, out: path.join(ROOT, 'public', 'songs'), index: true }
  const rest = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => {
      if (i + 1 >= argv.length) fail(`${a} needs a value`)
      return argv[++i]
    }
    if (a === '--preset') Object.assign(opts, PRESETS[next()] ?? fail(`unknown preset (known: ${Object.keys(PRESETS).join(', ')})`))
    else if (a === '--id') opts.id = next()
    else if (a === '--title') opts.title = next()
    else if (a === '--title-ar') opts.titleAr = next()
    else if (a === '--title-native') opts.titleNative = next()
    else if (a === '--about') opts.about = next()
    else if (a === '--mode') opts.mode = next()
    else if (a === '--source') opts.source = next()
    else if (a === '--track') opts.track = Number(next())
    else if (a === '--channel') opts.channel = Number(next())
    else if (a === '--transpose') opts.transpose = Number(next())
    else if (a === '--tempo-scale') opts.tempoScale = Number(next())
    else if (a === '--min-gap') opts.minGap = Number(next())
    else if (a === '--out') opts.out = path.resolve(next())
    else if (a === '--no-index') opts.index = false
    else if (a === '--dry-run') opts.dryRun = true
    else if (a === '--help' || a === '-h') opts.help = true
    else if (a.startsWith('--')) fail(`unknown option ${a}`)
    else rest.push(a)
  }
  opts.file = rest[0]
  if (opts.mode && !['classic', 'respectful'].includes(opts.mode)) fail('--mode must be classic or respectful')
  opts.mode ??= 'classic'
  return opts
}

function fail(msg) {
  console.error(`\n  ✖ ${msg}\n`)
  process.exit(1)
}

// ---------------------------------------------------------------- MIDI reading
/** Reads a Standard MIDI File: notes (with tick on/off), the tempo map and the ticks per quarter note. */
export function readMidi(buf) {
  let p = 0
  const u8 = () => buf[p++]
  const u16 = () => (buf[p++] << 8) | buf[p++]
  const u32 = () => ((buf[p++] << 24) | (buf[p++] << 16) | (buf[p++] << 8) | buf[p++]) >>> 0
  const str = (n) => String.fromCharCode(...buf.subarray(p, (p += n)))
  const vlq = () => {
    let v = 0
    let b
    do {
      b = buf[p++]
      v = (v << 7) | (b & 0x7f)
    } while (b & 0x80)
    return v
  }

  if (str(4) !== 'MThd') throw new Error('not a MIDI file (no MThd header)')
  const headerLen = u32()
  const format = u16()
  const nTracks = u16()
  const division = u16()
  p = 8 + headerLen
  if (division & 0x8000) throw new Error('SMPTE time division is not supported; export the MIDI with ticks per quarter note')

  const notes = []
  const tempos = []
  const trackNames = []
  for (let t = 0; t < nTracks && p < buf.length; t++) {
    while (p < buf.length && str(4) !== 'MTrk') p += u32() // skip unknown chunks
    const len = u32()
    const end = p + len
    let tick = 0
    let status = 0
    const open = new Map() // channel*128+pitch → [start notes] (FIFO)
    while (p < end) {
      tick += vlq()
      let b = u8()
      if (b === 0xff) {
        const type = u8()
        const l = vlq()
        if (type === 0x51 && l === 3) tempos.push({ tick, us: (buf[p] << 16) | (buf[p + 1] << 8) | buf[p + 2] })
        if (type === 0x03) trackNames[t] = str(l).trim()
        else p += l
        continue
      }
      if (b === 0xf0 || b === 0xf7) {
        p += vlq()
        continue
      }
      if (b < 0x80) {
        p-- // running status: reuse the last status byte
        b = status
      } else status = b
      const kind = b & 0xf0
      const ch = b & 0x0f
      if (kind === 0x90 || kind === 0x80) {
        const pitch = u8()
        const vel = u8()
        const key = ch * 128 + pitch
        if (kind === 0x90 && vel > 0) {
          if (!open.has(key)) open.set(key, [])
          open.get(key).push({ track: t, channel: ch, pitch, vel, on: tick })
        } else {
          const n = open.get(key)?.shift()
          if (n) notes.push({ ...n, off: tick })
        }
      } else if (kind === 0xc0 || kind === 0xd0) p += 1
      else p += 2 // 0xA0 0xB0 0xE0
    }
    for (const list of open.values()) for (const n of list) notes.push({ ...n, off: n.on + division }) // never released
    p = end
  }
  tempos.sort((a, b) => a.tick - b.tick)
  return { format, division, notes, tempos, trackNames }
}

/** tick → seconds, following every tempo change. */
function makeClock(division, tempos) {
  const map = [{ tick: 0, us: 500000, sec: 0 }] // 120 bpm until told otherwise
  for (const t of tempos) {
    const last = map[map.length - 1]
    const sec = last.sec + ((t.tick - last.tick) * last.us) / division / 1e6
    if (t.tick === last.tick) map[map.length - 1] = { ...last, us: t.us }
    else map.push({ tick: t.tick, us: t.us, sec })
  }
  return (tick) => {
    let seg = map[0]
    for (const m of map) if (m.tick <= tick) seg = m
    return seg.sec + ((tick - seg.tick) * seg.us) / division / 1e6
  }
}

// ---------------------------------------------------------------- melody
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1)

function describeTracks(midi) {
  const byTrack = new Map()
  for (const n of midi.notes) {
    if (!byTrack.has(n.track)) byTrack.set(n.track, [])
    byTrack.get(n.track).push(n)
  }
  return [...byTrack.entries()].map(([track, ns]) => ({
    track,
    name: midi.trackNames[track] || '',
    count: ns.length,
    drums: ns.every((n) => n.channel === 9),
    avgPitch: avg(ns.map((n) => n.pitch)),
    channels: [...new Set(ns.map((n) => n.channel + 1))],
  }))
}

/** Default melody: of the non-drum tracks with a fair number of notes, the one that sits highest. */
function pickMelodyTrack(tracks) {
  const candidates = tracks.filter((t) => !t.drums)
  const most = Math.max(...candidates.map((t) => t.count))
  return candidates.filter((t) => t.count >= most * 0.2).sort((a, b) => b.avgPitch - a.avgPitch)[0]?.track
}

/** One note at a time: at each onset keep the highest note; a note ends when the next one starts. */
function skyline(notes, minGap) {
  const sorted = [...notes].sort((a, b) => a.time - b.time || b.pitch - a.pitch)
  const out = []
  for (const n of sorted) {
    const last = out[out.length - 1]
    if (last && n.time - last.time < 0.03) continue // same onset (a chord): the top note already won
    if (last && n.time - last.time < minGap) {
      // two notes almost together: an ornament (grace note) and its main note. Keep the longer one.
      if (n.dur > last.dur) Object.assign(last, n)
      continue
    }
    if (last) last.dur = Math.min(last.dur, n.time - last.time - 0.02)
    out.push({ ...n })
  }
  return out.filter((n) => n.dur > 0.03)
}

function autoTranspose(notes) {
  const sorted = notes.map((n) => n.pitch).sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  return Math.round((67 - median) / 12) * 12 // whole octaves, median near G4
}

// ---------------------------------------------------------------- main
function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help || !opts.file) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 22).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
    process.exit(opts.file ? 0 : 1)
  }
  if (!fs.existsSync(opts.file)) fail(`file not found: ${opts.file}`)

  const midi = readMidi(fs.readFileSync(opts.file))
  const clock = makeClock(midi.division, midi.tempos)
  const tracks = describeTracks(midi)
  console.log(`\n  ${path.basename(opts.file)}: format ${midi.format}, ${midi.division} ticks per beat, ${midi.tempos.length} tempo event(s)`)
  console.log('  tracks:')
  for (const t of tracks) console.log(`    #${t.track}  ${String(t.count).padStart(4)} notes  avg pitch ${t.avgPitch.toFixed(1)}  channel ${t.channels.join(',')}${t.drums ? '  (drums, skipped)' : ''}  ${t.name}`)

  const track = opts.track ?? (opts.channel == null ? pickMelodyTrack(tracks) : undefined)
  let notes = midi.notes.filter((n) => n.channel !== 9 || opts.channel === 10)
  if (track != null) notes = notes.filter((n) => n.track === track)
  if (opts.channel != null) notes = notes.filter((n) => n.channel === opts.channel - 1)
  if (!notes.length) fail('no notes left (check --track / --channel)')
  console.log(`  melody from ${track != null ? `track #${track}` : 'all tracks'}${opts.channel != null ? `, channel ${opts.channel}` : ''}`)

  // ticks → seconds; "on the beat" is decided from the written beats, before any shifting
  const tickNotes = notes.map((n) => {
    const beat = n.on / midi.division
    const frac = beat - Math.floor(beat)
    return { pitch: n.pitch, time: clock(n.on) / opts.tempoScale, dur: (clock(n.off) - clock(n.on)) / opts.tempoScale, onBeat: frac < 0.08 || frac > 0.92 }
  })
  let melody = skyline(tickNotes, opts.minGap)
  const shift = opts.transpose ?? autoTranspose(melody)
  const start = melody[0].time
  melody = melody.map((n) => ({
    pitch: Math.max(36, Math.min(96, n.pitch + shift)),
    time: +(n.time - start).toFixed(3),
    dur: +Math.max(0.12, n.dur).toFixed(3),
    onBeat: n.onBeat,
  }))
  // hold tiles: notes clearly longer than this song's usual note (and long enough to hold)
  const durs = melody.map((n) => n.dur).sort((a, b) => a - b)
  const typical = durs[Math.floor(durs.length / 2)]
  for (const n of melody) n.hold = n.dur >= Math.max(HOLD_MIN, typical * 1.6)
  const withLanes = assignLanes(melody, { lanes: 4, tileSec: TILE_SEC, holdMin: HOLD_MIN })

  const firstUs = midi.tempos[0]?.us ?? 500000
  const id = opts.id ?? path.basename(opts.file, path.extname(opts.file)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const song = {
    id,
    title: opts.title ?? id,
    ...(opts.titleAr ? { titleAr: opts.titleAr } : {}),
    ...(opts.titleNative ? { titleNative: opts.titleNative } : {}),
    mode: opts.mode,
    tempo: Math.round((60e6 / firstUs) * opts.tempoScale),
    ...(opts.about ? { about: opts.about } : {}),
    source: opts.source ?? `Converted from ${path.basename(opts.file)} with scripts/midi-to-song.js`,
    notes: withLanes,
  }

  // summary + warnings
  const gaps = withLanes.slice(1).map((n, i) => n.time - withLanes[i].time)
  const holds = withLanes.filter((n) => n.hold).length
  const lanes = [0, 0, 0, 0]
  for (const n of withLanes) lanes[n.lane]++
  const end = Math.max(...withLanes.map((n) => n.time + n.dur))
  console.log(`  → ${withLanes.length} tiles (${holds} hold), ${end.toFixed(1)} s, ${song.tempo} bpm, transposed ${shift >= 0 ? '+' : ''}${shift}, lanes ${lanes.join('/')}`)
  const fast = gaps.filter((g) => g < 0.16).length
  if (fast) console.log(`  ⚠ ${fast} notes follow each other faster than 0.16 s: try --min-gap 0.16 or --tempo-scale 0.9`)
  if (withLanes.length < 8) console.log('  ⚠ very few notes: is this the melody track? (see --track)')

  if (opts.dryRun) {
    console.log('  (dry run: nothing written)\n')
    return
  }
  fs.mkdirSync(opts.out, { recursive: true })
  const file = path.join(opts.out, `${id}.json`)
  fs.writeFileSync(file, JSON.stringify(song, null, 1) + '\n')
  console.log(`  ✔ wrote ${path.relative(ROOT, file)}`)

  if (opts.index) {
    const indexFile = path.join(opts.out, 'index.json')
    const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : { songs: [] }
    const name = `${id}.json`
    if (!index.songs.includes(name)) {
      // respectful songs (the anthem) go first in the list
      if (song.mode === 'respectful') index.songs.unshift(name)
      else index.songs.push(name)
      fs.writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n')
      console.log(`  ✔ added to ${path.relative(ROOT, indexFile)}`)
    } else console.log(`  (already in ${path.relative(ROOT, indexFile)})`)
  }
  console.log()
}

main()

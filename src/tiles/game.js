import { END_PAUSE, HIT_LINE, LANES, LEAD_IN, SCORE, SPEED, STARS, TILE_SEC, TIMING, TOUCH } from './config.js'
import { C, Effects, drawHitLine, drawHold, makeBackground, makeTileSprites } from './art.js'
import { comboMult } from './songs.js'

// ?timer=1 runs the loop on setTimeout (for testing in a background tab, where animation frames pause)
const useTimer = new URLSearchParams(location.search).has('timer')
const nextFrame = (fn) => (useTimer ? setTimeout(fn, 16) : requestAnimationFrame(fn))
const cancelFrame = (id) => (useTimer ? clearTimeout(id) : cancelAnimationFrame(id))

/**
 * Plays one song on the canvas until it ends, then calls onEnd(result).
 *
 * Respectful mode: the whole melody is scheduled on the audio clock up front; taps only add points
 * and a soft glow. Nothing the player does (or doesn't do) can stop or change the music.
 * Classic mode: the first tile waits for a tap; then every correct tap plays that tile's note.
 * Missing a tile or tapping an empty lane ends the round.
 *
 * @returns {{ stop(): void }} to leave early
 */
export function playSong({ canvas, song, chart, difficulty, piano, onEnd }) {
  const respectful = song.mode === 'respectful'
  const ctx = canvas.getContext('2d', { alpha: false })
  let dpr, W, H, laneW, hitY, speed, tileH, bg, sprites
  const fx = new Effects(1)

  function layout() {
    dpr = Math.min(2, window.devicePixelRatio || 1)
    W = Math.round(window.innerWidth * dpr)
    H = Math.round(window.innerHeight * dpr)
    canvas.width = W
    canvas.height = H
    laneW = W / LANES
    hitY = Math.round(H * HIT_LINE)
    speed = H * SPEED[difficulty]
    tileH = speed * TILE_SEC
    bg = makeBackground(W, H, laneW, hitY, dpr)
    sprites = makeTileSprites(laneW, tileH, dpr)
    fx.dpr = dpr
  }
  layout()

  const tiles = chart.tiles.map((t, i) => ({ ...t, i, state: 'pending', judge: null, pointer: null, voice: null, heldTo: t.t }))
  const lanes = Array.from({ length: LANES }, () => [])
  for (const t of tiles) lanes[t.lane].push(t)
  const lastEnd = tiles.reduce((m, t) => Math.max(m, t.t + (t.hold ? t.d : TILE_SEC)), 0)

  const st = { score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0 }
  const voices = [] // every sound we started, so leaving can silence them
  let t0 = piano.now + LEAD_IN // audio time at which song time 0 happens
  let started = respectful // classic waits for the first tile to be tapped
  let ended = false
  let frozenAt = null // song time at which a classic round was lost (the screen freezes there)
  let judgeText = null
  let cursor = 0 // first tile that still needs checking
  let drawFrom = 0
  let raf = 0
  let lastMs = performance.now()
  let endTimer = 0

  // song time = seconds since the song's first beat; in respectful mode shifted by the speaker latency
  // so a tile reaches the line exactly when its note is heard
  const songTime = () => {
    if (frozenAt != null) return frozenAt
    if (!started) return tiles[0]?.t ?? 0
    return piano.now - t0 - (respectful ? piano.latency : 0)
  }

  // ---------------------------------------------------------------- respectful: the music plays itself
  let nextNote = 0
  const schedule = () => {
    if (!respectful || ended) return
    const horizon = piano.now + 0.25
    while (nextNote < chart.notes.length && t0 + chart.notes[nextNote].time < horizon) {
      const n = chart.notes[nextNote++]
      voices.push(piano.play(n.pitch, t0 + n.time, { dur: n.dur, vel: 0.75 }))
    }
  }
  const scheduler = setInterval(schedule, 40)
  schedule()

  // ---------------------------------------------------------------- scoring
  function hit(tile, now, pointerId) {
    const j = Math.abs(now - tile.t) <= TIMING.perfect ? 'perfect' : 'good'
    tile.judge = j
    st[j]++
    st.combo++
    st.maxCombo = Math.max(st.maxCombo, st.combo)
    st.score += SCORE[j] * comboMult(st.combo)
    const x = tile.lane * laneW
    if (respectful) fx.glow(x, laneW, hitY)
    else {
      fx.burst(x + laneW / 2, hitY - tileH * 0.4, j === 'perfect')
      tile.voice = piano.play(tile.pitch, piano.now, tile.hold ? { vel: 0.95 } : { dur: Math.max(0.3, tile.d), vel: 0.95 })
      voices.push(tile.voice)
      // Easy: the melody notes between this tile and the next one play by themselves
      for (const f of tile.fillers) voices.push(piano.play(f.pitch, piano.now + f.dt, { dur: f.dur, vel: 0.8 }))
      judgeText = { text: j === 'perfect' ? 'ممتاز!' : 'جيد', color: j === 'perfect' ? C.saffron : C.teal, at: performance.now() }
    }
    if (tile.hold) {
      tile.state = 'holding'
      tile.pointer = pointerId
    } else tile.state = 'hit'
  }

  function finishHold(tile, now, letGo) {
    const end = tile.t + tile.d
    tile.heldTo = Math.max(tile.t, Math.min(now, end))
    st.score += SCORE.holdPerSecond * (tile.heldTo - tile.t)
    tile.state = 'hit'
    tile.pointer = null
    tile.voice?.stop(piano.now + (letGo ? 0.03 : 0.3))
    tile.voice = null
  }

  /** Classic only: the round is lost. Freeze, flash what went wrong, then show the result. */
  function lose(now, tile, lane, tapY) {
    if (ended) return
    ended = true
    frozenAt = now
    piano.playThud()
    for (const v of voices) v.stop(piano.now + 0.05)
    if (tile) tile.state = 'fail'
    else fx.flash(lane * laneW + sprites.pad, sprites.w, tapY - tileH / 2, tileH)
    endTimer = setTimeout(() => finish(true), 1400)
  }

  function finish(failed) {
    stop()
    const ratio = chart.maxScore ? st.score / chart.maxScore : 0
    const stars = failed ? 0 : ratio >= STARS.three ? 3 : ratio >= STARS.two ? 2 : 1
    onEnd({ ...st, score: Math.round(st.score), failed, stars, ratio, total: tiles.length })
  }

  function update(now) {
    for (let i = cursor; i < tiles.length; i++) {
      const t = tiles[i]
      if (t.t > now + TIMING.early) break
      if (t.state === 'pending' && now - t.t > TIMING.good) {
        if (respectful) {
          t.state = 'missed'
          st.miss++
          st.combo = 0
        } else return lose(now, t)
      }
      if (t.state === 'holding' && now >= t.t + t.d) finishHold(t, now, false)
    }
    while (cursor < tiles.length && (tiles[cursor].state === 'hit' || tiles[cursor].state === 'missed')) cursor++

    if (respectful && now > chart.end + END_PAUSE) {
      ended = true
      finish(false)
    } else if (!respectful && cursor >= tiles.length && now > lastEnd + 0.4) {
      ended = true
      endTimer = setTimeout(() => finish(false), 700)
    }
  }

  // ---------------------------------------------------------------- input (multitouch)
  /** Where a finger landed, in canvas pixels. */
  function pointOf(e) {
    const r = canvas.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  const laneOfX = (x) => Math.min(LANES - 1, Math.max(0, Math.floor(x / laneW)))

  /** A tile's rectangle on screen at song time `now` (its bottom edge reaches the hit line at t). */
  function rectOf(t, now) {
    const bottom = hitY + (now - t.t) * speed
    return { top: bottom - (t.hold ? Math.max(tileH, t.d * speed) : tileH), bottom }
  }

  /**
   * The tile a finger meant. Generous on purpose: each tile can be touched on itself, TOUCH.padY tile-heights
   * above and below it, and TOUCH.padX of a lane into the lanes beside it. A tap anywhere in a lane also takes
   * that lane's tile while it is close to the hit line in time. If several fit, the nearest one (then the lowest) wins.
   */
  function tileAt(p, now) {
    const padY = tileH * TOUCH.padY
    const padX = laneW * TOUCH.padX
    const fingerLane = laneOfX(p.x)
    let best = null
    for (let l = 0; l < LANES; l++) {
      const left = l * laneW
      const right = left + laneW
      if (p.x < left - padX || p.x > right + padX) continue
      for (const t of lanes[l]) {
        if (t.state !== 'pending') continue
        const r = rectOf(t, now)
        if (r.bottom < -padY) break // this tile and all later ones are still above the screen
        if (r.top > H + padY) continue // already gone below the screen
        const nearLine = l === fingerLane && Math.abs(now - t.t) <= TIMING.early
        const dy = p.y < r.top ? r.top - p.y : p.y > r.bottom ? p.y - r.bottom : 0
        if (dy > padY && !nearLine) continue
        const dx = p.x < left ? left - p.x : p.x > right ? p.x - right : 0
        const dist = nearLine ? 0 : dy + dx
        if (!best || dist < best.dist || (dist === best.dist && t.t < best.t.t)) best = { t, dist }
      }
    }
    return best?.t ?? null
  }

  /** A second tap on a tile that was just played (a double tap) is not a wrong tap. */
  function onPlayedTile(p, now) {
    const padY = tileH * TOUCH.padY
    return lanes[laneOfX(p.x)].some((t) => {
      if (t.state !== 'hit' && t.state !== 'holding') return false
      const r = rectOf(t, now)
      return p.y >= r.top - padY && p.y <= r.bottom + padY
    })
  }

  function onDown(e) {
    e.preventDefault()
    if (ended) return
    const p = pointOf(e)
    if (!started) {
      // classic: tap the first tile (it waits on the line) to start the song
      const first = tiles[0]
      if (!first || (tileAt(p, first.t) !== first && laneOfX(p.x) !== first.lane)) return
      t0 = piano.now - first.t
      started = true
    }
    const now = songTime()
    const target = tileAt(p, now)
    if (target) {
      hit(target, now, e.pointerId)
      if (target.hold) {
        try {
          canvas.setPointerCapture(e.pointerId) // keep getting this finger's "up" even if it slides off
        } catch {
          /* not a real pointer (tests) */
        }
      }
    } else if (!respectful && !onPlayedTile(p, now)) {
      lose(now, null, laneOfX(p.x), p.y)
    }
  }

  function onUp(e) {
    const t = tiles.find((x) => x.state === 'holding' && x.pointer === e.pointerId)
    if (t) finishHold(t, songTime(), true)
  }

  const block = (e) => e.preventDefault()
  canvas.addEventListener('pointerdown', onDown, { passive: false })
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('contextmenu', block)
  window.addEventListener('resize', layout)

  // phone locked / app switched: pause the audio clock (the whole game follows it)
  const onVisibility = () => (document.hidden ? piano.suspend() : piano.resume())
  document.addEventListener('visibilitychange', onVisibility)

  // ---------------------------------------------------------------- drawing
  function draw(now) {
    ctx.drawImage(bg, 0, 0)
    const topTime = now + hitY / speed + 0.05
    while (drawFrom < tiles.length && hitY + (now - tiles[drawFrom].t) * speed - (tiles[drawFrom].hold ? tiles[drawFrom].d * speed : tileH) > H) drawFrom++
    for (let i = drawFrom; i < tiles.length; i++) {
      const t = tiles[i]
      if (t.t > topTime) break
      const bottom = hitY + (now - t.t) * speed
      const x = t.lane * laneW + sprites.pad
      if (t.hold) {
        const h = Math.max(tileH, t.d * speed)
        const heldTo = t.state === 'holding' ? Math.min(now, t.t + t.d) : t.heldTo
        const held = t.state === 'holding' || (t.state === 'hit' && t.heldTo > t.t) ? Math.max(0, (heldTo - t.t) * speed) : 0
        drawHold(ctx, x, bottom - h, sprites.w, h, { held, state: t.state, dpr })
      } else {
        const img = t.state === 'hit' ? sprites.hit : t.state === 'missed' ? sprites.missed : t.state === 'fail' ? sprites.fail : sprites.normal
        ctx.drawImage(img, x, bottom - tileH)
      }
      if (!started && i === 0) {
        ctx.fillStyle = C.ivory
        ctx.font = `${Math.round(tileH * 0.3)}px Lalezar, system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.direction = 'rtl'
        ctx.fillText('ابدأ', x + sprites.w / 2, bottom - tileH * 0.22)
      }
    }
    const pulse = tiles.some((t) => t.state === 'holding') ? 1 : 0
    drawHitLine(ctx, W, hitY, dpr, pulse)
    fx.draw(ctx)

    // score (and combo, in classic)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.direction = 'ltr'
    // an ivory outline keeps the numbers readable when a dark tile passes behind them
    ctx.lineJoin = 'round'
    ctx.lineWidth = 6 * dpr
    ctx.strokeStyle = C.ivory
    ctx.fillStyle = C.indigo
    ctx.font = `${Math.round(34 * dpr)}px Lalezar, system-ui, sans-serif`
    ctx.strokeText(String(Math.round(st.score)), W / 2, 18 * dpr)
    ctx.fillText(String(Math.round(st.score)), W / 2, 18 * dpr)
    if (!respectful && st.combo >= 2) {
      ctx.fillStyle = C.kumkum
      ctx.font = `${Math.round(20 * dpr)}px Lalezar, system-ui, sans-serif`
      ctx.strokeText(`×${st.combo}`, W / 2, 58 * dpr)
      ctx.fillText(`×${st.combo}`, W / 2, 58 * dpr)
    }
    if (judgeText) {
      const age = (performance.now() - judgeText.at) / 1000
      if (age > 0.6) judgeText = null
      else {
        const s = 1 + 0.25 * Math.max(0, 1 - age * 6)
        ctx.save()
        ctx.globalAlpha = Math.min(1, (0.6 - age) * 4)
        ctx.translate(W / 2, hitY - tileH * 1.6)
        ctx.scale(s, s)
        ctx.direction = 'rtl'
        ctx.textBaseline = 'middle'
        ctx.font = `${Math.round(30 * dpr)}px Lalezar, system-ui, sans-serif`
        ctx.lineWidth = 6 * dpr
        ctx.strokeStyle = C.ivory
        ctx.strokeText(judgeText.text, 0, 0)
        ctx.fillStyle = judgeText.color
        ctx.fillText(judgeText.text, 0, 0)
        ctx.restore()
      }
    }
  }

  function frame() {
    raf = nextFrame(frame)
    const ms = performance.now()
    const dt = Math.min(0.05, (ms - lastMs) / 1000)
    lastMs = ms
    const now = songTime()
    if (!ended) update(now)
    schedule()
    fx.update(dt)
    draw(now)
  }
  frame()

  // ---------------------------------------------------------------- leaving
  let stopped = false
  function stop() {
    if (stopped) return
    stopped = true
    cancelFrame(raf)
    clearInterval(scheduler)
    clearTimeout(endTimer)
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointercancel', onUp)
    canvas.removeEventListener('contextmenu', block)
    window.removeEventListener('resize', layout)
    document.removeEventListener('visibilitychange', onVisibility)
  }

  return {
    /** Leave the song now (back button): silence everything. */
    stop() {
      ended = true
      for (const v of voices) v.stop(piano.now + 0.05)
      stop()
    },
  }
}

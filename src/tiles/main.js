import './tiles.css'
import arabicFontUrl from '@fontsource/lalezar/files/lalezar-arabic-400-normal.woff2?url'
import latinFontUrl from '@fontsource/lalezar/files/lalezar-latin-400-normal.woff2?url'
import { Piano } from './audio.js'
import { buildChart, loadSongs, pitchesOf } from './songs.js'
import { playSong } from './game.js'
import { drawMandala } from './art.js'
import { getBest, getSetting, saveBest, setSetting } from './storage.js'

/*
 * Raga Tiles, the phone page (/tiles). Everything is loaded here, once, behind the loading bar:
 * code (this small bundle), the headline font, every song, and the synthesized piano.
 * After that the game never touches the network (no server calls, no sockets), so any number of
 * phones can play at the same time and a dropped Wi-Fi changes nothing.
 */

const ui = document.getElementById('ui')
const stage = document.getElementById('stage')
const piano = new Piano()
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

let songs = []
let difficulty = getSetting('difficulty', 'normal')
let game = null

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const stars = (n) => `<span class="stars" aria-label="${n} من 3">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}">★</i>`).join('')}</span>`
const soundHint = `<p class="hint">${isIOS ? 'لا يوجد صوت؟ أطفئ الوضع الصامت 🔔 (المفتاح على جانب الآيفون)' : 'لا يوجد صوت؟ ارفع صوت الهاتف 🔊'}</p>`
const title = (song) => esc(song.titleAr || song.title)

function show(html) {
  document.body.classList.remove('playing')
  ui.innerHTML = html
}

// ---------------------------------------------------------------- background rangoli for the menus
function drawDeco() {
  const cv = document.getElementById('deco')
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  cv.width = Math.round(innerWidth * dpr)
  cv.height = Math.round(innerHeight * dpr)
  const ctx = cv.getContext('2d')
  const m = Math.min(cv.width, cv.height)
  drawMandala(ctx, cv.width * 0.92, cv.height * 0.04, m * 0.55, { alpha: 0.5 })
  drawMandala(ctx, cv.width * 0.05, cv.height * 1.0, m * 0.62, { alpha: 0.4 })
}

// ---------------------------------------------------------------- loading
function showLoading(p) {
  const bar = ui.querySelector('.bar i')
  if (bar) bar.style.width = `${Math.round(p * 100)}%`
  else
    show(`<section class="screen">
      <div class="logo"><h1>راغا تايلز</h1><p dir="ltr">Raga Tiles 🎹</p></div>
      <div class="bar" role="progressbar" aria-label="التحميل"><i style="width:${Math.round(p * 100)}%"></i></div>
      <p class="small">جارٍ تحميل اللعبة…</p>
    </section>`)
}

async function loadFonts() {
  const faces = [
    new FontFace('Lalezar', `url(${arabicFontUrl}) format("woff2")`, { unicodeRange: 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFC, U+200C-200F' }),
    new FontFace('Lalezar', `url(${latinFontUrl}) format("woff2")`, { unicodeRange: 'U+0000-00FF, U+2000-206F, U+00D7' }),
  ]
  await Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff)).catch(() => {})))
}

async function boot() {
  drawDeco()
  addEventListener('resize', drawDeco)
  const parts = { font: 0, songs: 0, piano: 0 }
  const report = () => showLoading(parts.font * 0.15 + parts.songs * 0.25 + parts.piano * 0.6)
  report()
  try {
    const fonts = loadFonts().then(() => {
      parts.font = 1
      report()
    })
    songs = await loadSongs((p) => {
      parts.songs = p
      report()
    })
    await piano.prepare(pitchesOf(songs), (p) => {
      parts.piano = p
      report()
    })
    await fonts
    showLoading(1)
    setTimeout(showStart, 250)
  } catch (e) {
    console.warn('[tiles] loading failed', e)
    show(`<section class="screen">
      <div class="logo"><h1>راغا تايلز</h1></div>
      <p class="lead">تعذّر تحميل اللعبة. تأكد أنك متصل بشبكة الواي فاي الخاصة بالجناح.</p>
      <button class="primary" data-act="retry">حاول مرة أخرى</button>
    </section>`)
    ui.querySelector('[data-act=retry]').onclick = () => location.reload()
  }
}

// ---------------------------------------------------------------- "tap to start": unlocks sound
function showStart() {
  show(`<button class="screen tap" data-act="start">
    <div class="logo"><h1>راغا تايلز</h1><p dir="ltr">Raga Tiles 🎹</p></div>
    <span class="primary big">اضغط للبدء</span>
    ${soundHint}
  </button>`)
  ui.querySelector('[data-act=start]').addEventListener(
    'pointerup',
    async () => {
      await piano.unlock()
      document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {})
      showSongs()
    },
    { once: true },
  )
}

// ---------------------------------------------------------------- song select
function showSongs() {
  const list = songs
    .map((s, i) => {
      const best = getBest(s.id, difficulty)
      const respectful = s.mode === 'respectful'
      return `<li><button class="song ${respectful ? 'calm' : ''}" data-song="${i}">
        <span class="song-title">${title(s)}</span>
        ${s.titleAr && s.title ? `<span class="song-latin" dir="ltr">${esc(s.title)}</span>` : ''}
        <span class="song-mode">${respectful ? 'هادئ: يُعزف اللحن كاملاً دون توقف' : 'كلاسيكي: لا تفوّت أي بلاطة!'}</span>
        <span class="song-best">${best ? `أفضل نتيجة: <b>${best.score}</b>${respectful ? '' : ` ${stars(best.stars)}`}` : 'لم تلعبها بعد'}</span>
      </button></li>`
    })
    .join('')
  show(`<section class="screen menu">
    <div class="logo small-logo"><h1>راغا تايلز</h1></div>
    <div class="segmented" role="radiogroup" aria-label="المستوى">
      <button role="radio" aria-checked="${difficulty === 'easy'}" data-diff="easy">سهل</button>
      <button role="radio" aria-checked="${difficulty === 'normal'}" data-diff="normal">عادي</button>
    </div>
    <ul class="songs">${list}</ul>
    ${soundHint}
  </section>`)
  ui.querySelectorAll('[data-diff]').forEach((b) =>
    b.addEventListener('click', () => {
      difficulty = b.dataset.diff
      setSetting('difficulty', difficulty)
      showSongs()
    }),
  )
  ui.querySelectorAll('[data-song]').forEach((b) =>
    b.addEventListener('click', () => {
      const song = songs[Number(b.dataset.song)]
      if (song.mode === 'respectful') showCalmIntro(song)
      else startSong(song)
    }),
  )
}

// ---------------------------------------------------------------- respectful songs: a calm screen first
function showCalmIntro(song) {
  show(`<section class="screen calm-screen">
    ${song.titleNative ? `<p class="native" lang="hi">${esc(song.titleNative)}</p>` : ''}
    <h1 class="calm-title">${title(song)}</h1>
    ${song.titleAr && song.title ? `<p class="song-latin" dir="ltr">${esc(song.title)}</p>` : ''}
    ${song.about ? `<p class="lead">${esc(song.about)}</p>` : ''}
    <p class="small">يُعزف اللحن كاملاً دون توقف. المس البلاطات وأنت تستمع.</p>
    <button class="primary" data-act="go">ابدأ</button>
    <button class="link" data-act="back">رجوع</button>
  </section>`)
  ui.querySelector('[data-act=go]').onclick = () => startSong(song)
  ui.querySelector('[data-act=back]').onclick = showSongs
}

// ---------------------------------------------------------------- playing
function startSong(song) {
  const respectful = song.mode === 'respectful'
  document.body.classList.add('playing')
  ui.innerHTML = `<button class="quit ${respectful ? 'calm' : ''}" data-act="quit" aria-label="خروج">${respectful ? 'إنهاء' : '✕'}</button>`
  const chart = buildChart(song, difficulty)
  game = playSong({
    canvas: stage,
    song,
    chart,
    difficulty,
    piano,
    onEnd: (result) => {
      game = null
      showResult(song, result)
    },
  })
  ui.querySelector('[data-act=quit]').onclick = () => {
    game?.stop()
    game = null
    showSongs()
  }
}

// ---------------------------------------------------------------- results
function showResult(song, r) {
  const respectful = song.mode === 'respectful'
  const isNew = saveBest(song.id, difficulty, r.score, r.stars)
  const best = getBest(song.id, difficulty)
  if (respectful) {
    show(`<section class="screen calm-screen">
      <h1 class="calm-title">شكرًا لك</h1>
      <p class="lead">${title(song)}</p>
      <p class="score">${r.score}</p>
      <p class="small">أفضل نتيجة: ${best?.score ?? r.score}</p>
      <button class="primary" data-act="songs">العودة إلى الأغاني</button>
    </section>`)
  } else if (r.failed) {
    show(`<section class="screen">
      <h1>انتهت الجولة</h1>
      <p class="lead">${title(song)}</p>
      <p class="score">${r.score}</p>
      <p class="small">أفضل نتيجة: ${best?.score ?? r.score}</p>
      <button class="primary" data-act="again">حاول مرة أخرى</button>
      <button class="link" data-act="songs">أغنية أخرى</button>
    </section>`)
  } else {
    show(`<section class="screen">
      <h1>أحسنت!</h1>
      ${stars(r.stars)}
      <p class="score">${r.score}</p>
      ${isNew ? '<p class="badge">نتيجة جديدة! 🎉</p>' : `<p class="small">أفضل نتيجة: ${best?.score ?? r.score}</p>`}
      <p class="small">ممتاز ${r.perfect} · جيد ${r.good} · أطول سلسلة ${r.maxCombo}</p>
      <button class="primary" data-act="again">مرة أخرى</button>
      <button class="link" data-act="songs">أغنية أخرى</button>
    </section>`)
  }
  ui.querySelector('[data-act=again]')?.addEventListener('click', () => startSong(song))
  ui.querySelector('[data-act=songs]')?.addEventListener('click', showSongs)
}

// no zoom, no long-press menu, no double-tap zoom anywhere
for (const type of ['gesturestart', 'dblclick', 'contextmenu']) document.addEventListener(type, (e) => e.preventDefault(), { passive: false })
// (the song list may scroll, nothing else)
document.addEventListener('touchmove', (e) => !e.target.closest?.('.songs') && e.preventDefault(), { passive: false })

boot()

import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import Board from './Board.jsx'
import { isMuted, play, setMuted, unlockSound } from './sound.js'
import { flushScores, hasPending, submitScore } from './scores.js'
import { cleanNickname, NICK_MAX } from '../../shared/nicknames.js'
import { PIECE_CREDIT } from '../chess-shared/pieces.js'

const LEVELS = 15
const LIVES = 3
const NICK_KEY = 'chess-ladder:nickname'
// testing only (in development, or with ?test in the address): A plays the right move (such runs are never
// submitted), W plays a wrong one (to test losing lives)
const CAN_AUTOSOLVE = import.meta.env.DEV || new URLSearchParams(location.search).has('test')

const fmtTime = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const mateText = (n) => (n === 1 ? 'كش مات في نقلة واحدة' : n === 2 ? 'كش مات في نقلتين' : `كش مات في ${n} نقلات`)
const depthOf = (node) => (node ? 1 + Math.max(0, ...Object.values(node).map((v) => (v ? depthOf(v.next) : 0))) : 0)
const firstMove = (node) => Object.keys(node).find((k) => node[k] === null) ?? Object.keys(node)[0]
const readNick = () => {
  try {
    return localStorage.getItem(NICK_KEY) || ''
  } catch {
    return ''
  }
}

export default function App() {
  const [byLevel, setByLevel] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [screen, setScreen] = useState('loading') // loading | start | play | end
  const [nickname, setNickname] = useState(readNick)
  const [run, setRun] = useState(null) // { picks, index, lives, start, end, autoSolved, nickname }
  const [version, setVersion] = useState(0)
  const [lastMove, setLastMove] = useState(null)
  const [animate, setAnimate] = useState(null)
  const [busy, setBusy] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  const [msg, setMsg] = useState(null)
  const [overlay, setOverlay] = useState(null) // { type: 'level' | 'fact' | 'solution', … }
  const [, setTick] = useState(0)
  const [muted, setMutedState] = useState(isMuted)
  const [sent, setSent] = useState(null) // true | false (waiting to send) after a run
  const chess = useRef(new Chess())
  const node = useRef(null)
  const runRef = useRef(null)
  runRef.current = run

  // ---------------------------------------------------------------- load everything once (works offline afterwards)
  useEffect(() => {
    fetch('/puzzles/puzzles.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((data) => {
        const levels = Array.from({ length: LEVELS }, (_, i) => data.puzzles.filter((p) => p.level === i + 1))
        setByLevel(levels)
        setScreen('start')
      })
      .catch(() => setLoadError(true))
    flushScores() // anything left from an earlier offline run
    const retry = setInterval(() => hasPending() && flushScores(), 20000)
    window.addEventListener('online', flushScores)
    return () => {
      clearInterval(retry)
      window.removeEventListener('online', flushScores)
    }
  }, [])

  // run timer
  useEffect(() => {
    if (screen !== 'play') return
    const t = setInterval(() => setTick((n) => n + 1), 250)
    return () => clearInterval(t)
  }, [screen])

  const puzzle = run?.picks[run.index]

  // ---------------------------------------------------------------- run flow
  const showPuzzle = useCallback((r, index) => {
    const p = r.picks[index]
    chess.current.load(p.fen)
    node.current = p.tree
    setLastMove(null)
    setAnimate(null)
    setMsg(null)
    setOverlay(null)
    setBusy(false)
    setVersion((v) => v + 1)
  }, [])

  const start = (asGuest) => {
    unlockSound()
    let name = null
    if (!asGuest) {
      name = cleanNickname(nickname)
      if (!name) {
        setMsg({ kind: 'wrong', text: nickname.trim() ? 'اختر اسمًا آخر من فضلك' : 'اكتب اسمًا أو العب كضيف' })
        return
      }
      try {
        localStorage.setItem(NICK_KEY, name)
      } catch {
        /* not remembered */
      }
    }
    const picks = byLevel.map((pool) => pool[Math.floor(Math.random() * pool.length)]).filter(Boolean)
    const r = { picks, index: 0, lives: LIVES, start: performance.now(), end: null, autoSolved: false, nickname: name }
    setRun(r)
    setSent(null)
    setScreen('play')
    showPuzzle(r, 0)
  }

  const finish = useCallback((r, all) => {
    const end = performance.now()
    const level = all ? r.picks.length : r.index // levels completed
    const done = { ...r, end, level, grandmaster: all }
    setRun(done)
    setOverlay(null)
    setScreen('end')
    if (!r.autoSolved) {
      submitScore({ nickname: r.nickname, level, time: Math.round((end - r.start) / 1000) }).then(setSent)
    }
  }, [])

  const nextLevel = useCallback(() => {
    const r = runRef.current
    if (r.index + 1 >= r.picks.length) return finish(r, true)
    const n = { ...r, index: r.index + 1 }
    setRun(n)
    showPuzzle(n, n.index)
  }, [finish, showPuzzle])

  const solved = useCallback(() => {
    const r = runRef.current
    play('correct')
    setBusy(true)
    setMsg({ kind: 'good', text: 'كش مات! 🎉' })
    const p = r.picks[r.index]
    setTimeout(() => {
      play('level')
      if (p.source) setOverlay({ type: 'fact', level: r.index + 1, source: p.source })
      else {
        setOverlay({ type: 'level', level: r.index + 1 })
        setTimeout(nextLevel, 950)
      }
    }, 650)
  }, [nextLevel])

  /** Out of lives: play the rest of the solution, then the end screen. */
  const showSolution = useCallback(() => {
    setBusy(true)
    setOverlay({ type: 'solution' })
    const steps = []
    let n = node.current
    while (n) {
      const m = firstMove(n)
      steps.push(m)
      if (!n[m]) break
      steps.push(n[m].reply)
      n = n[m].next
    }
    steps.forEach((m, i) =>
      setTimeout(() => {
        const mv = chess.current.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] })
        setAnimate({ from: mv.from, to: mv.to, id: Math.random() })
        setLastMove({ from: mv.from, to: mv.to })
        setVersion((v) => v + 1)
        play('move')
      }, 700 + i * 900),
    )
    setTimeout(() => finish(runRef.current, false), 700 + steps.length * 900 + 1400)
  }, [finish])

  const onMove = useCallback(
    (uci, auto = false) => {
      if (busy || !node.current) return
      const here = node.current
      if (uci in here) {
        const mv = chess.current.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
        setLastMove({ from: mv.from, to: mv.to })
        setAnimate(auto ? { from: mv.from, to: mv.to, id: Math.random() } : null)
        setVersion((v) => v + 1)
        play('move')
        setMsg(null)
        const next = here[uci]
        if (next === null) return solved()
        // the opponent answers by itself
        setBusy(true)
        setTimeout(() => {
          const reply = chess.current.move({ from: next.reply.slice(0, 2), to: next.reply.slice(2, 4), promotion: next.reply[4] })
          setAnimate({ from: reply.from, to: reply.to, id: Math.random() })
          setLastMove({ from: reply.from, to: reply.to })
          setVersion((v) => v + 1)
          play('move')
          node.current = next.next
          setBusy(false)
          setMsg({ kind: 'info', text: `أحسنت! أكمل: ${mateText(depthOf(next.next))}` })
        }, 600)
        return
      }
      // a legal move, but not one that forces mate
      play('wrong')
      setShakeKey((k) => k + 1)
      const r = runRef.current
      const lives = r.lives - 1
      setRun({ ...r, lives })
      if (lives <= 0) {
        setMsg({ kind: 'wrong', text: 'انتهت المحاولات. هذا هو الحل:' })
        play('lost')
        showSolution()
      } else setMsg({ kind: 'wrong', text: `ليست هذه النقلة. حاول مرة أخرى (بقي ${lives === 1 ? 'محاولة واحدة' : 'محاولتان'})` })
    },
    [busy, solved, showSolution],
  )

  // keys: Esc leaves; A auto-solves when testing
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') location.href = '/chess'
      if (!CAN_AUTOSOLVE || screen !== 'play' || busy || !node.current) return
      if (e.key === 'a' || e.key === 'A') {
        setRun((r) => ({ ...r, autoSolved: true }))
        runRef.current = { ...runRef.current, autoSolved: true }
        onMove(firstMove(node.current), true)
      } else if (e.key === 'w' || e.key === 'W') {
        const wrong = chess.current.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? '')).find((u) => !(u in node.current))
        if (wrong) onMove(wrong)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, busy, onMove])

  // the end screen goes back to the start by itself after a while (a laptop left alone at the booth)
  useEffect(() => {
    if (screen !== 'end') return
    const t = setTimeout(() => setScreen('start'), 90000)
    return () => clearTimeout(t)
  }, [screen])

  const toggleMute = () => {
    setMuted(!muted)
    setMutedState(!muted)
    unlockSound()
  }

  // ---------------------------------------------------------------- screens
  if (screen === 'loading')
    return (
      <Shell>
        <div className="grid flex-1 place-items-center text-center">
          {loadError ? (
            <div>
              <p className="text-2xl font-bold">تعذّر تحميل الألغاز</p>
              <p className="mt-2 text-white/70">تأكد أنك متصل بشبكة الواي فاي الخاصة بالجناح.</p>
              <button className="btn-primary mt-6" onClick={() => location.reload()}>
                حاول مرة أخرى
              </button>
            </div>
          ) : (
            <p className="animate-pulse text-3xl">♟️</p>
          )}
        </div>
      </Shell>
    )

  if (screen === 'start')
    return (
      <Shell muted={muted} onMute={toggleMute}>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-5 text-center">
          <p className="text-6xl">♟️</p>
          <h1 className="font-display text-[clamp(2.4rem,9vw,3.6rem)] leading-tight">تحدّي ألغاز الشطرنج</h1>
          <p className="text-lg leading-relaxed text-white/85">
            15 مستوى، من كش مات في نقلة واحدة حتى كش مات في 3 نقلات.
            <br />
            لديك 3 محاولات: ♟️♟️♟️
          </p>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              start(false)
            }}
          >
            <input
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value.slice(0, NICK_MAX))
                setMsg(null)
              }}
              maxLength={NICK_MAX}
              placeholder="اسمك (حتى 12 حرفًا)"
              className="rounded-2xl border-2 border-white/25 bg-white/10 px-5 py-4 text-center text-2xl text-white placeholder:text-white/50 focus:border-saffron focus:outline-none"
              autoComplete="off"
              enterKeyHint="go"
            />
            {msg && <p className="font-bold text-[#ffb3a1]">{msg.text}</p>}
            <button type="submit" className="btn-primary">
              ابدأ التحدّي
            </button>
            <button type="button" className="text-lg text-white/80 underline underline-offset-4" onClick={() => start(true)}>
              العب كضيف
            </button>
          </form>
        </div>
      </Shell>
    )

  if (screen === 'end') {
    const total = run.end - run.start
    const starCount = run.level >= 15 ? 3 : run.level >= 10 ? 2 : run.level >= 5 ? 1 : 0
    return (
      <Shell muted={muted} onMute={toggleMute}>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
          {run.grandmaster ? (
            <>
              <Confetti />
              <p className="pop text-7xl">🏆</p>
              <h1 className="font-display text-[clamp(2.6rem,10vw,4rem)] text-saffron">غراندماستر!</h1>
              <p className="text-xl">حللت المستويات الخمسة عشر كلها!</p>
            </>
          ) : (
            <>
              <h1 className="font-display text-[clamp(2.2rem,8vw,3.2rem)]">انتهت المحاولات</h1>
              <p className="text-xl">
                وصلت إلى <b className="text-saffron">المستوى {Math.min(run.index + 1, 15)}</b>
              </p>
            </>
          )}
          <p className="text-5xl tracking-widest text-saffron">{'★'.repeat(starCount)}<span className="text-white/20">{'★'.repeat(3 - starCount)}</span></p>
          <div className="grid w-full grid-cols-2 gap-3">
            <Stat label="المستويات المكتملة" value={`${run.level} / 15`} />
            <Stat label="الوقت" value={fmtTime(total)} />
          </div>
          {!run.autoSolved && (
            <p className="text-sm text-white/70">{sent === null ? 'جارٍ إرسال نتيجتك…' : sent ? 'أُرسلت نتيجتك إلى لوحة الصدارة ✓' : 'ستُرسل نتيجتك عندما يعود الاتصال'}</p>
          )}
          <button className="btn-primary w-full" onClick={() => start(!run.nickname)}>
            العب مرة أخرى
          </button>
          <a href="/chess" className="text-lg text-white/80 underline underline-offset-4">
            العودة إلى صفحة الشطرنج
          </a>
        </div>
      </Shell>
    )
  }

  // play
  const toMove = puzzle.toMove
  const remaining = depthOf(node.current)
  const elapsed = performance.now() - run.start
  return (
    <Shell muted={muted} onMute={toggleMute}>
      <header className="mx-auto w-full max-w-[1400px] px-4 pt-2">
        <div className="flex items-center justify-between gap-3 text-lg">
          <span className="font-display text-2xl">
            المستوى {run.index + 1} <span className="text-white/60">/ 15</span>
          </span>
          <span className="text-2xl tracking-wider" aria-label={`${run.lives} محاولات`}>
            {Array.from({ length: LIVES }, (_, i) => (
              <span key={i} className={i < run.lives ? '' : 'opacity-20 grayscale'}>
                ♟️
              </span>
            ))}
          </span>
          <span className="font-mono text-xl tabular-nums" dir="ltr">
            {fmtTime(elapsed)}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-gradient-to-l from-saffron to-[#ffcf7a] transition-[width] duration-500" style={{ width: `${(run.index / 15) * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center justify-center gap-4 px-3 pb-3 lg:flex-row lg:items-center lg:gap-10">
        <div className="relative w-[min(94vw,calc(100dvh-235px))] shrink-0 lg:w-[min(60vw,calc(100dvh-140px))]">
          <Board
            chess={chess.current}
            version={version}
            orientation={puzzle.toMove}
            interactive={!busy}
            onMove={onMove}
            lastMove={lastMove}
            animate={animate}
            shakeKey={shakeKey}
          />
          {overlay?.type === 'level' && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <p className="pop rounded-3xl bg-green px-8 py-4 font-display text-4xl text-white shadow-2xl">المستوى {overlay.level} ✓</p>
            </div>
          )}
        </div>

        <aside className="w-full max-w-md text-center lg:max-w-sm lg:text-start">
          <p className="font-display text-[clamp(1.4rem,5vw,2rem)] leading-snug">
            <span className={`me-2 inline-block h-5 w-5 translate-y-0.5 rounded-full border-2 border-white/60 ${toMove === 'w' ? 'bg-white' : 'bg-black'}`} />
            {toMove === 'w' ? 'الأبيض يلعب' : 'الأسود يلعب'}: جِد {mateText(remaining || 1)}
          </p>
          <p className={`mt-2 min-h-[1.75rem] text-lg font-bold ${msg?.kind === 'wrong' ? 'text-[#ffb3a1]' : msg?.kind === 'good' ? 'text-[#9be38f]' : 'text-white/80'}`}>{msg?.text ?? 'اضغط على قطعة ثم على المربع، أو اسحبها.'}</p>
          {overlay?.type === 'fact' && (
            <div className="pop mt-4 rounded-3xl bg-cream p-5 text-start text-ink shadow-xl">
              <p className="font-display text-xl text-saffron-deep">هل تعلم؟</p>
              <p className="mt-1 text-lg leading-relaxed">
                هذا اللغز من مباراة حقيقية لـ<b>{overlay.source.player}</b>
                {overlay.source.event ? ` في ${overlay.source.event}` : ''}
                {overlay.source.year ? ` (${overlay.source.year})` : ''}.
              </p>
              {overlay.source.note && <p className="mt-1 text-base text-ink/75">{overlay.source.note}</p>}
              <button className="btn-primary mt-4 w-full" onClick={nextLevel}>
                المستوى التالي
              </button>
            </div>
          )}
        </aside>
      </main>
    </Shell>
  )
}

function Shell({ children, muted, onMute }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(circle_at_50%_-20%,#1d2a9a_0%,#000080_45%,#05053d_100%)] text-white">
      <div className="tricolor h-1.5 shrink-0" />
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <a href="/chess" className="rounded-full bg-white/10 px-4 py-2 font-bold hover:bg-white/20">
          ✕ خروج
        </a>
        {onMute && (
          <button onClick={onMute} className="rounded-full bg-white/10 px-4 py-2 font-bold hover:bg-white/20" aria-pressed={muted}>
            {muted ? '🔇 الصوت مغلق' : '🔊 الصوت'}
          </button>
        )}
      </div>
      {children}
      <p className="px-3 pb-2 text-center text-[10px] text-white/40" dir="ltr">
        {PIECE_CREDIT}
      </p>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-sm text-white/70">{label}</p>
      <p className="font-display text-3xl" dir="ltr">
        {value}
      </p>
    </div>
  )
}

function Confetti() {
  const colors = ['#ff9933', '#ffffff', '#138808', '#ffb000']
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 40 }, (_, i) => (
        <span
          key={i}
          className="confetti absolute top-[-5%] block h-3 w-2 rounded-sm"
          style={{ left: `${(i * 37) % 100}%`, background: colors[i % 4], animationDelay: `${(i % 10) * 0.18}s`, animationDuration: `${2.6 + (i % 5) * 0.4}s` }}
        />
      ))}
    </div>
  )
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import { CHARACTER_IDS, DEFAULT_PICKS, EV } from '../../shared/protocol.js'
import { connectSocket, getConnectionInfo, measurePing } from '../game/net/socket.js'
import { createInputBus, NetworkInputSource } from '../game/input/NetworkInputSource.js'
import { CombinedInputSource } from '../game/input/InputSource.js'
import { KEYMAPS, KeyboardInputSource } from '../game/input/KeyboardInputSource.js'
import { CHARACTERS, SLOT_LABEL_AR } from '../game/football/characters/index.js'
import { headDataUrl } from '../game/football/characters/art.js'
import { getTodayRecords, recordMatch } from '../game/football/records.js'
import { sfx } from '../game/sfx.js'
import FootballLobby from '../components/football/FootballLobby.jsx'
import FootballStage from '../components/football/FootballStage.jsx'
import QrCode from '../components/football/QrCode.jsx'

const RESULT_TIMEOUT_S = 15

/**
 * "Big Head Football" on the laptop: lobby → match → result.
 * The page owns the socket and turns phone input into InputSources; the game itself
 * (FootballStage / Phaser) only ever sees InputSources.
 */
export default function FootballPage() {
  const bus = useMemo(() => createInputBus(), [])
  const socketRef = useRef(null)
  const [room, setRoom] = useState(null)
  const [serverOk, setServerOk] = useState(null)
  const [info, setInfo] = useState(null)
  const [phase, setPhase] = useState('lobby') // lobby | playing | paused | result
  const [match, setMatch] = useState(null) // { id, sources, characters }
  const [score, setScore] = useState({ p1: 0, p2: 0 })
  const [result, setResult] = useState(null) // { winner, score, records }
  const [pausedSlot, setPausedSlot] = useState(null)
  const [resumeIn, setResumeIn] = useState(0)
  const [showPing, setShowPing] = useState(false)
  const [screenPing, setScreenPing] = useState(null)
  const [muted, setMuted] = useState(sfx.isMuted())
  const [records, setRecords] = useState(getTodayRecords)
  const phaseRef = useRef(phase)
  const pausedSlotRef = useRef(pausedSlot)
  const roomRef = useRef(room)
  useLayoutEffect(() => {
    phaseRef.current = phase
    pausedSlotRef.current = pausedSlot
    roomRef.current = room
  })
  const resultShownAt = useRef(0)

  const controllerUrl = info ? `http://${info.ip}:${window.location.port || 80}/controller` : null

  // ------------------------------------------------------------ socket
  useEffect(() => {
    getConnectionInfo().then((i) => {
      setInfo(i)
      setServerOk(!!i)
    })
    const socket = connectSocket()
    socketRef.current = socket
    socket.on('connect', () => {
      setServerOk(true)
      socket.emit(EV.SCREEN_JOIN, (state) => setRoom(state))
      socket.emit(EV.SCREEN_STATE, { phase: phaseRef.current })
    })
    socket.on('connect_error', () => setServerOk(false))
    socket.on(EV.ROOM_UPDATE, setRoom)
    socket.on(EV.INPUT, (msg) => bus.emit(msg))
    socket.on(EV.PLAYER_DISCONNECTED, ({ slot }) => {
      if (phaseRef.current === 'playing') {
        setPausedSlot(slot)
        setPhase('paused')
      }
    })
    socket.on(EV.PLAYER_CONNECTED, ({ slot }) => {
      if (phaseRef.current === 'paused' && pausedSlotRef.current === slot) setResumeIn(3)
    })
    return () => {
      socket.emit(EV.SCREEN_STATE, { phase: 'lobby' })
      socket.disconnect()
    }
  }, [bus])

  // tell the server (and through it the phones) the phase and score
  useEffect(() => {
    socketRef.current?.emit(EV.SCREEN_STATE, { phase, score })
  }, [phase, score])

  // ------------------------------------------------------------ match lifecycle
  const startMatch = useCallback(() => {
    const slots = roomRef.current?.slots ?? {}
    const source = (slot) => new CombinedInputSource([new NetworkInputSource(bus, slot), new KeyboardInputSource(KEYMAPS[slot])])
    // Step (b): P2 is played on the keyboard (arrow keys) when no phone has joined. The CPU comes next.
    const sources = { p1: source('p1'), p2: source('p2') }
    const characters = {
      p1: CHARACTERS[slots.p1?.character ?? DEFAULT_PICKS.p1],
      p2: CHARACTERS[slots.p2?.character ?? DEFAULT_PICKS.p2],
    }
    setResult(null)
    setPausedSlot(null)
    setScore({ p1: 0, p2: 0 })
    setMatch({ id: Date.now(), sources, characters })
    setPhase('playing')
  }, [bus])

  useEffect(() => {
    if (!match) return
    return () => Object.values(match.sources).forEach((s) => s.destroy())
  }, [match])

  const backToLobby = useCallback(() => {
    setMatch(null)
    setResult(null)
    setPhase('lobby')
    setRecords(getTodayRecords())
  }, [])

  const buzz = useCallback((slot, pattern) => socketRef.current?.emit(EV.SCREEN_BUZZ, { slot, pattern }), [])

  const onGameEvent = useCallback(
    (ev) => {
      if (ev.type === 'goal') {
        setScore(ev.score)
        const other = ev.scorer === 'p1' ? 'p2' : 'p1'
        buzz(ev.scorer, [80, 60, 80, 60, 160])
        buzz(other, [220])
      }
      if (ev.type === 'matchEnd') {
        resultShownAt.current = performance.now()
        const names = { p1: match?.characters.p1.nameAr, p2: match?.characters.p2.nameAr }
        const broken = recordMatch({ score: ev.score, winnerName: ev.winner ? names[ev.winner] : null, names })
        setResult({ winner: ev.winner, score: ev.score, broken })
        setScore(ev.score)
        setTimeout(() => setPhase((p) => (p === 'playing' ? 'result' : p)), 1600) // let the final whistle play
      }
    },
    [buzz, match],
  )

  // KICK (phone or keyboard) starts / restarts; in the lobby ◀ ▶ / A D / ← → change characters of non-phone players
  useEffect(() => {
    const tryStart = () => {
      const ph = phaseRef.current
      if (ph === 'lobby') startMatch()
      else if (ph === 'result' && performance.now() - resultShownAt.current > 2800) startMatch()
    }
    const cyclePick = (slot, dir) => {
      const r = roomRef.current
      if (phaseRef.current !== 'lobby' || r?.slots?.[slot]?.type === 'human') return
      const cur = r?.slots?.[slot]?.character ?? DEFAULT_PICKS[slot]
      const other = r?.slots?.[slot === 'p1' ? 'p2' : 'p1']?.character
      let i = CHARACTER_IDS.indexOf(cur)
      do i = (i + dir + CHARACTER_IDS.length) % CHARACTER_IDS.length
      while (CHARACTER_IDS[i] === other)
      socketRef.current?.emit(EV.SCREEN_PICK, { slot, characterId: CHARACTER_IDS[i] })
    }
    const off = bus.on((msg) => msg.pressed && msg.button === 'kick' && tryStart())
    const onKey = (e) => {
      if (e.repeat) return
      if (e.code === 'KeyP') setShowPing((v) => !v)
      else if (e.code === 'KeyM') setMuted(sfx.toggle())
      else if (e.code === 'KeyS' || e.code === 'ArrowDown') tryStart()
      else if (e.code === 'KeyA' || e.code === 'KeyD') cyclePick('p1', e.code === 'KeyD' ? 1 : -1)
      else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') cyclePick('p2', e.code === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      off()
      window.removeEventListener('keydown', onKey)
    }
  }, [bus, startMatch])

  // result → lobby after 15 s
  const [resultLeft, setResultLeft] = useState(RESULT_TIMEOUT_S)
  useEffect(() => {
    if (phase !== 'result') return
    setResultLeft(RESULT_TIMEOUT_S)
    const t = setInterval(() => setResultLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [phase])
  useEffect(() => {
    if (phase === 'result' && resultLeft <= 0) backToLobby()
  }, [phase, resultLeft, backToLobby])

  // paused → player came back → 3-2-1 → play
  useEffect(() => {
    if (resumeIn <= 0) return
    sfx.play('beep')
    const t = setTimeout(() => {
      if (resumeIn === 1) {
        setPausedSlot(null)
        setPhase('playing')
      }
      setResumeIn((n) => n - 1)
    }, 800)
    return () => clearTimeout(t)
  }, [resumeIn])

  useEffect(() => {
    if (phase === 'paused') Object.values(match?.sources ?? {}).forEach((s) => s.releaseAll())
  }, [phase, match])

  useEffect(() => {
    if (!showPing) return
    const t = setInterval(async () => socketRef.current && setScreenPing(await measurePing(socketRef.current)), 1500)
    return () => clearInterval(t)
  }, [showPing])

  return (
    <div className="relative h-full">
      {phase === 'lobby' || !match ? (
        <FootballLobby
          controllerUrl={controllerUrl}
          room={room}
          serverOk={serverOk}
          records={records}
          showPing={showPing}
          screenPing={screenPing}
        />
      ) : (
        <FootballStage key={match.id} characters={match.characters} sources={match.sources} paused={phase !== 'playing'} onEvent={onGameEvent} />
      )}

      <button
        onClick={() => setMuted(sfx.toggle())}
        className="absolute bottom-4 left-4 z-20 grid h-12 w-12 place-items-center rounded-full bg-paper/90 text-navy shadow ring-1 ring-ink/10"
        title="الصوت (M)"
      >
        {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
      </button>

      <AnimatePresence>
        {phase === 'paused' && (
          <Overlay key="paused">
            {resumeIn > 0 ? (
              <motion.p key={resumeIn} className="font-display text-[10rem] font-extrabold text-white" initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                {resumeIn}
              </motion.p>
            ) : (
              <div className="flex items-center gap-10">
                <div className="max-w-xl">
                  <p className="font-display text-5xl leading-snug font-extrabold text-white">انقطع اتصال {SLOT_LABEL_AR[pausedSlot] ?? 'اللاعب'}</p>
                  <p className="mt-3 text-3xl text-white/80">امسح الرمز مجددًا للعودة إلى المباراة</p>
                  <button onClick={backToLobby} className="mt-6 rounded-full bg-white/15 px-6 py-2 text-xl font-bold text-white hover:bg-white/25">
                    إنهاء المباراة
                  </button>
                </div>
                {controllerUrl && <QrCode text={controllerUrl} size={260} />}
              </div>
            )}
          </Overlay>
        )}
        {phase === 'result' && result && match && (
          <Overlay key="result">
            <ResultCard result={result} characters={match.characters} secondsLeft={resultLeft} />
          </Overlay>
        )}
      </AnimatePresence>
    </div>
  )
}

function Overlay({ children }) {
  return (
    <motion.div className="absolute inset-0 z-10 grid place-items-center bg-navy/80 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {children}
    </motion.div>
  )
}

function ResultCard({ result, characters, secondsLeft }) {
  const winner = result.winner ? characters[result.winner] : null
  return (
    <motion.div className="flex flex-col items-center text-center text-white" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
      {winner ? (
        <>
          <motion.img
            src={headDataUrl(winner)}
            alt=""
            className={`h-64 w-64 drop-shadow-[0_20px_30px_rgba(0,0,0,0.4)] ${result.winner === 'p2' ? '-scale-x-100' : ''}`}
            animate={{ y: [0, -24, 0], rotate: [0, -4, 4, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <p className="mt-2 text-3xl font-bold text-saffron">{SLOT_LABEL_AR[result.winner]} يفوز!</p>
          <p className="font-display text-8xl leading-tight font-extrabold">{winner.nameAr}</p>
        </>
      ) : (
        <p className="font-display text-8xl font-extrabold">تعادل!</p>
      )}
      <p className="mt-1 font-display text-5xl font-bold" dir="ltr">
        {result.score.p1} – {result.score.p2}
      </p>
      {result.broken?.includes('biggestWin') && <p className="mt-3 rounded-full bg-[#ffd23f] px-5 py-1 text-2xl font-extrabold text-navy">🏆 أكبر فوز اليوم!</p>}
      <motion.p
        className="mt-6 rounded-full bg-saffron px-8 py-3 font-display text-3xl font-extrabold text-navy"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        اضغط «ركل» للعب مجددًا
      </motion.p>
      <p className="mt-4 text-xl text-white/70">العودة إلى صفحة الانتظار بعد {Math.max(0, secondsLeft)} ثانية</p>
    </motion.div>
  )
}

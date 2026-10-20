import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import { EV, BUTTONS } from '../../shared/protocol.js'
import { connectSocket, getConnectionInfo, measurePing } from '../game/net/socket.js'
import { createInputBus, NetworkInputSource } from '../game/input/NetworkInputSource.js'
import { CombinedInputSource } from '../game/input/InputSource.js'
import { KEYMAPS, KeyboardInputSource } from '../game/input/KeyboardInputSource.js'
import { CpuInputSource } from '../game/input/CpuInputSource.js'
import { SLOT_CHARACTER, SLOT_LABEL_AR } from '../game/characters/index.js'
import { sfx } from '../game/sfx.js'
import FightLobby from '../components/fight/FightLobby.jsx'
import FightStage from '../components/fight/FightStage.jsx'
import QrCode from '../components/fight/QrCode.jsx'
import Chakra from '../components/Chakra.jsx'

const RESULT_TIMEOUT_S = 15
const noButtons = () => Object.fromEntries(BUTTONS.map((b) => [b, false]))

/**
 * "India Fighters" on the laptop: lobby → fight → result.
 * The page owns the socket and turns phone input into InputSources; the game itself
 * (FightStage / Phaser) only ever sees InputSources.
 */
export default function FightPage() {
  const bus = useMemo(() => createInputBus(), [])
  const socketRef = useRef(null)
  const [room, setRoom] = useState(null)
  const [serverOk, setServerOk] = useState(null)
  const [info, setInfo] = useState(null)
  const [phase, setPhase] = useState('lobby') // lobby | fighting | paused | result
  const [match, setMatch] = useState(null) // { id, sources }
  const [result, setResult] = useState(null) // { winner, wins }
  const [pausedSlot, setPausedSlot] = useState(null)
  const [resumeIn, setResumeIn] = useState(0)
  const [held, setHeld] = useState(noButtons)
  const [showPing, setShowPing] = useState(false)
  const [screenPing, setScreenPing] = useState(null)
  const [muted, setMuted] = useState(sfx.isMuted())
  const phaseRef = useRef(phase)
  const pausedSlotRef = useRef(pausedSlot)
  useLayoutEffect(() => {
    phaseRef.current = phase
    pausedSlotRef.current = pausedSlot
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
    socket.on(EV.INPUT, (msg) => {
      bus.emit(msg)
      if (msg.slot === 'p1') setHeld((h) => ({ ...h, [msg.button]: msg.pressed }))
    })
    socket.on(EV.PLAYER_DISCONNECTED, ({ slot }) => {
      if (slot === 'p1') setHeld(noButtons())
      if (phaseRef.current === 'fighting') {
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

  // tell the server (and through it the phones) which phase we're in
  useEffect(() => {
    socketRef.current?.emit(EV.SCREEN_STATE, { phase })
  }, [phase])

  // ------------------------------------------------------------ match lifecycle
  const startMatch = useCallback(() => {
    const p2IsCpu = (room?.slots?.p2?.type ?? 'cpu') === 'cpu'
    const sources = {
      p1: new CombinedInputSource([new NetworkInputSource(bus, 'p1'), new KeyboardInputSource(KEYMAPS.p1)]),
      p2: p2IsCpu ? new CpuInputSource() : new CombinedInputSource([new NetworkInputSource(bus, 'p2'), new KeyboardInputSource(KEYMAPS.p2)]),
    }
    setResult(null)
    setPausedSlot(null)
    setMatch({ id: Date.now(), sources })
    setPhase('fighting')
  }, [bus, room])

  // dispose input sources when a match is replaced/ended
  useEffect(() => {
    if (!match) return
    return () => Object.values(match.sources).forEach((s) => s.destroy())
  }, [match])

  const backToLobby = useCallback(() => {
    setMatch(null)
    setResult(null)
    setPhase('lobby')
  }, [])

  const onGameEvent = useCallback((ev) => {
    if (ev.type === 'hit' && !ev.blocked) socketRef.current?.emit(EV.SCREEN_HIT, { slot: ev.slot })
    if (ev.type === 'matchEnd') {
      resultShownAt.current = performance.now()
      setResult({ winner: ev.winner, wins: ev.wins })
      setPhase('result')
    }
  }, [])

  // any P1 button (phone or keyboard) starts / restarts the match
  useEffect(() => {
    const tryStart = () => {
      const ph = phaseRef.current
      if (ph === 'lobby') startMatch()
      else if (ph === 'result' && performance.now() - resultShownAt.current > 1200) startMatch()
    }
    const off = bus.on((msg) => msg.slot === 'p1' && msg.pressed && tryStart())
    const onKey = (e) => {
      if (e.code === 'KeyP') setShowPing((v) => !v)
      else if (e.code === 'KeyM') setMuted(sfx.toggle())
      else if (KEYMAPS.p1[e.code] && !e.repeat) tryStart()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      off()
      window.removeEventListener('keydown', onKey)
    }
  }, [bus, startMatch])

  // result screen: back to the lobby after 15 s
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

  // paused → player came back → 3-2-1 → fight
  useEffect(() => {
    if (resumeIn <= 0) return
    sfx.play('beep')
    const t = setTimeout(() => {
      if (resumeIn === 1) {
        setPausedSlot(null)
        setPhase('fighting')
      }
      setResumeIn((n) => n - 1)
    }, 800)
    return () => clearTimeout(t)
  }, [resumeIn])

  // release stuck buttons whenever the game pauses
  useEffect(() => {
    if (phase === 'paused') Object.values(match?.sources ?? {}).forEach((s) => s.releaseAll())
  }, [phase, match])

  // debug ping (laptop ↔ server)
  useEffect(() => {
    if (!showPing) return
    const t = setInterval(async () => socketRef.current && setScreenPing(await measurePing(socketRef.current)), 1500)
    return () => clearInterval(t)
  }, [showPing])

  return (
    <div className="relative h-full">
      {phase === 'lobby' || !match ? (
        <FightLobby
          controllerUrl={controllerUrl}
          room={room}
          serverOk={serverOk}
          heldButtons={held}
          showPing={showPing}
          screenPing={screenPing}
        />
      ) : (
        <FightStage key={match.id} sources={match.sources} paused={phase !== 'fighting'} onEvent={onGameEvent} />
      )}

      {/* mute toggle */}
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
                  <p className="font-display text-5xl leading-snug font-extrabold text-white">
                    انقطع اتصال {SLOT_LABEL_AR[pausedSlot] ?? 'اللاعب'}
                  </p>
                  <p className="mt-3 text-3xl text-white/80">امسح الرمز مجددًا للعودة إلى القتال</p>
                  <button onClick={backToLobby} className="mt-6 rounded-full bg-white/15 px-6 py-2 text-xl font-bold text-white hover:bg-white/25">
                    إنهاء المباراة
                  </button>
                </div>
                {controllerUrl && <QrCode text={controllerUrl} size={260} />}
              </div>
            )}
          </Overlay>
        )}
        {phase === 'result' && result && (
          <Overlay key="result">
            <ResultCard result={result} secondsLeft={resultLeft} />
          </Overlay>
        )}
      </AnimatePresence>
    </div>
  )
}

function Overlay({ children }) {
  return (
    <motion.div
      className="absolute inset-0 z-10 grid place-items-center bg-navy/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {children}
    </motion.div>
  )
}

function ResultCard({ result, secondsLeft }) {
  const winner = result.winner ? SLOT_CHARACTER[result.winner] : null
  return (
    <motion.div className="flex flex-col items-center text-center text-white" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
      <Chakra size={110} color="#ffffff" spin duration={6} />
      {winner ? (
        <>
          <p className="mt-4 text-3xl font-bold text-saffron">{SLOT_LABEL_AR[result.winner]} يفوز!</p>
          <p className="font-display text-8xl leading-tight font-extrabold">{winner.nameAr}</p>
        </>
      ) : (
        <p className="mt-4 font-display text-8xl font-extrabold">تعادل!</p>
      )}
      <p className="mt-2 font-display text-4xl font-bold" dir="ltr">
        {result.wins.p1} – {result.wins.p2}
      </p>
      <motion.p
        className="mt-8 rounded-full bg-saffron px-8 py-3 font-display text-3xl font-extrabold text-navy"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        اضغط أي زر في هاتفك للعب مجددًا
      </motion.p>
      <p className="mt-4 text-xl text-white/70">العودة إلى صفحة الانتظار بعد {Math.max(0, secondsLeft)} ثانية</p>
    </motion.div>
  )
}

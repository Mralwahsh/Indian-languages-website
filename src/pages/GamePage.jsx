import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Play, RotateCcw, Trophy, X } from 'lucide-react'
import { getGameData } from '../services/dataService.js'
import { getTodaysHighScore, submitScore } from '../services/storage.js'
import { scriptDir, scriptFont } from '../config/scripts.js'
import FitText from '../components/FitText.jsx'

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildRounds({ languages, words, roundsPerGame }) {
  const pickedWords = shuffle(words).slice(0, roundsPerGame)
  const targets = shuffle(languages) // different target language every round
  return pickedWords.map((word, i) => {
    const target = targets[i % targets.length]
    const others = shuffle(languages.filter((l) => l.id !== target.id)).slice(0, 3)
    return { word, target, options: shuffle([target, ...others]) }
  })
}

const FEEDBACK_MS = 1400

export default function GamePage() {
  const [data, setData] = useState(null)
  const [phase, setPhase] = useState('intro') // intro | play | end
  const [rounds, setRounds] = useState([])
  const [roundIdx, setRoundIdx] = useState(0)
  const [answer, setAnswer] = useState(null) // { id, correct, timedOut }
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [highScore, setHighScore] = useState(getTodaysHighScore)
  const [newRecord, setNewRecord] = useState(false)
  const roundStart = useRef(0)

  useEffect(() => {
    getGameData().then(setData)
  }, [])

  const start = () => {
    setRounds(buildRounds(data))
    setRoundIdx(0)
    setScore(0)
    setCorrectCount(0)
    setAnswer(null)
    setNewRecord(false)
    setPhase('play')
    roundStart.current = performance.now()
  }

  const round = rounds[roundIdx]
  const seconds = data?.secondsPerRound ?? 6

  const choose = useCallback(
    (lang, timedOut = false) => {
      if (answer || !round) return
      const correct = !timedOut && lang?.id === round.target.id
      const elapsed = (performance.now() - roundStart.current) / 1000
      // 50 points for a right answer + up to 50 for speed
      const points = correct ? 50 + Math.round(Math.max(0, 1 - elapsed / seconds) * 50) : 0
      setAnswer({ id: lang?.id ?? null, correct, timedOut, points })
      setScore((s) => s + points)
      if (correct) setCorrectCount((c) => c + 1)
    },
    [answer, round, seconds],
  )

  // advance after feedback
  useEffect(() => {
    if (!answer) return
    const t = setTimeout(() => {
      if (roundIdx + 1 < rounds.length) {
        setRoundIdx((i) => i + 1)
        setAnswer(null)
        roundStart.current = performance.now()
      } else {
        setPhase('end')
      }
    }, FEEDBACK_MS)
    return () => clearTimeout(t)
  }, [answer, roundIdx, rounds.length])

  // timeout
  useEffect(() => {
    if (phase !== 'play' || answer) return
    const t = setTimeout(() => choose(null, true), seconds * 1000)
    return () => clearTimeout(t)
  }, [phase, answer, roundIdx, seconds, choose])

  // record high score once at the end
  useEffect(() => {
    if (phase !== 'end') return
    if (submitScore(score)) setNewRecord(true)
    setHighScore(getTodaysHighScore())
  }, [phase, score])

  // keyboard 1-4 for the guide
  useEffect(() => {
    const onKey = (e) => {
      if (phase === 'play' && round && ['1', '2', '3', '4'].includes(e.key)) choose(round.options[Number(e.key) - 1])
      if (phase !== 'play' && e.key === 'Enter' && data) start()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!data) return null

  return (
    <div className="mx-auto flex h-full max-w-[1600px] flex-col px-12 py-6">
      <AnimatePresence mode="wait">
        {phase === 'intro' && <Intro key="intro" onStart={start} highScore={highScore} data={data} />}
        {phase === 'play' && round && (
          <motion.div key="play" className="flex min-h-0 flex-1 flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* status bar */}
            <div className="flex items-center gap-6">
              <div className="flex gap-2">
                {rounds.map((_, i) => (
                  <span
                    key={i}
                    className={`h-4 w-12 rounded-full transition-colors ${i < roundIdx ? 'bg-navy' : i === roundIdx ? 'bg-saffron' : 'bg-ink/10'}`}
                  />
                ))}
              </div>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-ink/10">
                <motion.div
                  key={`timer-${roundIdx}`}
                  className="h-full rounded-full bg-gradient-to-r from-green via-saffron to-accent"
                  initial={{ width: '100%' }}
                  animate={{ width: answer ? undefined : '0%' }}
                  transition={{ duration: seconds, ease: 'linear' }}
                />
              </div>
              <motion.span key={score} className="min-w-36 text-end font-display text-4xl font-extrabold text-navy" initial={{ scale: 1.3 }} animate={{ scale: 1 }}>
                {score} نقطة
              </motion.span>
            </div>

            {/* question */}
            <AnimatePresence mode="wait">
              <motion.div
                key={roundIdx}
                className="flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mt-5 text-center">
                  <p className="text-2xl text-muted">
                    الكلمات الأربع تعني <b className="text-ink">«{round.word.arabic}»</b>
                  </p>
                  <h2 className="mt-1 font-display text-6xl leading-snug font-extrabold">
                    أيُّها مكتوبة ب<span className="text-saffron-deep">{round.target.nameAr}</span>؟
                  </h2>
                </div>

                <div className="mt-6 grid min-h-0 flex-1 grid-cols-2 gap-5">
                  {round.options.map((opt, i) => {
                    const revealed = !!answer
                    const isTarget = opt.id === round.target.id
                    const isPicked = answer?.id === opt.id
                    const state = !revealed ? 'idle' : isTarget ? 'right' : isPicked ? 'wrong' : 'other'
                    return (
                      <motion.button
                        key={opt.id}
                        onClick={() => choose(opt)}
                        disabled={revealed}
                        className={`relative flex min-h-0 flex-col items-center justify-center rounded-[2rem] ring-4 transition-colors ${
                          state === 'right'
                            ? 'bg-green text-white ring-green'
                            : state === 'wrong'
                              ? 'bg-accent text-white ring-accent'
                              : state === 'other'
                                ? 'bg-paper text-ink/30 ring-transparent'
                                : 'bg-paper text-navy ring-transparent hover:ring-saffron'
                        } shadow-sm`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={state === 'wrong' ? { opacity: 1, y: 0, x: [0, -14, 14, -10, 10, 0] } : { opacity: 1, y: 0, scale: state === 'right' ? 1.03 : 1 }}
                        transition={{ delay: revealed ? 0 : i * 0.05, duration: state === 'wrong' ? 0.45 : 0.25 }}
                        whileTap={!revealed ? { scale: 0.96 } : undefined}
                      >
                        <span className="absolute start-5 top-3 font-display text-xl font-bold opacity-40">{i + 1}</span>
                        <div className="w-full px-6">
                          <FitText dir={scriptDir(opt.script)} className={`${scriptFont(opt.script)} text-7xl leading-[1.5] font-bold 2xl:text-8xl`}>
                            {round.word.translations[opt.id]}
                          </FitText>
                        </div>
                        <AnimatePresence>
                          {revealed && (
                            <motion.span
                              className="flex items-center gap-2 text-2xl font-bold"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              {state === 'right' && <Check size={28} strokeWidth={3} />}
                              {state === 'wrong' && <X size={28} strokeWidth={3} />}
                              {opt.nameAr}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {state === 'right' && answer?.correct && (
                          <motion.span
                            className="absolute end-6 top-4 font-display text-4xl font-extrabold"
                            initial={{ opacity: 0, y: 10, scale: 0.5 }}
                            animate={{ opacity: 1, y: -10, scale: 1 }}
                          >
                            +{answer.points}
                          </motion.span>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
                <div className="mt-3 h-10 text-center text-2xl font-bold">
                  {answer?.timedOut && <span className="text-accent">⏰ انتهى الوقت!</span>}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
        {phase === 'end' && (
          <End key="end" score={score} correct={correctCount} total={rounds.length} highScore={highScore} newRecord={newRecord} onAgain={start} />
        )}
      </AnimatePresence>
    </div>
  )
}

function Intro({ onStart, highScore, data }) {
  const sample = data.words[0]
  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-center text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="mb-6 flex flex-wrap justify-center gap-4">
        {data.languages.slice(0, 6).map((l, i) => (
          <motion.span
            key={l.id}
            className={`${scriptFont(l.script)} rounded-3xl bg-paper px-6 text-5xl leading-[1.6] font-bold text-navy shadow-sm`}
            initial={{ opacity: 0, y: 30, rotate: -6 }}
            animate={{ opacity: 1, y: [0, -8, 0], rotate: 0 }}
            transition={{ delay: i * 0.08, y: { duration: 2.4, repeat: Infinity, delay: i * 0.3 } }}
          >
            {sample.translations[l.id]}
          </motion.span>
        ))}
      </div>
      <h1 className="font-display text-7xl leading-snug font-extrabold">خمّن الخط!</h1>
      <p className="mt-2 text-3xl text-ink/70">
        نفس الكلمة بأربعة خطوط مختلفة. اختر الصحيح <b>بسرعة!</b>
      </p>
      <motion.button
        onClick={onStart}
        whileTap={{ scale: 0.95 }}
        className="mt-8 flex h-24 items-center gap-4 rounded-full bg-gradient-to-l from-saffron to-saffron-deep px-14 font-display text-4xl font-extrabold text-white shadow-[0_20px_50px_-15px_rgba(226,112,10,0.6)] hover:brightness-110"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      >
        <Play size={40} fill="currentColor" className="-scale-x-100" /> ابدأ
      </motion.button>
      <p className="mt-6 flex items-center gap-2 text-2xl text-muted">
        <Trophy className="text-saffron" /> أعلى نتيجة اليوم: <b className="text-ink">{highScore} نقطة</b>
      </p>
    </motion.div>
  )
}

function End({ score, correct, total, highScore, newRecord, onAgain }) {
  const message = correct === total ? 'ممتاز! أنت خبير خطوط! 🏆' : correct >= 3 ? 'عينٌ حادّة! 👏' : 'محاولة جميلة، الخطوط صعبة! 😄'
  return (
    <motion.div
      className="relative flex flex-1 flex-col items-center justify-center text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
    >
      {newRecord && <Confetti />}
      <p className="text-3xl font-semibold text-muted">{message}</p>
      <motion.p
        className="font-display text-[10rem] leading-none font-extrabold text-navy"
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 12 }}
      >
        {score}
        <span className="text-5xl"> نقطة</span>
      </motion.p>
      <p className="mt-2 text-3xl font-bold">
        صحيحة: {correct} من {total}
      </p>
      {newRecord ? (
        <motion.p
          className="mt-4 rounded-full bg-saffron px-6 py-2 text-3xl font-extrabold text-ink"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 0.9, repeat: Infinity }}
        >
          🎉 أعلى نتيجة اليوم!
        </motion.p>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-2xl text-muted">
          <Trophy className="text-saffron" /> أعلى نتيجة اليوم: <b className="text-ink">{highScore} نقطة</b>
        </p>
      )}
      <motion.button
        onClick={onAgain}
        whileTap={{ scale: 0.95 }}
        className="mt-10 flex h-20 items-center gap-3 rounded-full bg-navy px-12 font-display text-3xl font-extrabold text-white shadow-lg hover:brightness-110"
      >
        <RotateCcw size={32} /> العب مرة أخرى
      </motion.button>
    </motion.div>
  )
}

function Confetti() {
  const colors = ['#ff9933', '#138808', '#000080', '#e2700a', '#ffb866']
  // random values fixed once so re-renders don't restart the burst
  const [pieces] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({ i, x: (Math.random() - 0.5) * 1400, up: 300 + Math.random() * 300, rot: Math.random() * 720, dur: 2.2 + Math.random() })),
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map(({ i, x, up, rot, dur }) => (
        <motion.span
          key={i}
          className="absolute top-1/2 left-1/2 h-4 w-2.5 rounded-sm"
          style={{ backgroundColor: colors[i % colors.length] }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x, y: [0, -up, 500], rotate: rot, opacity: [1, 1, 0] }}
          transition={{ duration: dur, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

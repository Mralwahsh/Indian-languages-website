import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, PenLine, Sparkles } from 'lucide-react'
import { useVisitor } from '../context/VisitorContext.jsx'
import GlyphText from '../components/GlyphText.jsx'
import LetterBreakdown from '../components/LetterBreakdown.jsx'
import NameCardModal from '../components/NameCardModal.jsx'
import { scriptFont } from '../config/scripts.js'
import { NAME_SCRIPTS } from '../config/nameScripts.js'

const EXAMPLES = ['أحمد', 'سارة', 'عمر', 'لينا', 'يوسف', 'Noor']

export default function NamePage() {
  const { name, setName, result } = useVisitor()
  const [breakdown, setBreakdown] = useState(null) // one of NAME_SCRIPTS
  const [writeRun, setWriteRun] = useState(0) // >0 while the writing animation plays
  const [showCard, setShowCard] = useState(false)
  const doneCount = useRef(0)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Stop the writing animation if the name changes
  useEffect(() => setWriteRun(0), [result?.input])

  const startWriting = () => {
    doneCount.current = 0
    setWriteRun((n) => n + 1)
  }
  const onWriteDone = useCallback(() => {
    doneCount.current += 1
    if (doneCount.current >= NAME_SCRIPTS.length) setTimeout(() => setWriteRun(0), 1500)
  }, [])

  return (
    <div className="mx-auto flex h-full max-w-[1800px] flex-col px-10 pt-6 pb-6">
      {/* Input */}
      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-4xl">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            dir="auto"
            maxLength={30}
            spellCheck={false}
            autoComplete="off"
            placeholder="اكتب اسمك (بالعربية أو الإنجليزية)"
            className="h-24 w-full rounded-full bg-paper px-16 text-center font-display text-5xl font-bold text-ink shadow-[0_12px_40px_-12px_rgba(0,0,128,0.22)] ring-2 ring-navy/10 transition outline-none placeholder:text-4xl placeholder:font-semibold placeholder:text-ink/25 focus:ring-4 focus:ring-saffron/60"
          />
          <Sparkles className="pointer-events-none absolute start-8 top-1/2 -translate-y-1/2 text-saffron" size={30} />
        </div>

        <div className="mt-3 flex h-10 items-center gap-3 text-xl">
          {result ? (
            <motion.div key={result.input} className="flex items-center gap-3" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
              <span className="text-muted">يُلفظ:</span>
              <span className="rounded-full bg-navy/5 px-4 py-1 font-bold text-navy" dir="ltr">
                {result.pronunciation}
              </span>
              {result.approximate && (
                <span
                  className="rounded-full bg-saffron-soft px-3 py-1 text-base font-semibold text-[#9a4b00]"
                  title="الاسم ليس في قاموسنا، فكُتب بقواعد تقريبية"
                >
                  ≈ تهجئة تقريبية
                </span>
              )}
              {result.funNote && <span className="rounded-full bg-green-soft px-3 py-1 text-base font-semibold text-green">{result.funNote}</span>}
            </motion.div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-muted">جرّب:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setName(ex)}
                  className="rounded-full bg-paper px-4 py-0.5 font-semibold text-ink/70 ring-1 ring-ink/10 transition hover:bg-saffron-soft"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="mt-5 grid min-h-0 flex-1 grid-cols-5 gap-4">
        {NAME_SCRIPTS.map((s, i) => (
          <motion.button
            key={s.key}
            disabled={!result}
            onClick={() => setBreakdown(s)}
            className="group relative flex min-h-0 flex-col overflow-hidden rounded-[2rem] bg-paper text-start shadow-sm ring-1 ring-ink/5 transition enabled:hover:-translate-y-1 enabled:hover:shadow-xl disabled:cursor-default"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 160, damping: 20 }}
          >
            <div className="h-2 w-full" style={{ backgroundColor: s.accent }} />
            <div className="px-5 pt-3">
              <span className="block font-display text-2xl font-extrabold 2xl:text-3xl">{s.language}</span>
              <span className="block text-base text-muted">خط {s.scriptName}</span>
            </div>
            <div className="grid min-h-0 flex-1 place-items-center px-3">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key={`${result[s.key]}-${writeRun}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    className="flex w-full justify-center"
                    style={{ color: s.accent }}
                  >
                    <GlyphText
                      text={result[s.key]}
                      script={s.script}
                      height={s.script === 'urdu' ? 170 : 130}
                      mode={writeRun ? 'write' : 'static'}
                      onDone={writeRun ? onWriteDone : undefined}
                    />
                  </motion.div>
                ) : (
                  <motion.span
                    key="placeholder"
                    className={`${scriptFont(s.script)} text-6xl font-bold text-ink/10`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {s.placeholder}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="px-5 pb-4 text-base font-semibold text-muted transition group-enabled:group-hover:text-ink">
              {result ? 'اضغط لترى كيف يُكتب ←' : 'سيظهر اسمك هنا'}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-5 flex justify-center gap-5">
        <ActionButton disabled={!result || writeRun > 0} onClick={startWriting} className="bg-saffron text-ink">
          <PenLine size={30} /> {writeRun ? 'جارٍ الكتابة…' : 'شاهده وهو يُكتب'}
        </ActionButton>
        <ActionButton disabled={!result} onClick={() => setShowCard(true)} className="bg-navy text-white">
          <Camera size={30} /> التقط صورة!
        </ActionButton>
      </div>

      <AnimatePresence>
        {breakdown && result && (
          <LetterBreakdown key="breakdown" config={breakdown} text={result[breakdown.key]} onClose={() => setBreakdown(null)} />
        )}
        {showCard && result && <NameCardModal key="card" result={result} onClose={() => setShowCard(false)} />}
      </AnimatePresence>
    </div>
  )
}

function ActionButton({ children, className, ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className={`flex h-20 items-center gap-3 rounded-full px-10 font-display text-3xl font-extrabold shadow-lg transition hover:brightness-110 disabled:opacity-35 disabled:shadow-none ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import GlyphText from './GlyphText.jsx'
import { blockSound, breakIntoBlocks } from '../services/scriptInfo.js'
import { scriptFont } from '../config/scripts.js'

const TIPS = {
  devanagari: 'كل حرف ساكن فيه صوت «a» مخفي. وباقي حروف العلة تصبح علامات صغيرة حوله، فوقه أو تحته أو حتى قبله، تمامًا مثل الحركات!',
  bengali: 'مثل الديفاناغاري: حروف العلة بعد الحرف تصبح علامات حوله، والصوت المخفي في كل حرف هو «o».',
  tamil: 'حروف التاميلية أقل: حرف واحد قد يكون «ك» أو «غ»، و«ت» أو «د». والنقطة فوق الحرف (بُلّي) مثل السكون.',
  malayalam: 'حروف مستديرة! حروف العلة تلتفّ حول الحرف، وبعض الحروف الساكنة في آخر الكلمة لها أشكال خاصة اسمها «تشيلّو».',
  urdu: 'الأردية تستخدم الحروف العربية مع حروف جديدة لأصوات هندية، وتتغيّر أشكال الحروف حسب مكانها في الكلمة، تمامًا كالعربية.',
}

const isMark = (kind) => ['vowel-sign', 'virama', 'nukta', 'nasal', 'mark'].includes(kind)
const PART_COLORS = ['#e2700a', '#138808', '#000080', '#9c2a4b', '#0b7a75']

/** Full-screen explainer: the name split into syllable blocks, each block split into its parts. */
export default function LetterBreakdown({ config, text, onClose }) {
  const { script } = config
  const blocks = useMemo(() => breakIntoBlocks(text, script), [text, script])
  const [blockIdx, setBlockIdx] = useState(0)
  const [partIdx, setPartIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const block = blocks[blockIdx]
  const isUrdu = script === 'urdu'

  // Auto-cycle through the parts so the screen explains itself
  // (Urdu: blocks are single letters, so cycle letter by letter instead)
  useEffect(() => {
    if (paused || !block) return
    const t = setInterval(() => {
      if (isUrdu) setBlockIdx((b) => (b + 1) % blocks.length)
      else setPartIdx((p) => (p + 1) % (block.parts.length + 1))
    }, 2600)
    return () => clearInterval(t)
  }, [paused, block, isUrdu, blocks.length])

  useEffect(() => setPartIdx(0), [blockIdx])

  if (!block) return null
  const activePart = block.parts[partIdx] ?? null // null = "whole block" step

  // Code point indices to highlight inside the big rendering
  const highlight = isUrdu
    ? new Set(activePart ? activePart.indices : block.parts.flatMap((p) => p.indices))
    : activePart
      ? new Set(activePart.indices.map((i) => i - block.start))
      : null
  const activeColor = activePart ? PART_COLORS[partIdx % PART_COLORS.length] : config.accent

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-8 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="flex h-full max-h-[900px] w-full max-w-[1500px] flex-col rounded-[2.5rem] bg-cream px-8 py-6 shadow-2xl"
        initial={{ y: 40, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-semibold" style={{ color: config.accent }}>
              {config.language} · خط {config.scriptName}
            </p>
            <h2 className="font-display text-4xl font-extrabold">كيف يُبنى اسمك؟</h2>
          </div>
          <button onClick={onClose} className="grid h-14 w-14 place-items-center rounded-full bg-ink/5 hover:bg-ink/10">
            <X size={30} />
          </button>
        </div>

        {/* syllable blocks */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3" dir={isUrdu ? 'rtl' : 'ltr'}>
          {blocks.map((b, i) => (
            <motion.button
              key={`${b.start}-${b.text}`}
              onClick={() => {
                setBlockIdx(i)
                if (isUrdu) setPaused(true)
              }}
              whileTap={{ scale: 0.94 }}
              className={`${scriptFont(script)} min-w-24 rounded-2xl px-5 font-bold transition ${
                i === blockIdx ? 'bg-paper shadow-lg ring-4' : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
              } ${isUrdu ? 'py-0 text-5xl' : 'py-1 text-5xl 2xl:text-6xl'}`}
              style={i === blockIdx ? { '--tw-ring-color': config.accent, color: config.accent } : undefined}
            >
              {b.text}
            </motion.button>
          ))}
        </div>
        <p className="mt-2 text-center text-lg text-muted">
          {isUrdu ? 'اضغط على حرف' : 'اضغط على مقطع: كل مقطع صوتٌ واحد'}
        </p>

        {/* detail */}
        <div className="mt-3 grid min-h-0 flex-1 grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-6">
          <div className="grid place-items-center rounded-[2rem] bg-paper p-6 ring-1 ring-ink/5">
            <GlyphText
              key={`${blockIdx}-${isUrdu}`}
              text={isUrdu ? text : block.text}
              script={script}
              height={isUrdu ? 200 : 260}
              color="#10123a"
              highlight={highlight}
              highlightColor={activeColor}
              dimOthers={isUrdu}
            />
          </div>

          <div className="flex min-h-0 flex-col justify-center" onMouseLeave={() => setPaused(false)}>
            {/* equation */}
            <div className="flex flex-wrap items-center gap-2" dir={isUrdu ? 'rtl' : 'ltr'}>
              {block.parts.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-3xl font-bold text-ink/30">+</span>}
                  <button
                    onMouseEnter={() => {
                      setPaused(true)
                      setPartIdx(i)
                    }}
                    onClick={() => {
                      setPaused(true)
                      setPartIdx(i)
                    }}
                    className={`flex min-w-20 flex-col items-center rounded-2xl px-3 py-1.5 transition ${
                      partIdx === i ? 'scale-105 bg-paper shadow-lg' : 'bg-ink/5'
                    }`}
                    style={partIdx === i ? { boxShadow: `0 0 0 4px ${PART_COLORS[i % PART_COLORS.length]}` } : undefined}
                  >
                    <span
                      className={`${scriptFont(script)} font-bold ${isUrdu ? 'text-5xl leading-[1.8]' : 'text-5xl leading-[1.4]'}`}
                      style={{ color: PART_COLORS[i % PART_COLORS.length] }}
                    >
                      {isMark(p.kind) ? `◌${p.ch}` : p.ch}
                    </span>
                    <span className="text-2xl font-bold">{p.sound || '—'}</span>
                    <span className="text-sm text-muted">{p.label}</span>
                  </button>
                </div>
              ))}
              {!isUrdu && (
                <>
                  <span className="text-3xl font-bold text-ink/30">=</span>
                  <button
                    onMouseEnter={() => {
                      setPaused(true)
                      setPartIdx(block.parts.length)
                    }}
                    className={`flex min-w-20 flex-col items-center rounded-2xl px-3 py-1.5 transition ${
                      !activePart ? 'scale-105 bg-paper shadow-lg' : 'bg-ink/5'
                    }`}
                    style={!activePart ? { boxShadow: `0 0 0 4px ${config.accent}` } : undefined}
                  >
                    <span className={`${scriptFont(script)} text-5xl leading-[1.4] font-bold`} style={{ color: config.accent }}>
                      {block.text}
                    </span>
                    <span className="text-2xl font-bold">{blockSound(block, script)}</span>
                    <span className="text-sm text-muted">مقطع</span>
                  </button>
                </>
              )}
            </div>

            {/* explanation of the active part */}
            <div className="mt-4 min-h-20">
              <motion.p
                  key={`${blockIdx}-${partIdx}`}
                  className="rounded-2xl bg-paper px-6 py-3 text-2xl leading-snug font-semibold ring-1 ring-ink/5"
                  initial={{ opacity: 0.3, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {activePart ? (
                    activePart.note ?? `«${activePart.ch}» = ${activePart.sound || activePart.label}`
                  ) : (
                    <>
                      معًا:{' '}
                      <bdi dir="ltr">
                        {block.parts.map((p) => p.ch).join(' + ')} = {block.text} ({blockSound(block, script)})
                      </bdi>
                    </>
                  )}
                </motion.p>
            </div>
          </div>
        </div>

        <p className="mt-4 rounded-2xl bg-navy px-6 py-2.5 text-lg font-semibold text-white 2xl:text-xl">💡 {TIPS[script]}</p>
      </motion.div>
    </motion.div>
  )
}

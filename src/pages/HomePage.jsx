import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Counter from '../components/Counter.jsx'
import Chakra from '../components/Chakra.jsx'
import { getArabicWords, getLanguages } from '../services/dataService.js'
import { scriptFont } from '../config/scripts.js'

// Census of India 2011. TODO: verify wording/numbers.
const STATS = [
  { to: 22, suffix: '', label: 'لغة رسمية', sub: 'في دستور الهند', color: 'text-saffron-deep' },
  { to: 120, suffix: '+', label: 'لغة رئيسية', sub: 'لكلٍّ منها أكثر من 10,000 متحدث', color: 'text-green' },
  { to: 19500, suffix: '+', label: 'لغة أم', sub: 'سُجّلت في التعداد السكاني', color: 'text-accent' },
]

// Front: Hindi + English. Back panel: 15 more (Sanskrit isn't in languages.json, so it's added inline).
const BANKNOTE_LANGS = ['hindi', 'assamese', 'bengali', 'gujarati', 'kannada', 'kashmiri', 'konkani', 'malayalam', 'marathi', 'nepali', 'odia', 'punjabi', 'tamil', 'telugu', 'urdu']

export default function HomePage() {
  const [words, setWords] = useState([])
  const [languages, setLanguages] = useState([])

  useEffect(() => {
    getArabicWords().then((w) => setWords(w.slice(0, 8)))
    getLanguages().then(setLanguages)
  }, [])

  const noteLangs = [
    { id: 'english', nativeName: 'English', script: 'latin' },
    ...languages.filter((l) => BANKNOTE_LANGS.includes(l.id)),
    { id: 'sanskrit', nativeName: 'संस्कृतम्', script: 'devanagari' },
  ]

  return (
    <div className="mx-auto grid h-full max-w-[1800px] grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 px-12 py-7">
      {/* START side: the numbers */}
      <section className="relative flex min-h-0 flex-col">
        <Chakra size={300} spin duration={90} className="pointer-events-none absolute -top-16 -end-10 opacity-[0.07]" />
        <motion.h1
          className="relative font-display text-5xl leading-[1.3] font-extrabold text-navy 2xl:text-7xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          بلدٌ واحد،
          <br />
          <span className="bg-gradient-to-l from-saffron-deep via-navy to-green bg-clip-text text-transparent">وأصواتٌ كثيرة!</span>
        </motion.h1>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              className="rounded-3xl bg-paper p-4 shadow-sm ring-1 ring-ink/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.12 }}
            >
              <Counter
                to={s.to}
                suffix={s.suffix}
                delay={0.2 + i * 0.15}
                className={`block text-right font-display text-4xl font-extrabold tabular-nums 2xl:text-6xl ${s.color}`}
                dir="ltr"
              />
              <span className="mt-1 block text-2xl leading-tight font-bold">{s.label}</span>
              <span className="block text-sm leading-snug text-muted">{s.sub}</span>
            </motion.div>
          ))}
        </div>

        {/* Banknote fun fact */}
        <motion.div
          className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#ffead3] via-white to-[#dff2da] p-4 ring-1 ring-ink/5 2xl:p-5"
          initial={{ opacity: 0, rotate: 2, y: 20 }}
          animate={{ opacity: 1, rotate: 0, y: 0 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 120 }}
        >
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/70 text-3xl">💵</span>
            <p className="text-xl leading-snug font-bold 2xl:text-2xl">
              العملة الهندية تكتب قيمتها بـ<span className="text-accent">17 لغة!</span>
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0 text-base leading-relaxed text-ink/60 2xl:text-xl">
            {noteLangs.map((l, i) => (
              <motion.span
                key={l.id}
                className={`${scriptFont(l.script)} !leading-relaxed`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 + i * 0.06 }}
              >
                {l.nativeName}
              </motion.span>
            ))}
          </div>
        </motion.div>

        <div className="flex-1" />

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, type: 'spring' }}>
          <Link
            to="/name"
            className="group mt-4 flex items-center justify-between gap-4 rounded-[2rem] bg-navy px-8 py-5 text-white shadow-[0_20px_50px_-15px_rgba(0,0,128,0.45)] transition hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
          >
            <span className="font-display text-4xl leading-snug font-extrabold 2xl:text-5xl">شاهد اسمك بالخطوط الهندية</span>
            <motion.span
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-saffron text-navy"
              animate={{ x: [0, -8, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              <ArrowLeft size={36} strokeWidth={3} />
            </motion.span>
          </Link>
        </motion.div>
      </section>

      {/* END side: the hook */}
      <section className="flex min-h-0 flex-col rounded-[2.5rem] bg-paper p-6 shadow-sm ring-1 ring-ink/5 2xl:p-8">
        <div className="flex items-end justify-between gap-6">
          <h2 className="font-display text-4xl leading-snug font-extrabold 2xl:text-5xl">
            أنت تعرف بعض <span className="text-saffron-deep">الهندية</span> مسبقًا!
          </h2>
          <p className="pb-1 text-lg text-muted">مرّر على البطاقة لترى الكلمة بالأردية</p>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-3 2xl:gap-4">
          {words.map((w, i) => (
            <WordCard key={w.id} word={w} index={i} />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-5 rounded-3xl bg-green-soft px-6 py-3">
          <div className="flex shrink-0 items-center gap-3 text-4xl" dir="ltr">
            <span className="font-deva font-bold">किताब</span>
            <span className="text-2xl text-ink/40">=</span>
            <span className="font-urdu text-3xl leading-[1.6]">کتاب</span>
          </div>
          <p className="text-xl leading-relaxed">
            <b>الهندية والأردية</b> تكادان تكونان لغة واحدة في الكلام، والخط فقط مختلف. والهندية ليست إلا <b>واحدة</b> من لغات الهند الكثيرة!
          </p>
        </div>
      </section>
    </div>
  )
}

function WordCard({ word, index }) {
  return (
    <motion.div
      className="group relative [perspective:1000px]"
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.25 + index * 0.07, type: 'spring', stiffness: 180, damping: 18 }}
    >
      <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        {/* front: Hindi = Arabic */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-cream p-3 ring-1 ring-ink/5 [backface-visibility:hidden]">
          <span className="font-deva text-[2.6rem] leading-[1.35] font-bold text-navy 2xl:text-6xl">{word.hindi}</span>
          <span className="text-xl leading-none text-ink/30">=</span>
          <span className="font-arab text-4xl leading-[1.5] font-bold text-green 2xl:text-5xl">{word.arabic}</span>
        </div>
        {/* back: Urdu */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-navy p-3 text-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="text-base font-bold text-saffron">بالأردية</span>
          <span className="font-urdu text-4xl leading-[1.9] 2xl:text-5xl">{word.urdu}</span>
          <span className="text-center text-base leading-snug text-white/75">نفس الكلمة، وبحروف عربية!</span>
        </div>
      </div>
    </motion.div>
  )
}

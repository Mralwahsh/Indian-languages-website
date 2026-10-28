import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { getArabicWords, getLanguages } from '../services/dataService.js'
import { scriptFont } from '../config/scripts.js'

// The page is laid out like the flag: a saffron greeting at the top, the white middle with the
// navy line, and a green band of activities at the bottom.
//
// The centrepiece is the line itself: Devanagari letters hang *from* a line drawn along their tops
// (the shirorekha), Arabic letters sit *on* their line. So the same word is shown on both sides
// of one long navy bar: Arabic sitting on it, Hindi hanging from it.

// Census of India 2011 / RBI. TODO: verify wording/numbers.
const STATS = { official: 22, major: 120, mother: '19,500', banknote: 17 }

// Short words so six fit across the screen
const WORD_IDS = ['kitab', 'duniya', 'waqt', 'qalam', 'khabar', 'safar']
const GREETING_ORDER = ['hindi', 'tamil', 'bengali', 'urdu', 'malayalam', 'telugu', 'punjabi', 'gujarati', 'kannada', 'odia', 'meitei', 'santali', 'ladakhi', 'marathi', 'assamese']
const GREETING_MS = 2600

const ACTIVITIES = [
  { to: '/map', title: 'الخريطة', sub: 'لغة كل ولاية، واسمك بخطّها' },
  { to: '/game', title: 'خمّن الخط', sub: 'لعبة سريعة من خمس جولات' },
  { to: '/tour', title: 'جولات 360°', sub: 'تجوّل في الهند بهاتفك' },
  { to: '/football', title: 'كرة القدم', sub: 'العب بهاتفك ضد صديقك' },
]

export default function HomePage() {
  const [words, setWords] = useState([])
  const [languages, setLanguages] = useState([])

  useEffect(() => {
    getArabicWords().then((all) => setWords(WORD_IDS.map((id) => all.find((w) => w.id === id)).filter(Boolean)))
    getLanguages().then(setLanguages)
  }, [])

  const greetings = useMemo(
    () => GREETING_ORDER.map((id) => languages.find((l) => l.id === id)).filter((l) => l?.helloNative),
    [languages],
  )

  return (
    <div className="flex h-full flex-col overflow-hidden bg-paper">
      {/* ---------------------------------------------------------------- top: headline + greeting */}
      <section className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-[1.05] grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] items-center gap-[3vw] px-[4vw]">
        <div>
          <h1 className="font-display text-[min(6.8vw,11vh)] leading-[1.12] text-navy">
            بلدٌ واحد،
            <br />
            وأصواتٌ كثيرة
          </h1>
          <p className="mt-[1.6vh] max-w-[46ch] text-[min(1.6vw,2.8vh)] leading-[1.6] text-ink/80">
            في الهند <Num>{STATS.official}</Num> لغة رسمية، وأكثر من <Num>{STATS.major}</Num> لغة رئيسية، و<Num>{STATS.mother}</Num> لغة أُمّ سجّلها
            التعداد. وأوراقها النقدية تكتب قيمتها بـ<Num>{STATS.banknote}</Num> لغة!
          </p>
        </div>
        <Greeting greetings={greetings} />
      </section>

      {/* ---------------------------------------------------------------- middle: the shared line */}
      <WordLine words={words} />

      {/* ---------------------------------------------------------------- bottom: green band of activities */}
      <nav className="shrink-0 bg-green text-white" aria-label="الأنشطة">
        <div className="mx-auto flex h-[min(17vh,11rem)] w-full max-w-[1800px] items-stretch px-[4vw]">
          <Link
            to="/name"
            className="group my-[2.2vh] flex items-center gap-[1.5vw] rounded-[1.4rem] bg-saffron px-[2.2vw] text-navy shadow-[0_10px_0_#b85c06] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_12px_0_#b85c06] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-y-2 active:shadow-[0_2px_0_#b85c06]"
          >
            <span>
              <span className="block font-display text-[min(3.4vw,6vh)] leading-[1.15]">اكتب اسمك</span>
              <span className="block text-[min(1.3vw,2.3vh)] font-bold">وشاهده بخمسة خطوط هندية</span>
            </span>
            <ArrowLeft className="h-[min(3.4vw,6vh)] w-[min(3.4vw,6vh)] transition-transform group-hover:-translate-x-1" strokeWidth={3} />
          </Link>
          <ul className="ms-[2vw] flex flex-1 items-stretch">
            {ACTIVITIES.map((a) => (
              <li key={a.to} className="flex flex-1 border-s border-white/25">
                <Link
                  to={a.to}
                  className="flex flex-1 flex-col justify-center px-[1.6vw] transition-colors hover:bg-white/10 focus-visible:bg-white/15 focus-visible:outline-none"
                >
                  <span className="font-display text-[min(2.3vw,4.2vh)] leading-[1.25]">{a.title}</span>
                  <span className="text-[min(1.1vw,2vh)] leading-snug text-white/80">{a.sub}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  )
}

/** A number inside the stats sentence: set in the poster face, larger, same colour. */
function Num({ children }) {
  return (
    <bdi className="font-display text-[1.45em] leading-none text-navy" dir="ltr">
      {children}
    </bdi>
  )
}

/** One big "hello", changing language every few seconds. */
function Greeting({ greetings }) {
  const [i, setI] = useState(0)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (greetings.length < 2) return
    const t = setInterval(() => setI((n) => (n + 1) % greetings.length), GREETING_MS)
    return () => clearInterval(t)
  }, [greetings.length])

  const g = greetings[i % Math.max(1, greetings.length)]
  if (!g) return <div />

  return (
    <div className="relative flex h-full min-w-0 flex-col items-center justify-center text-center" aria-live="polite" data-fit>
      <div className="relative grid h-[min(19vw,30vh)] w-full place-items-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={g.id}
            className="col-start-1 row-start-1 flex w-full justify-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: '18%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: '-18%' }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <FitText className={`${scriptFont(g.script)} text-saffron-deep`} lang={g.id}>
              {g.helloNative}
            </FitText>
          </motion.span>
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={g.id}
          className="text-[min(1.7vw,3vh)] text-ink/75"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          «{g.helloPronunciationAr}» تعني مرحبًا {g.nameAr.startsWith('ال') ? `ب${g.nameAr}` : `بلغة ${g.nameAr}`}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

/** Text as big as it can be (up to 18vh) while still fitting the width of its parent. */
function FitText({ children, className, lang }) {
  const ref = useRef(null)
  const scaleRef = useRef(1)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      // width at full size = current width / current scale
      const natural = el.scrollWidth / scaleRef.current
      const room = el.closest('[data-fit]').clientWidth * 0.94
      scaleRef.current = Math.min(1, room / Math.max(1, natural))
      setScale(scaleRef.current)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el.closest('[data-fit]'))
    document.fonts?.ready.then(fit)
    return () => ro.disconnect()
  }, [children])
  return (
    <span ref={ref} className={`${className} whitespace-nowrap`} style={{ fontSize: `calc(min(9vw, 17vh) * ${scale})`, lineHeight: 1.5 }} lang={lang}>
      {children}
    </span>
  )
}

/**
 * The navy bar across the page. Each Arabic word sits on it, the same Hindi word hangs from it.
 * Hover or tap a word to see it in Urdu too (Urdu = Hindi's spoken twin, written in Arabic letters).
 */
function WordLine({ words }) {
  const [open, setOpen] = useState(null)
  const reduce = useReducedMotion()

  return (
    <section className="relative mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col justify-center px-[4vw]" aria-label="كلمات هندية تعرفها">
      <div className="grid grid-cols-[minmax(0,1.9fr)_repeat(6,minmax(0,1fr))] items-stretch">
        {/* heading: it is Arabic too, so it sits on the line like the words */}
        <div className="flex flex-col justify-end pb-[0.9vh]">
          <h2 className="font-display text-[min(2.9vw,5.2vh)] leading-[1.2] text-navy">
            أنت تعرف هذه
            <br />
            الكلمات الهندية!
          </h2>
        </div>
        {words.map((w, i) => (
          <motion.button
            key={w.id}
            type="button"
            onMouseEnter={() => setOpen(w.id)}
            onMouseLeave={() => setOpen((o) => (o === w.id ? null : o))}
            onFocus={() => setOpen(w.id)}
            onBlur={() => setOpen((o) => (o === w.id ? null : o))}
            onClick={() => setOpen((o) => (o === w.id ? null : w.id))}
            className="flex cursor-pointer flex-col items-center justify-end rounded-t-2xl pt-[1vh] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saffron"
            initial={reduce ? false : { opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
            aria-label={`${w.arabic} = ${w.hindi}`}
          >
            <span className="font-arab text-[min(3.3vw,6vh)] leading-[1.45] font-bold text-green" style={{ marginBottom: SIT }}>
              {w.arabic}
            </span>
          </motion.button>
        ))}
      </div>

      {/* the line */}
      <motion.div
        className="h-[min(0.55vw,1vh)] origin-right rounded-full bg-navy"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, ease: [0.6, 0, 0.2, 1] }}
      />

      <div className="grid grid-cols-[minmax(0,1.9fr)_repeat(6,minmax(0,1fr))]">
        <p className="pt-[1.4vh] pe-[1.5vw] text-[min(1.15vw,2.1vh)] leading-[1.6] text-ink/70">
          حروف الهندية تتدلّى من خطٍّ فوقها، وحروف العربية تجلس على السطر. والكلمة نفسها!
          <span className="mt-[0.5vh] block font-bold text-saffron-deep">المس كلمة لتراها بالأردية.</span>
        </p>
        {words.map((w, i) => (
          <motion.div
            key={w.id}
            className="flex flex-col items-center"
            initial={reduce ? false : { opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 + i * 0.07, type: 'spring', stiffness: 260, damping: 22 }}
          >
            {/* pulled up so the Devanagari headline bar merges into the navy line */}
            <span className="font-deva text-[min(3.5vw,6.4vh)] leading-none font-bold text-navy" style={{ marginTop: HANG }} lang="hi">
              {w.hindi}
            </span>
            <span
              className={`mt-[0.2vh] text-center transition-opacity duration-200 ${open === w.id ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden={open !== w.id}
            >
              <span className="block text-[min(1vw,1.8vh)] font-bold text-saffron-deep">بالأردية</span>
              <span className="font-urdu block text-[min(2.2vw,4vh)] leading-[1.9] text-ink" lang="ur">
                {w.urdu}
              </span>
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// Measured against the fonts' metrics so the letters meet the bar exactly:
// HANG pulls the Hindi word up until its headline stroke starts at the top edge of the bar,
// SIT pulls the Arabic word down until its baseline is a hair above the bar (tails may cross it, as on ruled paper).
const HANG = '-0.27em'
const SIT = '-0.39em'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Crown, Star } from 'lucide-react'
import AncientPiece from '../components/chess/AncientPiece.jsx'
import Leaderboard from '../components/chess/Leaderboard.jsx'
import QrCode from '../components/football/QrCode.jsx'
import { PIECES as MODERN, PIECE_CREDIT } from '../chess-shared/pieces.js'
import { CHECKMATE, JOURNEY, MATCH, PIECES, TIMELINE } from '../config/chess.js'
import { getConnectionInfo } from '../game/net/socket.js'

/** /chess: "India & Chess". Works on the laptop (big, from a distance) and on phones; the page scrolls. */
export default function ChessPage() {
  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-paper">
      <Hero />
      <div className="mx-auto max-w-[1500px] space-y-[clamp(3rem,8vh,6rem)] px-[clamp(1rem,4vw,4rem)] pb-16">
        <Countdown />
        <Morph />
        <Journey />
        <Timeline />
      </div>
      <PuzzleCta />
      <p className="bg-navy px-4 pb-4 text-center text-xs text-white/50" dir="ltr">
        {PIECE_CREDIT}
      </p>
    </div>
  )
}

/** Flag of India, drawn (Windows can't show the 🇮🇳 emoji: it shows the letters "IN"). */
function IndianFlag({ className = '' }) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-label="علم الهند" role="img">
      <rect width="30" height="20" fill="#fff" />
      <rect width="30" height="6.67" fill="#ff9933" />
      <rect y="13.33" width="30" height="6.67" fill="#138808" />
      <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth="0.55" />
      <circle cx="15" cy="10" r="0.6" fill="#000080" />
    </svg>
  )
}

// ---------------------------------------------------------------- 1. hero
function Hero() {
  const reduce = useReducedMotion()
  return (
    <section className="relative overflow-hidden bg-navy px-[clamp(1rem,4vw,4rem)] pt-[clamp(1.5rem,5vh,4rem)] pb-[clamp(2rem,6vh,5rem)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background:repeating-conic-gradient(#fff_0_25%,transparent_0_50%)_0_0/clamp(60px,8vw,110px)_clamp(60px,8vw,110px)]" />
      <div className="relative mx-auto grid max-w-[1500px] items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h1 className="font-display text-[clamp(2.6rem,6.5vw,6rem)] leading-[1.12]">
            الشطرنج وُلد في الهند <span className="whitespace-nowrap">
              <IndianFlag className="inline-block h-[0.62em] w-auto -translate-y-[0.06em] rounded-[0.08em] ring-2 ring-white/70" /> ♟️
            </span>
          </h1>
          <p className="mt-4 max-w-[36ch] text-[clamp(1.1rem,1.8vw,1.7rem)] leading-relaxed text-white/85">
            قبل نحو 1500 سنة لعب الهنود «تشاتورانغا»: جيش صغير من فيلة وخيّالة وعربات ومشاة. ومن هناك سافرت اللعبة إلى العالم كله.
          </p>
        </div>
        <div className="flex items-end justify-center gap-[clamp(0.2rem,1vw,1rem)]">
          {PIECES.map((p, i) => (
            <motion.div
              key={p.id}
              className="w-[clamp(3.2rem,9vw,8.5rem)]"
              initial={reduce ? false : { opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 140, damping: 16 }}
            >
              <div className="rounded-[1.4rem] bg-white/10 p-1.5">
                <AncientPiece id={p.id} className="h-auto w-full" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- 2. countdown
function Countdown() {
  const target = new Date(MATCH.game1).getTime()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const left = Math.max(0, target - now)
  const parts = [
    [Math.floor(left / 86400000), 'يوم'],
    [Math.floor(left / 3600000) % 24, 'ساعة'],
    [Math.floor(left / 60000) % 60, 'دقيقة'],
    [Math.floor(left / 1000) % 60, 'ثانية'],
  ]
  const date = new Date(MATCH.game1).toLocaleDateString('ar', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <section className="-mt-[clamp(1.5rem,4vh,3rem)] relative rounded-[2rem] bg-cream p-[clamp(1.2rem,3vw,2.5rem)] shadow-[0_20px_50px_-20px_rgba(0,0,128,0.35)] ring-1 ring-ink/5">
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-[clamp(1rem,1.4vw,1.3rem)] font-bold text-saffron-deep">بطولة العالم للشطرنج</p>
          <h2 className="mt-1 font-display text-[clamp(1.7rem,3.2vw,3rem)] leading-snug text-navy">
            غوكيش د. يدافع عن لقبه ضد جافوخير سيندروف في {MATCH.cityAr}
          </h2>
          <p className="mt-1 text-[clamp(1rem,1.4vw,1.3rem)] text-muted">
            المباراة الأولى: {date} <span dir="ltr">({MATCH.champion.name} vs {MATCH.challenger.name})</span>
          </p>
        </div>
        {left > 0 ? (
          <div className="flex gap-[clamp(0.4rem,1vw,0.9rem)]" dir="rtl">
            {parts.map(([n, label]) => (
              <div key={label} className="w-[clamp(4.2rem,7.5vw,7rem)] rounded-2xl bg-navy py-3 text-center text-white">
                <p className="font-display text-[clamp(2rem,4vw,3.6rem)] leading-none tabular-nums">{n}</p>
                <p className="mt-1 text-[clamp(0.85rem,1.1vw,1.1rem)] text-white/75">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-green px-6 py-4 font-display text-[clamp(1.6rem,3vw,2.6rem)] text-white">بدأت المباراة!</p>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- 3. from Chaturanga to chess
function Morph() {
  const [open, setOpen] = useState(null)
  return (
    <section>
      <h2 className="font-display text-[clamp(2rem,4vw,3.6rem)] leading-tight text-navy">من تشاتورانغا إلى الشطرنج</h2>
      <p className="mt-1 text-[clamp(1rem,1.5vw,1.4rem)] text-muted">المس قطعة (أو مرّر عليها) لترى كيف صارت قطعة الشطرنج التي نعرفها.</p>
      <div className="mt-6 grid grid-cols-2 gap-[clamp(0.6rem,1.4vw,1.2rem)] sm:grid-cols-3 lg:grid-cols-6">
        {PIECES.map((p) => {
          const on = open === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(on ? null : p.id)}
              onMouseEnter={() => setOpen(p.id)}
              onMouseLeave={() => setOpen((o) => (o === p.id ? null : o))}
              className={`group flex flex-col items-center rounded-[1.6rem] p-3 text-center ring-1 transition-colors focus-visible:outline-3 focus-visible:outline-saffron ${on ? 'bg-navy text-white ring-navy' : 'bg-cream ring-ink/10'}`}
              aria-pressed={on}
            >
              <div className="relative aspect-square w-full max-w-[9rem]">
                <AncientPiece id={p.id} className={`absolute inset-0 h-full w-full transition-all duration-500 ${on ? 'scale-50 -rotate-12 opacity-0' : 'scale-100 opacity-100'}`} />
                <img
                  src={MODERN[(on ? 'w' : 'b') + p.modern]}
                  alt={p.english}
                  className={`absolute inset-[8%] h-[84%] w-[84%] transition-all duration-500 ${on ? 'scale-100 rotate-0 opacity-100' : 'scale-50 rotate-12 opacity-0'}`}
                />
              </div>
              <p className={`mt-2 text-[clamp(1rem,1.4vw,1.25rem)] ${on ? 'text-white/70' : 'text-muted'}`}>
                <span className="font-deva">{p.ancient.sa}</span> <span dir="ltr">({p.ancient.tr})</span>
              </p>
              <p className={`text-[clamp(0.85rem,1.1vw,1rem)] ${on ? 'text-white/70' : 'text-muted'}`}>{p.ancient.ar}</p>
              <p className={`mt-1 font-display text-[clamp(1.5rem,2.4vw,2.2rem)] leading-tight ${on ? 'text-saffron' : 'text-navy'}`}>{p.arabic}</p>
              <p className={`text-[clamp(0.95rem,1.3vw,1.2rem)] font-bold ${on ? 'text-white' : 'text-ink/70'}`} dir="ltr">
                {p.english}
              </p>
              <p className={`mt-2 text-sm leading-snug transition-opacity ${on ? 'opacity-90' : 'opacity-0'}`}>{p.note}</p>
            </button>
          )
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[1.6rem] bg-saffron-soft px-6 py-4">
        <span className="font-display text-[clamp(1.6rem,2.6vw,2.4rem)] text-navy">«{CHECKMATE.arabic}»</span>
        <span className="text-[clamp(1rem,1.5vw,1.35rem)]">
          من الفارسية <i dir="ltr">{CHECKMATE.persian}</i>: {CHECKMATE.meaning}. ومنها جاءت الكلمة الإنجليزية <b dir="ltr">{CHECKMATE.english}</b>.
        </span>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- 4. the journey
// stop positions on a schematic map, east (India, right) to west (Europe) and then the whole world
const STOPS = { india: [880, 210], persia: [700, 120], arab: [520, 190], europe: [300, 90], world: [110, 190] }
const ROUTE = 'M880 210 C 820 150, 760 110, 700 120 S 580 200, 520 190 S 380 80, 300 90 S 160 170, 110 190'

function Journey() {
  const reduce = useReducedMotion()
  return (
    <section>
      <h2 className="font-display text-[clamp(2rem,4vw,3.6rem)] leading-tight text-navy">رحلة الشطرنج</h2>
      <div className="mt-4 overflow-hidden rounded-[2rem] bg-[#eef3ff] ring-1 ring-navy/10">
        <svg viewBox="0 0 1000 300" className="hidden h-auto w-full md:block" role="img" aria-label="الهند ← فارس ← العالم العربي ← أوروبا ← العالم">
          <motion.path
            d={ROUTE}
            fill="none"
            stroke="#ff9933"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="1 0"
            initial={reduce ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 2.2, ease: 'easeInOut' }}
          />
          {JOURNEY.map((s, i) => {
            const [x, y] = STOPS[s.id]
            return (
              <motion.g
                key={s.id}
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: 0.2 + i * 0.42 }}
                style={{ transformOrigin: `${x}px ${y}px` }}
              >
                <circle cx={x} cy={y} r="18" fill="#000080" stroke="#fff" strokeWidth="5" />
                <text x={x} y={y + 7} textAnchor="middle" fontSize="20" fill="#fff" fontWeight="800">
                  {i + 1}
                </text>
                <text x={x} y={y + 52} textAnchor="middle" fontSize="30" fill="#000080" fontFamily="Lalezar, sans-serif">
                  {s.name}
                </text>
                <text x={x} y={y + 80} textAnchor="middle" fontSize="18" fill="#63657e">
                  {s.era}
                </text>
              </motion.g>
            )
          })}
        </svg>
        <ol className="grid gap-3 p-5 md:grid-cols-5 md:pt-0">
          {JOURNEY.map((s, i) => (
            <li key={s.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="font-display text-xl text-navy">
                {i + 1}. {s.name} <span className="font-sans text-sm text-muted">({s.era})</span>
              </p>
              <p className="mt-1 text-[clamp(1rem,1.2vw,1.15rem)] leading-relaxed">{s.line}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------- 5. timeline
function Timeline() {
  const icon = (name) =>
    name === 'chariot' ? <AncientPiece id="rook" className="h-14 w-14" /> : name === 'crown' ? <Crown className="h-12 w-12 text-saffron" strokeWidth={2.2} /> : <Star className="h-12 w-12 text-saffron" strokeWidth={2.2} fill="#ff9933" />
  return (
    <section>
      <h2 className="font-display text-[clamp(2rem,4vw,3.6rem)] leading-tight text-navy">من الهند إلى القمة</h2>
      <ol className="relative mt-6 grid gap-5 md:grid-cols-3">
        <div className="absolute top-12 right-[16%] left-[16%] hidden h-1.5 rounded-full bg-gradient-to-l from-saffron via-white to-green ring-1 ring-ink/5 md:block" />
        {TIMELINE.map((t) => (
          <li key={t.id} className="relative flex flex-col items-center text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-navy shadow-lg ring-4 ring-white">{icon(t.icon)}</div>
            <p className="mt-3 font-display text-2xl text-saffron-deep" dir="ltr">
              {t.when}
            </p>
            <p className="font-display text-[clamp(1.5rem,2.4vw,2.2rem)] leading-tight text-navy">{t.title}</p>
            <p className="mt-1 max-w-[28ch] text-[clamp(1rem,1.3vw,1.25rem)] leading-relaxed text-ink/80">{t.line}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------------------------------------------------------------- 6. puzzle challenge (bottom)
function PuzzleCta() {
  const [info, setInfo] = useState(undefined)
  useEffect(() => {
    getConnectionInfo().then(setInfo)
  }, [])
  const url = info ? `http://${info.ip}:${window.location.port || 80}/chess/puzzles` : null
  return (
    <section className="bg-navy px-[clamp(1rem,4vw,4rem)] py-[clamp(2.5rem,7vh,5rem)] text-white">
      <div className="mx-auto grid max-w-[1500px] gap-8 lg:grid-cols-[1.15fr_1fr] [&>*]:min-w-0">
        <div>
          <h2 className="font-display text-[clamp(2.2rem,4.5vw,4rem)] leading-tight">تحدّي ألغاز الشطرنج ♟️</h2>
          <p className="mt-2 text-[clamp(1.05rem,1.6vw,1.5rem)] text-white/85">15 مستوى، 3 محاولات. هل تصل إلى لقب «غراندماستر»؟</p>
          <div className="mt-6 flex flex-col items-stretch gap-6 sm:flex-row sm:items-center">
            {/* a full page load: the challenge is its own small page */}
            <a
              href="/chess/puzzles"
              className="rounded-[1.6rem] bg-saffron px-8 py-5 text-center font-display text-[clamp(1.6rem,2.6vw,2.4rem)] text-navy sm:whitespace-nowrap shadow-[0_8px_0_#b8600a] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_3px_0_#b8600a]"
            >
              ابدأ تحدّي الألغاز ♟️
            </a>
            <div className="flex min-w-0 items-center gap-4">
              <div className="shrink-0 rounded-3xl bg-white p-3">
                {url ? <QrCode text={url} size={180} /> : <div className="grid h-[180px] w-[180px] place-items-center text-center text-navy">{info === null ? 'الخادم غير متصل' : '…'}</div>}
              </div>
              <div>
                <p className="font-display text-[clamp(1.3rem,2vw,1.8rem)]">امسح لتلعب على هاتفك</p>
                <p className="mt-1 font-mono text-sm break-all text-white/60" dir="ltr">
                  {url ?? ''}
                </p>
              </div>
            </div>
          </div>
        </div>
        <Leaderboard />
      </div>
    </section>
  )
}

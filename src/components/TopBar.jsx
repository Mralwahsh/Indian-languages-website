import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Maximize, Minimize, RotateCcw } from 'lucide-react'
import { useVisitor } from '../context/VisitorContext.jsx'
import { useFullscreen } from '../hooks/useFullscreen.js'
import Chakra from './Chakra.jsx'

const NAV = [
  { to: '/', label: 'الرئيسية' },
  { to: '/map', label: 'الخريطة' },
  { to: '/name', label: 'اسمك' },
  { to: '/game', label: 'اللعبة' },
  { to: '/tour', label: 'جولات' },
  { to: '/football', label: 'كرة القدم' },
  { to: '/chess', label: 'شطرنج' },
  { to: '/tiles-qr', label: 'بيانو' }, // Raga Tiles: the laptop shows only a QR code (Esc comes back)
]

export default function TopBar({ onReset }) {
  const { result } = useVisitor()
  const { isFullscreen, toggle } = useFullscreen()

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-2 bg-paper/85 px-2 shadow-[0_1px_0_rgba(16,18,58,0.06)] backdrop-blur sm:h-20 sm:gap-4 sm:px-6 xl:gap-6 xl:px-8">
      {/* tricolour band along the bottom of the bar */}
      <div className="tricolor-band absolute inset-x-0 bottom-0 h-1.5" />
      <NavLink to="/" className="flex shrink-0 items-center gap-4">
        <span className="grid h-13 w-13 place-items-center rounded-full bg-paper shadow-[0_0_0_3px_#ff9933,0_0_0_6px_#fff,0_0_0_9px_#138808]">
          <Chakra size={42} spin duration={40} />
        </span>
        <span className="hidden leading-tight lg:block">
          <span className="block font-display text-2xl font-extrabold text-navy">الهند تتحدّث</span>
          <span className="block font-deva text-sm font-semibold text-green">भारत बोलता है</span>
        </span>
      </NavLink>

      <nav className="no-scrollbar mx-auto flex min-w-0 items-center gap-1 overflow-x-auto rounded-full bg-ink/5 p-1.5">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end className="relative shrink-0 rounded-full px-3 py-1.5 text-base font-bold whitespace-nowrap sm:px-4 sm:py-2 sm:text-lg xl:px-6 xl:text-xl">
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-navy shadow"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className={`relative ${isActive ? 'text-white' : 'text-ink/70 hover:text-ink'}`}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {result && (
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden max-w-56 truncate rounded-full bg-saffron-soft px-4 py-2 text-lg font-semibold text-ink 2xl:block"
            title="اسم الزائر"
          >
            👋 <bdi>{result.display}</bdi>
          </motion.span>
        )}
        <button
          onClick={toggle}
          className="hidden h-12 w-12 place-items-center rounded-full bg-ink/5 text-ink transition hover:bg-ink/10 sm:grid"
          title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
        >
          {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
        </button>
        <button
          onClick={onReset}
          className="flex h-10 items-center gap-2 rounded-full bg-accent px-3 text-lg font-bold text-white shadow-sm transition hover:brightness-110 active:scale-95 sm:h-12 sm:px-5"
          title="زائر جديد (Esc)"
        >
          <RotateCcw size={20} />
          <span className="hidden sm:inline">من جديد</span>
        </button>
      </div>
    </header>
  )
}

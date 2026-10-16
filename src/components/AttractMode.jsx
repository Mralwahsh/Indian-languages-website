import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getLanguages, getLanguageFamilies } from '../services/dataService.js'
import { scriptFont, scriptDir } from '../config/scripts.js'
import { BOOTH } from '../config/booth.js'
import FitText from './FitText.jsx'
import Chakra from './Chakra.jsx'

/**
 * Full-screen idle loop styled as the Indian flag: saffron band, white centre with a turning
 * Ashoka Chakra, green band. Cycles "Hello" in many Indian languages. Any input closes it (parent).
 */
export default function AttractMode() {
  const [languages, setLanguages] = useState([])
  const [families, setFamilies] = useState({})
  const [index, setIndex] = useState(0)

  useEffect(() => {
    getLanguages().then((ls) => setLanguages(ls.filter((l) => l.script !== 'latin')))
    getLanguageFamilies().then(setFamilies)
  }, [])

  useEffect(() => {
    if (!languages.length) return
    const t = setInterval(() => setIndex((i) => (i + 1) % languages.length), BOOTH.attractSlideMs)
    return () => clearInterval(t)
  }, [languages.length])

  const lang = languages[index]
  const color = families[lang?.family]?.color ?? '#ff9933'

  return (
    <motion.div
      className="fixed inset-0 z-50 flex cursor-pointer flex-col overflow-hidden bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      transition={{ duration: 0.8 }}
    >
      {/* saffron band */}
      <motion.div
        className="relative grid h-[22%] shrink-0 place-items-center bg-gradient-to-b from-[#ff8a1f] to-saffron"
        initial={{ y: '-100%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <p className="font-display text-5xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">كيف تقول الهند «مرحبا»؟</p>
      </motion.div>

      {/* white centre with the chakra */}
      <div className="relative grid min-h-0 flex-1 place-items-center">
        <Chakra size={520} spin duration={50} className="pointer-events-none absolute opacity-[0.09]" />
        <AnimatePresence mode="popLayout">
          {lang && (
            <motion.div
              key={lang.id}
              className="absolute inset-x-0 flex flex-col items-center px-16"
              initial={{ opacity: 0, y: 50, scale: 0.85, filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -50, scale: 1.1, filter: 'blur(12px)' }}
              transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <FitText dir={scriptDir(lang.script)} className={`${scriptFont(lang.script)} text-[8.5rem] leading-[1.35] font-bold text-navy`}>
                {lang.helloNative}
              </FitText>
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-ink/80">«{lang.helloPronunciationAr}»</span>
                <span className="rounded-full px-5 py-1.5 text-2xl font-bold text-white" style={{ backgroundColor: color }}>
                  {lang.nameAr}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* green band */}
      <motion.div
        className="relative flex h-[22%] shrink-0 flex-col items-center justify-center bg-gradient-to-b from-green to-[#0f6e06]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <motion.span
          className="font-display text-5xl font-extrabold text-white"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          المس أي مكان للبدء
        </motion.span>
        <span className="absolute start-10 bottom-4 font-display text-lg font-bold text-white/70">
          الهند تتحدّث · الأسبوع الدولي في جامعة الحسين التقنية
        </span>
      </motion.div>
    </motion.div>
  )
}

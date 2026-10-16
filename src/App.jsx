import { useCallback, useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { VisitorProvider, useVisitor } from './context/VisitorContext.jsx'
import { useIdle } from './hooks/useIdle.js'
import { BOOTH } from './config/booth.js'
import TopBar from './components/TopBar.jsx'
import AttractMode from './components/AttractMode.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import HomePage from './pages/HomePage.jsx'
import MapPage from './pages/MapPage.jsx'
import NamePage from './pages/NamePage.jsx'
import GamePage from './pages/GamePage.jsx'

function Shell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { reset, resetKey } = useVisitor()
  const idle = useIdle(BOOTH.idleSeconds)

  const resetAll = useCallback(() => {
    reset()
    navigate('/')
  }, [reset, navigate])

  // Esc = new visitor (works everywhere, including inside inputs)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') resetAll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resetAll])

  // If attract mode keeps running, the visitor has left: wipe their data.
  useEffect(() => {
    if (!idle) return
    const t = setTimeout(resetAll, BOOTH.attractResetSeconds * 1000)
    return () => clearTimeout(t)
  }, [idle, resetAll])

  return (
    <div className="bg-exhibit flex h-full flex-col">
      <TopBar onReset={resetAll} />
      <main className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${location.pathname}#${resetKey}`}
            className="absolute inset-0"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <ErrorBoundary resetKey={resetKey} onReset={resetAll}>
              <Routes location={location}>
                <Route path="/" element={<HomePage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/name" element={<NamePage />} />
                <Route path="/game" element={<GamePage />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>
      <AnimatePresence>{idle && <AttractMode key="attract" />}</AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <VisitorProvider>
        <Shell />
      </VisitorProvider>
    </HashRouter>
  )
}

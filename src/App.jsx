import { Suspense, lazy, useCallback, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
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

// The football game (Phaser) and the phone controller are loaded only when visited.
const FootballPage = lazy(() => import('./pages/FootballPage.jsx'))
const ControllerPage = lazy(() => import('./pages/ControllerPage.jsx'))
// Virtual tours (360° viewer) and their own phone controller, separate from the football one.
const TourPage = lazy(() => import('./pages/TourPage.jsx'))
const TourControllerPage = lazy(() => import('./pages/TourControllerPage.jsx'))
// Team tool: check the Google Street View key and find panoramas (not in the top bar).
const StreetViewTestPage = lazy(() => import('./pages/StreetViewTestPage.jsx'))
// Raga Tiles: the laptop only shows a QR code; the game itself is the separate /tiles page (tiles.html).
const TilesQrPage = lazy(() => import('./pages/TilesQrPage.jsx'))
// India & Chess (the puzzle challenge itself is the separate /chess/puzzles page, chess-puzzles.html).
const ChessPage = lazy(() => import('./pages/ChessPage.jsx'))

// A phone (touch, small screen) visiting a page: never show the booth's attract mode on it.
const IS_PHONE = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) < 600

// Pages driven by a phone: no attract mode, and Reset stays on the page (back to its start screen).
const PHONE_PAGES = ['/football', '/tour']

function Shell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { reset, resetKey } = useVisitor()
  // During a match or tour the laptop gets no mouse/keyboard input (visitors use phones): no attract mode there.
  const onPhonePage = PHONE_PAGES.includes(location.pathname)
  const idle = useIdle(BOOTH.idleSeconds, !onPhonePage && !IS_PHONE)

  // Reset = new visitor. On the football page it ends the match and goes back to its lobby;
  // on the tour page it leaves the 360° view and goes back to the map of places.
  const resetAll = useCallback(() => {
    reset()
    if (!PHONE_PAGES.includes(window.location.pathname)) navigate('/')
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
                <Route
                  path="/football"
                  element={
                    <Suspense fallback={null}>
                      <FootballPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/tour"
                  element={
                    <Suspense fallback={null}>
                      <TourPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/chess"
                  element={
                    <Suspense fallback={null}>
                      <ChessPage />
                    </Suspense>
                  }
                />
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
    <BrowserRouter>
      <Routes>
        {/* phone controller: standalone page, none of the booth chrome */}
        <Route
          path="/controller"
          element={
            <Suspense fallback={null}>
              <ControllerPage />
            </Suspense>
          }
        />
        <Route
          path="/tiles-qr"
          element={
            <Suspense fallback={null}>
              <TilesQrPage />
            </Suspense>
          }
        />
        <Route
          path="/streetview-test"
          element={
            <Suspense fallback={null}>
              <StreetViewTestPage />
            </Suspense>
          }
        />
        <Route
          path="/tour-controller"
          element={
            <Suspense fallback={null}>
              <TourControllerPage />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <VisitorProvider>
              <Shell />
            </VisitorProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

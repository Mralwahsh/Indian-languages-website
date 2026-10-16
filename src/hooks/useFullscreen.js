import { useCallback, useEffect, useState } from 'react'

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement)

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
        // Chrome/Edge: let a short Esc press reach the page (= Reset) instead of exiting
        // fullscreen. Holding Esc still exits fullscreen.
        await navigator.keyboard?.lock?.(['Escape']).catch(() => {})
      }
    } catch {
      /* browser refused (e.g. not triggered by a click) — ignore */
    }
  }, [])

  return { isFullscreen, toggle }
}

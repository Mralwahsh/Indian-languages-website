import { useEffect, useRef, useState } from 'react'

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'pointerdown']

/** true after `seconds` without any user input; flips back to false on the next input. */
export function useIdle(seconds) {
  const [idle, setIdle] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    const arm = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setIdle(true), seconds * 1000)
    }
    const onActivity = () => {
      setIdle(false)
      arm()
    }
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    arm()
    return () => {
      clearTimeout(timer.current)
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [seconds])

  return idle
}

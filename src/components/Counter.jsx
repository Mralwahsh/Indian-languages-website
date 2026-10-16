import { useEffect, useRef } from 'react'
import { animate, useInView } from 'framer-motion'

/** Number that counts up from 0 when it appears. */
export default function Counter({ to, duration = 1.8, delay = 0, suffix = '', className = '', ...props }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView || !ref.current) return
    const controls = animate(0, to, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toLocaleString('en-US') + suffix
      },
    })
    return () => controls.stop()
  }, [inView, to, duration, delay, suffix])

  return (
    <span ref={ref} className={className} {...props}>
      0{suffix}
    </span>
  )
}

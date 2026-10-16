import { useLayoutEffect, useRef, useState } from 'react'

/** Shrinks a single line of text (never enlarges) so it fits the available width. */
export default function FitText({ children, className = '', ...props }) {
  const outer = useRef(null)
  const inner = useRef(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return
      const available = outer.current.clientWidth
      const needed = inner.current.scrollWidth
      setScale(needed > available ? available / needed : 1)
    }
    measure()
    document.fonts?.ready.then(measure)
    const ro = new ResizeObserver(measure)
    ro.observe(outer.current)
    return () => ro.disconnect()
  }, [children])

  return (
    <div ref={outer} className="flex w-full justify-center">
      <span
        ref={inner}
        className={`inline-block whitespace-nowrap ${className}`}
        style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
        {...props}
      >
        {children}
      </span>
    </div>
  )
}

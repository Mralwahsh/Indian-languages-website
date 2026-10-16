import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { transliterateName } from '../services/transliteration.js'

const VisitorContext = createContext(null)

/**
 * Everything that belongs to the current visitor.
 * `resetKey` changes on every reset; pages are keyed on it so their local state is wiped too.
 */
export function VisitorProvider({ children }) {
  const [name, setName] = useState('')
  const [result, setResult] = useState(null)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      const r = await transliterateName(name)
      if (!cancelled) setResult(r)
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [name])

  const reset = useCallback(() => {
    setName('')
    setResult(null)
    setResetKey((k) => k + 1)
  }, [])

  const value = useMemo(() => ({ name, setName, result, resetKey, reset }), [name, result, resetKey, reset])
  return <VisitorContext.Provider value={value}>{children}</VisitorContext.Provider>
}

export function useVisitor() {
  const ctx = useContext(VisitorContext)
  if (!ctx) throw new Error('useVisitor must be used inside <VisitorProvider>')
  return ctx
}

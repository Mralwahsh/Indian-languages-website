import { useCallback, useEffect, useRef, useState } from 'react'

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * "Today's top solvers", refreshed every 5 seconds from the laptop's server.
 * Hidden admin action: Shift+R three times (within 3 s) clears today's list (allowed only on the laptop).
 */
export default function Leaderboard() {
  const [top, setTop] = useState(null) // null = loading, [] = empty
  const [offline, setOffline] = useState(false)
  const presses = useRef([])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/chess/scores', { cache: 'no-store' })
      if (!res.ok) throw new Error(res.status)
      setTop((await res.json()).top)
      setOffline(false)
    } catch {
      setOffline(true)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    const onKey = async (e) => {
      if (!(e.shiftKey && e.key.toLowerCase() === 'r')) return
      const now = Date.now()
      presses.current = [...presses.current.filter((t0) => now - t0 < 3000), now]
      if (presses.current.length < 3) return
      presses.current = []
      if (!window.confirm('مسح قائمة «أفضل اللاعبين اليوم»؟')) return
      const res = await fetch('/api/chess/scores', { method: 'DELETE' }).catch(() => null)
      if (!res?.ok) window.alert('لم يتم المسح: يعمل فقط على حاسوب الجناح نفسه.')
      load()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [load])

  return (
    <div className="rounded-[2rem] bg-white/10 p-5 ring-1 ring-white/15">
      <h3 className="font-display text-[clamp(1.5rem,2.4vw,2.2rem)] text-saffron">🏆 أفضل اللاعبين اليوم</h3>
      {top === null ? (
        <p className="mt-3 text-white/70">{offline ? 'الخادم غير متصل' : '…'}</p>
      ) : top.length === 0 ? (
        <p className="mt-3 text-lg text-white/80">لا أحد بعد. كن الأول!</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {top.map((e, i) => (
            <li key={i} className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-[clamp(1rem,1.5vw,1.35rem)] ${i === 0 ? 'bg-saffron/25' : 'bg-white/5'}`}>
              <span className="w-8 text-center font-display text-saffron">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
              <bdi className="min-w-0 flex-1 truncate font-bold">{e.nickname ?? 'ضيف'}</bdi>
              <span className="font-bold whitespace-nowrap">
                المستوى <span dir="ltr">{e.level}/15</span>
              </span>
              <span className="w-16 text-end font-mono text-white/75" dir="ltr">
                {fmt(e.time)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

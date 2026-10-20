import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * React wrapper around the Phaser game. Phaser is loaded on demand (it's big), and the game
 * only receives InputSources: it never knows whether a phone, keyboard or CPU is playing.
 */
export default function FootballStage({ characters, sources, paused, onEvent }) {
  const hostRef = useRef(null)
  const gameRef = useRef(null)
  const pausedRef = useRef(paused)
  const onEventRef = useRef(onEvent)
  useLayoutEffect(() => {
    pausedRef.current = paused
    onEventRef.current = onEvent
  })

  useEffect(() => {
    let cancelled = false
    import('../../game/football/createFootballGame.js').then(async ({ createFootballGame }) => {
      if (cancelled) return
      const game = await createFootballGame(hostRef.current, {
        characters,
        sources,
        onEvent: (ev) => onEventRef.current?.(ev),
      })
      if (cancelled) return game.destroy()
      gameRef.current = game
      game.setPaused(pausedRef.current)
    })
    return () => {
      cancelled = true
      gameRef.current?.destroy()
      gameRef.current = null
    }
    // a new match = new sources object; characters are fixed for the match
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources])

  useEffect(() => {
    gameRef.current?.setPaused(paused)
  }, [paused])

  // overflow-hidden: Phaser centres the canvas with margin-top, which would otherwise "leak" out and push the page down
  return <div ref={hostRef} className="h-full w-full overflow-hidden bg-[#1b1f63]" />
}

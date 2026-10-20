import { useEffect, useLayoutEffect, useRef } from 'react'
import { SLOT_CHARACTER } from '../../game/characters/index.js'

/**
 * React wrapper around the Phaser game. Phaser is loaded on demand (it's big), and the game
 * only receives InputSources — it never knows whether a phone, keyboard or CPU is playing.
 */
export default function FightStage({ sources, paused, onEvent }) {
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
    import('../../game/phaser/createFightGame.js').then(async ({ createFightGame }) => {
      if (cancelled) return
      const game = await createFightGame(hostRef.current, {
        characters: SLOT_CHARACTER,
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
  }, [sources])

  useEffect(() => {
    gameRef.current?.setPaused(paused)
  }, [paused])

  // overflow-hidden: Phaser centres the canvas with margin-top, which would otherwise "leak" out and push the page down
  return <div ref={hostRef} className="h-full w-full overflow-hidden bg-[#10123a]" />
}

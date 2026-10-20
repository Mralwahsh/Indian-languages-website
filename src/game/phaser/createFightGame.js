import Phaser from 'phaser'
import { FightScene, GAME_SIZE } from './FightScene.js'

/**
 * Mounts the fighting game into `parent`.
 * @param {HTMLElement} parent
 * @param {{ characters: {p1, p2}, sources: {p1: InputSource, p2: InputSource}, onEvent?: (ev) => void }} opts
 * @returns {Promise<{ setPaused(paused: boolean): void, destroy(): void }>}
 */
export async function createFightGame(parent, opts) {
  // Phaser draws text on a canvas: make sure the Arabic + Latin fonts are ready first
  try {
    await Promise.all([document.fonts.load('700 64px "IS Kufi"'), document.fonts.load('700 64px "Bricolage Grotesque Variable"')])
  } catch {
    /* fall back to system fonts */
  }

  // ?timer=1 forces a setTimeout loop (for testing in background tabs where rAF is paused)
  const forceSetTimeOut = new URLSearchParams(window.location.search).has('timer')

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_SIZE.width,
    height: GAME_SIZE.height,
    backgroundColor: '#1b1f63',
    banner: false,
    disableContextMenu: true,
    audio: { noAudio: true }, // our own Web Audio sfx
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    fps: { target: 60, forceSetTimeOut },
    render: { antialias: true, roundPixels: false },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false }, // input comes from InputSources
  })

  const scene = await new Promise((resolve) => {
    game.events.once('ready', () => {
      game.scene.add('fight', FightScene, true, opts)
      resolve(game.scene.getScene('fight'))
    })
  })

  if (import.meta.env.DEV) window.__fightScene = scene // handy for debugging in the console

  return {
    setPaused: (paused) => scene.setPaused?.(paused),
    destroy: () => game.destroy(true),
  }
}

import Phaser from 'phaser'
import { PHYSICS, WORLD } from './config.js'
import { FootballScene } from './FootballScene.js'
import { headDataUrl } from './characters/art.js'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Mounts Big Head Football into `parent`.
 * @param {{ characters: {p1, p2}, sources: {p1, p2}, onEvent?: (ev) => void }} opts
 * @returns {Promise<{ setPaused(paused: boolean): void, destroy(): void }>}
 */
export async function createFootballGame(parent, opts) {
  // fonts for canvas text + head textures (generated SVG, or real art from character.sprites.head)
  const heads = {}
  await Promise.all([
    document.fonts.load('700 64px "IS Kufi"').catch(() => {}),
    document.fonts.load('700 64px "Bricolage Grotesque Variable"').catch(() => {}),
    ...Object.values(opts.characters).map(async (c) => {
      heads[c.id] = await loadImage(c.sprites?.head ?? headDataUrl(c, { pupils: false }))
    }),
  ])

  // ?timer=1 forces a setTimeout loop (testing in background tabs where requestAnimationFrame is paused)
  const forceSetTimeOut = new URLSearchParams(window.location.search).has('timer')

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WORLD.width,
    height: WORLD.height,
    backgroundColor: '#1b1f63',
    banner: false,
    disableContextMenu: true,
    audio: { noAudio: true }, // our own Web Audio sfx
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    fps: { target: 60, forceSetTimeOut },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false }, // input comes from InputSources
    physics: {
      default: 'matter',
      matter: {
        gravity: { y: PHYSICS.gravity },
        autoUpdate: false, // we step the world ourselves at a fixed 60 Hz
        positionIterations: PHYSICS.positionIterations,
        velocityIterations: PHYSICS.velocityIterations,
        enableSleeping: false,
        debug: new URLSearchParams(window.location.search).has('debug'),
      },
    },
  })

  const scene = await new Promise((resolve) => {
    game.events.once('ready', () => {
      for (const [id, img] of Object.entries(heads)) if (!game.textures.exists(`head-${id}`)) game.textures.addImage(`head-${id}`, img)
      game.scene.add('football', FootballScene, true, opts)
      resolve(game.scene.getScene('football'))
    })
  })

  if (import.meta.env.DEV) window.__football = scene // handy for debugging in the console

  return {
    setPaused: (paused) => scene.setPaused?.(paused),
    destroy: () => game.destroy(true),
  }
}

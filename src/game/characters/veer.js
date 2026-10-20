// Veer — original character: a palace guard in a saffron kurta and navy turban.
// Special: "Chakra Throw", a spinning disc projectile.
//
// To use real art later, fill `sprites` (see src/game/characters/README.md) — no game code changes needed.
// Frame numbers are at 60 FPS. Hitbox x = distance in front of the body centre, y = height above the feet (negative = up).
export default {
  id: 'veer',
  name: 'Veer',
  nameAr: 'فير',
  titleAr: 'حارس القصر',
  colors: {
    main: '#ff9933', // kurta (saffron)
    trim: '#000080', // turban + sash (navy)
    pants: '#fff6e6', // dhoti / churidar
    skin: '#b0784c',
    hair: '#2b1a10',
    accent: '#ffd23f', // plume, bangles
    outline: '#3a2414',
  },
  look: { headwear: 'turban' },

  sprites: null, // e.g. { sheet: 'sprites/veer.png', frameWidth: 256, frameHeight: 256, anchorY: 1, anims: { idle: { frames: [0, 5], frameRate: 8, repeat: -1 }, … } }

  stats: {
    maxHp: 100,
    walkSpeed: 4.4,
    backSpeed: 3.4,
    jumpVelocity: 17.5,
    width: 64,
    height: 176,
    crouchHeight: 112,
  },

  moves: {
    punch: { startup: 4, active: 4, recovery: 9, damage: 6, hitstun: 15, blockstun: 9, knockback: 5, hitbox: { x: 26, y: -150, w: 66, h: 28 } },
    kick: { startup: 7, active: 5, recovery: 14, damage: 9, hitstun: 19, blockstun: 11, knockback: 8, hitbox: { x: 22, y: -112, w: 94, h: 34 } },
    special: {
      type: 'projectile',
      nameAr: 'رمية الشاكرا',
      startup: 14,
      active: 1,
      recovery: 22,
      cooldown: 240,
      damage: 12,
      hitstun: 20,
      blockstun: 12,
      knockback: 9,
      projectile: { speed: 9.5, size: 46, y: -136, life: 170 },
    },
  },
}

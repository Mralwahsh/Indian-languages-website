// Tara — original character: a fast fighter inspired by Kerala's Kalaripayattu, in green and white.
// Special: "Tiger Leap", a fast forward dash that hits along the way.
//
// To use real art later, fill `sprites` (see src/game/characters/README.md) — no game code changes needed.
export default {
  id: 'tara',
  name: 'Tara',
  nameAr: 'تارا',
  titleAr: 'محاربة الكالاري',
  colors: {
    main: '#138808', // top (India green)
    trim: '#ffd23f', // gold border
    pants: '#ffffff',
    skin: '#9c6640',
    hair: '#1a1210',
    accent: '#ff9933',
    outline: '#16300f',
  },
  look: { headwear: 'bun' },

  sprites: null,

  stats: {
    maxHp: 100,
    walkSpeed: 5.0,
    backSpeed: 3.8,
    jumpVelocity: 18,
    width: 60,
    height: 168,
    crouchHeight: 106,
  },

  moves: {
    punch: { startup: 3, active: 3, recovery: 8, damage: 5, hitstun: 14, blockstun: 8, knockback: 5, hitbox: { x: 24, y: -142, w: 62, h: 26 } },
    kick: { startup: 6, active: 5, recovery: 13, damage: 8, hitstun: 18, blockstun: 10, knockback: 8, hitbox: { x: 20, y: -104, w: 96, h: 34 } },
    special: {
      type: 'dash',
      nameAr: 'وثبة النمر',
      startup: 8,
      active: 16,
      recovery: 18,
      cooldown: 240,
      damage: 13,
      hitstun: 22,
      blockstun: 12,
      knockback: 12,
      dashSpeed: 15,
      hitbox: { x: 6, y: -150, w: 72, h: 110 },
    },
  },
}

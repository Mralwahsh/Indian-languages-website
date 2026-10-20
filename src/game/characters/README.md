# Characters

One file per fighter (`veer.js`, `tara.js`). Everything about a character lives there: names, colours, sprite paths and move stats. Nothing else in the game needs to change when you edit or add one.

## Swapping in real art

Right now `sprites: null` and the game draws a clean placeholder figure from the `colors`. To use a sprite sheet instead:

1. Put the image in `public/sprites/` (e.g. `public/sprites/veer.png`). All frames must have the same size, laid out left-to-right, top-to-bottom.
2. Fill in `sprites` in the character file:

```js
sprites: {
  sheet: 'sprites/veer.png',
  frameWidth: 256,
  frameHeight: 256,
  anchorY: 1,        // 1 = the bottom of the frame is the fighter's feet
  scale: 0.8,        // optional
  anims: {
    idle:    { frames: [0, 5],   frameRate: 8,  repeat: -1 },
    walk:    { frames: [6, 13],  frameRate: 12, repeat: -1 },
    jump:    { frames: [14, 17], frameRate: 10 },
    crouch:  { frames: [18, 18] },
    block:   { frames: [19, 19] },
    punch:   { frames: [20, 23], frameRate: 20 },
    kick:    { frames: [24, 28], frameRate: 18 },
    special: { frames: [29, 34], frameRate: 14 },
    hit:     { frames: [35, 36], frameRate: 12 },
    ko:      { frames: [37, 40], frameRate: 8 },
    win:     { frames: [41, 44], frameRate: 8, repeat: -1 },
  },
},
```

Missing animations fall back to `idle`. Frames are the sheet's frame numbers (first and last). Draw the character **facing right**; the game mirrors it automatically.

## Tuning moves

All numbers are in frames at 60 FPS:

| Field | Meaning |
| --- | --- |
| `startup` / `active` / `recovery` | wind-up, frames that can hit, cool-down |
| `damage` | HP removed (blocked hits do 20 %) |
| `hitstun` / `blockstun` | how long the opponent is stuck |
| `knockback` | push distance per frame |
| `hitbox` | hit area: `x` = distance in front of the body centre, `y` = height above the feet (negative = up) |
| `special.cooldown` | frames until the special can be used again (240 = 4 s) |
| `special.type` | `'projectile'` (uses `projectile: { speed, size, y, life }`) or `'dash'` (uses `dashSpeed`, `hitbox`) |

After changing numbers, check the balance without a browser:

```bash
npm run sim
```

It plays hundreds of matches with the real engine (CPU vs CPU, a button-masher vs CPU, an idle player vs CPU) and prints who wins and how long matches last.

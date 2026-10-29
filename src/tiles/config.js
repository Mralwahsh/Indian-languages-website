// Raga Tiles: every tuning value in one place. Times in seconds.

export const LANES = 4

/** Timing windows around the moment a tile's bottom edge reaches the hit line. */
export const TIMING = {
  perfect: 0.075, // ± this → Perfect
  good: 0.15, // ± this → Good; later than this → Miss
  early: 0.24, // a tap may come this early and still count (as Good)
}

export const SCORE = {
  perfect: 100,
  good: 50,
  holdPerSecond: 120, // extra points while a hold tile is held
  comboStep: 10, // every 10 in a row raises the multiplier…
  comboBonus: 0.25, // …by 0.25…
  comboMaxMult: 2, // …up to ×2
}

/** Stars from the share of the best possible score (classic songs must also be finished). */
export const STARS = { two: 0.65, three: 0.9 }

/** How fast tiles fall, in screen heights per second. */
export const SPEED = { easy: 0.46, normal: 0.6 }

export const HIT_LINE = 0.8 // hit line at 80% of the screen height
export const TILE_SEC = 0.3 // a normal tile is this long (its height = speed × this)

/** How forgiving a touch is: a tile also takes taps this far around it. */
export const TOUCH = {
  padY: 0.5, // tile heights above and below the tile
  padX: 0.18, // lane widths into the lanes on either side
}
export const HOLD_MIN = 0.55 // songs without a "hold" flag: notes at least this long become hold tiles
export const LEAD_IN = 2.2 // time before the first tile reaches the line
export const EASY_MIN_GAP = 0.34 // Easy: at least this much time between tiles
export const END_PAUSE = 1.4 // after the last note, wait this long before the end screen

/** The browser's piano: synthesized at load time, no recordings. */
export const PIANO = { sampleRate: 32000, volume: 0.8 }

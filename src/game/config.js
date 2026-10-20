// Game-wide settings for "India Fighters". All frame counts are at 60 FPS.

export const WORLD = {
  width: 1280,
  height: 720,
  floorY: 640, // fighters' feet
  leftBound: 70,
  rightBound: 1210,
  startGap: 380, // distance between fighters at round start
}

export const PHYSICS = {
  gravity: 0.95,
  hitKnockbackFriction: 0.86,
  pushApart: 0.5,
}

export const RULES = {
  roundSeconds: 60,
  roundsToWin: 2, // best of 3
  maxRounds: 5, // safety net for draws
  blockDamageFactor: 0.2,
  blockKnockbackFactor: 0.5,
  hitstopFrames: 5, // tiny freeze on every hit, for impact
  roundOverFrames: 170,
}

/** CPU opponent: simple and beatable. Raise reaction speed / chances to make it harder. */
export const CPU = {
  reactionFrames: 14, // how often it re-thinks (lower = faster)
  attackRange: 120,
  attackChance: 0.55,
  kickRatio: 0.4,
  blockChance: 0.3, // chance to block when the player attacks nearby
  jumpChance: 0.04,
  specialChance: 0.08,
  retreatChance: 0.12,
  idleChance: 0.15, // sometimes just stands there (gives visitors openings)
}

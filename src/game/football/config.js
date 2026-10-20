// Big Head Football — every tuning value in one place.
// Units: pixels and physics steps (60 steps per second). "per step" ≈ per frame at 60 FPS.
// Tip: change one number at a time, reload /football, play 30 seconds, repeat.

export const WORLD = {
  width: 1280,
  height: 720,
  groundY: 640, // top of the grass
  cameraDrift: 0.05, // how much the camera follows the ball sideways (parallax). 0 = static
}

export const PHYSICS = {
  gravity: 1.9, // Matter gravity (≈0.53 px/step²). Higher = snappier, less floaty
  positionIterations: 8, // solver quality (stability of stacked/pressed bodies)
  velocityIterations: 6,
  maxStepMs: 100, // clamp after a hitch so nothing explodes
}

export const BALL = {
  radius: 22,
  restitution: 0.8, // bounciness 0..1
  friction: 0.01,
  frictionAir: 0.006, // drag in the air
  density: 0.0007, // light compared to players → players push the ball, not the other way round
  maxSpeed: 25, // px/step cap (also prevents tunnelling through the 20 px crossbar)
  kickoffHeight: 260, // y where the ball is dropped at kickoff
  stuckOnBarFrames: 60, // nudge the ball off a crossbar after ~1 s
  nudge: { x: 8, y: -7 }, // push towards midfield
}

export const PLAYER = {
  headRadius: 56,
  bodyWidth: 34,
  bodyHeight: 38,
  density: 0.004,
  restitution: 0.1,
  speed: 5.6, // max walking speed (px/step)
  groundAccel: 0.35, // how fast walking reaches full speed (0..1, 1 = instant)
  airAccel: 0.16, // steering while airborne
  jumpVelocity: 13.5, // ≈ 170 px high jumps
  startX: { p1: 320, p2: 960 },
}

export const KICK = {
  frames: 14, // whole swing
  activeFrom: 2, // frames in which the shoe can launch the ball
  activeTo: 10,
  cooldownFrames: 8,
  legLength: 40,
  restAngle: 70, // degrees, 90 = straight down; shoe slightly forward at rest
  backAngle: 115, // wind-up
  forwardAngle: -25, // end of the swing (above horizontal)
  power: 17, // launch speed along the ground (px/step)
  lift: 9, // upward launch speed
  liftBonusHigh: 6, // extra lift when the ball is above the shoe (chip it)
  reach: 14, // extra distance (px) at which the shoe still catches the ball
  shoeRadius: 17,
}

export const GOAL = {
  width: 112, // goal mouth depth from the side wall
  height: 220, // from the grass to the underside of the crossbar
  barThickness: 20,
  barOverhang: 18, // crossbar sticks out a bit past the goal line (players can stand on it)
}

export const MATCH = {
  seconds: 90,
  goalCelebrationMs: 2000, // celebration before the next kickoff
  slowMoMs: 700,
  slowMoScale: 0.25,
  kickoffPauseMs: 600, // freeze before play resumes after a goal
}

/** CPU opponent (used from step c on). 0.0 = sleepy, 1.0 = very sharp. */
export const CPU = {
  difficulty: 0.55,
}

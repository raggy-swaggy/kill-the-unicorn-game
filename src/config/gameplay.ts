// Central gameplay tuning. Units: pixels, seconds, milliseconds where noted.
// One tile is 16 px.

export const PHYSICS = {
  gravity: 900,
};

export const PLAYER = {
  runSpeed: 110,
  groundAccel: 1300,
  groundDecel: 1700,
  /** Applied instead of accel when pushing against the current direction. */
  turnAccel: 2400,
  airAccel: 950,
  airDecel: 500,

  /** Initial jump velocity. 317 px/s with gravity 900 gives about 3.5 tiles of height. */
  jumpVelocity: 317,
  /** Velocity multiplier when jump is released while still rising (variable jump height). */
  jumpCutMultiplier: 0.45,
  /** Gravity multiplier while falling, makes jumps feel less floaty. */
  fallGravityMultiplier: 1.6,
  /** Gravity multiplier near the apex while jump is held, gives a short hang time. */
  apexGravityMultiplier: 0.6,
  apexThreshold: 45,
  maxFallSpeed: 360,

  /** Jump still allowed this long after walking off a ledge. */
  coyoteTimeMs: 90,
  /** A jump pressed this long before landing still triggers on landing. */
  jumpBufferMs: 110,

  /** Physics body inside the 16x32 frame. */
  body: { width: 10, height: 26, offsetX: 3, offsetY: 6 },
};

export const CAMERA = {
  lerpX: 0.12,
  lerpY: 0.1,
  deadzoneWidth: 24,
  deadzoneHeight: 48,
  /** How far the camera looks ahead in the facing direction. */
  lookahead: 28,
  lookaheadLerp: 0.04,
};

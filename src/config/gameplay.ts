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

export const HEALTH = {
  heartsPerLife: 3,
  lives: 3,
  /** Blinking, untouchable time after taking a hit or respawning. */
  invulnerableMs: 1200,
  /** Input is ignored this long after a hit so the knockback reads clearly. */
  hitStunMs: 180,
  knockbackX: 130,
  knockbackY: 170,
};

export const RIFF_SHOT = {
  speed: 240,
  cooldownMs: 230,
  lifetimeMs: 650,
  damage: 1,
  maxOnScreen: 4,
};

export const ENEMIES = {
  patrol: { hp: 2, score: 100, speed: 28 },
  flyer: { hp: 1, score: 150, speed: 36, amplitude: 14, periodMs: 1600, patrolDistance: 64 },
  shooter: { hp: 3, score: 200, rangeX: 150, rangeY: 48, fireIntervalMs: 1700, bulletSpeed: 95, bulletLifetimeMs: 2200 },
  /** Enemies further than this from the camera centre are paused. */
  activeDistance: 260,
  hitFlashMs: 70,
};

export const SCORE = {
  cassette: 50,
  /** Every this many cassettes grant an extra life. */
  cassettesPerLife: 10,
};

export const BOSS = {
  hp: 60,
  score: 5000,
  /** Second phase starts below this share of HP. */
  phase2At: 0.5,
  /** Phase 2 timings are multiplied by this (smaller = faster). */
  phase2Speed: 0.7,
  /** Music speed in phase 2. */
  phase2MusicRate: 1.12,
  introMs: 1800,
  idleMs: 1100,
  laser: { telegraphMs: 950, durationMs: 650, thickness: 14 },
  stomp: { jumpVelocity: 380, waveSpeed: 120, waveLifetimeMs: 2600, pauseMs: 450 },
  spread: { count: 5, countPhase2: 7, speed: 105, angleDeg: 70, bursts: 1, burstsPhase2: 2, lifetimeMs: 3000 },
  hitFlashMs: 60,
};

export const CONTINUE = {
  /** Seconds to decide on CONTINUE? after the last life is lost. */
  seconds: 10,
};

export const HIGHSCORE = {
  /** Number of entries kept in the table. */
  entries: 10,
  /** localStorage key; change it to reset everyone's table after a balance change. */
  storageKey: 'ktu-highscores-v1',
  /** Initial table, so the list never starts empty. */
  defaults: [
    ['KTU', 20000], ['UNI', 15000], ['RIF', 12000], ['CHG', 10000], ['BRK', 8000],
    ['GLT', 6000], ['AMP', 5000], ['BPM', 4000], ['PIT', 3000], ['CRT', 2000],
  ] as [string, number][],
};

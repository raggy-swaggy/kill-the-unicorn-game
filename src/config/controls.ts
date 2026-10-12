// Key names are Phaser.Input.Keyboard.KeyCodes names.
export const KEYBOARD = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  jump: ['SPACE'],
  attack: ['J', 'X'],
  /** Pauses the game; confirms in menus. */
  start: ['ENTER', 'ESC', 'P'],
} as const;

// Standard gamepad mapping button indices.
export const GAMEPAD = {
  jump: [0], // A / Cross
  attack: [2, 1], // X / Square, B / Circle
  start: [9], // Start / Options
  stickDeadzone: 0.35,
} as const;

/** Global keys, handled outside the scenes. */
export const HOTKEYS = {
  mute: 'm',
  crt: 'c',
  fullscreen: 'f',
} as const;

/**
 * On-screen buttons for touch devices, in game pixels (320x180). `r` is the touch radius,
 * a little larger than the drawn 24x24 button so thumbs don't miss.
 */
export const TOUCH = {
  /** Button transparency when idle and while pressed. */
  alpha: 0.5,
  pressedAlpha: 0.9,
  game: {
    left: { x: 24, y: 152, r: 18 },
    right: { x: 62, y: 152, r: 18 },
    jump: { x: 294, y: 146, r: 20 },
    attack: { x: 258, y: 158, r: 18 },
    start: { x: 160, y: 168, r: 12 },
  },
  menu: {
    up: { x: 40, y: 118, r: 13 },
    down: { x: 40, y: 162, r: 13 },
    left: { x: 18, y: 140, r: 13 },
    right: { x: 62, y: 140, r: 13 },
    jump: { x: 294, y: 146, r: 20 },
  },
} as const;

// Key names are Phaser.Input.Keyboard.KeyCodes names.
export const KEYBOARD = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  jump: ['SPACE'],
  attack: ['J', 'X'],
} as const;

// Standard gamepad mapping button indices.
export const GAMEPAD = {
  jump: [0], // A / Cross
  attack: [2, 1], // X / Square, B / Circle
  stickDeadzone: 0.35,
} as const;

import Phaser from 'phaser';
import { GAMEPAD, KEYBOARD } from '../config/controls';

export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack';
const ACTIONS: Action[] = ['left', 'right', 'up', 'down', 'jump', 'attack'];

/**
 * Merges keyboard, gamepad and (later) touch buttons into one input state.
 * Call update() once per frame before reading.
 */
export class InputManager {
  private keys: Record<Action, Phaser.Input.Keyboard.Key[]>;
  private held = new Set<Action>();
  private prevHeld = new Set<Action>();
  /** Set by on-screen touch buttons. */
  readonly virtual = new Set<Action>();

  constructor(private scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard!;
    this.keys = {} as Record<Action, Phaser.Input.Keyboard.Key[]>;
    for (const action of ACTIONS) {
      this.keys[action] = KEYBOARD[action].map((name) =>
        keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[name as keyof typeof Phaser.Input.Keyboard.KeyCodes], true),
      );
    }
  }

  update(): void {
    [this.prevHeld, this.held] = [this.held, this.prevHeld];
    this.held.clear();

    for (const action of ACTIONS) {
      if (this.keys[action].some((key) => key.isDown) || this.virtual.has(action)) this.held.add(action);
    }

    const pad = this.scene.input.gamepad?.pad1;
    if (pad) {
      const dz = GAMEPAD.stickDeadzone;
      if (pad.left || pad.leftStick.x < -dz) this.held.add('left');
      if (pad.right || pad.leftStick.x > dz) this.held.add('right');
      if (pad.up || pad.leftStick.y < -dz) this.held.add('up');
      if (pad.down || pad.leftStick.y > dz) this.held.add('down');
      if (GAMEPAD.jump.some((i) => pad.buttons[i]?.pressed)) this.held.add('jump');
      if (GAMEPAD.attack.some((i) => pad.buttons[i]?.pressed)) this.held.add('attack');
    }
  }

  isDown(action: Action): boolean {
    return this.held.has(action);
  }

  /** True only in the frame the action went down. */
  justPressed(action: Action): boolean {
    return this.held.has(action) && !this.prevHeld.has(action);
  }

  /** -1, 0 or 1. Pressing both directions cancels out. */
  get horizontal(): number {
    return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
  }
}

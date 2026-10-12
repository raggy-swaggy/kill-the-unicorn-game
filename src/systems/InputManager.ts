import Phaser from 'phaser';
import { GAMEPAD, KEYBOARD } from '../config/controls';

export type Action = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack' | 'start';
export const ACTIONS: Action[] = ['left', 'right', 'up', 'down', 'jump', 'attack', 'start'];

/** Actions currently held on on-screen touch buttons, one set per active TouchControls. */
const touchSources = new Set<Set<Action>>();

export function registerTouchSource(source: Set<Action>): () => void {
  touchSources.add(source);
  return () => touchSources.delete(source);
}

const touchHeld = (action: Action) => [...touchSources].some((s) => s.has(action));

/**
 * Merges keyboard, gamepad and touch buttons into one input state.
 * Call update() once per frame before reading.
 */
export class InputManager {
  private keys: Record<Action, Phaser.Input.Keyboard.Key[]>;
  private held = new Set<Action>();
  private prevHeld = new Set<Action>();
  private nextRepeat = new Map<Action, number>();
  private seenTimeDown = new Map<Phaser.Input.Keyboard.Key, number>();

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
      // A new timeDown also catches taps shorter than a frame, where down and up arrive together.
      const key = this.keys[action].some((k) => {
        const tapped = k.timeDown !== (this.seenTimeDown.get(k) ?? k.timeDown);
        this.seenTimeDown.set(k, k.timeDown);
        return k.isDown || tapped;
      });
      if (key || touchHeld(action)) this.held.add(action);
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
      if (GAMEPAD.start.some((i) => pad.buttons[i]?.pressed)) this.held.add('start');
    }
  }

  isDown(action: Action): boolean {
    return this.held.has(action);
  }

  /** True only in the frame the action went down. */
  justPressed(action: Action): boolean {
    return this.held.has(action) && !this.prevHeld.has(action);
  }

  /** Like justPressed, but fires again while held (menu cursor movement). */
  repeated(action: Action, delay = 320, interval = 90): boolean {
    const now = this.scene.time.now;
    if (this.justPressed(action)) {
      this.nextRepeat.set(action, now + delay);
      return true;
    }
    const next = this.nextRepeat.get(action);
    if (this.isDown(action) && next !== undefined && now >= next) {
      this.nextRepeat.set(action, now + interval);
      return true;
    }
    return false;
  }

  /** Confirm in menus: jump, attack or start. */
  get confirmPressed(): boolean {
    return this.justPressed('jump') || this.justPressed('attack') || this.justPressed('start');
  }

  /** -1, 0 or 1. Pressing both directions cancels out. */
  get horizontal(): number {
    return (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
  }
}

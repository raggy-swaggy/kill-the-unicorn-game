import Phaser from 'phaser';
import { RHYTHM } from '../config/rhythm';
import type { BeatClock } from '../systems/BeatClock';

const FRAME = { on: 0, warn: 1, off: 2 } as const;

/** One 16px segment of a platform that is solid only on the beats its pattern marks with 1. */
export class BeatPlatform extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, private pattern: string) {
    super(scene, x, y, 'beat-platform', 0);
    scene.add.existing(this);
    this.setOrigin(0, 0);
  }

  setupBody(): void {
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(16, 6);
    // Solid from above only, like the one-way tiles.
    this.body.checkCollision.down = false;
    this.body.checkCollision.left = false;
    this.body.checkCollision.right = false;
  }

  sync(clock: BeatClock): void {
    const { on, warn } = clock.sample(this.pattern, RHYTHM.warnFraction);
    this.body.enable = on;
    this.setFrame(warn ? FRAME.warn : on ? FRAME.on : FRAME.off);
  }
}

/** Spikes that strike on the beats its pattern marks with 1. */
export class BeatTrap extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  extended = false;

  constructor(scene: Phaser.Scene, x: number, y: number, private pattern: string) {
    super(scene, x, y, 'beat-spikes', 0);
    scene.add.existing(this);
    this.setOrigin(0, 0);
  }

  setupBody(): void {
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setSize(14, 12).setOffset(1, 4);
  }

  sync(clock: BeatClock): void {
    const { on, warn } = clock.sample(this.pattern, RHYTHM.warnFraction);
    this.extended = on;
    this.setFrame(on ? 2 : warn ? 1 : 0);
  }
}

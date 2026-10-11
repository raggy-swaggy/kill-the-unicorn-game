import Phaser from 'phaser';
import { ENEMIES } from '../../config/gameplay';
import { Enemy, type EnemyContext } from './Enemy';

/** Flies back and forth along a sine wave, ignoring gravity. */
export class FlyerEnemy extends Enemy {
  private dir = -1;
  private readonly minX: number;
  private readonly maxX: number;
  private readonly baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, ctx: EnemyContext, patrolDistance = ENEMIES.flyer.patrolDistance) {
    super(scene, x, y, 'enemy-cursor', ENEMIES.flyer, ctx);
    this.minX = x - patrolDistance / 2;
    this.maxX = x + patrolDistance / 2;
    this.baseY = y;
    this.play('enemy-cursor-fly');
  }

  setupBody(): void {
    this.body.setAllowGravity(false);
    this.body.setSize(10, 10).setOffset(3, 3);
  }

  protected behave(time: number): void {
    const cfg = ENEMIES.flyer;
    if (this.x <= this.minX) this.dir = 1;
    else if (this.x >= this.maxX) this.dir = -1;
    this.body.setVelocityX(this.dir * cfg.speed);

    // Steer towards the sine target instead of teleporting, so collisions stay sane.
    const targetY = this.baseY + Math.sin((time / cfg.periodMs) * Math.PI * 2) * cfg.amplitude;
    this.body.setVelocityY((targetY - this.y) * 8);
    this.setFlipX(this.dir > 0);
  }
}

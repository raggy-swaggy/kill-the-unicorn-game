import Phaser from 'phaser';
import { ENEMIES } from '../../config/gameplay';
import { Enemy, type EnemyContext } from './Enemy';

/** Stands still and fires at the player when in range. */
export class ShooterEnemy extends Enemy {
  private nextShotAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, ctx: EnemyContext) {
    super(scene, x, y, 'enemy-card', ENEMIES.shooter, ctx);
    this.play('enemy-card-idle');
  }

  setupBody(): void {
    this.body.setSize(10, 16).setOffset(3, 0);
    this.body.setImmovable(true);
  }

  protected behave(time: number): void {
    const cfg = ENEMIES.shooter;
    const player = this.ctx.player;
    const dx = player.x - this.x;
    const inRange = Math.abs(dx) < cfg.rangeX && Math.abs(player.y - this.y) < cfg.rangeY;
    this.body.setVelocityX(0);
    if (!inRange) {
      this.nextShotAt = Math.max(this.nextShotAt, time + 400);
      return;
    }
    const dir = Math.sign(dx) || 1;
    this.setFlipX(dir < 0);
    if (time >= this.nextShotAt) {
      this.nextShotAt = time + cfg.fireIntervalMs;
      this.fireBullet(dir, cfg);
      this.play('enemy-card-shoot');
      this.scene.time.delayedCall(250, () => this.active && this.play('enemy-card-idle'));
    }
  }
}

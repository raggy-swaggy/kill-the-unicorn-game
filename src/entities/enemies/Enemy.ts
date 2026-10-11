import Phaser from 'phaser';
import { ENEMIES } from '../../config/gameplay';
import type { Player } from '../Player';
import type { Projectile } from '../Projectile';

/** Things every enemy may need from the level. */
export interface EnemyContext {
  player: Player;
  ground: Phaser.Tilemaps.TilemapLayer;
  bullets: Phaser.Physics.Arcade.Group;
}

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  hp: number;
  readonly scoreValue: number;
  private flashUntil = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    stats: { hp: number; score: number },
    protected ctx: EnemyContext,
  ) {
    super(scene, x, y, texture, 0);
    this.hp = stats.hp;
    this.scoreValue = stats.score;
    scene.add.existing(this);
    this.setOrigin(0.5, 1);
  }

  /**
   * Called after the enemy was added to its physics group, because adding to a
   * group resets body settings to the group defaults.
   */
  abstract setupBody(): void;

  protected abstract behave(time: number, delta: number): void;

  update(time: number, delta: number): void {
    if (!this.active) return;
    if (time >= this.flashUntil && this.tintMode === Phaser.TintModes.FILL) {
      this.clearTint();
      this.setTintMode(Phaser.TintModes.MULTIPLY);
    }
    const cam = this.scene.cameras.main;
    const near = Math.abs(this.x - cam.midPoint.x) < ENEMIES.activeDistance;
    this.body.enable = near;
    if (near) this.behave(time, delta);
  }

  hit(damage: number): void {
    this.hp -= damage;
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.flashUntil = this.scene.time.now + ENEMIES.hitFlashMs;
    if (this.hp <= 0) {
      this.scene.events.emit('enemy-killed', this);
      this.destroy();
    }
  }

  protected fireBullet(dir: number, spec: { bulletSpeed: number; bulletLifetimeMs: number }): void {
    const bullet = this.ctx.bullets.get(this.x + dir * 6, this.y - 8) as Projectile | null;
    bullet?.fire(this.x + dir * 6, this.y - 8, dir, {
      anim: 'enemy-bullet',
      speed: spec.bulletSpeed,
      lifetimeMs: spec.bulletLifetimeMs,
    });
  }
}

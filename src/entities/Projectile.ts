import Phaser from 'phaser';

export interface ProjectileSpec {
  anim: string;
  speed: number;
  lifetimeMs: number;
}

/** Pooled straight-flying projectile, used for the Riff Shot and enemy bullets. */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private expiresAt = 0;

  fire(x: number, y: number, dir: number, spec: ProjectileSpec): void {
    this.enableBody(true, x, y, true, true);
    this.body.setAllowGravity(false);
    this.body.setSize(6, 6);
    this.setVelocity(dir * spec.speed, 0);
    this.setFlipX(dir < 0);
    this.play(spec.anim, true);
    this.expiresAt = this.scene.time.now + spec.lifetimeMs;
  }

  kill(): void {
    this.disableBody(true, true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.active && time >= this.expiresAt) this.kill();
  }
}

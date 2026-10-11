import Phaser from 'phaser';

export interface ProjectileSpec {
  anim: string;
  speed: number;
  lifetimeMs: number;
  /** Vertical speed, for angled shots. */
  vy?: number;
  /** Hitbox size, default 6x6. */
  size?: [number, number];
}

/** Pooled straight-flying projectile, used for the Riff Shot and enemy bullets. */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private expiresAt = 0;

  fire(x: number, y: number, dir: number, spec: ProjectileSpec): void {
    this.enableBody(true, x, y, true, true);
    this.body.setAllowGravity(false);
    const [w, h] = spec.size ?? [6, 6];
    this.body.setSize(w, h);
    this.setVelocity(dir * spec.speed, spec.vy ?? 0);
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

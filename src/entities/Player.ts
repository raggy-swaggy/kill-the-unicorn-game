import Phaser from 'phaser';
import { HEALTH, PHYSICS, PLAYER, RIFF_SHOT } from '../config/gameplay';
import type { InputManager } from '../systems/InputManager';
import type { Projectile } from './Projectile';

function approach(value: number, target: number, step: number): number {
  return value < target ? Math.min(value + step, target) : Math.max(value - step, target);
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  facing: 1 | -1 = 1;
  private lastGroundedAt = -Infinity;
  private lastJumpPressedAt = -Infinity;
  private rising = false;
  private lastShotAt = -Infinity;
  private invulnerableUntil = 0;
  private stunnedUntil = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private controls: InputManager,
    private shots: Phaser.Physics.Arcade.Group,
  ) {
    super(scene, x, y, 'player', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const b = PLAYER.body;
    this.body.setSize(b.width, b.height).setOffset(b.offsetX, b.offsetY);
    this.body.setMaxVelocity(10000, PLAYER.maxFallSpeed);
    this.setOrigin(0.5, 1);
    this.play('player-idle');
  }

  get onGround(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    const body = this.body;
    const grounded = this.onGround;

    if (grounded) this.lastGroundedAt = time;
    if (this.controls.justPressed('jump')) this.lastJumpPressedAt = time;

    // Horizontal movement with acceleration, so starts and stops feel tight but not robotic.
    const stunned = time < this.stunnedUntil;
    const dir = stunned ? 0 : this.controls.horizontal;
    const vx = body.velocity.x;
    let accel: number;
    if (dir !== 0 && Math.sign(vx) === -dir) accel = PLAYER.turnAccel;
    else if (grounded) accel = dir !== 0 ? PLAYER.groundAccel : PLAYER.groundDecel;
    else accel = dir !== 0 ? PLAYER.airAccel : PLAYER.airDecel;
    if (!stunned) body.setVelocityX(approach(vx, dir * PLAYER.runSpeed, accel * dt));
    if (dir !== 0) this.facing = dir as 1 | -1;

    // Jump: buffered presses and coyote time.
    const buffered = time - this.lastJumpPressedAt <= PLAYER.jumpBufferMs;
    const coyote = time - this.lastGroundedAt <= PLAYER.coyoteTimeMs;
    if (buffered && coyote) {
      body.setVelocityY(-PLAYER.jumpVelocity);
      this.lastJumpPressedAt = -Infinity;
      this.lastGroundedAt = -Infinity;
      this.rising = true;
      this.scene.events.emit('player-jump');
    }

    // Variable jump height: releasing early cuts the upward speed.
    const jumpHeld = this.controls.isDown('jump');
    if (this.rising && !jumpHeld && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * PLAYER.jumpCutMultiplier);
      this.rising = false;
    }
    if (body.velocity.y >= 0) this.rising = false;

    // Gravity shaping, on top of the world gravity.
    const vy = body.velocity.y;
    let gravityScale = 1;
    if (!grounded && jumpHeld && Math.abs(vy) < PLAYER.apexThreshold) gravityScale = PLAYER.apexGravityMultiplier;
    else if (vy > 0) gravityScale = PLAYER.fallGravityMultiplier;
    body.setGravityY(PHYSICS.gravity * (gravityScale - 1));

    if (!stunned && this.controls.isDown('attack') && time - this.lastShotAt >= RIFF_SHOT.cooldownMs) {
      this.shoot(time);
    }

    this.updateAnimation(grounded);
    this.setAlpha(this.isInvulnerable && Math.floor(time / 70) % 2 === 0 ? 0.25 : 1);
  }

  private shoot(time: number): void {
    const x = this.x + this.facing * 9;
    const y = this.y - 15;
    const shot = this.shots.get(x, y) as Projectile | null;
    if (!shot) return;
    this.lastShotAt = time;
    shot.fire(x, y, this.facing, { anim: 'riff-shot', speed: RIFF_SHOT.speed, lifetimeMs: RIFF_SHOT.lifetimeMs });
    this.scene.events.emit('player-shoot');
  }

  get isInvulnerable(): boolean {
    return this.scene.time.now < this.invulnerableUntil;
  }

  makeInvulnerable(ms = HEALTH.invulnerableMs): void {
    this.invulnerableUntil = this.scene.time.now + ms;
  }

  /** Applies knockback away from the source. Returns false while invulnerable. */
  hurt(sourceX: number): boolean {
    if (this.isInvulnerable) return false;
    const away = this.x < sourceX ? -1 : 1;
    this.body.setVelocity(away * HEALTH.knockbackX, -HEALTH.knockbackY);
    this.stunnedUntil = this.scene.time.now + HEALTH.hitStunMs;
    this.rising = false;
    this.makeInvulnerable();
    return true;
  }

  private updateAnimation(grounded: boolean): void {
    this.setFlipX(this.facing < 0);
    let anim: string;
    if (grounded) anim = Math.abs(this.body.velocity.x) > 8 ? 'player-run' : 'player-idle';
    else anim = this.body.velocity.y < 0 ? 'player-jump' : 'player-fall';
    this.play(anim, true);
  }

  respawn(x: number, y: number): void {
    this.body.reset(x, y);
    this.lastGroundedAt = -Infinity;
    this.lastJumpPressedAt = -Infinity;
    this.rising = false;
    this.stunnedUntil = 0;
    this.makeInvulnerable();
  }
}

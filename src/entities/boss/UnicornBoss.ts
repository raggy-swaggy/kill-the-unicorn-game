import Phaser from 'phaser';
import { BOSS, PHYSICS } from '../../config/gameplay';
import { PALETTE } from '../../config/palette';
import type { AudioManager } from '../../systems/AudioManager';
import type { Player } from '../Player';
import type { Projectile } from '../Projectile';

export interface BossContext {
  player: Player;
  bullets: Phaser.Physics.Arcade.Group;
  audio: AudioManager;
  /** Arena bounds in world pixels; floorY is the ground line. */
  arena: { x: number; width: number; floorY: number };
  /** Called when the laser touches the player. */
  hurtPlayer: (sourceX: number) => void;
}

type State =
  | 'waiting'
  | 'intro'
  | 'idle'
  | 'laser-telegraph'
  | 'laser-fire'
  | 'stomp-air'
  | 'stomp-pause'
  | 'return-air'
  | 'spread'
  | 'dying';
type Attack = 'laser' | 'stomp' | 'spread';

const RAINBOW = [PALETTE.pink, PALETTE.hotpink, PALETTE.white, PALETTE.cyan, PALETTE.teal, PALETTE.violet, PALETTE.purple];

/**
 * "The Unicorn": sugar-sweet and evil. Three attacks (rainbow laser, stomp with
 * shockwaves, glitter spread) and a darker, faster second phase below 50 % HP.
 */
export class UnicornBoss extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  hp = BOSS.hp;
  readonly maxHp = BOSS.hp;
  phase: 1 | 2 = 1;

  private mode: State = 'waiting';
  private stateUntil = 0;
  private readonly homeX: number;
  private lastAttack?: Attack;
  private laserY = 0;
  private lasersLeft = 0;
  private burstsLeft = 0;
  private leftGround = false;
  private flashUntil = 0;
  private readonly fx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, private ctx: BossContext) {
    super(scene, x, y, 'boss-unicorn', 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(5).setVisible(false);
    this.homeX = x;
    this.fx = scene.add.graphics().setDepth(20);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.fx.destroy());
  }

  setupBody(): void {
    this.body.setSize(40, 36).setOffset(12, 24);
    this.body.enable = false;
  }

  get alive(): boolean {
    return this.mode !== 'dying' && this.hp > 0;
  }

  get vulnerable(): boolean {
    return this.mode !== 'waiting' && this.mode !== 'intro' && this.alive;
  }

  start(): void {
    if (this.mode !== 'waiting') return;
    this.mode = 'intro';
    this.stateUntil = this.scene.time.now + BOSS.introMs;
    this.body.enable = true;
    this.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 600 });
    this.ctx.audio.sfx('roar');
    this.scene.cameras.main.shake(500, 0.008);
  }

  private ms(base: number): number {
    return this.phase === 2 ? base * BOSS.phase2Speed : base;
  }

  private setMode(mode: State, durationMs = 0): void {
    this.mode = mode;
    this.stateUntil = this.scene.time.now + durationMs;
  }

  update(time: number): void {
    this.fx.clear();
    if (this.mode === 'waiting' || this.mode === 'dying') return;

    if (time >= this.flashUntil && this.tintMode === Phaser.TintModes.FILL) {
      this.clearTint();
      this.setTintMode(Phaser.TintModes.MULTIPLY);
    }
    const player = this.ctx.player;
    const grounded = this.body.blocked.down;

    switch (this.mode) {
      case 'intro':
        if (time >= this.stateUntil) this.setMode('idle', this.ms(BOSS.idleMs) / 2);
        break;
      case 'idle':
        this.body.setVelocityX(0);
        this.setFlipX(player.x > this.x);
        if (time >= this.stateUntil) this.chooseAttack();
        break;
      case 'laser-telegraph':
        if (Math.floor(time / 70) % 2 === 0) {
          this.fx.fillStyle(PALETTE.pink, 0.9);
          this.fx.fillRect(this.ctx.arena.x, this.laserY - 1, this.ctx.arena.width, 2);
        }
        if (time >= this.stateUntil) {
          this.ctx.audio.sfx('laser');
          this.scene.cameras.main.shake(BOSS.laser.durationMs, 0.004);
          this.setMode('laser-fire', BOSS.laser.durationMs);
        }
        break;
      case 'laser-fire':
        this.drawBeam(time);
        if (this.beamHitsPlayer()) this.ctx.hurtPlayer(this.x);
        if (time >= this.stateUntil) {
          this.lasersLeft--;
          if (this.lasersLeft > 0) {
            // Second beam at the other height.
            this.laserY = this.laserY < this.ctx.arena.floorY - 24 ? this.groundBeamY() : this.highBeamY();
            this.ctx.audio.sfx('laser-charge');
            this.setMode('laser-telegraph', this.ms(BOSS.laser.telegraphMs) * 0.7);
          } else {
            this.setMode('idle', this.ms(BOSS.idleMs));
          }
        }
        break;
      case 'stomp-air':
        if (!grounded) this.leftGround = true;
        else if (this.leftGround) this.land(true);
        break;
      case 'stomp-pause':
        if (time >= this.stateUntil) this.jumpTo(this.homeX, 'return-air');
        break;
      case 'return-air':
        if (!grounded) this.leftGround = true;
        else if (this.leftGround) this.land(this.phase === 2);
        break;
      case 'spread':
        if (time >= this.stateUntil) {
          if (this.burstsLeft > 0) {
            this.fireSpread();
            this.burstsLeft--;
            this.stateUntil = time + this.ms(500);
          } else {
            this.setMode('idle', this.ms(BOSS.idleMs));
          }
        }
        break;
    }
    this.updateAnimation(grounded);
  }

  private chooseAttack(): void {
    const options = (['laser', 'stomp', 'spread'] as Attack[]).filter((a) => a !== this.lastAttack);
    const attack = Phaser.Utils.Array.GetRandom(options);
    this.lastAttack = attack;
    if (attack === 'laser') {
      const player = this.ctx.player;
      const onGround = player.body.blocked.down && player.y >= this.ctx.arena.floorY - 2;
      this.laserY = onGround ? this.groundBeamY() : Math.min(this.groundBeamY(), player.y - 12);
      this.lasersLeft = this.phase === 2 ? 2 : 1;
      this.ctx.audio.sfx('laser-charge');
      this.setMode('laser-telegraph', this.ms(BOSS.laser.telegraphMs));
    } else if (attack === 'stomp') {
      this.jumpTo(this.ctx.player.x, 'stomp-air');
    } else {
      this.burstsLeft = this.phase === 2 ? BOSS.spread.burstsPhase2 : BOSS.spread.bursts;
      this.setMode('spread', this.ms(450));
    }
  }

  private groundBeamY(): number {
    return this.ctx.arena.floorY - 10;
  }

  private highBeamY(): number {
    return this.ctx.arena.floorY - 60;
  }

  private beamRect(): Phaser.Geom.Rectangle {
    const t = BOSS.laser.thickness;
    const front = this.flipX ? this.x + 18 : this.x - 18;
    const { x, width } = this.ctx.arena;
    return this.flipX
      ? new Phaser.Geom.Rectangle(front, this.laserY - t / 2, x + width - front, t)
      : new Phaser.Geom.Rectangle(x, this.laserY - t / 2, front - x, t);
  }

  private drawBeam(time: number): void {
    const r = this.beamRect();
    const stripe = r.height / RAINBOW.length;
    const shift = Math.floor(time / 50);
    RAINBOW.forEach((_, i) => {
      this.fx.fillStyle(RAINBOW[(i + shift) % RAINBOW.length], 1);
      this.fx.fillRect(r.x, r.y + i * stripe, r.width, Math.ceil(stripe));
    });
    // Glow line from the horn down to the beam.
    const hornX = this.flipX ? this.x + 22 : this.x - 22;
    this.fx.fillStyle(PALETTE.white, 0.8);
    this.fx.fillRect(hornX - 1, Math.min(this.y - 58, this.laserY), 3, Math.abs(this.laserY - (this.y - 58)));
  }

  private beamHitsPlayer(): boolean {
    const b = this.ctx.player.body;
    return Phaser.Geom.Rectangle.Overlaps(this.beamRect(), new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height));
  }

  private jumpTo(targetX: number, mode: State): void {
    const { x, width } = this.ctx.arena;
    const target = Phaser.Math.Clamp(targetX, x + 40, x + width - 40);
    const v = BOSS.stomp.jumpVelocity;
    const flightTime = (2 * v) / PHYSICS.gravity;
    this.body.setVelocity((target - this.x) / flightTime, -v);
    this.setFlipX(target > this.x);
    this.leftGround = false;
    this.ctx.audio.sfx('jump', 0.8);
    this.setMode(mode);
  }

  private land(withWaves: boolean): void {
    this.body.setVelocityX(0);
    this.scene.cameras.main.shake(220, 0.012);
    this.ctx.audio.sfx('stomp');
    if (withWaves) {
      for (const dir of [-1, 1]) {
        const wave = this.ctx.bullets.get(this.x, this.ctx.arena.floorY - 8) as Projectile | null;
        wave?.fire(this.x + dir * 20, this.ctx.arena.floorY - 8, dir, {
          anim: 'shockwave',
          speed: this.phase === 2 ? BOSS.stomp.waveSpeed * 1.3 : BOSS.stomp.waveSpeed,
          lifetimeMs: BOSS.stomp.waveLifetimeMs,
          size: [12, 10],
        });
      }
    }
    if (this.mode === 'stomp-air') this.setMode('stomp-pause', this.ms(BOSS.stomp.pauseMs));
    else this.setMode('idle', this.ms(BOSS.idleMs));
  }

  private fireSpread(): void {
    const cfg = BOSS.spread;
    const count = this.phase === 2 ? cfg.countPhase2 : cfg.count;
    const dir = this.ctx.player.x < this.x ? -1 : 1;
    this.setFlipX(dir > 0);
    const mouthX = this.x + dir * 26;
    const mouthY = this.y - 40;
    const aim = Math.atan2(this.ctx.player.y - 16 - mouthY, Math.abs(this.ctx.player.x - mouthX));
    const spread = Phaser.Math.DegToRad(cfg.angleDeg);
    for (let i = 0; i < count; i++) {
      const a = aim - spread / 2 + (spread * i) / (count - 1);
      const shot = this.ctx.bullets.get(mouthX, mouthY) as Projectile | null;
      shot?.fire(mouthX, mouthY, dir, {
        anim: 'boss-glitter',
        speed: cfg.speed * Math.cos(a),
        vy: cfg.speed * Math.sin(a),
        lifetimeMs: cfg.lifetimeMs,
      });
    }
    this.ctx.audio.sfx('shoot', 0.8);
  }

  private updateAnimation(grounded: boolean): void {
    const prefix = this.phase === 2 ? 'unicorn-dark-' : 'unicorn-';
    let anim = 'idle';
    if (!grounded && (this.mode === 'stomp-air' || this.mode === 'return-air')) anim = 'jump';
    else if (this.mode === 'laser-telegraph' || this.mode === 'laser-fire' || this.mode === 'spread') anim = 'charge';
    this.play(prefix + anim, true);
  }

  hit(damage: number): void {
    if (!this.vulnerable) return;
    this.hp = Math.max(0, this.hp - damage);
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.flashUntil = this.scene.time.now + BOSS.hitFlashMs;
    this.scene.events.emit('boss-hp', this.hp, this.maxHp);
    if (this.hp <= 0) {
      this.die();
      return;
    }
    this.ctx.audio.sfx('boss-hit', 0.7);
    if (this.phase === 1 && this.hp <= this.maxHp * BOSS.phase2At) {
      this.phase = 2;
      this.ctx.audio.sfx('roar');
      this.scene.events.emit('boss-phase2');
    }
  }

  private die(): void {
    this.mode = 'dying';
    this.fx.clear();
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.clearTint();
    this.setTintMode(Phaser.TintModes.MULTIPLY);
    this.scene.events.emit('boss-defeated', this);
  }
}

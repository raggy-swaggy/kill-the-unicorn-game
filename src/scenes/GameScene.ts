import Phaser from 'phaser';
import { AUDIO } from '../config/audio';
import { CAMERA, HEALTH, PHYSICS, RIFF_SHOT, SCORE } from '../config/gameplay';
import { DISPLAY } from '../config/display';
import { Player } from '../entities/Player';
import { Portal, type TransitionEffect } from '../entities/Portal';
import { Projectile } from '../entities/Projectile';
import { Checkpoint, Pickup, type PickupKind } from '../entities/Pickup';
import type { Enemy, EnemyContext } from '../entities/enemies/Enemy';
import { FlyerEnemy } from '../entities/enemies/FlyerEnemy';
import { PatrolEnemy } from '../entities/enemies/PatrolEnemy';
import { ShooterEnemy } from '../entities/enemies/ShooterEnemy';
import { AudioManager } from '../systems/AudioManager';
import { addTo, resetGameState, STATE } from '../systems/GameState';
import { InputManager } from '../systems/InputManager';
import { getProp, loadLevel, type LevelSection, type LoadedLevel } from '../systems/LevelLoader';

const LEVEL_KEY = 'level1';
const PARALLAX_FACTORS = { far: 0.1, near: 0.35 };

export class GameScene extends Phaser.Scene {
  private inputs!: InputManager;
  private audio!: AudioManager;
  private player!: Player;
  private level!: LoadedLevel;
  private bgFar!: Phaser.GameObjects.TileSprite;
  private bgNear!: Phaser.GameObjects.TileSprite;
  private lookahead = 0;

  private shots!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private checkpoints!: Phaser.Physics.Arcade.Group;
  private portals!: Phaser.Physics.Arcade.Group;
  private respawnPoint!: Phaser.Math.Vector2;
  private section?: LevelSection;
  private gameOver = false;
  private transitioning = false;

  constructor() {
    super('Game');
  }

  create(): void {
    this.gameOver = false;
    this.transitioning = false;
    this.section = undefined;
    this.lookahead = 0;
    resetGameState(this.registry);
    this.audio = new AudioManager(this);

    this.bgFar = this.add.tileSprite(0, 0, DISPLAY.width, DISPLAY.height, 'bg-arcade-far').setOrigin(0).setScrollFactor(0);
    this.bgNear = this.add.tileSprite(0, 0, DISPLAY.width, DISPLAY.height, 'bg-arcade-near').setOrigin(0).setScrollFactor(0);

    this.level = loadLevel(this, LEVEL_KEY);
    const { map, ground, spawn } = this.level;
    this.respawnPoint = spawn.clone();

    this.physics.world.gravity.y = PHYSICS.gravity;
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels + 64);
    this.physics.world.checkCollision.down = false;

    this.shots = this.physics.add.group({ classType: Projectile, defaultKey: 'projectiles', maxSize: RIFF_SHOT.maxOnScreen });
    this.bullets = this.physics.add.group({ classType: Projectile, defaultKey: 'projectiles', maxSize: 12 });
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.checkpoints = this.physics.add.group();
    this.portals = this.physics.add.group();

    this.inputs = new InputManager(this);
    this.player = new Player(this, spawn.x, spawn.y, this.inputs, this.shots);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    this.spawnEntities({ player: this.player, ground, bullets: this.bullets });
    this.setupCollisions();
    this.setupSounds();

    const cam = this.cameras.main;
    cam.setDeadzone(CAMERA.deadzoneWidth, CAMERA.deadzoneHeight);
    this.updateSection(true);

    this.input.keyboard!.on(`keydown-${AUDIO.muteKey}`, () => this.audio.toggleMute());

    this.scene.launch('UI');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop('UI'));
  }

  private spawnEntities(ctx: EnemyContext): void {
    for (const obj of this.level.objects) {
      const x = obj.x ?? 0;
      const y = obj.y ?? 0;
      if (obj.type === 'enemy') {
        const kind = getProp<string>(obj, 'enemyType');
        let enemy: Enemy;
        if (kind === 'flyer') enemy = new FlyerEnemy(this, x, y, ctx, getProp<number>(obj, 'patrolDistance'));
        else if (kind === 'shooter') enemy = new ShooterEnemy(this, x, y, ctx);
        else enemy = new PatrolEnemy(this, x, y, ctx);
        this.enemies.add(enemy);
        enemy.setupBody();
      } else if (obj.type === 'pickup') {
        const pickup = new Pickup(this, x, y, (getProp<string>(obj, 'kind') ?? 'cassette') as PickupKind);
        this.pickups.add(pickup);
        pickup.setupBody();
      } else if (obj.type === 'checkpoint') {
        const checkpoint = new Checkpoint(this, x, y);
        this.checkpoints.add(checkpoint);
        checkpoint.setupBody();
      } else if (obj.type === 'portal') {
        const portal = new Portal(
          this,
          x,
          y,
          getProp<string>(obj, 'sprite') ?? 'portal',
          getProp<string>(obj, 'target') ?? '',
          (getProp<string>(obj, 'effect') ?? 'fade') as TransitionEffect,
        );
        this.portals.add(portal);
        portal.setupBody();
      }
    }
  }

  private setupCollisions(): void {
    const { ground } = this.level;
    type Obj = Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0];

    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.enemies, ground);
    this.physics.add.collider(this.shots, ground, (shot: Obj) => (shot as Projectile).kill());
    this.physics.add.collider(this.bullets, ground, (bullet: Obj) => (bullet as Projectile).kill());

    this.physics.add.overlap(this.shots, this.enemies, (shot: Obj, enemy: Obj) => {
      (shot as Projectile).kill();
      const target = enemy as Enemy;
      target.hit(RIFF_SHOT.damage);
      if (target.active) this.audio.sfx('enemy-hit');
    });
    this.physics.add.overlap(this.player, this.enemies, (_p: Obj, enemy: Obj) => this.damagePlayer((enemy as Enemy).x));
    this.physics.add.overlap(this.player, this.bullets, (_p: Obj, bullet: Obj) => {
      if (this.player.isInvulnerable) return;
      (bullet as Projectile).kill();
      this.damagePlayer((bullet as Projectile).x);
    });
    this.physics.add.overlap(this.player, this.pickups, (_p: Obj, pickup: Obj) => this.collect(pickup as Pickup));
    this.physics.add.overlap(this.player, this.checkpoints, (_p: Obj, cp: Obj) => {
      const checkpoint = cp as Checkpoint;
      if (checkpoint.activated) return;
      checkpoint.activate();
      this.respawnPoint.set(checkpoint.x, checkpoint.y);
      this.audio.sfx('checkpoint');
    });
    this.physics.add.overlap(this.player, this.portals, (_p: Obj, portal: Obj) => {
      const p = portal as Portal;
      this.transitionTo(p.target, p.effect);
    });
  }

  private setupSounds(): void {
    this.events.on('player-jump', () => this.audio.sfx('jump', 0.6));
    this.events.on('player-shoot', () => this.audio.sfx('shoot', 0.5));
    this.events.on('enemy-killed', (enemy: Enemy) => {
      addTo(this.registry, STATE.score, enemy.scoreValue);
      this.spawnPop(enemy.x, enemy.y - enemy.height / 2);
      this.audio.sfx('enemy-die');
    });
  }

  private collect(pickup: Pickup): void {
    if (pickup.kind === 'heart') {
      const hearts = this.registry.get(STATE.hearts) as number;
      if (hearts >= HEALTH.heartsPerLife) return;
      this.registry.set(STATE.hearts, hearts + 1);
      this.audio.sfx('heart');
    } else {
      addTo(this.registry, STATE.cassettes, 1);
      addTo(this.registry, STATE.score, SCORE.cassette);
      this.audio.sfx('pickup');
    }
    this.spawnPop(pickup.x, pickup.y - 8);
    pickup.destroy();
  }

  private damagePlayer(sourceX: number): void {
    if (this.gameOver || this.transitioning || !this.player.hurt(sourceX)) return;
    this.cameras.main.shake(90, 0.01);
    const hearts = addTo(this.registry, STATE.hearts, -1);
    if (hearts <= 0) this.loseLife();
    else this.audio.sfx('hurt');
  }

  private loseLife(): void {
    const lives = addTo(this.registry, STATE.lives, -1);
    this.cameras.main.flash(150, 255, 46, 151);
    this.audio.sfx('lose-life');
    if (lives <= 0) {
      this.triggerGameOver();
      return;
    }
    this.registry.set(STATE.hearts, HEALTH.heartsPerLife);
    this.player.respawn(this.respawnPoint.x, this.respawnPoint.y);
    this.updateSection(true);
  }

  /** Placeholder until the GameOver scene with CONTINUE countdown arrives in milestone 5. */
  private triggerGameOver(): void {
    this.gameOver = true;
    this.physics.pause();
    this.player.setVisible(false);
    this.game.events.emit('game-over');
    this.time.delayedCall(2500, () => this.scene.restart());
  }

  /** Moves the player to another section through a cursed cabinet (glitch) or a portal (fade). */
  private transitionTo(target: string, effect: TransitionEffect): void {
    const dest = this.level.spawns.get(target);
    if (this.transitioning || !dest) return;
    this.transitioning = true;
    this.physics.pause();
    this.player.anims.pause();

    const cam = this.cameras.main;
    const leadIn = effect === 'glitch' ? 700 : 150;
    if (effect === 'glitch') {
      this.audio.sfx('glitch');
      cam.shake(leadIn, 0.012);
      this.game.events.emit('glitch', leadIn + 300);
    } else {
      this.audio.sfx('portal');
    }

    this.time.delayedCall(leadIn, () => {
      cam.fadeOut(250, 7, 6, 26);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.player.respawn(dest.x, dest.y);
        this.player.anims.resume();
        this.respawnPoint.copy(dest);
        this.updateSection(true);
        this.physics.resume();
        cam.fadeIn(350, 7, 6, 26);
        this.transitioning = false;
      });
    });
  }

  /** Checks which section the player is in and switches camera bounds, background and music. */
  private updateSection(snapCamera = false): void {
    const px = this.player.x;
    const next = this.level.sections.find((s) => px >= s.x && px < s.x + s.width) ?? this.level.sections[0];
    const cam = this.cameras.main;

    if (next !== this.section) {
      this.section = next;
      cam.setBounds(next.x, 0, next.width, this.level.map.heightInPixels);
      this.bgFar.setTexture(`bg-${next.background}-far`);
      this.bgNear.setTexture(`bg-${next.background}-near`);
      this.audio.playMusic(next.music);
      this.registry.set('section', next.name);
      if (next.title) this.game.events.emit('banner', next.title);
      if (next.name === 'boss') this.time.delayedCall(2200, () => this.game.events.emit('banner', 'BOSS FIGHT COMING SOON'));
      snapCamera = true;
    }
    if (snapCamera) {
      this.lookahead = this.player.facing * CAMERA.lookahead;
      cam.setFollowOffset(-this.lookahead, 0);
      cam.startFollow(this.player, true, CAMERA.lerpX, CAMERA.lerpY);
    }
  }

  private spawnPop(x: number, y: number): void {
    const fx = this.add.sprite(x, y, 'fx', 0).play('fx-pop');
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
  }

  private checkHazards(): void {
    const tile = this.level.ground.getTileAtWorldXY(this.player.x, this.player.y - 4);
    if ((tile?.properties as Record<string, unknown> | undefined)?.hazard) {
      this.damagePlayer(this.player.x + this.player.facing * 8);
    }
  }

  update(time: number, delta: number): void {
    if (this.gameOver || this.transitioning) return;
    this.inputs.update();
    this.player.update(time, delta);
    for (const enemy of this.enemies.getChildren()) (enemy as Enemy).update(time, delta);
    for (const pickup of this.pickups.getChildren()) (pickup as Pickup).update(time);

    this.checkHazards();
    // Fell into a pit: costs a whole life.
    if (this.player.y > this.level.map.heightInPixels + 48) this.loseLife();
    if (this.gameOver) return;
    this.updateSection();

    // Camera looks ahead in the facing direction (followOffset is subtracted from the target).
    this.lookahead = Phaser.Math.Linear(this.lookahead, this.player.facing * CAMERA.lookahead, CAMERA.lookaheadLerp);
    this.cameras.main.setFollowOffset(-this.lookahead, 0);

    const scrollX = this.cameras.main.scrollX;
    this.bgFar.tilePositionX = Math.round(scrollX * PARALLAX_FACTORS.far);
    this.bgNear.tilePositionX = Math.round(scrollX * PARALLAX_FACTORS.near);
  }
}

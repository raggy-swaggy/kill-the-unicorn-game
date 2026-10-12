import Phaser from 'phaser';
import { BOSS, CAMERA, HEALTH, PHYSICS, RIFF_SHOT, SCORE } from '../config/gameplay';
import { RHYTHM } from '../config/rhythm';
import { DISPLAY } from '../config/display';
import { BeatPlatform, BeatTrap } from '../entities/BeatPlatform';
import { UnicornBoss } from '../entities/boss/UnicornBoss';
import { Player } from '../entities/Player';
import { Portal, type TransitionEffect } from '../entities/Portal';
import { Projectile } from '../entities/Projectile';
import { Checkpoint, Pickup, type PickupKind } from '../entities/Pickup';
import type { Enemy, EnemyContext } from '../entities/enemies/Enemy';
import { FlyerEnemy } from '../entities/enemies/FlyerEnemy';
import { PatrolEnemy } from '../entities/enemies/PatrolEnemy';
import { ShooterEnemy } from '../entities/enemies/ShooterEnemy';
import { AudioManager } from '../systems/AudioManager';
import { BeatClock } from '../systems/BeatClock';
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
  private beatPlatforms!: Phaser.Physics.Arcade.Group;
  private beatTraps!: Phaser.Physics.Arcade.Group;
  private beatClock!: BeatClock;
  private bossSpawn?: Phaser.Math.Vector2;
  private boss?: UnicornBoss;
  private won = false;
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
    this.won = false;
    this.boss = undefined;
    this.bossSpawn = undefined;
    this.section = undefined;
    this.lookahead = 0;
    resetGameState(this.registry);
    this.audio = new AudioManager(this);
    this.beatClock = new BeatClock(this);
    this.beatClock.on('breakdown', () => this.cameras.main.shake(RHYTHM.breakdownShakeMs, RHYTHM.breakdownShakeIntensity));

    this.bgFar = this.add.tileSprite(0, 0, DISPLAY.width, DISPLAY.height, 'bg-arcade-far').setOrigin(0).setScrollFactor(0);
    this.bgNear = this.add.tileSprite(0, 0, DISPLAY.width, DISPLAY.height, 'bg-arcade-near').setOrigin(0).setScrollFactor(0);

    this.level = loadLevel(this, LEVEL_KEY);
    const { map, ground, spawn } = this.level;
    this.respawnPoint = spawn.clone();

    this.physics.world.gravity.y = PHYSICS.gravity;
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels + 64);
    this.physics.world.checkCollision.down = false;

    this.shots = this.physics.add.group({ classType: Projectile, defaultKey: 'projectiles', maxSize: RIFF_SHOT.maxOnScreen });
    this.bullets = this.physics.add.group({ classType: Projectile, defaultKey: 'projectiles', maxSize: 32 });
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.checkpoints = this.physics.add.group();
    this.portals = this.physics.add.group();
    this.beatPlatforms = this.physics.add.group();
    this.beatTraps = this.physics.add.group();

    this.inputs = new InputManager(this);
    this.player = new Player(this, spawn.x, spawn.y, this.inputs, this.shots);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    this.spawnEntities({ player: this.player, ground, bullets: this.bullets });
    this.registry.set('cassettesTotal', this.pickups.getChildren().filter((p) => (p as Pickup).kind === 'cassette').length);
    this.registry.set('bossMax', 0);
    this.setupCollisions();
    this.setupSounds();

    const cam = this.cameras.main;
    cam.setDeadzone(CAMERA.deadzoneWidth, CAMERA.deadzoneHeight);
    this.updateSection(true);

    this.scene.launch('UI');
    const onContinue = () => this.continueGame();
    // Leaving the tab or app (a phone call, the home button) opens the pause menu.
    const onHidden = () => this.openPause();
    this.game.events.on('continue', onContinue);
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('continue', onContinue);
      this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden);
      this.scene.stop('UI');
    });
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
      } else if (obj.type === 'beat-platform') {
        const tiles = getProp<number>(obj, 'tiles') ?? 3;
        const pattern = getProp<string>(obj, 'pattern') ?? '10';
        for (let i = 0; i < tiles; i++) {
          const segment = new BeatPlatform(this, x + i * 16, y, pattern);
          this.beatPlatforms.add(segment);
          segment.setupBody();
        }
      } else if (obj.type === 'beat-trap') {
        const trap = new BeatTrap(this, x, y, getProp<string>(obj, 'pattern') ?? '10');
        this.beatTraps.add(trap);
        trap.setupBody();
      } else if (obj.type === 'boss') {
        this.bossSpawn = new Phaser.Math.Vector2(x, y);
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
    this.physics.add.collider(this.player, this.beatPlatforms);
    this.physics.add.overlap(this.player, this.beatTraps, (_p: Obj, trap: Obj) => {
      const t = trap as BeatTrap;
      if (t.extended) this.damagePlayer(t.x + 8);
    });
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
    this.events.on('boss-hp', (hp: number, max: number) => {
      this.registry.set('bossHp', hp);
      this.registry.set('bossMax', max);
    });
    this.events.on('boss-phase2', () => {
      this.cameras.main.flash(300, 90, 0, 60);
      this.bgFar.setTint(0x9a5a9a);
      this.bgNear.setTint(0x9a5a9a);
      this.audio.setMusicRate(BOSS.phase2MusicRate);
    });
    this.events.on('boss-defeated', (boss: UnicornBoss) => this.winSequence(boss));
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
      const cassettes = addTo(this.registry, STATE.cassettes, 1);
      addTo(this.registry, STATE.score, SCORE.cassette);
      if (cassettes % SCORE.cassettesPerLife === 0) {
        addTo(this.registry, STATE.lives, 1);
        this.audio.sfx('1up');
        this.game.events.emit('banner', '1UP!');
      } else {
        this.audio.sfx('pickup');
      }
    }
    this.spawnPop(pickup.x, pickup.y - 8);
    pickup.destroy();
  }

  private damagePlayer(sourceX: number): void {
    if (this.gameOver || this.transitioning || this.won || !this.player.hurt(sourceX)) return;
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

  private triggerGameOver(): void {
    this.gameOver = true;
    this.physics.pause();
    this.player.setVisible(false);
    this.audio.stopMusic(300);
    this.audio.sfx('game-over');
    this.time.delayedCall(1500, () => {
      this.scene.pause('UI');
      this.scene.launch('GameOver', { score: this.registry.get(STATE.score) });
      this.scene.pause();
    });
  }

  /** CONTINUE: back at the last checkpoint with full lives, score reset to 0. */
  private continueGame(): void {
    this.registry.set(STATE.score, 0);
    this.registry.set(STATE.lives, HEALTH.lives);
    this.registry.set(STATE.hearts, HEALTH.heartsPerLife);
    this.player.respawn(this.respawnPoint.x, this.respawnPoint.y);
    this.player.setVisible(true);
    this.physics.resume();
    this.gameOver = false;
    this.cameras.main.flash(300, 41, 231, 255);
    if (this.section) this.audio.playMusic(this.section.music, this.boss?.phase === 2 ? BOSS.phase2MusicRate : 1);
    this.updateSection(true);
  }

  private openPause(): void {
    if (this.gameOver || this.won || !this.scene.isActive()) return;
    this.scene.pause('UI');
    this.scene.launch('Pause');
    this.scene.pause();
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
      if (next.name === 'boss') this.startBossFight(next);
      snapCamera = true;
    }
    if (snapCamera) {
      this.lookahead = this.player.facing * CAMERA.lookahead;
      cam.setFollowOffset(-this.lookahead, 0);
      cam.startFollow(this.player, true, CAMERA.lerpX, CAMERA.lerpY);
    }
  }

  private startBossFight(section: LevelSection): void {
    if (this.boss || !this.bossSpawn) return;
    const boss = new UnicornBoss(this, this.bossSpawn.x, this.bossSpawn.y, {
      player: this.player,
      bullets: this.bullets,
      audio: this.audio,
      arena: { x: section.x, width: section.width, floorY: this.bossSpawn.y },
      hurtPlayer: (sourceX) => this.damagePlayer(sourceX),
    });
    this.physics.add.existing(boss);
    boss.setupBody();
    this.boss = boss;
    type Obj = Parameters<Phaser.Types.Physics.Arcade.ArcadePhysicsCallback>[0];
    // The boss is too heavy for one-way platforms; it only lands on solid ground.
    this.physics.add.collider(boss, this.level.ground, undefined, (_b: Obj, tile: Obj) => {
      return !((tile as Phaser.Tilemaps.Tile).properties as Record<string, unknown>)?.oneWay;
    });
    this.physics.add.overlap(this.shots, boss, (a: Obj, b: Obj) => {
      const shot = (a instanceof Projectile ? a : b) as Projectile;
      if (!boss.vulnerable) return;
      shot.kill();
      boss.hit(RIFF_SHOT.damage);
    });
    this.physics.add.overlap(this.player, boss, () => {
      if (boss.alive) this.damagePlayer(boss.x);
    });
    this.registry.set('bossHp', boss.hp);
    this.registry.set('bossMax', boss.maxHp);
    this.time.delayedCall(1200, () => boss.start());
  }

  private winSequence(boss: UnicornBoss): void {
    this.won = true;
    this.player.makeInvulnerable(1e9);
    for (const b of this.bullets.getChildren()) (b as Projectile).kill();
    this.audio.stopMusic();
    this.audio.sfx('boss-die');
    addTo(this.registry, STATE.score, BOSS.score);
    this.registry.set('bossMax', 0);
    for (let i = 0; i < 12; i++) {
      this.time.delayedCall(i * 110, () => {
        this.spawnPop(boss.x + Phaser.Math.Between(-24, 24), boss.y - Phaser.Math.Between(8, 52));
        this.cameras.main.shake(80, 0.01);
      });
    }
    this.time.delayedCall(1400, () => {
      this.cameras.main.flash(500, 255, 255, 255);
      boss.destroy();
      this.boss = undefined;
      this.audio.sfx('win');
    });
    this.time.delayedCall(3200, () => {
      this.cameras.main.fadeOut(400, 7, 6, 26);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.stop('UI');
        this.scene.start('Win', {
          score: this.registry.get(STATE.score),
          cassettes: this.registry.get(STATE.cassettes),
          cassettesTotal: this.registry.get('cassettesTotal'),
        });
      });
    });
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
    if (this.inputs.justPressed('start')) return this.openPause();
    this.player.update(time, delta);
    for (const enemy of this.enemies.getChildren()) (enemy as Enemy).update(time, delta);
    for (const pickup of this.pickups.getChildren()) (pickup as Pickup).update(time);

    this.beatClock.update(time);
    for (const p of this.beatPlatforms.getChildren()) (p as BeatPlatform).sync(this.beatClock);
    for (const t of this.beatTraps.getChildren()) (t as BeatTrap).sync(this.beatClock);
    this.boss?.update(time);

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

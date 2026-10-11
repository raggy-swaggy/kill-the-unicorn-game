import Phaser from 'phaser';
import { CAMERA, HEALTH, PHYSICS, RIFF_SHOT, SCORE } from '../config/gameplay';
import { DISPLAY } from '../config/display';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { Checkpoint, Pickup, type PickupKind } from '../entities/Pickup';
import type { Enemy, EnemyContext } from '../entities/enemies/Enemy';
import { FlyerEnemy } from '../entities/enemies/FlyerEnemy';
import { PatrolEnemy } from '../entities/enemies/PatrolEnemy';
import { ShooterEnemy } from '../entities/enemies/ShooterEnemy';
import { addTo, resetGameState, STATE } from '../systems/GameState';
import { InputManager } from '../systems/InputManager';
import { getProp, loadLevel, type LoadedLevel } from '../systems/LevelLoader';

const PARALLAX = [
  { key: 'bg-arcade-far', factor: 0.1 },
  { key: 'bg-arcade-near', factor: 0.35 },
];

export class GameScene extends Phaser.Scene {
  private inputs!: InputManager;
  private player!: Player;
  private level!: LoadedLevel;
  private backgrounds: { sprite: Phaser.GameObjects.TileSprite; factor: number }[] = [];
  private lookahead = 0;

  private shots!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private checkpoints!: Phaser.Physics.Arcade.Group;
  private respawnPoint!: Phaser.Math.Vector2;
  private gameOver = false;

  constructor() {
    super('Game');
  }

  create(): void {
    this.gameOver = false;
    this.lookahead = 0;
    resetGameState(this.registry);

    this.backgrounds = PARALLAX.map(({ key, factor }) => ({
      sprite: this.add.tileSprite(0, 0, DISPLAY.width, DISPLAY.height, key).setOrigin(0).setScrollFactor(0),
      factor,
    }));

    this.level = loadLevel(this, 'testlevel');
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

    this.inputs = new InputManager(this);
    this.player = new Player(this, spawn.x, spawn.y, this.inputs, this.shots);
    this.player.setCollideWorldBounds(true);

    this.spawnEntities({ player: this.player, ground, bullets: this.bullets });
    this.setupCollisions();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, CAMERA.lerpX, CAMERA.lerpY);
    cam.setDeadzone(CAMERA.deadzoneWidth, CAMERA.deadzoneHeight);

    this.events.on('enemy-killed', (enemy: Enemy) => {
      addTo(this.registry, STATE.score, enemy.scoreValue);
      this.spawnPop(enemy.x, enemy.y - enemy.height / 2);
    });

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
      (enemy as Enemy).hit(RIFF_SHOT.damage);
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
    });
  }

  private collect(pickup: Pickup): void {
    if (pickup.kind === 'heart') {
      const hearts = this.registry.get(STATE.hearts) as number;
      if (hearts >= HEALTH.heartsPerLife) return;
      this.registry.set(STATE.hearts, hearts + 1);
    } else {
      addTo(this.registry, STATE.cassettes, 1);
      addTo(this.registry, STATE.score, SCORE.cassette);
    }
    this.spawnPop(pickup.x, pickup.y - 8);
    pickup.destroy();
  }

  private damagePlayer(sourceX: number): void {
    if (this.gameOver || !this.player.hurt(sourceX)) return;
    this.cameras.main.shake(90, 0.01);
    const hearts = addTo(this.registry, STATE.hearts, -1);
    if (hearts <= 0) this.loseLife();
  }

  private loseLife(): void {
    const lives = addTo(this.registry, STATE.lives, -1);
    this.cameras.main.flash(150, 255, 46, 151);
    if (lives <= 0) {
      this.triggerGameOver();
      return;
    }
    this.registry.set(STATE.hearts, HEALTH.heartsPerLife);
    this.player.respawn(this.respawnPoint.x, this.respawnPoint.y);
  }

  /** Placeholder until the GameOver scene with CONTINUE countdown arrives in milestone 5. */
  private triggerGameOver(): void {
    this.gameOver = true;
    this.physics.pause();
    this.player.setVisible(false);
    this.game.events.emit('game-over');
    this.time.delayedCall(2500, () => this.scene.restart());
  }

  private spawnPop(x: number, y: number): void {
    const fx = this.add.sprite(x, y, 'fx', 0).play('fx-pop');
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;
    this.inputs.update();
    this.player.update(time, delta);
    for (const enemy of this.enemies.getChildren()) (enemy as Enemy).update(time, delta);
    for (const pickup of this.pickups.getChildren()) (pickup as Pickup).update(time);

    // Fell into a pit: costs a whole life.
    if (this.player.y > this.level.map.heightInPixels + 48) this.loseLife();

    // Camera looks ahead in the facing direction (followOffset is subtracted from the target).
    this.lookahead = Phaser.Math.Linear(this.lookahead, this.player.facing * CAMERA.lookahead, CAMERA.lookaheadLerp);
    this.cameras.main.setFollowOffset(-this.lookahead, 0);

    const scrollX = this.cameras.main.scrollX;
    for (const bg of this.backgrounds) bg.sprite.tilePositionX = Math.round(scrollX * bg.factor);
  }
}

import Phaser from 'phaser';
import { CAMERA, PHYSICS } from '../config/gameplay';
import { DISPLAY } from '../config/display';
import { Player } from '../entities/Player';
import { InputManager } from '../systems/InputManager';
import { loadLevel, type LoadedLevel } from '../systems/LevelLoader';

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

  constructor() {
    super('Game');
  }

  create(): void {
    this.backgrounds = PARALLAX.map(({ key, factor }) => ({
      sprite: this.add.tileSprite(0, 0, DISPLAY.width, DISPLAY.height, key).setOrigin(0).setScrollFactor(0),
      factor,
    }));

    this.level = loadLevel(this, 'testlevel');
    const { map, ground, spawn } = this.level;

    this.physics.world.gravity.y = PHYSICS.gravity;
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels + 64);
    this.physics.world.checkCollision.down = false;

    this.inputs = new InputManager(this);
    this.player = new Player(this, spawn.x, spawn.y, this.inputs);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, ground);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, CAMERA.lerpX, CAMERA.lerpY);
    cam.setDeadzone(CAMERA.deadzoneWidth, CAMERA.deadzoneHeight);

    this.add
      .text(4, 4, 'ARROWS/WASD MOVE   SPACE JUMP', { fontFamily: 'monospace', fontSize: '8px', color: '#29e7ff' })
      .setScrollFactor(0)
      .setResolution(4);
  }

  update(time: number, delta: number): void {
    this.inputs.update();
    this.player.update(time, delta);

    // Fell into a pit: back to spawn. Damage and lives come in milestone 2.
    if (this.player.y > this.level.map.heightInPixels + 48) {
      this.player.respawn(this.level.spawn.x, this.level.spawn.y);
    }

    // Camera looks ahead in the facing direction (followOffset is subtracted from the target).
    this.lookahead = Phaser.Math.Linear(this.lookahead, this.player.facing * CAMERA.lookahead, CAMERA.lookaheadLerp);
    this.cameras.main.setFollowOffset(-this.lookahead, 0);

    const scrollX = this.cameras.main.scrollX;
    for (const bg of this.backgrounds) bg.sprite.tilePositionX = Math.round(scrollX * bg.factor);
  }
}

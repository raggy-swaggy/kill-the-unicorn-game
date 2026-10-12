import Phaser from 'phaser';
import { DISPLAY } from '../config/display';
import { PALETTE } from '../config/palette';
import { AudioManager } from '../systems/AudioManager';
import { InputManager } from '../systems/InputManager';
import { drawHighscoreTable } from '../ui/HighscoreTable';
import { pixelText } from '../ui/pixelText';
import { TouchControls } from '../ui/TouchControls';

const ATTRACT_MS = 7000;

/** Logo, PRESS START, and an attract loop that alternates with the highscore table. */
export class TitleScene extends Phaser.Scene {
  private inputs!: InputManager;
  private audio!: AudioManager;
  private starting = false;

  constructor() {
    super('Title');
  }

  create(): void {
    this.starting = false;
    this.inputs = new InputManager(this);
    this.audio = new AudioManager(this);
    this.audio.playMusic('music-title');
    this.cameras.main.fadeIn(400, 7, 6, 26);
    const cx = DISPLAY.width / 2;

    this.add.tileSprite(0, 0, DISPLAY.width, DISPLAY.height, 'bg-arcade-far').setOrigin(0).setScrollFactor(0);
    const near = this.add.tileSprite(0, 0, DISPLAY.width, DISPLAY.height, 'bg-arcade-near').setOrigin(0).setAlpha(0.5);
    this.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, dt: number) => (near.tilePositionX += dt * 0.01));
    this.add.rectangle(0, 0, DISPLAY.width, DISPLAY.height, PALETTE.void, 0.45).setOrigin(0);

    const logoPage = this.add.container(0, 0, [
      this.add.image(cx, 52, 'logo'),
      pixelText(this, cx, 92, 'CURSED ARCADE', { scale: 2, tint: PALETTE.cyan }),
    ]);
    const scorePage = this.add.container(0, 0, drawHighscoreTable(this, cx, 24)).setVisible(false);
    this.time.addEvent({
      delay: ATTRACT_MS,
      loop: true,
      callback: () => {
        logoPage.setVisible(!logoPage.visible);
        scorePage.setVisible(!logoPage.visible);
      },
    });

    const prompt = pixelText(this, cx, 128, TouchControls.active ? 'TAP TO START' : 'PRESS START', { scale: 2, tint: PALETTE.white });
    this.tweens.add({ targets: prompt, alpha: 0, duration: 450, yoyo: true, repeat: -1 });
    if (!TouchControls.active) pixelText(this, cx, 150, 'M SOUND  C CRT FILTER  F FULLSCREEN', { tint: PALETTE.violet });

    // Any key, tap or button starts. The first tap also unlocks audio on iOS.
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!['m', 'c', 'f'].includes(e.key.toLowerCase())) this.startGame();
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => this.startGame());
  }

  update(): void {
    this.inputs.update();
    if (this.inputs.confirmPressed) this.startGame();
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;
    this.audio.sfx('menu-select');
    this.audio.stopMusic(400);
    this.cameras.main.flash(150, 255, 46, 151);
    this.cameras.main.fadeOut(450, 7, 6, 26);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game'));
  }
}

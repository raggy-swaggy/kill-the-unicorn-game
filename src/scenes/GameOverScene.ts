import Phaser from 'phaser';
import { DISPLAY } from '../config/display';
import { CONTINUE } from '../config/gameplay';
import { PALETTE } from '../config/palette';
import { AudioManager } from '../systems/AudioManager';
import { addHighscore, rankFor } from '../systems/HighscoreStore';
import { InputManager } from '../systems/InputManager';
import { InitialsEntry } from '../ui/InitialsEntry';
import { pixelText } from '../ui/pixelText';
import { TouchControls } from '../ui/TouchControls';

export interface GameOverData {
  score: number;
}

/**
 * Overlay over the paused Game scene. A score good enough for the table is entered first,
 * so continuing (which resets the score) never costs the highscore. Then CONTINUE? counts down.
 */
export class GameOverScene extends Phaser.Scene {
  private inputs!: InputManager;
  private audio!: AudioManager;
  private entry?: InitialsEntry;
  private counting = false;
  private remaining = 0;
  private countText?: Phaser.GameObjects.BitmapText;
  private finished = false;

  constructor() {
    super('GameOver');
  }

  create(data: GameOverData): void {
    this.inputs = new InputManager(this);
    this.audio = new AudioManager(this);
    this.entry = undefined;
    this.counting = false;
    this.finished = false;
    new TouchControls(this, 'menu');

    const cx = DISPLAY.width / 2;
    const shade = this.add.rectangle(0, 0, DISPLAY.width, DISPLAY.height, PALETTE.void, 0).setOrigin(0);
    this.tweens.add({ targets: shade, fillAlpha: 0.75, duration: 400 });
    pixelText(this, cx, 34, 'GAME OVER', { scale: 3, tint: PALETTE.pink });
    pixelText(this, cx, 56, `SCORE ${String(data.score).padStart(6, '0')}`, { tint: PALETTE.white });

    const rank = rankFor(data.score);
    if (rank >= 0) {
      const title = pixelText(this, cx, 76, `NEW HIGHSCORE  RANK ${rank + 1}`, { tint: PALETTE.cyan });
      const hint = pixelText(this, cx, 116, TouchControls.active ? 'UP/DOWN LETTER  A NEXT' : 'UP/DOWN LETTER  SPACE NEXT', { tint: PALETTE.violet });
      this.entry = new InitialsEntry(this, this.inputs, cx, 96, (name) => {
        addHighscore(name, data.score);
        this.time.delayedCall(500, () => {
          this.entry?.destroy();
          this.entry = undefined;
          [title, hint].forEach((t) => t.destroy());
          this.startCountdown();
        });
      });
    } else {
      this.startCountdown();
    }
  }

  private startCountdown(): void {
    const cx = DISPLAY.width / 2;
    pixelText(this, cx, 84, 'CONTINUE?', { scale: 2, tint: PALETTE.cyan });
    this.countText = pixelText(this, cx, 110, '', { scale: 3, tint: PALETTE.white });
    const prompt = pixelText(this, cx, 136, TouchControls.active ? 'TAP A TO CONTINUE' : 'PRESS START', { tint: PALETTE.hotpink });
    this.tweens.add({ targets: prompt, alpha: 0, duration: 400, yoyo: true, repeat: -1 });
    // Classic arcade count: 9 down to 0 for a 10 second window.
    this.remaining = CONTINUE.seconds - 1;
    this.counting = true;
    this.showCount();
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.counting) return;
        this.remaining--;
        if (this.remaining < 0) this.giveUp();
        else this.showCount();
      },
    });
  }

  private showCount(): void {
    this.countText?.setText(String(this.remaining));
    this.audio.sfx('countdown');
  }

  update(): void {
    this.inputs.update();
    if (this.entry) return this.entry.update();
    if (!this.counting) return;
    if (this.inputs.confirmPressed) this.continueGame();
  }

  private continueGame(): void {
    if (this.finished) return;
    this.finished = true;
    this.counting = false;
    this.audio.sfx('menu-select');
    this.scene.resume('UI');
    this.scene.resume('Game');
    this.game.events.emit('continue');
    this.scene.stop();
  }

  private giveUp(): void {
    if (this.finished) return;
    this.finished = true;
    this.counting = false;
    this.cameras.main.fadeOut(600, 7, 6, 26);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop('UI');
      this.scene.stop('Game');
      this.scene.start('Title');
    });
  }
}

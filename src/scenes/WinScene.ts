import Phaser from 'phaser';
import { DISPLAY } from '../config/display';
import { PALETTE } from '../config/palette';
import { AudioManager } from '../systems/AudioManager';
import { addHighscore, rankFor } from '../systems/HighscoreStore';
import { InputManager } from '../systems/InputManager';
import { drawHighscoreTable } from '../ui/HighscoreTable';
import { InitialsEntry } from '../ui/InitialsEntry';
import { pixelText } from '../ui/pixelText';
import { TouchControls } from '../ui/TouchControls';

export interface WinData {
  score: number;
  cassettes: number;
  cassettesTotal: number;
}

/** Shown after the Unicorn is defeated: result, highscore entry, then the table. */
export class WinScene extends Phaser.Scene {
  private inputs!: InputManager;
  private entry?: InitialsEntry;
  private canLeave = false;
  private leaving = false;

  constructor() {
    super('Win');
  }

  create(data: WinData): void {
    const cx = DISPLAY.width / 2;
    this.inputs = new InputManager(this);
    this.entry = undefined;
    this.canLeave = false;
    this.leaving = false;
    new TouchControls(this, 'menu');
    this.cameras.main.fadeIn(500, 7, 6, 26);

    // Falling rainbow confetti, made of the unicorn's own colours.
    const colors = [PALETTE.pink, PALETTE.hotpink, PALETTE.cyan, PALETTE.white, PALETTE.violet];
    for (let i = 0; i < 40; i++) {
      const piece = this.add.rectangle(
        Phaser.Math.Between(0, DISPLAY.width),
        Phaser.Math.Between(-DISPLAY.height, 0),
        2,
        Phaser.Math.Between(1, 3),
        Phaser.Utils.Array.GetRandom(colors),
      );
      this.tweens.add({
        targets: piece,
        y: DISPLAY.height + 10,
        x: piece.x + Phaser.Math.Between(-30, 30),
        duration: Phaser.Math.Between(2500, 5000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }

    const result = this.add.container(0, 0, [
      pixelText(this, cx, 30, 'THE UNICORN', { scale: 2, tint: PALETTE.hotpink }),
      pixelText(this, cx, 50, 'IS DEAD!', { scale: 3, tint: PALETTE.pink }),
      pixelText(this, cx, 78, `SCORE ${String(data.score ?? 0).padStart(6, '0')}`, { scale: 2, tint: PALETTE.cyan }),
      pixelText(this, cx, 96, `CASSETTES ${data.cassettes ?? 0}/${data.cassettesTotal ?? 0}`, { tint: PALETTE.white }),
    ]);

    const rank = rankFor(data.score ?? 0);
    // Short delay so a held fire button doesn't skip the screen.
    this.time.delayedCall(1500, () => {
      if (rank < 0) return this.showTable(result, -1);
      const title = pixelText(this, cx, 114, `NEW HIGHSCORE  RANK ${rank + 1}`, { tint: PALETTE.cyan });
      this.entry = new InitialsEntry(this, this.inputs, cx, 132, (name) => {
        const placed = addHighscore(name, data.score);
        this.time.delayedCall(600, () => {
          this.entry?.destroy();
          this.entry = undefined;
          title.destroy();
          this.showTable(result, placed);
        });
      });
    });
  }

  private showTable(result: Phaser.GameObjects.Container, highlight: number): void {
    const cx = DISPLAY.width / 2;
    this.tweens.add({ targets: result, alpha: 0, duration: 300, onComplete: () => result.destroy() });
    this.time.delayedCall(300, () => {
      drawHighscoreTable(this, cx, 20, highlight);
      const prompt = pixelText(this, cx, 116 + 40, TouchControls.active ? 'TAP TO CONTINUE' : 'PRESS START', { tint: PALETTE.white });
      this.tweens.add({ targets: prompt, alpha: 0, duration: 450, yoyo: true, repeat: -1 });
      this.time.delayedCall(500, () => {
        this.canLeave = true;
        this.input.once(Phaser.Input.Events.POINTER_UP, () => this.leave());
      });
    });
  }

  update(): void {
    this.inputs.update();
    if (this.entry) return this.entry.update();
    if (this.canLeave && this.inputs.confirmPressed) this.leave();
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    new AudioManager(this).sfx('menu-select');
    this.cameras.main.fadeOut(400, 7, 6, 26);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Title'));
  }
}

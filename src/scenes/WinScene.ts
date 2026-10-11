import Phaser from 'phaser';
import { DISPLAY } from '../config/display';
import { PALETTE } from '../config/palette';
import { pixelText } from '../ui/pixelText';

export interface WinData {
  score: number;
  cassettes: number;
  cassettesTotal: number;
}

/** Shown after the Unicorn is defeated. Highscore entry follows in milestone 5. */
export class WinScene extends Phaser.Scene {
  constructor() {
    super('Win');
  }

  create(data: WinData): void {
    const cx = DISPLAY.width / 2;
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

    pixelText(this, cx, 30, 'THE UNICORN', { scale: 2, tint: PALETTE.hotpink });
    pixelText(this, cx, 50, 'IS DEAD!', { scale: 3, tint: PALETTE.pink });
    pixelText(this, cx, 84, `SCORE ${String(data.score ?? 0).padStart(6, '0')}`, { scale: 2, tint: PALETTE.cyan });
    pixelText(this, cx, 104, `CASSETTES ${data.cassettes ?? 0}/${data.cassettesTotal ?? 0}`, { tint: PALETTE.white });

    const prompt = pixelText(this, cx, 140, 'PRESS START', { scale: 2, tint: PALETTE.white });
    this.tweens.add({ targets: prompt, alpha: 0, duration: 450, yoyo: true, repeat: -1 });

    // Short delay so a held fire button doesn't skip the screen.
    this.time.delayedCall(1200, () => {
      const restart = () => this.scene.start('Game');
      this.input.keyboard?.once('keydown', restart);
      this.input.once('pointerdown', restart);
      this.input.gamepad?.once('down', restart);
    });
  }
}

import Phaser from 'phaser';
import { PALETTE } from '../config/palette';
import { AudioManager } from '../systems/AudioManager';
import type { InputManager } from '../systems/InputManager';
import { pixelText } from './pixelText';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!? ';
const SLOT_GAP = 16;

/**
 * Arcade-style three-letter name entry. Up/down picks the letter, confirm (or right)
 * moves on, left goes back. Call update() every frame; onDone gets the name.
 */
export class InitialsEntry {
  private letters = [0, 0, 0];
  private slot = 0;
  private texts: Phaser.GameObjects.BitmapText[] = [];
  private cursor: Phaser.GameObjects.Rectangle;
  private done = false;
  private audio: AudioManager;

  constructor(
    scene: Phaser.Scene,
    private inputs: InputManager,
    x: number,
    y: number,
    private onDone: (name: string) => void,
  ) {
    this.audio = new AudioManager(scene);
    for (let i = 0; i < 3; i++) {
      this.texts.push(pixelText(scene, x + (i - 1) * SLOT_GAP, y, 'A', { scale: 2, tint: PALETTE.white }));
    }
    this.cursor = scene.add.rectangle(0, y + 9, 10, 2, PALETTE.pink).setOrigin(0.5, 0);
    scene.tweens.add({ targets: this.cursor, alpha: 0.2, duration: 250, yoyo: true, repeat: -1 });
    this.refresh();
  }

  update(): void {
    if (this.done) return;
    const step = (this.inputs.repeated('up') ? 1 : 0) - (this.inputs.repeated('down') ? 1 : 0);
    if (step) {
      this.letters[this.slot] = Phaser.Math.Wrap(this.letters[this.slot] + step, 0, LETTERS.length);
      this.audio.sfx('menu-move');
      this.refresh();
    }
    if (this.inputs.justPressed('left') && this.slot > 0) {
      this.slot--;
      this.audio.sfx('menu-move');
      this.refresh();
    } else if (this.inputs.confirmPressed || this.inputs.justPressed('right')) {
      if (this.slot < 2) {
        // Start the next slot on the same letter: quick for names like "AAA" or "KKK".
        this.letters[this.slot + 1] = this.letters[this.slot];
        this.slot++;
        this.audio.sfx('menu-move');
        this.refresh();
      } else {
        this.done = true;
        this.cursor.setVisible(false);
        this.audio.sfx('menu-select');
        this.onDone(this.letters.map((i) => LETTERS[i]).join(''));
      }
    }
  }

  destroy(): void {
    this.texts.forEach((t) => t.destroy());
    this.cursor.destroy();
  }

  private refresh(): void {
    this.texts.forEach((t, i) => t.setText(LETTERS[this.letters[i]] === ' ' ? '-' : LETTERS[this.letters[i]]));
    this.texts.forEach((t, i) => t.setTint(i === this.slot ? PALETTE.cyan : PALETTE.white));
    const t = this.texts[this.slot];
    this.cursor.setX(t.x + t.width / 2);
  }
}

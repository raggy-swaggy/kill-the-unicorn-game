import Phaser from 'phaser';
import { DISPLAY } from '../config/display';
import { PALETTE } from '../config/palette';
import { createAnimations, createFonts, getManifest, queueManifest } from '../systems/AssetManifest';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const w = 120;
    const x = (DISPLAY.width - w) / 2;
    const y = DISPLAY.height / 2;
    this.add.rectangle(x, y, w, 6).setOrigin(0, 0.5).setStrokeStyle(1, PALETTE.purple);
    const bar = this.add.rectangle(x + 1, y, 0, 4, PALETTE.pink).setOrigin(0, 0.5);
    this.load.on('progress', (p: number) => (bar.width = (w - 2) * p));

    queueManifest(this, getManifest(this));
  }

  create(): void {
    const manifest = getManifest(this);
    createAnimations(this, manifest);
    createFonts(this, manifest);
    this.scene.start('Game');
  }
}

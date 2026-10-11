import Phaser from 'phaser';
import { ASSET_BASE, MANIFEST_KEY } from '../systems/AssetManifest';

/** Loads only the asset manifest; PreloadScene loads everything listed in it. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.json(MANIFEST_KEY, `${ASSET_BASE}manifest.json`);
  }

  create(): void {
    this.scene.start('Preload');
  }
}

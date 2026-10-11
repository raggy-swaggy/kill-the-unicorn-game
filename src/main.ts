import Phaser from 'phaser';
import { DISPLAY } from './config/display';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { PreloadScene } from './scenes/PreloadScene';
import { UIScene } from './scenes/UIScene';
import { installPixelScaler } from './systems/PixelScaler';

const debug = new URLSearchParams(window.location.search).has('debug');

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: DISPLAY.width,
  height: DISPLAY.height,
  backgroundColor: DISPLAY.backgroundColor,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { gamepad: true },
  physics: {
    default: 'arcade',
    arcade: { debug, fps: 60 },
  },
  scene: [BootScene, PreloadScene, GameScene, UIScene],
});

installPixelScaler(game);

if (debug) (window as unknown as { game: Phaser.Game }).game = game;

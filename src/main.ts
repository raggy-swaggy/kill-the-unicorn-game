import Phaser from 'phaser';
import { DISPLAY } from './config/display';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { TitleScene } from './scenes/TitleScene';
import { PreloadScene } from './scenes/PreloadScene';
import { UIScene } from './scenes/UIScene';
import { WinScene } from './scenes/WinScene';
import { HOTKEYS } from './config/controls';
import { initAudio, setMuted } from './systems/AudioManager';
import { applyCrt, toggleCrt } from './systems/CrtFilter';
import { installPixelScaler } from './systems/PixelScaler';
import { getSettings } from './systems/Settings';

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
  // Order is draw order: overlays come last.
  scene: [BootScene, PreloadScene, TitleScene, GameScene, UIScene, WinScene, PauseScene, GameOverScene],
});

installPixelScaler(game);
applyCrt();
game.events.once(Phaser.Core.Events.READY, () => initAudio(game));

// Global keys work in every scene.
window.addEventListener('keydown', (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key === HOTKEYS.mute) setMuted(game, !getSettings().muted);
  else if (key === HOTKEYS.crt) toggleCrt();
  else if (key === HOTKEYS.fullscreen && game.device.fullscreen.available) game.scale.toggleFullscreen();
});

// Portrait on a phone: show the rotate hint (index.html) and hold the game until it's turned back.
const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
const onOrientation = () => {
  if (portrait.matches) game.pause();
  else if (game.isPaused) game.resume();
};
portrait.addEventListener('change', onOrientation);
game.events.once(Phaser.Core.Events.READY, onOrientation);

if (debug) (window as unknown as { game: Phaser.Game }).game = game;

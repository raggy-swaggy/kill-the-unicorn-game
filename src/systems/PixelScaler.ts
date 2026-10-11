import Phaser from 'phaser';
import { DISPLAY } from '../config/display';

/**
 * Scales the canvas to fill the window. Prefers whole-number zoom for crisp pixels,
 * falls back to a free fit when integer zoom would waste too much screen.
 */
export function installPixelScaler(game: Phaser.Game): void {
  const apply = () => {
    const fit = Math.min(window.innerWidth / DISPLAY.width, window.innerHeight / DISPLAY.height);
    const whole = Math.floor(fit);
    const zoom = whole >= 1 && whole / fit >= DISPLAY.integerZoomThreshold ? whole : fit;
    game.scale.setZoom(zoom);
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', () => setTimeout(apply, 200));
}

import Phaser from 'phaser';
import { PALETTE } from '../config/palette';
import { getHighscores } from '../systems/HighscoreStore';
import { pixelText } from './pixelText';

const ROW = 8;

/** Draws the top-10 list centred at x. The row at `highlight` blinks. Returns the created texts. */
export function drawHighscoreTable(scene: Phaser.Scene, x: number, y: number, highlight = -1): Phaser.GameObjects.GameObject[] {
  const objects: Phaser.GameObjects.GameObject[] = [pixelText(scene, x, y, 'HIGH SCORES', { tint: PALETTE.hotpink })];
  getHighscores().forEach((entry, i) => {
    const rank = `${i + 1}.`.padStart(3, ' ');
    const line = `${rank} ${entry.name}  ${String(entry.score).padStart(6, '0')}`;
    const color = i === highlight ? PALETTE.cyan : i < 3 ? PALETTE.white : PALETTE.violet;
    const text = pixelText(scene, x, y + 12 + i * ROW, line, { tint: color });
    if (i === highlight) scene.tweens.add({ targets: text, alpha: 0.3, duration: 300, yoyo: true, repeat: -1 });
    objects.push(text);
  });
  return objects;
}

import Phaser from 'phaser';
import { HEALTH } from '../config/gameplay';

/**
 * Run-wide values live in the game registry so the HUD can react to changes
 * via registry 'changedata-<key>' events.
 */
export const STATE = {
  score: 'score',
  lives: 'lives',
  hearts: 'hearts',
  cassettes: 'cassettes',
} as const;

export function resetGameState(registry: Phaser.Data.DataManager): void {
  registry.set(STATE.score, 0);
  registry.set(STATE.lives, HEALTH.lives);
  registry.set(STATE.hearts, HEALTH.heartsPerLife);
  registry.set(STATE.cassettes, 0);
}

export function addTo(registry: Phaser.Data.DataManager, key: string, amount: number): number {
  const value = (registry.get(key) as number) + amount;
  registry.set(key, value);
  return value;
}

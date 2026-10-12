import Phaser from 'phaser';
import { AUDIO } from '../config/audio';
import { getSettings, updateSettings } from './Settings';

/**
 * Music and sound effects. Music outlives scene restarts, so the current track is
 * kept at module level. Keys that are missing from the manifest are ignored.
 */
let currentMusic: Phaser.Sound.WebAudioSound | undefined;
let currentKey: string | undefined;
let pendingKey: string | undefined;

export function getCurrentMusic(): Phaser.Sound.BaseSound | undefined {
  return currentMusic;
}

/**
 * Sets up things that only need to happen once per page: the saved mute state, and on iOS
 * an audio session that keeps playing when the ring/silent switch is set to silent.
 */
export function initAudio(game: Phaser.Game): void {
  game.sound.mute = getSettings().muted;
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) session.type = 'playback';
}

export class AudioManager {
  constructor(private scene: Phaser.Scene) {}

  /** Cross-fades to another looping track. `rate` speeds it up (boss phase 2 after a continue). */
  playMusic(key: string, rate = 1): void {
    if (key === currentKey || key === pendingKey) return;
    if (!this.scene.cache.audio.exists(key)) return;
    pendingKey = key;

    const start = () => {
      if (pendingKey !== key) return;
      pendingKey = undefined;
      if (currentMusic) this.fadeOutAndDestroy(currentMusic);
      const music = this.scene.sound.add(key, { loop: true, volume: 0, rate }) as Phaser.Sound.WebAudioSound;
      music.play();
      currentMusic = music;
      currentKey = key;
      this.fade(music, AUDIO.musicVolume * 0.2, AUDIO.musicVolume, AUDIO.musicFadeMs);
    };

    // Browsers only allow audio after a user gesture; start as soon as that happens.
    if (this.scene.sound.locked) this.scene.sound.once(Phaser.Sound.Events.UNLOCKED, start);
    else start();
  }

  /** Speeds the current track up or down, e.g. for the boss's second phase. */
  setMusicRate(rate: number): void {
    currentMusic?.setRate?.(rate);
  }

  stopMusic(fadeMs = 0): void {
    if (currentMusic) {
      if (fadeMs > 0) this.fadeOutAndDestroy(currentMusic, fadeMs);
      else {
        currentMusic.stop();
        currentMusic.destroy();
      }
    }
    currentMusic = undefined;
    currentKey = undefined;
    pendingKey = undefined;
  }

  sfx(key: string, volume = 1): void {
    const fullKey = `sfx-${key}`;
    if (this.scene.sound.locked || !this.scene.cache.audio.exists(fullKey)) return;
    this.scene.sound.play(fullKey, { volume: AUDIO.sfxVolume * volume });
  }

  private fadeOutAndDestroy(music: Phaser.Sound.WebAudioSound, ms = AUDIO.musicFadeMs / 2): void {
    this.fade(music, music.volume, 0, ms, () => {
      music.stop();
      music.destroy();
    });
  }

  /** Volume tween on the game-wide clock, so it keeps running when the scene that started it stops. */
  private fade(music: Phaser.Sound.WebAudioSound, from: number, to: number, ms: number, done?: () => void): void {
    const startTime = performance.now();
    const step = () => {
      // The sound may already be destroyed (scene change, stopMusic).
      if (!music.manager) return;
      const k = Math.min(1, (performance.now() - startTime) / ms);
      music.setVolume(from + (to - from) * k);
      if (k < 1) requestAnimationFrame(step);
      else done?.();
    };
    step();
  }
}

export function setMuted(game: Phaser.Game, muted: boolean): boolean {
  game.sound.mute = muted;
  updateSettings({ muted });
  return muted;
}

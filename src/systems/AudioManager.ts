import Phaser from 'phaser';
import { AUDIO } from '../config/audio';

/**
 * Music and sound effects. Music outlives scene restarts, so the current track is
 * kept at module level. Keys that are missing from the manifest are ignored.
 */
let currentMusic: Phaser.Sound.BaseSound | undefined;
let currentKey: string | undefined;
let pendingKey: string | undefined;

export function getCurrentMusic(): Phaser.Sound.BaseSound | undefined {
  return currentMusic;
}

export class AudioManager {
  constructor(private scene: Phaser.Scene) {}

  playMusic(key: string): void {
    if (key === currentKey || key === pendingKey) return;
    if (!this.scene.cache.audio.exists(key)) return;
    pendingKey = key;

    const start = () => {
      if (pendingKey !== key) return;
      pendingKey = undefined;
      currentMusic?.stop();
      currentMusic?.destroy();
      const music = this.scene.sound.add(key, { loop: true, volume: 0 });
      music.play();
      currentMusic = music;
      currentKey = key;
      const setVolume = (v: number) => {
        // The track may have been replaced (and destroyed) while fading in.
        if (currentMusic === music) (music as Phaser.Sound.WebAudioSound).setVolume?.(v);
      };
      this.scene.tweens.addCounter({
        from: 0.2,
        to: 1,
        duration: AUDIO.musicFadeMs,
        onUpdate: (tween) => setVolume(AUDIO.musicVolume * tween.getValue()!),
        onStop: () => setVolume(AUDIO.musicVolume),
      });
    };

    // Browsers only allow audio after a user gesture; start as soon as that happens.
    if (this.scene.sound.locked) this.scene.sound.once(Phaser.Sound.Events.UNLOCKED, start);
    else start();
  }

  /** Speeds the current track up or down, e.g. for the boss's second phase. */
  setMusicRate(rate: number): void {
    (currentMusic as Phaser.Sound.WebAudioSound | undefined)?.setRate?.(rate);
  }

  stopMusic(): void {
    currentMusic?.stop();
    currentMusic?.destroy();
    currentMusic = undefined;
    currentKey = undefined;
    pendingKey = undefined;
  }

  sfx(key: string, volume = 1): void {
    const fullKey = `sfx-${key}`;
    if (this.scene.sound.locked || !this.scene.cache.audio.exists(fullKey)) return;
    this.scene.sound.play(fullKey, { volume: AUDIO.sfxVolume * volume });
  }

  toggleMute(): void {
    this.scene.sound.mute = !this.scene.sound.mute;
  }
}

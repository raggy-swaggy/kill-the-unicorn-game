import Phaser from 'phaser';
import { DEFAULT_BPM, TRACKS } from '../config/rhythm';
import { getCurrentMusic } from './AudioManager';

/**
 * Derives the beat from the playback position of the current music track
 * (not from frame counts, so nothing drifts). Emits 'beat' with the beat
 * number inside the loop, plus 'breakdown' on beats inside a breakdown range.
 */
export class BeatClock extends Phaser.Events.EventEmitter {
  /** Beat number inside the current loop. */
  beat = 0;
  /** 0..1 progress through the current beat. */
  phase = 0;
  private lastBeat = -1;
  private fallbackStart = 0;

  constructor(scene: Phaser.Scene) {
    super();
    this.fallbackStart = scene.time.now;
  }

  update(time: number): void {
    const music = getCurrentMusic();
    const track = music ? TRACKS[music.key] : undefined;
    const bpm = track?.bpm ?? DEFAULT_BPM;
    const beatLen = 60 / bpm;

    let position: number;
    if (music?.isPlaying) {
      const duration = music.duration || Infinity;
      position = ((music as Phaser.Sound.WebAudioSound).seek % duration) - (track?.offsetMs ?? 0) / 1000;
    }
    else position = (time - this.fallbackStart) / 1000;

    const exact = Math.max(0, position) / beatLen;
    const beat = Math.floor(exact);
    this.phase = exact - beat;
    if (beat === this.lastBeat) return;
    this.lastBeat = beat;
    this.beat = beat;
    this.emit('beat', beat);
    if (track?.breakdowns?.some(([from, to]) => beat >= from && beat < to)) this.emit('breakdown', beat);
  }

  /** State of a pattern like "1100" at the current beat, and whether it changes at the next beat. */
  sample(pattern: string, warnFraction: number): { on: boolean; warn: boolean } {
    if (!pattern) return { on: true, warn: false };
    const n = pattern.length;
    const on = pattern[this.beat % n] === '1';
    const next = pattern[(this.beat + 1) % n] === '1';
    return { on, warn: on !== next && this.phase >= 1 - warnFraction };
  }
}

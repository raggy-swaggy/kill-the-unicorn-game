/**
 * Tempo per music track. The beat clock reads the playback position of the
 * current track, so platforms and traps stay in sync with the music.
 * When a real band track replaces a placeholder, update its BPM here.
 *
 * breakdowns: ranges of beats [from, to) inside one loop of the track where
 * the screen shakes on every beat.
 */
export const TRACKS: Record<string, { bpm: number; offsetMs?: number; breakdowns?: [number, number][] }> = {
  'music-arcade': { bpm: 140 },
  'music-datahighway': { bpm: 136 },
  'music-catacombs': { bpm: 140, breakdowns: [[8, 16], [24, 32]] },
  'music-boss': { bpm: 160 },
};

/** Used while no music is playing (audio still locked or track missing). */
export const DEFAULT_BPM = 120;

export const RHYTHM = {
  /** Part of a beat before a switch in which platforms and traps flash a warning. */
  warnFraction: 0.4,
  breakdownShakeMs: 90,
  breakdownShakeIntensity: 0.006,
} as const;

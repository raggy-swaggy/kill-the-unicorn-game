import { HIGHSCORE } from '../config/gameplay';

export interface HighscoreEntry {
  name: string;
  score: number;
}

/** Top-10 table in localStorage. Falls back to an in-memory table when storage is blocked. */
let memory: HighscoreEntry[] | undefined;

export function getHighscores(): HighscoreEntry[] {
  if (memory) return memory;
  try {
    const stored = JSON.parse(localStorage.getItem(HIGHSCORE.storageKey) ?? 'null');
    if (Array.isArray(stored)) return (memory = stored.slice(0, HIGHSCORE.entries));
  } catch {
    // fall through to defaults
  }
  return (memory = HIGHSCORE.defaults.map(([name, score]) => ({ name, score })));
}

/** Position (0-based) the score would take in the table, or -1 if it doesn't make it. */
export function rankFor(score: number): number {
  if (score <= 0) return -1;
  const table = getHighscores();
  const index = table.findIndex((e) => score > e.score);
  if (index >= 0) return index;
  return table.length < HIGHSCORE.entries ? table.length : -1;
}

export function addHighscore(name: string, score: number): number {
  const rank = rankFor(score);
  if (rank < 0) return -1;
  const table = [...getHighscores()];
  table.splice(rank, 0, { name, score });
  memory = table.slice(0, HIGHSCORE.entries);
  try {
    localStorage.setItem(HIGHSCORE.storageKey, JSON.stringify(memory));
  } catch {
    // Kept for this visit only.
  }
  return rank;
}

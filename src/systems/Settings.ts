/**
 * Player settings that survive reloads. Storage can be unavailable (private mode,
 * blocked site data), so every access falls back to the defaults.
 */
const KEY = 'ktu-settings-v1';

export interface Settings {
  muted: boolean;
  crt: boolean;
}

const defaults: Settings = { muted: false, crt: true };
let current: Settings = load();

function load(): Settings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...defaults };
  }
}

export function getSettings(): Readonly<Settings> {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Not persisted; the setting still applies for this visit.
  }
}

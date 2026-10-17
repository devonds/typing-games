// Everything the game remembers between visits, kept in this browser's localStorage.
import type { Difficulty, SpeedMode } from "./config";
import type { Stats } from "./game/stats";
import type { LessonId } from "./lessons";

export interface Settings {
  lesson: LessonId;
  difficulty: Difficulty;
  speedMode: SpeedMode;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { lesson: "home", difficulty: "easy", speedMode: "ramp", sound: true };

const KEYS = {
  settings: "balloon-pop/settings/v1",
  stats: "balloon-pop/stats/v1",
  best: "balloon-pop/best/v1",
};

// localStorage can be missing or throw (private windows, blocked storage); the game still works, it just forgets.
function read<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not saved; nothing else to do.
  }
}

export const loadSettings = (): Settings => read(KEYS.settings, { ...DEFAULT_SETTINGS });
export const saveSettings = (s: Settings): void => write(KEYS.settings, s);

export const loadStats = (): Stats => read<Stats>(KEYS.stats, {});
export const saveStats = (s: Stats): void => write(KEYS.stats, s);

/** Best scores, keyed by lesson + difficulty + speed mode. */
export const loadBest = (): Record<string, number> => read<Record<string, number>>(KEYS.best, {});
export const saveBest = (b: Record<string, number>): void => write(KEYS.best, b);

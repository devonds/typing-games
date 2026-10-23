// What Word Garden remembers between visits. The letter history is shared with the other games (shared/storage.ts).
import type { LessonId } from "../shared/lessons";
import { read, write } from "../shared/storage";
import type { BurstChoice, Level, RoundLength } from "./config";

export interface Settings {
  /** Which letters to favour when picking sentences. */
  lesson: LessonId;
  level: Level;
  length: RoundLength;
  bursts: BurstChoice;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { lesson: "all", level: "short", length: 5, bursts: "random", sound: true };

const KEYS = {
  settings: "word-garden/settings/v1",
  best: "word-garden/best/v1",
};

export const loadSettings = (): Settings => read(KEYS.settings, { ...DEFAULT_SETTINGS });
export const saveSettings = (s: Settings): void => write(KEYS.settings, s);

/** Best words per minute, keyed by sentence length. */
export const loadBest = (): Record<string, number> => read<Record<string, number>>(KEYS.best, {});
export const saveBest = (b: Record<string, number>): void => write(KEYS.best, b);

// What Balloon Pop remembers between visits. The letter history is shared with the other games (shared/storage.ts).
import type { LessonId } from "../shared/lessons";
import { read, write } from "../shared/storage";
import type { Difficulty, SpeedMode } from "./config";

export interface Settings {
  lesson: LessonId;
  difficulty: Difficulty;
  speedMode: SpeedMode;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { lesson: "home", difficulty: "easy", speedMode: "ramp", sound: true };

const KEYS = {
  settings: "balloon-pop/settings/v1",
  best: "balloon-pop/best/v1",
};

export const loadSettings = (): Settings => read(KEYS.settings, { ...DEFAULT_SETTINGS });
export const saveSettings = (s: Settings): void => write(KEYS.settings, s);

/** Best scores, keyed by lesson + difficulty + speed mode. */
export const loadBest = (): Record<string, number> => read<Record<string, number>>(KEYS.best, {});
export const saveBest = (b: Record<string, number>): void => write(KEYS.best, b);

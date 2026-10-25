// What Fresh Cuts remembers between visits, for each player. Saved through the player (shared/player.ts), so siblings
// on one computer keep their own settings and best scores; the letter history is shared by all three games.
import type { GuideMode } from "../shared/guide";
import type { LessonId } from "../shared/lessons";
import type { Player } from "../shared/player";
import type { Difficulty, RoundLength, SpeedMode } from "./config";

export interface Settings {
  lesson: LessonId;
  difficulty: Difficulty;
  speedMode: SpeedMode;
  /** Play until the baskets run out, or a timed round. */
  length: RoundLength;
  rotten: boolean;
  /** How much the finger keyboard helps during play. */
  guide: GuideMode;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { lesson: "mine", difficulty: "easy", speedMode: "ramp", length: "baskets", rotten: true, guide: "automatic", sound: true };

const KEYS = {
  settings: "fresh-cuts/settings/v1",
  best: "fresh-cuts/best/v1",
};

/** Saved settings from before a setting existed get its default (read() merges them in). */
export const loadSettings = (player: Player): Settings => player.read(KEYS.settings, { ...DEFAULT_SETTINGS });
export const saveSettings = (player: Player, s: Settings): void => player.write(KEYS.settings, s);

/** Best scores, keyed by lesson + difficulty + speed mode + rotten fruit (+ length, for timed rounds). */
export const loadBest = (player: Player): Record<string, number> => player.read<Record<string, number>>(KEYS.best, {});
export const saveBest = (player: Player, b: Record<string, number>): void => player.write(KEYS.best, b);

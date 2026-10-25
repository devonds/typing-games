// What Balloon Pop remembers for each player, saved through their profile (shared/player.ts). Settings saved before
// a field existed load with that field's default (Player.read merges over the defaults).
import type { GuideMode } from "../shared/guide";
import type { LessonId } from "../shared/lessons";
import type { Player } from "../shared/player";
import type { Difficulty, SpeedMode } from "./config";

export interface Settings {
  lesson: LessonId;
  difficulty: Difficulty;
  speedMode: SpeedMode;
  sound: boolean;
  /** How much the finger keyboard helps during play. */
  guide: GuideMode;
  /** "lives": play until the lives run out; "timed": a ROUND_SECONDS round. */
  length: RoundLength;
}

export type RoundLength = "lives" | "timed";

/** New players start on the Learn path, with no speed-up. */
export const DEFAULT_SETTINGS: Settings = { lesson: "mine", difficulty: "easy", speedMode: "steady", sound: true, guide: "automatic", length: "lives" };

const KEYS = {
  settings: "balloon-pop/settings/v1",
  best: "balloon-pop/best/v1",
};

export const loadSettings = (player: Player): Settings => player.read(KEYS.settings, { ...DEFAULT_SETTINGS });
export const saveSettings = (player: Player, s: Settings): void => player.write(KEYS.settings, s);

/** Best scores, keyed by lesson + difficulty + speed mode. */
export const loadBest = (player: Player): Record<string, number> => player.read<Record<string, number>>(KEYS.best, {});
export const saveBest = (player: Player, b: Record<string, number>): void => player.write(KEYS.best, b);

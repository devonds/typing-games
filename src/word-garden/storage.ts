// What Word Garden remembers between visits, for the player playing now (each child has their own; see
// shared/profiles.ts). Settings saved before a field existed load with that field's default.
import type { GuideMode } from "../shared/guide";
import type { Player } from "../shared/player";
import type { BurstChoice, FocusChoice, Level, RoundChoice } from "./config";
import { NO_MARKS, type MarksRecord } from "./game/stages";

export interface Settings {
  /** Which letters to practise: "mine" follows the Learn path; "own" is text a parent pasted in. */
  lesson: FocusChoice;
  level: Level;
  length: RoundChoice;
  bursts: BurstChoice;
  /** How much the finger keyboard helps. */
  guide: GuideMode;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { lesson: "mine", level: "short", length: 5, bursts: "random", guide: "automatic", sound: true };

/** Our words: the text as pasted, and which line the next round starts from. */
export interface OwnWords {
  text: string;
  next: number;
}

const KEYS = {
  settings: "word-garden/settings/v1",
  best: "word-garden/best/v1",
  marks: "word-garden/marks/v1",
  own: "word-garden/own/v1",
};

export const loadSettings = (player: Player): Settings => player.read(KEYS.settings, { ...DEFAULT_SETTINGS });
export const saveSettings = (player: Player, s: Settings): void => player.write(KEYS.settings, s);

/** Best words per minute, keyed by sentence length. */
export const loadBest = (player: Player): Record<string, number> => player.read<Record<string, number>>(KEYS.best, {});
export const saveBest = (player: Player, b: Record<string, number>): void => player.write(KEYS.best, b);

/** Capitals and punctuation: whether each is unlocked, and recent capitals. */
export const loadMarks = (player: Player): MarksRecord => player.read(KEYS.marks, { ...NO_MARKS });
export const saveMarks = (player: Player, m: MarksRecord): void => player.write(KEYS.marks, m);

export const loadOwn = (player: Player): OwnWords => player.read(KEYS.own, { text: "", next: 0 });
export const saveOwn = (player: Player, o: OwnWords): void => player.write(KEYS.own, o);

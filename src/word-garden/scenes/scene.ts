import type { Frame } from "../../shared/input";
import type { Player } from "../../shared/player";
import type { RoundLog } from "../../shared/history";
import type { Sfx } from "../audio";
import type { BurstKind } from "../config";
import type { MarksStage } from "../game/stages";
import type { Settings } from "../storage";

/** One screen of the game. update runs 60 times a second; draw runs once per browser frame, in scene units. */
export interface Scene {
  update(dt: number, input: Frame): void;
  draw(ctx: CanvasRenderingContext2D): void;
  /** Called when the tab or window loses focus. */
  pause?(): void;
}

export interface RoundResult {
  sentences: number;
  /** Seconds spent typing (pauses between sentences don't count). */
  seconds: number;
  wpm: number;
  /** Correct keys over all keys, 0..1; null if no keys were pressed. */
  accuracy: number | null;
  /** Sentences typed without a single wrong key. */
  perfect: number;
  best: number;
  newBest: boolean;
  /** Letters fumbled this round, most trouble first. */
  tricky: string[];
  /** The keys this round practised, to show each one's progress. */
  keys: string[];
  /** Keys just unlocked on the Learn path. */
  unlocked: string[];
  /** Capitals or punctuation, if just unlocked. */
  marks: MarksStage | null;
  /** For the one-minute check: the words per minute of the check before this one, if any. */
  check: { previous: number | null } | null;
  /** Today's practice was finished by this round. */
  sessionDone: boolean;
  /** The time of day the round ended in, so the results keep the same sky. */
  lastKind: BurstKind;
}

/** What scenes can ask of the game as a whole. Implemented in main.ts. */
export interface App {
  /** The child playing now; changes when the menu switches player. */
  readonly player: Player;
  readonly settings: Settings;
  readonly sfx: Sfx;
  /** Sentences from the last round, so the next one picks different ones. */
  recent: string[];
  saveSettings(): void;
  /** Move to the next (or previous) player on this computer. */
  switchPlayer(step: number): void;
  setLittleHands(on: boolean): void;
  /** Open the "Our words" box for a parent to paste text into. */
  editOwnWords(): void;
  /** Fold a round into the player's history; returns any keys just unlocked. */
  finishRound(log: RoundLog, seconds: number): { unlocked: string[] };
  /** Record a words-per-minute score; returns the best before it. */
  submitWpm(wpm: number): number;
  showMenu(): void;
  startGame(): void;
  showResults(result: RoundResult): void;
}

import type { Frame } from "../../shared/input";
import type { Stats } from "../../shared/letters";
import type { Sfx } from "../audio";
import type { BurstKind } from "../config";
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
  /** Letters fumbled this round. */
  tricky: string[];
  /** The time of day the round ended in, so the results keep the same sky. */
  lastKind: BurstKind;
}

/** What scenes can ask of the game as a whole. Implemented in main.ts. */
export interface App {
  readonly settings: Settings;
  readonly stats: Stats;
  readonly sfx: Sfx;
  /** Sentences from the last round, so the next one picks different ones. */
  recent: string[];
  saveSettings(): void;
  /** Fold a round's letter stats into the long-term history. */
  finishRound(round: Stats): void;
  /** Record a words-per-minute score; returns the best before it. */
  submitWpm(wpm: number): number;
  showMenu(): void;
  startGame(): void;
  showResults(result: RoundResult): void;
}

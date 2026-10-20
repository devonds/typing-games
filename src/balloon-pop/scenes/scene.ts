import type { Sfx } from "../audio";
import type { Frame } from "../../shared/input";
import type { Stats } from "../../shared/letters";
import type { Pixels } from "../look/pixels";
import type { Scenery } from "../look/scenery";
import type { Settings } from "../storage";

/** One screen of the game. update runs 60 times a second; draw runs once per browser frame. */
export interface Scene {
  update(dt: number, input: Frame): void;
  draw(p: Pixels): void;
  /** Called when the tab or window loses focus. */
  pause?(): void;
}

export interface RoundResult {
  score: number;
  popped: number;
  seconds: number;
  /** Pops divided by all letter keys pressed, 0..1; null if no keys were pressed. */
  accuracy: number | null;
  best: number;
  newBest: boolean;
  /** Letters that got away or were fumbled this round. */
  tricky: string[];
}

/** What scenes can ask of the game as a whole. Implemented in main.ts. */
export interface App {
  readonly settings: Settings;
  readonly stats: Stats;
  readonly sfx: Sfx;
  saveSettings(): void;
  /** Fold a round's letter stats into the long-term history. */
  finishRound(round: Stats): void;
  /** Record a score; returns the best before it. */
  submitScore(score: number): number;
  showMenu(): void;
  startGame(): void;
  showResults(result: RoundResult, scenery: Scenery): void;
}

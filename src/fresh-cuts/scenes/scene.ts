import type { Frame } from "../../shared/input";
import type { Finger } from "../../shared/keyboard";
import type { LessonId } from "../../shared/lessons";
import type { Player, Practice } from "../../shared/player";
import type { Sfx } from "../audio";
import type { Settings } from "../storage";

/** One screen of the game. update runs 60 times a second; draw runs once per browser frame, in scene units. */
export interface Scene {
  update(dt: number, input: Frame): void;
  draw(ctx: CanvasRenderingContext2D): void;
  /** Called when the tab or window loses focus. */
  pause?(): void;
}

/** What a round plays: its keys, its lesson, and how long it lasts. */
export interface RoundPlan {
  practice: Practice;
  lesson: LessonId;
  /** Seconds for a timed round, or null to play until the baskets run out (or, little hands, the fruit). */
  seconds: number | null;
}

export interface RoundResult {
  score: number;
  sliced: number;
  seconds: number;
  /** Slices divided by all letter keys pressed, 0..1; null if no keys were pressed. */
  accuracy: number | null;
  best: number;
  newBest: boolean;
  /** Little hands see stars (1 to 3) instead of a score. */
  littleHands: boolean;
  stars: number;
  /** Letters that got away or were fumbled this round. */
  tricky: string[];
  /** The keys this round practised, each with how close it now is to mastered (0..1). */
  keys: { key: string; progress: number }[];
  /** Keys the Learn path just unlocked: they come into play next round. */
  unlocked: string[];
  /** The finger that most needs practice, if one stands out. */
  weakestFinger: Finger | null;
  /** For "My keys": where the player is on the Learn path (1-based), and how many stages there are. */
  stage: { now: number; of: number } | null;
}

/** What scenes can ask of the game as a whole. Implemented in main.ts. */
export interface App {
  readonly settings: Settings;
  readonly player: Player;
  readonly sfx: Sfx;
  saveSettings(): void;
  /** Load the current profile again (after switching player or changing Little hands), with its settings. */
  reloadPlayer(): void;
  /** Record a score under a key naming the round's settings; returns the best before it. */
  submitScore(score: number, key: string): number;
  showMenu(): void;
  startGame(): void;
  showResults(result: RoundResult): void;
}

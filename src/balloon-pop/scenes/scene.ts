import type { Sfx } from "../audio";
import type { Frame } from "../../shared/input";
import type { RoundLog } from "../../shared/history";
import type { LessonId } from "../../shared/lessons";
import type { GameId, Step } from "../../shared/session";
import type { Player } from "../../shared/player";
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

/** How this round is played: from the menu settings, or from a step of Today's practice. */
export interface Round {
  lesson: LessonId;
  /** A timed round's length in seconds, or null to play until the lives run out (or 20 balloons, little hands). */
  seconds: number | null;
  /** Today's practice: this step, and where it is ("1 OF 3"); null outside a session. */
  step: Step | null;
  stepLabel: string | null;
}

export interface RoundResult {
  round: Round;
  /** A Little hands round: stars and keys, no score. */
  littleHands: boolean;
  score: number;
  popped: number;
  seconds: number;
  /** Right letters divided by all letter keys pressed, 0..1; null if no keys were pressed. */
  accuracy: number | null;
  /** Letters right first time divided by all letter keys pressed (for stars, so mashing can't buy them). */
  firstTime: number | null;
  best: number;
  newBest: boolean;
  /** Letters that got away or were fumbled this round. */
  tricky: string[];
  /** The keys this round practised, to show each one's progress. */
  keys: string[];
  /** Keys just unlocked on the Learn path (they come into play next round). */
  unlocked: string[];
}

/** What scenes can ask of the game as a whole. Implemented in main.ts. */
export interface App {
  /** The child playing now, and their settings. Both change when the player is switched. */
  readonly player: Player;
  readonly settings: Settings;
  readonly sfx: Sfx;
  saveSettings(): void;
  /** Play as another profile: loads their history, Learn path and settings. */
  switchPlayer(id: string): void;
  setLittleHands(on: boolean): void;
  /** Fold a round into the player's history and Learn path; returns any keys just unlocked. */
  finishRound(log: RoundLog, seconds: number): { unlocked: string[] };
  /** Record a score; returns the best before it. Bests are kept per lesson, level, speed and round length. */
  submitScore(score: number, round: Round): number;
  /** Today's practice: this game's step is done. Returns the next step, or null if that was the last. */
  finishStep(): Step | null;
  /** Go to another game's page (for the next step of Today's practice). */
  openGame(game: GameId): void;
  showMenu(): void;
  startGame(): void;
  showResults(result: RoundResult, scenery: Scenery): void;
}

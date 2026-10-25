import type { FruitKindName } from "../config";

export interface Fruit {
  id: number;
  kind: FruitKindName;
  /** What's on its price tag: a letter, or (fresh fruit only) a letter pair or a short word. */
  letter: string;
  /** Letters of a pair or word typed so far. */
  typed?: number;
  /** When its last letter was typed, to time the next one. */
  lastTypedAt?: number;
  /** Rotten fruit should be left alone: slicing it costs a basket. */
  rotten: boolean;
  /** Frozen fruit comes in a block of ice: slicing it slows everything down. Letting it fall costs nothing. */
  frozen: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Each throw has its own gravity, so every throw takes the same time whatever its height. */
  gravity: number;
  rot: number;
  spin: number;
  launchedAt: number;
  /** When it became the one to type (World.target): its reaction time is measured from here. */
  targetSince?: number;
  /** Little hands: it has reached the top of its throw and waits there to be sliced. */
  hanging?: boolean;
}

/** What happened during a step or key press. Scenes turn these into effects, sounds and letter history. */
export type GameEvent =
  | { type: "launched"; fruit: Fruit }
  /** A right key on a fruit: `index` is which letter of its tag, timed `seconds` after the one before (or after it
   * became the target). `ok` if no wrong key came while it was wanted. `done` if that finished the tag. */
  | { type: "typed"; fruit: Fruit; letter: string; index: number; seconds: number; ok: boolean; done: boolean }
  | { type: "sliced"; fruit: Fruit; reactionTime: number; combo: number; points: number }
  | { type: "rottenSliced"; fruit: Fruit; penalty?: number }
  /** A fresh fruit fell. In a timed round it costs `penalty` points instead of a basket. */
  | { type: "dropped"; fruit: Fruit; penalty?: number }
  | { type: "comboEnd"; chain: number; bonus: number }
  | { type: "wrongKey"; key: string; expected: string | null }
  /** A key pressed again too soon after it was wrong: it does nothing. */
  | { type: "fizzled"; key: string }
  | { type: "speedUp"; level: number }
  | { type: "freeze"; seconds: number }
  | { type: "thaw" }
  | { type: "gameOver" }
  /** Little hands: the round's fruit have all been sliced. */
  | { type: "roundDone" }
  /** A timed round's clock ran out. */
  | { type: "timeUp" };

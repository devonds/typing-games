import type { FruitKindName } from "../config";

export interface Fruit {
  id: number;
  kind: FruitKindName;
  letter: string;
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
}

/** What happened during a step or key press. Scenes turn these into effects, sounds and letter history. */
export type GameEvent =
  | { type: "launched"; fruit: Fruit }
  | { type: "sliced"; fruit: Fruit; reactionTime: number; combo: number }
  | { type: "rottenSliced"; fruit: Fruit }
  | { type: "dropped"; fruit: Fruit }
  | { type: "comboEnd"; chain: number; bonus: number }
  | { type: "wrongKey"; key: string; expected: string | null }
  | { type: "speedUp"; level: number }
  | { type: "freeze"; seconds: number }
  | { type: "thaw" }
  | { type: "gameOver" };

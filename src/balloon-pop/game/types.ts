export interface Balloon {
  id: number;
  /** What it carries: a letter, a letter pair or a short word. */
  text: string;
  /** How many of its letters are typed so far. */
  typed: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Index into the look's balloon colours. */
  colour: number;
  /** World time (seconds) when the balloon left the cannon. */
  launchedAt: number;
  /** World time when it became the oldest balloon (the one to type), or null while others are older. */
  targetAt: number | null;
  /** World time its last letter was typed, for timing the next one. */
  typedAt: number;
  /** Share of the normal rise speed (0..1): balloons with keys still being learned rise slowly. */
  pace: number;
}

export interface Launcher {
  x: number;
  /** World time of the next shot. */
  nextShotAt: number;
  /** Direction (radians) of the next shot; the look turns the barrel towards it. */
  aim: number;
}

/** Everything that can happen in the world. The rules return these; the screens react to them. */
export type GameEvent =
  | { type: "launched"; balloon: Balloon; launcher: number }
  /**
   * A right letter. `seconds` since it became the one to type (the first letter: since the balloon became the
   * target; later letters: since the one before). `ok` if no wrong key came while it was wanted.
   */
  | { type: "letter"; balloon: Balloon; letter: string; index: number; seconds: number; ok: boolean }
  /** Its last letter was typed. */
  | { type: "popped"; balloon: Balloon; points: number }
  | { type: "wrongKey"; key: string; expected: string | null }
  /** A key pressed again while it's fizzling after a wrong press: it does nothing. */
  | { type: "fizzled"; key: string }
  /** It floated away; `typed` letters of it had been typed. In a timed round it costs `cost` points. */
  | { type: "escaped"; balloon: Balloon; cost: number }
  | { type: "speedUp"; level: number }
  | { type: "gameOver" }
  /** A timed round's clock ran out. */
  | { type: "timeUp" }
  /** Little hands: every balloon of the round has been popped. */
  | { type: "finished" };

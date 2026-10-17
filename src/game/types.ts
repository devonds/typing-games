export interface Balloon {
  id: number;
  letter: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Index into the look's balloon colours. */
  colour: number;
  /** World time (seconds) when the balloon left the cannon. */
  launchedAt: number;
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
  | { type: "popped"; balloon: Balloon; reactionTime: number }
  | { type: "wrongKey"; key: string; expected: string | null }
  | { type: "escaped"; balloon: Balloon }
  | { type: "speedUp"; level: number }
  | { type: "gameOver" };

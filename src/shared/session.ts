// "Today's practice": about ten minutes across the three games, started from the home page. Short and frequent
// beats long: a few sentences in Word Garden, a short Balloon Pop round on new keys, then Fresh Cuts. Each game
// checks for a session on its results screen and offers the next step.
import { readFor, writeFor } from "./profiles";

export type GameId = "balloon-pop" | "fresh-cuts" | "word-garden";

export interface Step {
  game: GameId;
  /** What this step practises: the Learn path's keys, or the trickiest letters. */
  lesson: "mine" | "weak";
  /** Shown on the results screen, e.g. "New keys". */
  label: string;
  /** How long the round runs: seconds for the arcade games, sentences for Word Garden. */
  length: number;
}

export interface Session {
  day: number;
  steps: Step[];
  /** Index of the step being played (or next to play). */
  at: number;
}

const KEY = "session/v1";

export const TODAY: readonly Step[] = [
  { game: "word-garden", lesson: "mine", label: "Sentences", length: 5 },
  { game: "balloon-pop", lesson: "mine", label: "New keys", length: 150 },
  { game: "fresh-cuts", lesson: "mine", label: "Quick keys", length: 150 },
];

export const GAME_NAMES: Record<GameId, string> = {
  "balloon-pop": "Balloon Pop",
  "fresh-cuts": "Fresh Cuts",
  "word-garden": "Word Garden",
};

/** Begin today's practice; returns the first step. */
export function startSession(profileId: string, day: number): Step {
  writeFor(profileId, KEY, { day, steps: [...TODAY], at: 0 } satisfies Session);
  return TODAY[0];
}

/** Today's session, if one is under way (yesterday's unfinished one doesn't count). */
export function currentSession(profileId: string, day: number): Session | null {
  const s = readFor<Session | { day: -1 }>(profileId, KEY, { day: -1 });
  return "steps" in s && s.day === day && s.at < s.steps.length ? s : null;
}

/** The step this game should play now, if a session is on and it's this game's turn. */
export function stepFor(profileId: string, day: number, game: GameId): Step | null {
  const s = currentSession(profileId, day);
  const step = s?.steps[s.at];
  return step && step.game === game ? step : null;
}

/** Mark this game's step done; returns the next step, or null when today's practice is finished. */
export function finishStep(profileId: string, day: number, game: GameId): Step | null {
  const s = currentSession(profileId, day);
  if (!s || s.steps[s.at]?.game !== game) return null;
  const next = { ...s, at: s.at + 1 };
  writeFor(profileId, KEY, next);
  return next.steps[next.at] ?? null;
}

/** Leave today's practice. */
export function endSession(profileId: string): void {
  writeFor(profileId, KEY, { day: -1 });
}

/** The URL of a game's page, relative to another game's page (they're siblings). */
export function gameUrl(game: GameId): string {
  return `../${game}/`;
}

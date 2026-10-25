// "Today's practice": one round of Word Garden, started from the home page. Word Garden is the most thorough
// teacher, and short daily practice beats long sessions, so this is all a day asks for. Balloon Pop and Fresh Cuts
// are there for fun whenever a child likes; nothing here nudges anyone to play more.
import type { LessonId } from "./lessons";
import { readFor, writeFor } from "./profiles";

export const TODAY: { lesson: LessonId; sentences: number; littleHands: number } = {
  lesson: "mine",
  /** How many sentences: enough to learn something, short enough to finish happily. */
  sentences: 8,
  littleHands: 5,
};

export type PracticeState = "none" | "started" | "done";

interface Saved {
  day: number;
  state: PracticeState;
}

const KEY = "practice/v1";

/** Where today's practice is for this player. Yesterday's counts for nothing. */
export function practiceState(profileId: string, day: number): PracticeState {
  const s = readFor<Saved>(profileId, KEY, { day: -1, state: "none" });
  return s.day === day ? s.state : "none";
}

/** Begin today's practice: Word Garden's next round will be it. */
export function startPractice(profileId: string, day: number): void {
  writeFor(profileId, KEY, { day, state: "started" } satisfies Saved);
}

/** Today's practice is finished. */
export function finishPractice(profileId: string, day: number): void {
  writeFor(profileId, KEY, { day, state: "done" } satisfies Saved);
}

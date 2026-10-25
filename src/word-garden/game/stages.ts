// The Learn path's last two stages, Word Garden's own: capitals with Shift once every letter is learned, then
// punctuation once capitals come easily. Each unlocks between rounds and then stays. Never for little hands.
import type { History } from "../../shared/history";
import { finished, mastered, STAGES, type PathState } from "../../shared/path";
import { MARKS } from "../config";
import type { Rules } from "./round";

export interface MarksRecord {
  capitals: boolean;
  punctuation: boolean;
  /** Recent capitals: 1 if right first time. */
  recent: (0 | 1)[];
}

export const NO_MARKS: MarksRecord = { capitals: false, punctuation: false, recent: [] };

export type MarksStage = "capitals" | "punctuation";

/** What a round asks for. */
export function rulesFor(record: MarksRecord, littleHands: boolean): Rules {
  if (littleHands) return { capitals: false, punctuation: false };
  return { capitals: record.capitals, punctuation: record.capitals && record.punctuation };
}

/** Whether capitals come easily enough for punctuation. */
export function capitalsReady(recent: readonly (0 | 1)[]): boolean {
  const last = recent.slice(-MARKS.capitals);
  return last.length >= MARKS.capitals && last.filter((ok) => ok).length / last.length >= MARKS.accuracy;
}

/**
 * After a round: add its capitals (1 = right first time) and unlock what's due. `lettersDone` is true once the Learn
 * path is finished and every letter mastered. Returns the new record and anything just unlocked.
 */
export function advanceMarks(record: MarksRecord, capitals: readonly (0 | 1)[], lettersDone: boolean, littleHands: boolean): { record: MarksRecord; unlocked: MarksStage | null } {
  if (littleHands) return { record, unlocked: null };
  const next: MarksRecord = { ...record, recent: [...record.recent, ...capitals].slice(-MARKS.capitals) };
  if (!next.capitals) {
    if (!lettersDone) return { record: next, unlocked: null };
    return { record: { ...next, capitals: true }, unlocked: "capitals" };
  }
  if (!next.punctuation && capitalsReady(next.recent)) return { record: { ...next, punctuation: true }, unlocked: "punctuation" };
  return { record: next, unlocked: null };
}

/** The Learn path is finished and every letter on it is mastered: time for capitals. */
export function lettersDone(path: PathState, history: History, speedMatters: boolean): boolean {
  return finished(path) && STAGES.join("").split("").every((k) => mastered(history.letters[k], speedMatters));
}

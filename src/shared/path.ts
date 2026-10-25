// The Learn path: keys introduced a few at a time, outward from the home anchors F and J. A new stage unlocks once
// every key so far is mastered. Mastery is judged from each letter's recent results in the shared history.
import type { History, LetterRecord } from "./history";

/** Each stage adds these keys to the ones before. (Letters only; punctuation arrives later in Word Garden.) */
export const STAGES = ["fj", "dk", "sl", "a", "gh", "ru", "ei", "ty", "wo", "qp", "vm", "c", "bn", "x", "z"] as const;

export const MASTERY = {
  /** Judge on this many most recent appearances... */
  window: 15,
  /** ...of which at least this share must be right first time... */
  accuracy: 0.9,
  /** ...at no slower than this many times the child's typical speed (not used for little hands). */
  speed: 1.15,
};

export interface PathState {
  /** Index of the latest unlocked stage. */
  stage: number;
}

export const START: PathState = { stage: 0 };

/** Every key unlocked up to and including `stage`. */
export function unlockedKeys(state: PathState): string[] {
  return STAGES.slice(0, Math.min(state.stage, STAGES.length - 1) + 1).join("").split("");
}

/** The keys of the latest stage: the ones being learned now. */
export function newestKeys(state: PathState): string[] {
  return [...STAGES[Math.min(state.stage, STAGES.length - 1)]];
}

export function finished(state: PathState): boolean {
  return state.stage >= STAGES.length - 1;
}

/**
 * How close a letter is to mastered, 0..1, for showing between rounds. It's the lower of "enough recent tries" and
 * "right often enough", so a key at 1 is mastered.
 */
export function masteryProgress(record: LetterRecord | undefined, speedMatters = true): number {
  if (!record || record.recent.length === 0) return 0;
  const recent = record.recent.slice(-MASTERY.window);
  const tries = Math.min(1, recent.length / MASTERY.window);
  const right = recent.filter(([ok]) => ok).length / recent.length;
  const accuracy = Math.min(1, right / MASTERY.accuracy);
  let speed = 1;
  if (speedMatters) {
    const speeds = recent.filter(([ok, s]) => ok && s > 0).map(([, s]) => s);
    if (speeds.length > 0) {
      const typical = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      speed = Math.min(1, MASTERY.speed / typical);
    }
  }
  const p = Math.min(tries, accuracy, speed);
  // Rounding: only a key that meets every bar shows as fully mastered.
  return mastered(record, speedMatters) ? 1 : Math.min(p, 0.99);
}

export function mastered(record: LetterRecord | undefined, speedMatters = true): boolean {
  if (!record || record.recent.length < MASTERY.window) return false;
  const recent = record.recent.slice(-MASTERY.window);
  if (recent.filter(([ok]) => ok).length / recent.length < MASTERY.accuracy) return false;
  if (!speedMatters) return true;
  const speeds = recent.filter(([ok, s]) => ok && s > 0).map(([, s]) => s);
  if (speeds.length === 0) return true;
  return speeds.reduce((a, b) => a + b, 0) / speeds.length <= MASTERY.speed;
}

/**
 * After a round: if every unlocked key is mastered, unlock the next stage. Returns the new state and the keys just
 * unlocked (empty if nothing changed). Called between rounds only: new keys come into play from the next round.
 */
export function advance(state: PathState, history: History, speedMatters = true): { state: PathState; unlocked: string[] } {
  if (finished(state)) return { state, unlocked: [] };
  const allMastered = unlockedKeys(state).every((k) => mastered(history.letters[k], speedMatters));
  if (!allMastered) return { state, unlocked: [] };
  const next = { stage: state.stage + 1 };
  return { state: next, unlocked: newestKeys(next) };
}

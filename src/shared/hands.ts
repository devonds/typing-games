// Per-finger results, rolled up from the per-letter history: which fingers are sure and which need practice. The
// games can't see fingers, only keys, so this is "the keys this finger should press".
import type { History } from "./history";
import { FINGERS, KEYS, type Finger } from "./keyboard";
import { masteryProgress } from "./path";

export interface FingerSummary {
  finger: Finger;
  /** Recent tries on this finger's letters. */
  tries: number;
  /** Share right first time, 0..1 (null with no tries). */
  accuracy: number | null;
  /** Average mastery of this finger's letters that have been tried, 0..1. */
  progress: number;
}

/** A summary for each finger (letters only; the thumb has just the space bar, which isn't tracked). */
export function fingerSummaries(history: History, speedMatters = true): FingerSummary[] {
  return FINGERS.filter((f) => f !== "thumb").map((finger) => {
    const letters = KEYS.filter((k) => k.finger === finger && /^[a-z]$/.test(k.key)).map((k) => history.letters[k.key]).filter((r) => r && r.recent.length > 0);
    const recent = letters.flatMap((r) => r!.recent);
    const right = recent.filter(([ok]) => ok).length;
    const progress = letters.length ? letters.reduce((a, r) => a + masteryProgress(r, speedMatters), 0) / letters.length : 0;
    return { finger, tries: recent.length, accuracy: recent.length ? right / recent.length : null, progress };
  });
}

/** The finger that most needs practice (lowest accuracy among fingers with enough tries), or null. */
export function weakestFinger(history: History, speedMatters = true, minTries = 8): Finger | null {
  const tried = fingerSummaries(history, speedMatters).filter((s) => s.tries >= minTries && s.accuracy !== null);
  if (tried.length < 2) return null;
  const worst = tried.reduce((a, b) => (b.accuracy! < a.accuracy! ? b : a));
  const best = Math.max(...tried.map((s) => s.accuracy!));
  // Only worth saying if it really stands out.
  return best - worst.accuracy! >= 0.1 ? worst.finger : null;
}

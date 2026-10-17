// Per-letter history, used to build the "weak letters" lesson.
import type { GameEvent } from "./types";

export interface LetterStats {
  /** Balloons with this letter that were launched. */
  seen: number;
  popped: number;
  /** Floated away without being popped. */
  escaped: number;
  /** A wrong key was pressed while this letter was the oldest balloon in the air. */
  fumbles: number;
  /** Total seconds from launch to pop, over all pops. */
  reactionTotal: number;
}

export type Stats = Record<string, LetterStats>;

export const WEAK = {
  /** A letter needs to have been seen this often before we judge it. */
  minSeen: 3,
  /** We need this many judged letters before the lesson is available. */
  minLetters: 4,
  /** How many letters the lesson uses. */
  count: 6,
  /** After each round, older history counts this much (so improvement shows up). */
  keep: 0.8,
};

function entry(stats: Stats, letter: string): LetterStats {
  return (stats[letter] ??= { seen: 0, popped: 0, escaped: 0, fumbles: 0, reactionTotal: 0 });
}

export function recordEvent(stats: Stats, event: GameEvent): void {
  switch (event.type) {
    case "launched":
      entry(stats, event.balloon.letter).seen += 1;
      break;
    case "popped": {
      const s = entry(stats, event.balloon.letter);
      s.popped += 1;
      s.reactionTotal += event.reactionTime;
      break;
    }
    case "escaped":
      entry(stats, event.balloon.letter).escaped += 1;
      break;
    case "wrongKey":
      if (event.expected) entry(stats, event.expected).fumbles += 1;
      break;
  }
}

/** Higher is weaker: mostly how often the letter got away, plus a little for slow pops. */
export function weakness(s: LetterStats): number {
  const missRate = (s.escaped + 0.5 * s.fumbles + 0.5) / (s.seen + 1);
  const averageReaction = s.popped > 0 ? s.reactionTotal / s.popped : 10;
  return missRate + averageReaction / 20;
}

/** The weakest letters (alphabetical), or null if there isn't enough history yet. */
export function weakLetters(stats: Stats, count = WEAK.count): string[] | null {
  const judged = Object.entries(stats).filter(([letter, s]) => /^[a-z]$/.test(letter) && s.seen >= WEAK.minSeen);
  if (judged.length < WEAK.minLetters) return null;
  return judged
    .sort(([, a], [, b]) => weakness(b) - weakness(a))
    .slice(0, count)
    .map(([letter]) => letter)
    .sort();
}

/** Letters that got away or were fumbled this round, most trouble first. */
export function trickyLetters(round: Stats, count = 5): string[] {
  return Object.entries(round)
    .map(([letter, s]) => [letter, s.escaped + s.fumbles] as const)
    .filter(([, trouble]) => trouble > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([letter]) => letter);
}

/** Fold a finished round into the long-term history, fading older rounds a little. */
export function mergeRound(history: Stats, round: Stats, keep = WEAK.keep): Stats {
  const merged: Stats = {};
  for (const letter of new Set([...Object.keys(history), ...Object.keys(round)])) {
    const old = history[letter];
    const now = round[letter];
    const m = entry(merged, letter);
    for (const key of ["seen", "popped", "escaped", "fumbles", "reactionTotal"] as const) {
      m[key] = (old?.[key] ?? 0) * keep + (now?.[key] ?? 0);
    }
  }
  return merged;
}

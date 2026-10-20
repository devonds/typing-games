// Per-letter history, shared by every game, used to build the "weak letters" lesson.
// A "hit" is a balloon popped or a fruit sliced; a "miss" is one that got away.

export interface LetterStats {
  /** Times this letter appeared. */
  seen: number;
  hit: number;
  /** Got away without being hit. */
  missed: number;
  /** A wrong key was pressed while this letter was the one to type next. */
  fumbles: number;
  /** Total seconds from appearing to being hit, over all hits. */
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
  return (stats[letter] ??= { seen: 0, hit: 0, missed: 0, fumbles: 0, reactionTotal: 0 });
}

export function recordSeen(stats: Stats, letter: string): void {
  entry(stats, letter).seen += 1;
}

export function recordHit(stats: Stats, letter: string, reactionTime: number): void {
  const s = entry(stats, letter);
  s.hit += 1;
  s.reactionTotal += reactionTime;
}

export function recordMiss(stats: Stats, letter: string): void {
  entry(stats, letter).missed += 1;
}

export function recordFumble(stats: Stats, letter: string): void {
  entry(stats, letter).fumbles += 1;
}

/** Higher is weaker: mostly how often the letter got away, plus a little for slow hits. */
export function weakness(s: LetterStats): number {
  const missRate = (s.missed + 0.5 * s.fumbles + 0.5) / (s.seen + 1);
  const averageReaction = s.hit > 0 ? s.reactionTotal / s.hit : 10;
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
    .map(([letter, s]) => [letter, s.missed + s.fumbles] as const)
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
    for (const key of ["seen", "hit", "missed", "fumbles", "reactionTotal"] as const) {
      m[key] = (old?.[key] ?? 0) * keep + (now?.[key] ?? 0);
    }
  }
  return merged;
}

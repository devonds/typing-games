// What we know about a child's typing, kept between visits and shared by every game. Version 2 adds, beside the
// running totals, each letter's last few results (to judge mastery), letter pairs, and the day each was last
// practised (for review). It all stays in this browser.

/** The version 1 history (running totals only), kept so old saved data can be carried across. */
export interface V1LetterStats {
  seen: number;
  hit: number;
  missed: number;
  fumbles: number;
  reactionTotal: number;
}
export type V1Stats = Record<string, V1LetterStats>;

/** How many recent results each letter and pair keeps. */
export const RECENT = 20;

/**
 * One appearance: [right first time (1) or not (0), speed]. Speed is the time taken divided by the child's typical
 * time in that round (1 = typical, 2 = twice as slow), or 0 when there's no time (it got away).
 */
export type Outcome = [ok: 0 | 1, speed: number];

export interface LetterRecord {
  seen: number;
  hits: number;
  misses: number;
  fumbles: number;
  recent: Outcome[];
  /** Day number (see `dayNumber`) it was last practised. */
  last: number;
}

export interface PairRecord {
  recent: Outcome[];
  last: number;
}

export interface History {
  version: 2;
  letters: Record<string, LetterRecord>;
  /** Keyed by the two letters, e.g. "th". */
  pairs: Record<string, PairRecord>;
}

export function emptyHistory(): History {
  return { version: 2, letters: {}, pairs: {} };
}

/** Days since 1970 in the player's own time zone, so "today" turns over at their midnight. */
export function dayNumber(now = new Date()): number {
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000);
}

/**
 * Carry over the old running totals. There are no recent results in the old format, so mastery starts from fresh
 * evidence, but nothing a child has done is thrown away.
 */
export function fromV1(old: V1Stats, today: number): History {
  const history = emptyHistory();
  for (const [letter, s] of Object.entries(old)) {
    if (!/^[a-z]$/.test(letter)) continue;
    history.letters[letter] = {
      seen: Math.round(s.seen),
      hits: Math.round(s.hit),
      misses: Math.round(s.missed),
      fumbles: Math.round(s.fumbles),
      recent: [],
      last: today,
    };
  }
  return history;
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? 0 : s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

interface Item {
  key: string;
  ok: boolean;
  /** It got away untyped. */
  missed: boolean;
  /** Seconds taken, or null when there's no fair time (it got away, or it was the first key of a sentence). */
  time: number | null;
}

/**
 * Everything that happened in one round, gathered as it happens and folded into the history at the end. Speeds are
 * turned into "compared with this round's typical time" only then, which makes them fair across games that time
 * different things (a balloon rising, a fruit flying, the gap between two keys in a sentence).
 */
export class RoundLog {
  private letters: Item[] = [];
  private pairs: Item[] = [];
  private fumbles: Record<string, number> = {};
  /** Letters fumbled since they were last hit, so their next hit isn't "right first time". */
  private slipped = new Set<string>();

  /** A wrong key while `letter` was the one wanted. */
  fumble(letter: string): void {
    this.fumbles[letter] = (this.fumbles[letter] ?? 0) + 1;
    this.slipped.add(letter);
  }

  /**
   * `letter` was typed, `seconds` after it became the one to type. Pass null (or 0) when there's no fair time, e.g.
   * the first key of a sentence, which includes reading time: it still counts, just not towards speed.
   */
  hit(letter: string, seconds: number | null): void {
    this.letters.push({ key: letter, ok: !this.slipped.has(letter), missed: false, time: seconds && seconds > 0 ? seconds : null });
    this.slipped.delete(letter);
  }

  /** `letter` got away untyped. */
  miss(letter: string): void {
    this.letters.push({ key: letter, ok: false, missed: true, time: null });
    this.slipped.delete(letter);
  }

  /** Two letters typed one after the other (in a word or sentence). `ok` if the second was right first time. */
  pair(first: string, second: string, seconds: number, ok: boolean): void {
    this.pairs.push({ key: first + second, ok, missed: false, time: seconds > 0 ? seconds : null });
  }

  get empty(): boolean {
    return this.letters.length === 0 && Object.keys(this.fumbles).length === 0;
  }

  /** Letters that got away or were fumbled this round, most trouble first. */
  tricky(count = 5): string[] {
    const trouble: Record<string, number> = { ...this.fumbles };
    for (const i of this.letters) if (i.missed) trouble[i.key] = (trouble[i.key] ?? 0) + 1;
    return Object.entries(trouble)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([letter]) => letter);
  }

  /** Fold this round into a history (returns a new one). */
  mergeInto(history: History, today: number): History {
    const out: History = { version: 2, letters: { ...history.letters }, pairs: { ...history.pairs } };
    const outcome = (items: Item[]) => {
      const times = items.filter((i) => i.time !== null).map((i) => i.time!);
      // With too few timings to say what's typical, don't judge speed at all.
      const typical = times.length >= 3 ? median(times) : 0;
      return (i: Item): Outcome => [i.ok ? 1 : 0, i.time !== null && typical > 0 ? +(i.time / typical).toFixed(2) : 0];
    };
    const letterOutcome = outcome(this.letters);
    for (const i of this.letters) {
      const r = (out.letters[i.key] = { ...(out.letters[i.key] ?? { seen: 0, hits: 0, misses: 0, fumbles: 0, recent: [], last: today }) });
      r.seen += 1;
      if (i.missed) r.misses += 1;
      else r.hits += 1;
      r.recent = [...r.recent, letterOutcome(i)].slice(-RECENT);
      r.last = today;
    }
    for (const [letter, n] of Object.entries(this.fumbles)) {
      const r = (out.letters[letter] = { ...(out.letters[letter] ?? { seen: 0, hits: 0, misses: 0, fumbles: 0, recent: [], last: today }) });
      r.fumbles += n;
    }
    const pairOutcome = outcome(this.pairs);
    for (const i of this.pairs) {
      const r = (out.pairs[i.key] = { ...(out.pairs[i.key] ?? { recent: [], last: today }) });
      r.recent = [...r.recent, pairOutcome(i)].slice(-RECENT);
      r.last = today;
    }
    return out;
  }
}

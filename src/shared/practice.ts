// How often each thing comes up: weighted by how much it needs practice. One mechanism for single letters, letter
// pairs, words and sentences, used by every game. (Not by how common a letter is in English: every letter matters
// the same to a child learning the keyboard.)
import type { History, LetterRecord, Outcome, PairRecord } from "./history";

/** Every number that shapes the need score, in one place. */
export const NEED = {
  /** Every key in play has at least this much need, so known keys keep coming back between the weak ones. */
  floor: 0.2,
  /** Weight of getting it wrong (first-try failures in recent results, 0..1). */
  errors: 1.6,
  /** Weight of being slow (how much slower than the child's typical speed, capped). */
  slowness: 0.7,
  maxSlowness: 1.5,
  /** Something never seen, or seen fewer than `newFor` times, gets this boost (shrinking as it's practised). */
  fresh: 0.8,
  newFor: 20,
  /** Something not practised for `reviewDays` days gets this much extra, growing to it over that time. */
  review: 0.5,
  reviewDays: 7,
  /** No single item gets more than this share of the picks. */
  cap: 0.25,
};

export interface NeedOptions {
  /** Today's day number (history.dayNumber()). */
  today: number;
  /** Little hands are judged on accuracy only. */
  speedMatters?: boolean;
}

/** How a record's recent results look: first-try error rate (smoothed) and slowness. */
function recentScore(recent: readonly Outcome[]): { errors: number; slowness: number } {
  // Smoothing: pretend there were two extra results, one right and one wrong, so a single slip doesn't count double.
  const fails = recent.filter(([ok]) => !ok).length;
  const errors = (fails + 0.5) / (recent.length + 2);
  const speeds = recent.filter(([ok, s]) => ok && s > 0).map(([, s]) => s);
  const typical = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 1;
  return { errors, slowness: Math.min(NEED.maxSlowness, Math.max(0, typical - 1)) };
}

/** The need of one letter or pair record (undefined = never seen). */
export function needOf(record: LetterRecord | PairRecord | undefined, o: NeedOptions): number {
  if (!record) return NEED.floor + NEED.fresh + NEED.errors * 0.5;
  const { errors, slowness } = recentScore(record.recent);
  const seen = record.recent.length;
  const fresh = NEED.fresh * Math.max(0, 1 - seen / NEED.newFor);
  const review = NEED.review * Math.min(1, Math.max(0, o.today - record.last) / NEED.reviewDays);
  return NEED.floor + NEED.errors * errors + (o.speedMatters === false ? 0 : NEED.slowness * slowness) + fresh + review;
}

/**
 * Shares (summing to 1) for a set of keys, from their need. `emphasis` above 1 leans harder on the neediest (for the
 * "Tricky letters" lesson). No key gets more than `NEED.cap`, unless there are too few keys for that to add up.
 */
export function needWeights(keys: readonly string[], history: History, o: NeedOptions, emphasis = 1): Map<string, number> {
  const raw = keys.map((k) => [k, needOf(history.letters[k], o) ** emphasis] as const);
  return capShares(new Map(raw), NEED.cap);
}

/** Normalise weights to shares and cap each one, spreading what's trimmed over the rest. */
export function capShares(weights: Map<string, number>, cap: number): Map<string, number> {
  const total = [...weights.values()].reduce((a, b) => a + b, 0);
  const shares = new Map([...weights].map(([k, w]) => [k, total > 0 ? w / total : 1 / weights.size]));
  if (cap * weights.size < 1) return shares;
  for (let pass = 0; pass < 10; pass++) {
    const over = [...shares].filter(([, s]) => s > cap + 1e-9);
    if (over.length === 0) break;
    let excess = 0;
    for (const [k, s] of over) {
      excess += s - cap;
      shares.set(k, cap);
    }
    const under = [...shares].filter(([, s]) => s < cap - 1e-9);
    const underTotal = under.reduce((a, [, s]) => a + s, 0);
    for (const [k, s] of under) shares.set(k, s + (excess * s) / underTotal);
  }
  return shares;
}

/** The need of a pair: its own record, plus a little from its two letters. */
export function pairNeed(pair: string, history: History, o: NeedOptions): number {
  const own = needOf(history.pairs[pair], o);
  const letters = (needOf(history.letters[pair[0]], o) + needOf(history.letters[pair[1]], o)) / 2;
  return 0.6 * own + 0.4 * letters;
}

/**
 * The need of a word or sentence: the average need of its letters and the pairs inside its words, so text full of
 * tricky letters and pairs comes up more often.
 */
export function textNeed(text: string, history: History, o: NeedOptions): number {
  const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const parts: number[] = [];
  for (const word of words) {
    for (const c of word) parts.push(needOf(history.letters[c], o));
    for (let i = 1; i < word.length; i++) parts.push(pairNeed(word[i - 1] + word[i], history, o));
  }
  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
}

/**
 * A weighted random choice. Items for which `skip` says true (e.g. already on screen) are left out unless that
 * leaves nothing; then the skip is ignored. Returns null only for an empty list.
 */
export function pickWeighted<T>(items: readonly T[], weight: (item: T) => number, random: () => number = Math.random, skip?: (item: T) => boolean): T | null {
  let pool = skip ? items.filter((i) => !skip(i)) : [...items];
  if (pool.length === 0) pool = [...items];
  if (pool.length === 0) return null;
  const weights = pool.map((i) => Math.max(0, weight(i)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return pool[Math.floor(random() * pool.length)];
  let r = random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

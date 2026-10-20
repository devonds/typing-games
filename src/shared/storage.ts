// Saving between visits, in this browser's localStorage. Each game keeps its own settings and best scores; the
// letter history is shared, so a letter that's tricky in one game counts as tricky in all of them.
import type { Stats } from "./letters";

// localStorage can be missing or throw (private windows, blocked storage); the games still work, they just forget.
export function read<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not saved; nothing else to do.
  }
}

const LETTERS_KEY = "typing/letters/v1";
/** Balloon Pop kept the history on its own before there were two games. */
const OLD_BALLOON_KEY = "balloon-pop/stats/v1";

interface OldLetterStats {
  seen: number;
  popped: number;
  escaped: number;
  fumbles: number;
  reactionTotal: number;
}

/** Balloon Pop's old history, renamed to the shared fields (popped -> hit, escaped -> missed). */
export function migrateBalloonStats(old: Record<string, OldLetterStats>): Stats {
  const stats: Stats = {};
  for (const [letter, s] of Object.entries(old)) {
    stats[letter] = { seen: s.seen, hit: s.popped, missed: s.escaped, fumbles: s.fumbles, reactionTotal: s.reactionTotal };
  }
  return stats;
}

export function loadLetterHistory(): Stats {
  const stats = read<Stats>(LETTERS_KEY, {});
  if (Object.keys(stats).length > 0) return stats;
  const old = read<Record<string, OldLetterStats>>(OLD_BALLOON_KEY, {});
  return Object.keys(old).length > 0 ? migrateBalloonStats(old) : stats;
}

export const saveLetterHistory = (s: Stats): void => write(LETTERS_KEY, s);

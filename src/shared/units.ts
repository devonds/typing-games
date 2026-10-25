// What a balloon or a fruit carries: a single letter, a letter pair, or a short word. Words and pairs are how the
// arcade games move from finding keys to typing sequences. Typing the first letter "locks on" to the oldest thing
// starting with it; the following keys must continue that thing until it's done.
import { masteryProgress } from "./path";
import { pickWeighted } from "./practice";
import type { Player, Practice } from "./player";
import { pickPair, pickWord } from "./words";

/** How often a thrown thing carries a pair or a word, once a child is ready for them. */
export const UNITS = {
  /** On the Learn path, sequences start once this stage is unlocked ("e i": the first vowels after a). */
  fromStage: 6,
  /** Little hands start later and only get short words. */
  littleFromStage: 8,
  pairs: 0.2,
  words: 0.2,
  littleWords: 0.15,
  maxWord: 5,
  littleMaxWord: 3,
};

export interface Mix {
  pairs: number;
  words: number;
  maxWord: number;
}

/**
 * How much of a round should be pairs and words. None until the child is ready: on the Learn path that's a stage;
 * otherwise, once most of the lesson's keys are well on the way to mastered.
 */
export function unitMix(player: Player, lesson: string, practice: Practice): Mix {
  const little = player.littleHands;
  const none = { pairs: 0, words: 0, maxWord: 0 };
  if (lesson === "mine") {
    if (player.path.stage < (little ? UNITS.littleFromStage : UNITS.fromStage)) return none;
  } else {
    const ready = practice.keys.filter((k) => masteryProgress(player.history.letters[k], player.speedMatters) >= 0.5).length;
    if (ready < practice.keys.length * 0.7) return none;
  }
  return little ? { pairs: 0, words: UNITS.littleWords, maxWord: UNITS.littleMaxWord } : { pairs: UNITS.pairs, words: UNITS.words, maxWord: UNITS.maxWord };
}

/**
 * Something to throw: a letter, pair or word from the practice's keys, chosen by need. `inUse` holds the first
 * letters of everything already on screen: a new thing never starts with one of them, so the first key typed always
 * picks out exactly one target.
 */
export function pickUnit(player: Player, practice: Practice, mix: Mix, inUse: ReadonlySet<string>, random: () => number = Math.random): string | null {
  const o = { today: player.today, speedMatters: player.speedMatters, random, skip: (s: string) => inUse.has(s[0]) };
  const roll = random();
  if (roll < mix.words) {
    const word = pickWord(practice.keys, player.history, { ...o, min: 2, max: mix.maxWord });
    if (word) return word;
  } else if (roll < mix.words + mix.pairs) {
    const pair = pickPair(practice.keys, player.history, { ...o, easyFirst: true });
    if (pair) return pair;
  }
  const letter = pickWeighted(practice.keys, (k) => practice.weights.get(k) ?? 0, random, (k) => inUse.has(k));
  return letter && !inUse.has(letter) ? letter : null;
}

/** Anything typed letter by letter. `typed` counts the letters done so far. */
export interface Typeable {
  text: string;
  typed: number;
}

export type PressResult<T> =
  /** A right key: `index` is which letter of the target; `done` if that finished it. */
  | { kind: "letter"; target: T; letter: string; index: number; done: boolean }
  /** A wrong key; `expected` is what was wanted (null if nothing is on screen). */
  | { kind: "wrong"; expected: string | null };

/**
 * Which letter is wanted next: the locked target's next letter, or the oldest target's first letter.
 * `targets` are oldest first.
 */
export function nextWanted<T extends Typeable>(targets: readonly T[], locked: T | null): string | null {
  if (locked && targets.includes(locked)) return locked.text[locked.typed] ?? null;
  return targets[0]?.text[0] ?? null;
}

/**
 * Work out what a key press does. Doesn't change anything: the world advances `typed`, sets or clears its lock,
 * and removes finished targets.
 */
export function press<T extends Typeable>(targets: readonly T[], locked: T | null, key: string): PressResult<T> {
  if (locked && targets.includes(locked)) {
    const want = locked.text[locked.typed];
    if (key === want) return { kind: "letter", target: locked, letter: key, index: locked.typed, done: locked.typed + 1 >= locked.text.length };
    return { kind: "wrong", expected: want };
  }
  const target = targets.find((t) => t.typed === 0 && t.text[0] === key);
  if (target) return { kind: "letter", target, letter: key, index: 0, done: target.text.length === 1 };
  return { kind: "wrong", expected: nextWanted(targets, null) };
}

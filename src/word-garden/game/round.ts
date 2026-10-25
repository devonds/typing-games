// The rules of a round: a few sentences, typed one letter at a time. No drawing and no browser APIs.
// At first punctuation is typed for you and capitals don't need Shift: this is about finding the letters. Once a
// child has learned every letter, capitals need Shift; after that, . , ? and ' must be typed too ("!" is always
// filled in: it's up on the number row).
import type { RoundEvent } from "./types";

/** What a round asks for beyond the letters and the space bar. */
export interface Rules {
  /** Capitals need Shift, and a capital where a small letter belongs is a wrong key. */
  capitals: boolean;
  /** . , ? and ' are typed rather than filled in. */
  punctuation: boolean;
}

export const LETTERS_ONLY: Rules = { capitals: false, punctuation: false };

/** The punctuation a child can be asked to type. */
export const TYPED_MARKS = ".,?'";

/** Whether a character is typed (rather than filled in) under these rules. */
export function typedUnder(c: string, rules: Rules): boolean {
  return c === " " || /[a-z]/i.test(c) || (rules.punctuation && TYPED_MARKS.includes(c));
}

/** Letters and spaces are typed; everything else (. , ! ? ') is filled in automatically, until the rules say. */
export const isTyped = (c: string): boolean => typedUnder(c, LETTERS_ONLY);

const isLetter = (c: string): boolean => /^[a-z]$/i.test(c);
const isCapital = (c: string): boolean => /^[A-Z]$/.test(c);

export class Round {
  /** Which sentence we're on. */
  sentence = 0;
  /** Index of the next character to type in the current sentence. */
  pos = 0;
  /** True between finishing a sentence and the scene moving on to the next. */
  waiting = false;
  over = false;
  /** Letters and spaces typed correctly, and wrong keys, over the whole round. */
  correct = 0;
  wrongKeys = 0;
  /** Seconds spent typing: from the first key of each sentence to its last, so pauses between don't count. */
  typingTime = 0;
  /** Wrong keys in the current sentence. */
  private mistakes = 0;
  private started = false;
  /** Seconds since the last correct key (or since the sentence appeared). */
  private sinceLast = 0;
  private fumbled = false;

  constructor(
    readonly sentences: readonly string[],
    readonly rules: Rules = LETTERS_ONLY,
  ) {
    if (sentences.length === 0) throw new Error("Round needs at least one sentence");
    this.skipPunctuation();
  }

  get text(): string {
    return this.sentences[this.sentence];
  }

  /** The next character to type, or null while waiting between sentences. */
  get next(): string | null {
    return this.waiting || this.over ? null : this.text[this.pos] ?? null;
  }

  /** Words per minute, counting five characters as a word. Capped at 240, faster than anyone types. */
  get wpm(): number {
    return this.typingTime > 0 ? Math.min(240, this.correct / 5 / (this.typingTime / 60)) : 0;
  }

  /** Correct keys over all keys, 0..1; null before any key. */
  get accuracy(): number | null {
    const keys = this.correct + this.wrongKeys;
    return keys > 0 ? this.correct / keys : null;
  }

  step(dt: number): void {
    if (this.waiting || this.over) return;
    this.sinceLast += dt;
    if (this.started) this.typingTime += dt;
  }

  /** Whether the next character needs Shift: a capital, or "?". */
  get needsShift(): boolean {
    const next = this.next;
    return next !== null && ((this.rules.capitals && isCapital(next)) || next === "?");
  }

  /** `key` is a lowercase letter, " " or a punctuation key; `capital` if a letter was typed with Shift (or Caps Lock). */
  press(key: string, capital = false): RoundEvent[] {
    const expected = this.next;
    if (expected === null) return [];
    const rightKey = key === expected.toLowerCase();
    const rightCase = !this.rules.capitals || !isLetter(expected) || capital === isCapital(expected);
    if (!rightKey || !rightCase) {
      this.wrongKeys += 1;
      this.mistakes += 1;
      this.fumbled = true;
      return [{ type: "wrongKey", key, expected: expected.toLowerCase(), wrongCase: rightKey }];
    }
    const timed = this.started;
    this.started = true;
    this.correct += 1;
    const index = this.pos;
    const events: RoundEvent[] = [
      key === " "
        ? { type: "space", index }
        : isLetter(expected)
          ? { type: "letter", index, letter: key, reactionTime: this.sinceLast, fumbled: this.fumbled, timed, capital: this.rules.capitals && isCapital(expected) }
          : { type: "mark", index, mark: expected, fumbled: this.fumbled },
    ];
    this.sinceLast = 0;
    this.fumbled = false;
    this.pos += 1;
    this.skipPunctuation();
    if (this.pos >= this.text.length) {
      this.waiting = true;
      events.push({ type: "sentenceDone", sentence: this.sentence, mistakes: this.mistakes });
    }
    return events;
  }

  /** Stop where we are, mid-sentence if need be (the one-minute check's time is up). */
  end(): RoundEvent[] {
    if (this.over) return [];
    this.over = true;
    this.waiting = false;
    return [{ type: "roundDone" }];
  }

  /** Move on after a finished sentence. Called by the scene once the celebration is over. */
  advance(): RoundEvent[] {
    if (!this.waiting) return [];
    this.waiting = false;
    if (this.sentence + 1 >= this.sentences.length) {
      this.over = true;
      return [{ type: "roundDone" }];
    }
    this.sentence += 1;
    this.pos = 0;
    this.mistakes = 0;
    this.started = false;
    this.sinceLast = 0;
    this.fumbled = false;
    this.skipPunctuation();
    return [{ type: "nextSentence", sentence: this.sentence }];
  }

  private skipPunctuation(): void {
    while (this.pos < this.text.length && !typedUnder(this.text[this.pos], this.rules)) this.pos += 1;
  }
}

// The rules of a round: a few sentences, typed one letter at a time. No drawing and no browser APIs.
// Punctuation is typed for you and capitals don't need shift: this is about finding the letters.
import type { RoundEvent } from "./types";

/** Letters and spaces are typed; everything else (. , ! ? ') is filled in automatically. */
export const isTyped = (c: string): boolean => c === " " || /[a-z]/i.test(c);

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

  constructor(readonly sentences: readonly string[]) {
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

  /** `key` is a lowercase letter or " ". */
  press(key: string): RoundEvent[] {
    const expected = this.next;
    if (expected === null) return [];
    if (key !== expected.toLowerCase()) {
      this.wrongKeys += 1;
      this.mistakes += 1;
      this.fumbled = true;
      return [{ type: "wrongKey", key, expected: expected.toLowerCase() }];
    }
    this.started = true;
    this.correct += 1;
    const index = this.pos;
    const events: RoundEvent[] = [
      key === " "
        ? { type: "space", index }
        : { type: "letter", index, letter: key, reactionTime: this.sinceLast, fumbled: this.fumbled },
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
    while (this.pos < this.text.length && !isTyped(this.text[this.pos])) this.pos += 1;
  }
}

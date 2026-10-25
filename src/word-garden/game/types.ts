/** What happened on a key press or step. Scenes turn these into bursts, sounds and letter history. */
export type RoundEvent =
  /**
   * A letter typed correctly. `index` is its position in the sentence; `fumbled` if a wrong key came first. `timed`
   * is false for a sentence's first key, whose time includes reading the sentence.
   */
  | { type: "letter"; index: number; letter: string; reactionTime: number; fumbled: boolean; timed: boolean; capital: boolean }
  /** A punctuation mark typed (once punctuation is asked for). */
  | { type: "mark"; index: number; mark: string; fumbled: boolean }
  | { type: "space"; index: number }
  /**
   * `expected` is the letter that should have been typed (lowercase), " " for a space, or a punctuation mark.
   * `wrongCase`: the right key, but a capital without Shift (or with Shift where a small letter belongs).
   */
  | { type: "wrongKey"; key: string; expected: string; wrongCase: boolean }
  | { type: "sentenceDone"; sentence: number; mistakes: number }
  | { type: "nextSentence"; sentence: number }
  | { type: "roundDone" };

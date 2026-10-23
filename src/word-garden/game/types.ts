/** What happened on a key press or step. Scenes turn these into bursts, sounds and letter history. */
export type RoundEvent =
  /** A letter typed correctly. `index` is its position in the sentence; `fumbled` if a wrong key came first. */
  | { type: "letter"; index: number; letter: string; reactionTime: number; fumbled: boolean }
  | { type: "space"; index: number }
  /** `expected` is the letter that should have been typed, or " " for a space. */
  | { type: "wrongKey"; key: string; expected: string }
  | { type: "sentenceDone"; sentence: number; mistakes: number }
  | { type: "nextSentence"; sentence: number }
  | { type: "roundDone" };

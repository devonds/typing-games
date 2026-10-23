// Turns Word Garden's events into the shared per-letter history. Every letter in a sentence is seen and, since
// nothing gets away, eventually hit; wrong keys count as fumbles against the letter that was wanted.
import { recordFumble, recordHit, recordSeen, type Stats } from "../../shared/letters";
import type { RoundEvent } from "./types";

export function recordEvent(stats: Stats, event: RoundEvent): void {
  switch (event.type) {
    case "letter":
      recordSeen(stats, event.letter);
      recordHit(stats, event.letter, event.reactionTime);
      break;
    case "wrongKey":
      if (event.expected !== " ") recordFumble(stats, event.expected);
      break;
  }
}

// Turns Balloon Pop's events into the shared per-letter history.
import { recordFumble, recordHit, recordMiss, recordSeen, type Stats } from "../../shared/letters";
import type { GameEvent } from "./types";

export function recordEvent(stats: Stats, event: GameEvent): void {
  switch (event.type) {
    case "launched":
      recordSeen(stats, event.balloon.letter);
      break;
    case "popped":
      recordHit(stats, event.balloon.letter, event.reactionTime);
      break;
    case "escaped":
      recordMiss(stats, event.balloon.letter);
      break;
    case "wrongKey":
      if (event.expected) recordFumble(stats, event.expected);
      break;
  }
}

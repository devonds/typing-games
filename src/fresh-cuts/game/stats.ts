// Turns Fresh Cuts' events into the shared per-letter history. Rotten and frozen fruit are left out: a rotten
// fruit's letter is one you shouldn't type, and letting a frozen one fall costs nothing, so neither says much about
// how well you know the keyboard.
import { recordFumble, recordHit, recordMiss, recordSeen, type Stats } from "../../shared/letters";
import type { GameEvent } from "./types";

export function recordEvent(stats: Stats, event: GameEvent): void {
  switch (event.type) {
    case "launched":
      if (!event.fruit.rotten && !event.fruit.frozen) recordSeen(stats, event.fruit.letter);
      break;
    case "sliced":
      if (!event.fruit.frozen) recordHit(stats, event.fruit.letter, event.reactionTime);
      break;
    case "dropped":
      recordMiss(stats, event.fruit.letter);
      break;
    case "wrongKey":
      if (event.expected) recordFumble(stats, event.expected);
      break;
  }
}

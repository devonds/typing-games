// Turns Balloon Pop's events into the round's log for the shared history.
import type { RoundLog } from "../../shared/history";
import type { GameEvent } from "./types";

export function logEvent(log: RoundLog, event: GameEvent): void {
  switch (event.type) {
    case "letter": {
      log.hit(event.letter, event.seconds);
      // Each letter after the first of a pair or word is also a step from the one before.
      if (event.index > 0) log.pair(event.balloon.text[event.index - 1], event.letter, event.seconds, event.ok);
      break;
    }
    case "escaped":
      for (const letter of event.balloon.text.slice(event.balloon.typed)) log.miss(letter);
      break;
    case "wrongKey":
      if (event.expected) log.fumble(event.expected);
      break;
  }
}

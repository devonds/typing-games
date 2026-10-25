// Turns Word Garden's events into the round's log for the shared history: every letter typed (with the time since
// the key before), wrong keys as fumbles against the letter wanted, and each pair of letters typed one after the
// other inside a word, so the history learns which pairs are tricky. Spaces aren't tracked.
import type { RoundLog } from "../../shared/history";
import type { RoundEvent } from "./types";

const isLetter = (c: string | undefined): boolean => !!c && /^[a-z]$/i.test(c);

/** `text` is the sentence the event belongs to. */
export function logEvent(log: RoundLog, event: RoundEvent, text: string): void {
  switch (event.type) {
    case "letter": {
      // A sentence's first key includes reading time; null tells the history it has no fair time.
      log.hit(event.letter, event.timed ? event.reactionTime : null);
      const before = text[event.index - 1];
      if (isLetter(before)) log.pair(before.toLowerCase(), event.letter, event.reactionTime, !event.fumbled);
      break;
    }
    case "wrongKey":
      if (isLetter(event.expected)) log.fumble(event.expected);
      break;
  }
}

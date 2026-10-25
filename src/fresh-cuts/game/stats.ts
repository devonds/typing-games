// Turns Fresh Cuts' events into the round's log for the shared history: every letter typed, every pair inside a
// pair or word, what got away, and wrong keys. Rotten and frozen fruit are left out: a
// rotten fruit's letter is one you shouldn't type, and letting a frozen one fall costs nothing, so neither says much
// about how well you know the keyboard.
import type { RoundLog } from "../../shared/history";
import type { GameEvent } from "./types";

export function logEvent(log: RoundLog, event: GameEvent): void {
  switch (event.type) {
    case "typed": {
      const { fruit, letter, index, seconds, ok } = event;
      if (fruit.rotten || fruit.frozen) break;
      log.hit(letter, seconds);
      // Inside a pair or word, each letter also counts for the pair it finishes.
      if (index > 0) log.pair(fruit.letter[index - 1], letter, seconds, ok);
      break;
    }
    case "dropped":
      // A word that falls part-typed: only its untyped letters got away.
      for (const letter of event.fruit.letter.slice(event.fruit.typed ?? 0)) log.miss(letter);
      break;
    case "wrongKey":
      if (event.expected) log.fumble(event.expected);
      break;
  }
}

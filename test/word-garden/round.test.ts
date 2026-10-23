import { describe, expect, it } from "vitest";
import { recordEvent } from "../../src/word-garden/game/stats";
import { Round } from "../../src/word-garden/game/round";
import type { RoundEvent } from "../../src/word-garden/game/types";
import type { Stats } from "../../src/shared/letters";

/** Type a string one key at a time, with `gap` seconds before each key. */
function type(round: Round, keys: string, gap = 0.2): RoundEvent[] {
  const events: RoundEvent[] = [];
  for (const k of keys) {
    round.step(gap);
    events.push(...round.press(k));
  }
  return events;
}

describe("Round", () => {
  it("types a sentence letter by letter, without shift, filling in punctuation", () => {
    const round = new Round(["Hi, Sam!"]);
    expect(round.next).toBe("H");
    const events = type(round, "hi sam");
    expect(events.filter((e) => e.type === "letter").map((e) => e.type === "letter" && e.letter)).toEqual([..."hisam"]);
    expect(events.filter((e) => e.type === "space")).toHaveLength(1);
    expect(events.at(-1)).toEqual({ type: "sentenceDone", sentence: 0, mistakes: 0 });
    expect(round.waiting).toBe(true);
    expect(round.next).toBeNull();
  });

  it("waits on a wrong key and remembers the fumble", () => {
    const round = new Round(["ab"]);
    expect(round.press("x")).toEqual([{ type: "wrongKey", key: "x", expected: "a" }]);
    expect(round.next).toBe("a");
    const [hit] = round.press("a");
    expect(hit).toMatchObject({ type: "letter", letter: "a", fumbled: true });
    const [next] = round.press("b");
    expect(next).toMatchObject({ type: "letter", letter: "b", fumbled: false });
    expect(round.wrongKeys).toBe(1);
    expect(round.accuracy).toBeCloseTo(2 / 3);
  });

  it("needs the space bar between words", () => {
    const round = new Round(["a b"]);
    round.press("a");
    expect(round.press("b")).toEqual([{ type: "wrongKey", key: "b", expected: " " }]);
    expect(round.press(" ")[0]).toEqual({ type: "space", index: 1 });
  });

  it("ignores keys while waiting, then moves on and finishes the round", () => {
    const round = new Round(["a.", "b."]);
    type(round, "a");
    expect(round.press("b")).toEqual([]);
    expect(round.advance()).toEqual([{ type: "nextSentence", sentence: 1 }]);
    expect(round.text).toBe("b.");
    type(round, "b");
    expect(round.advance()).toEqual([{ type: "roundDone" }]);
    expect(round.over).toBe(true);
  });

  it("counts words per minute over typing time only", () => {
    const round = new Round(["aaaaa", "aaaaa"]);
    round.step(5); // looking at the sentence before the first key doesn't count
    type(round, "aaaaa", 1.5); // first key starts the clock: 4 gaps of 1.5 s = 6 s
    round.advance();
    round.step(3);
    type(round, "aaaaa", 1.5);
    // 10 characters = 2 words in 12 seconds = 10 wpm.
    expect(round.typingTime).toBeCloseTo(12);
    expect(round.wpm).toBeCloseTo(10);
  });

  it("never reports an impossible speed", () => {
    const round = new Round(["aaaaa aaaaa"]);
    type(round, "aaaaa aaaaa", 0.001);
    expect(round.wpm).toBe(240);
  });

  it("feeds the letter history: every letter seen and hit, wrong keys as fumbles", () => {
    const stats: Stats = {};
    const round = new Round(["Go go."]);
    for (const e of [...type(round, "gx"), ...type(round, "o go")]) recordEvent(stats, e);
    expect(stats.g).toMatchObject({ seen: 2, hit: 2, fumbles: 0 });
    expect(stats.o).toMatchObject({ seen: 2, hit: 2, fumbles: 1 });
    expect(stats[" "]).toBeUndefined();
  });
});

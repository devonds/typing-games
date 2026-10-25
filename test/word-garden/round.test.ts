import { describe, expect, it } from "vitest";
import { logEvent } from "../../src/word-garden/game/stats";
import { Round, typedUnder } from "../../src/word-garden/game/round";
import type { RoundEvent } from "../../src/word-garden/game/types";
import { RoundLog, emptyHistory } from "../../src/shared/history";

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
    expect(round.press("x")).toEqual([{ type: "wrongKey", key: "x", expected: "a", wrongCase: false }]);
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
    expect(round.press("b")).toEqual([{ type: "wrongKey", key: "b", expected: " ", wrongCase: false }]);
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

  it("feeds the history: letters hit, wrong keys as fumbles, and pairs inside words", () => {
    const log = new RoundLog();
    const round = new Round(["Go go, Al."]);
    for (const e of [...type(round, "gx"), ...type(round, "o go al")]) logEvent(log, e, round.text);
    const h = log.mergeInto(emptyHistory(), 100);
    expect(h.letters.g).toMatchObject({ seen: 2, hits: 2, fumbles: 0 });
    expect(h.letters.o).toMatchObject({ seen: 2, hits: 2, fumbles: 1 });
    expect(h.letters[" "]).toBeUndefined();
    // "go" twice: the first o was fumbled, the second right first time. No pair across the space or the comma.
    expect(h.pairs.go.recent.map(([ok]) => ok)).toEqual([0, 1]);
    expect(h.pairs.al.recent).toHaveLength(1);
    expect(Object.keys(h.pairs).sort()).toEqual(["al", "go"]);
  });

  it("doesn't time a sentence's first key, which includes reading it", () => {
    const log = new RoundLog();
    const round = new Round(["dad sad"]);
    round.step(5);
    for (const e of type(round, "dad sad")) logEvent(log, e, round.text);
    const h = log.mergeInto(emptyHistory(), 100);
    expect(h.letters.d.recent[0]).toEqual([1, 0]);
    expect(h.letters.d.recent[1][1]).toBeGreaterThan(0);
  });

  it("doesn't count a wrong space bar as a fumble", () => {
    const log = new RoundLog();
    const round = new Round(["a b"]);
    for (const e of type(round, "ax b")) logEvent(log, e, round.text);
    expect(log.tricky()).toEqual([]);
  });
});

describe("Round: capitals and punctuation", () => {
  const CAPS = { capitals: true, punctuation: false };
  const ALL = { capitals: true, punctuation: true };

  it("lets capitals go without Shift until capitals are on", () => {
    const round = new Round(["Hi"]);
    expect(round.press("h", false)[0]).toMatchObject({ type: "letter", capital: false });
    expect(round.needsShift).toBe(false);
  });

  it("needs Shift for a capital once capitals are on, and counts a slip against the letter", () => {
    const round = new Round(["Hi"], CAPS);
    expect(round.needsShift).toBe(true);
    expect(round.press("h", false)).toEqual([{ type: "wrongKey", key: "h", expected: "h", wrongCase: true }]);
    const [hit] = round.press("h", true);
    expect(hit).toMatchObject({ type: "letter", letter: "h", capital: true, fumbled: true });
    // A capital where a small letter belongs is wrong too (Caps Lock left on).
    expect(round.press("i", true)[0]).toMatchObject({ type: "wrongKey", wrongCase: true });
    expect(round.press("i", false)[0]).toMatchObject({ type: "letter", capital: false });
  });

  it("fills in punctuation until it's asked for", () => {
    const round = new Round(["Yes, I can."], CAPS);
    type(round, "");
    const events = [...round.press("y", true), ...round.press("e"), ...round.press("s"), ...round.press(" "), ...round.press("i", true)];
    expect(events.some((e) => e.type === "mark")).toBe(false);
    expect(round.text[round.pos]).toBe(" ");
  });

  it("asks for . , ? and ' once punctuation is on, but still fills in !", () => {
    const round = new Round(["It's me, ok? Yes!"], ALL);
    const keys: [string, boolean][] = [["i", true], ["t", false], ["'", false], ["s", false], [" ", false], ["m", false], ["e", false], [",", false], [" ", false], ["o", false], ["k", false]];
    for (const [k, cap] of keys) expect(round.press(k, cap)[0]?.type, k).not.toBe("wrongKey");
    expect(round.next).toBe("?");
    expect(round.needsShift).toBe(true);
    expect(round.press(".")[0]).toMatchObject({ type: "wrongKey", expected: "?" });
    expect(round.press("?")[0]).toMatchObject({ type: "mark", mark: "?", fumbled: true });
    round.press(" ");
    round.press("y", true);
    round.press("e");
    const done = round.press("s");
    expect(done.at(-1)).toMatchObject({ type: "sentenceDone" });
    expect(typedUnder("!", ALL)).toBe(false);
    expect(typedUnder(".", CAPS)).toBe(false);
    expect(typedUnder(".", ALL)).toBe(true);
  });

  it("can stop mid-sentence when time is up", () => {
    const round = new Round(["abc", "def"]);
    round.press("a");
    expect(round.end()).toEqual([{ type: "roundDone" }]);
    expect(round.over).toBe(true);
    expect(round.next).toBeNull();
    expect(round.press("b")).toEqual([]);
    expect(round.end()).toEqual([]);
  });
});

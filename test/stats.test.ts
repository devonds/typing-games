import { describe, expect, it } from "vitest";
import { mergeRound, recordEvent, trickyLetters, weakLetters, type LetterStats, type Stats } from "../src/game/stats";
import type { Balloon } from "../src/game/types";

const balloon = (letter: string): Balloon => ({ id: 1, letter, x: 0, y: 0, vx: 0, vy: 0, colour: 0, launchedAt: 0 });
const stat = (s: Partial<LetterStats>): LetterStats => ({ seen: 0, popped: 0, escaped: 0, fumbles: 0, reactionTotal: 0, ...s });

describe("recordEvent", () => {
  it("counts launches, pops, escapes and fumbles per letter", () => {
    const stats: Stats = {};
    recordEvent(stats, { type: "launched", balloon: balloon("f"), launcher: 0 });
    recordEvent(stats, { type: "launched", balloon: balloon("j"), launcher: 1 });
    recordEvent(stats, { type: "popped", balloon: balloon("f"), reactionTime: 2 });
    recordEvent(stats, { type: "wrongKey", key: "k", expected: "j" });
    recordEvent(stats, { type: "escaped", balloon: balloon("j") });
    expect(stats.f).toEqual(stat({ seen: 1, popped: 1, reactionTotal: 2 }));
    expect(stats.j).toEqual(stat({ seen: 1, escaped: 1, fumbles: 1 }));
    expect(stats.k).toBeUndefined();
  });
});

describe("weakLetters", () => {
  it("needs some history first", () => {
    expect(weakLetters({})).toBeNull();
    expect(weakLetters({ a: stat({ seen: 10, popped: 10, reactionTotal: 20 }) })).toBeNull();
  });

  it("ranks letters that get away above letters that get popped quickly", () => {
    const good = stat({ seen: 10, popped: 10, reactionTotal: 20 });
    const stats: Stats = {
      a: good, s: good, d: good, f: good, g: good, h: good,
      q: stat({ seen: 6, popped: 2, escaped: 4, reactionTotal: 12 }),
      z: stat({ seen: 6, popped: 4, escaped: 1, fumbles: 3, reactionTotal: 24 }),
    };
    const weak = weakLetters(stats, 2);
    expect(weak).toEqual(["q", "z"]);
  });

  it("ignores letters seen too rarely to judge", () => {
    const good = stat({ seen: 10, popped: 10, reactionTotal: 20 });
    const stats: Stats = { a: good, s: good, d: good, f: good, x: stat({ seen: 1, escaped: 1 }) };
    expect(weakLetters(stats)).not.toContain("x");
  });
});

describe("mergeRound", () => {
  it("adds the round on top of faded history", () => {
    const merged = mergeRound({ a: stat({ seen: 10, escaped: 5 }) }, { a: stat({ seen: 2 }), b: stat({ seen: 1 }) }, 0.5);
    expect(merged.a).toEqual(stat({ seen: 7, escaped: 2.5 }));
    expect(merged.b).toEqual(stat({ seen: 1 }));
  });
});

describe("trickyLetters", () => {
  it("lists letters with escapes or fumbles, most trouble first", () => {
    const round: Stats = { a: stat({ escaped: 1 }), b: stat({ fumbles: 3 }), c: stat({ popped: 4 }) };
    expect(trickyLetters(round)).toEqual(["b", "a"]);
  });
});

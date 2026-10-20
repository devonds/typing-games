import { describe, expect, it } from "vitest";
import { mergeRound, trickyLetters, weakLetters, type LetterStats, type Stats } from "../../src/shared/letters";
import { migrateBalloonStats } from "../../src/shared/storage";

const stat = (s: Partial<LetterStats>): LetterStats => ({ seen: 0, hit: 0, missed: 0, fumbles: 0, reactionTotal: 0, ...s });

describe("weakLetters", () => {
  it("needs some history first", () => {
    expect(weakLetters({})).toBeNull();
    expect(weakLetters({ a: stat({ seen: 10, hit: 10, reactionTotal: 20 }) })).toBeNull();
  });

  it("ranks letters that get away above letters that get popped quickly", () => {
    const good = stat({ seen: 10, hit: 10, reactionTotal: 20 });
    const stats: Stats = {
      a: good, s: good, d: good, f: good, g: good, h: good,
      q: stat({ seen: 6, hit: 2, missed: 4, reactionTotal: 12 }),
      z: stat({ seen: 6, hit: 4, missed: 1, fumbles: 3, reactionTotal: 24 }),
    };
    const weak = weakLetters(stats, 2);
    expect(weak).toEqual(["q", "z"]);
  });

  it("ignores letters seen too rarely to judge", () => {
    const good = stat({ seen: 10, hit: 10, reactionTotal: 20 });
    const stats: Stats = { a: good, s: good, d: good, f: good, x: stat({ seen: 1, missed: 1 }) };
    expect(weakLetters(stats)).not.toContain("x");
  });
});

describe("mergeRound", () => {
  it("adds the round on top of faded history", () => {
    const merged = mergeRound({ a: stat({ seen: 10, missed: 5 }) }, { a: stat({ seen: 2 }), b: stat({ seen: 1 }) }, 0.5);
    expect(merged.a).toEqual(stat({ seen: 7, missed: 2.5 }));
    expect(merged.b).toEqual(stat({ seen: 1 }));
  });
});

describe("trickyLetters", () => {
  it("lists letters that got away or were fumbled, most trouble first", () => {
    const round: Stats = { a: stat({ missed: 1 }), b: stat({ fumbles: 3 }), c: stat({ hit: 4 }) };
    expect(trickyLetters(round)).toEqual(["b", "a"]);
  });
});

describe("migrateBalloonStats", () => {
  it("renames Balloon Pop's old fields", () => {
    const old = { f: { seen: 4, popped: 3, escaped: 1, fumbles: 2, reactionTotal: 5 } };
    expect(migrateBalloonStats(old)).toEqual({ f: stat({ seen: 4, hit: 3, missed: 1, fumbles: 2, reactionTotal: 5 }) });
  });
});

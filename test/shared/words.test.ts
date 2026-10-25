import { describe, expect, it } from "vitest";
import { emptyHistory } from "../../src/shared/history";
import { seededRandom } from "../../src/shared/rng";
import { WORD_BANK, alternatesHands, pairsWithin, pickPair, pickWord, wordsWithin } from "../../src/shared/words";

describe("word bank", () => {
  it("is lowercase letters only", () => {
    for (const w of WORD_BANK) expect(w).toMatch(/^[a-z]+$/);
  });

  it("has words for the home row alone", () => {
    const home = wordsWithin("asdfghjkl");
    expect(home).toEqual(expect.arrayContaining(["sad", "dad", "ask", "glad", "flask"]));
    expect(home.every((w) => [...w].every((c) => "asdfghjkl".includes(c)))).toBe(true);
  });

  it("picks words and pairs only from allowed letters, and skips what it's told", () => {
    const random = seededRandom(2);
    const o = { today: 1, random, skip: (w: string) => w.startsWith("s") };
    for (let i = 0; i < 50; i++) {
      const w = pickWord("asdfghjkl", emptyHistory(), o)!;
      expect([...w].every((c) => "asdfghjkl".includes(c))).toBe(true);
      expect(w.startsWith("s")).toBe(false);
      const p = pickPair("fjdkslaghruei", emptyHistory(), { today: 1, random })!;
      expect(p).toHaveLength(2);
    }
    expect(pickWord("fj", emptyHistory(), { today: 1 })).toBeNull();
  });

  it("knows which pairs switch hands", () => {
    expect(alternatesHands("th")).toBe(true); // t: left hand, h: right hand
    expect(alternatesHands("as")).toBe(false);
    expect(pairsWithin("as").sort()).toEqual(["as", "sa"]); // from "as", "lass"... only pairs of allowed letters
    expect(pairsWithin("fj")).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { SENTENCES, focusShare, lettersOf, pickSentences } from "../../src/word-garden/game/sentences";
import { seededRandom } from "../../src/shared/rng";

const ALL = [...SENTENCES.short, ...SENTENCES.long];

describe("sentences", () => {
  it("only use letters, spaces and simple punctuation", () => {
    for (const s of ALL) expect(s).toMatch(/^[A-Za-z][A-Za-z ,.!?']*$/);
  });

  it("are short enough to fit on one line", () => {
    for (const s of SENTENCES.short) expect(s.length, s).toBeLessThanOrEqual(26);
    for (const s of SENTENCES.long) expect(s.length, s).toBeLessThanOrEqual(36);
  });

  it("have no repeats", () => {
    expect(new Set(ALL).size).toBe(ALL.length);
  });

  it("picks different sentences, as many as asked", () => {
    const picked = pickSentences(SENTENCES.short, 10, null, [], seededRandom(1));
    expect(picked).toHaveLength(10);
    expect(new Set(picked).size).toBe(10);
  });

  it("leans hard towards sentences made of the focus letters", () => {
    const home = [..."asdfghjkl"];
    const share = (picked: string[]) => picked.reduce((n, s) => n + focusShare(s, home), 0) / picked.length;
    const random = seededRandom(7);
    let focused = 0;
    let unfocused = 0;
    for (let i = 0; i < 40; i++) {
      focused += share(pickSentences(SENTENCES.short, 5, home, [], random));
      unfocused += share(pickSentences(SENTENCES.short, 5, null, [], random));
    }
    expect(focused / 40).toBeGreaterThan(unfocused / 40 + 0.2);
  });

  it("is less likely to repeat last round's sentences", () => {
    const random = seededRandom(3);
    const recent = SENTENCES.short.slice(0, 5);
    let repeats = 0;
    for (let i = 0; i < 100; i++) repeats += pickSentences(SENTENCES.short, 5, null, recent, random).filter((s) => recent.includes(s)).length;
    // Without the penalty we'd expect about 5 * 5/60 * 100 = 42 repeats.
    expect(repeats).toBeLessThan(15);
  });

  it("finds the letters in a sentence", () => {
    expect(lettersOf("Hi, Sam!")).toEqual([..."hisam"]);
  });
});

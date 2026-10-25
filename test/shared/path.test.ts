import { describe, expect, it } from "vitest";
import { Guide, helpFor } from "../../src/shared/guide";
import { emptyHistory, type Outcome } from "../../src/shared/history";
import { MASTERY, START, STAGES, advance, mastered, masteryProgress, unlockedKeys } from "../../src/shared/path";

const record = (recent: Outcome[]) => ({ seen: recent.length, hits: 0, misses: 0, fumbles: 0, recent, last: 0 });
const good = (n = 15): Outcome[] => Array(n).fill([1, 1]);

describe("Learn path", () => {
  it("covers every letter once", () => {
    expect(STAGES.join("").split("").sort().join("")).toBe("abcdefghijklmnopqrstuvwxyz");
    expect(unlockedKeys(START)).toEqual(["f", "j"]);
    expect(unlockedKeys({ stage: 2 })).toEqual([..."fjdksl"]);
  });

  it("calls a key mastered after 15 recent tries, 90% right, at a typical speed", () => {
    expect(mastered(record(good(14)))).toBe(false);
    expect(mastered(record(good()))).toBe(true);
    const twoSlips: Outcome[] = [...good(13), [0, 1], [0, 1]];
    expect(mastered(record(twoSlips))).toBe(false);
    const slow: Outcome[] = Array(15).fill([1, 1.5]);
    expect(mastered(record(slow))).toBe(false);
    expect(mastered(record(slow), false)).toBe(true); // little hands: accuracy only
    expect(masteryProgress(record(good(6)))).toBeCloseTo(6 / MASTERY.window);
  });

  it("unlocks the next stage only when every key so far is mastered", () => {
    const h = emptyHistory();
    h.letters.f = record(good());
    expect(advance(START, h).unlocked).toEqual([]);
    h.letters.j = record(good());
    expect(advance(START, h)).toEqual({ state: { stage: 1 }, unlocked: ["d", "k"] });
  });
});

describe("Guide fading", () => {
  it("lights new keys, helps known ones on a slip, and leaves mastered ones alone", () => {
    const h = emptyHistory();
    h.letters.f = record(good());
    h.letters.j = record(good(10));
    expect(helpFor("d", "automatic", h)).toBe("show");
    expect(helpFor("j", "automatic", h)).toBe("slip");
    expect(helpFor("f", "automatic", h)).toBe("off");
    expect(helpFor("f", "always", h)).toBe("show");
    expect(helpFor("f", "automatic", h, true)).toBe("show");
  });

  it("hides the keyboard once everything in play is mastered, but flashes it back on a slip", () => {
    const h = emptyHistory();
    h.letters.f = record(good());
    h.letters.j = record(good());
    const guide = new Guide("automatic", h, false, ["f", "j"]);
    guide.setTarget("f");
    expect(guide.view().visible).toBe(false);
    guide.slip("f");
    expect(guide.view()).toMatchObject({ visible: true, flashKey: "f" });
  });
});

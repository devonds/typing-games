import { describe, expect, it } from "vitest";
import { ownLines, ownRound } from "../../src/word-garden/game/own";
import { SENTENCES, checkSentences } from "../../src/word-garden/game/sentences";
import { seededRandom } from "../../src/shared/rng";

describe("our words", () => {
  it("runs a list of spelling words together into lines", () => {
    expect(ownLines("because\nfriend\nschool\nwhere\nthere\nthey", 21)).toEqual(["because friend school", "where there they"]);
  });

  it("keeps sentences as lines, and wraps long ones at word boundaries", () => {
    const text = "The fox jumped.\nIt ran over the long, long log by the river and far away!\nDid it stop?";
    const lines = ownLines(text, 24);
    expect(lines[0]).toBe("The fox jumped.");
    expect(lines.at(-1)).toBe("Did it stop?");
    for (const l of lines) expect(l.length, l).toBeLessThanOrEqual(24);
    expect(lines.join(" ")).toBe("The fox jumped. It ran over the long, long log by the river and far away! Did it stop?");
  });

  it("splits sentences on one line, and joins a passage's hard line breaks", () => {
    expect(ownLines("I see a cat. The cat sees me.", 40)).toEqual(["I see a cat.", "The cat sees me."]);
    expect(ownLines("We went to\nthe park today.", 40)).toEqual(["We went to the park today."]);
  });

  it("keeps only letters, spaces and . , ? ' !", () => {
    expect(ownLines("Sam’s 3 cats: “Bo” & Jo; (yes) #1", 60)).toEqual(["Sam's cats Bo Jo yes"]);
    expect(ownLines("123 456\n\n---", 60)).toEqual([]);
  });

  it("cuts a word too long for a line", () => {
    expect(ownLines("supercalifragilistic", 8)).toEqual(["supercal", "ifragili", "stic"]);
  });

  it("takes rounds in order, cycling", () => {
    expect(ownRound(["a", "b", "c"], 2, 4)).toEqual(["c", "a", "b", "c"]);
    expect(ownRound([], 0, 5)).toEqual([]);
  });
});

describe("the one-minute check", () => {
  it("uses the whole bank in a fresh order, leaving out last round's sentences", () => {
    const recent = SENTENCES.short.slice(0, 5);
    const picked = checkSentences("short", recent, seededRandom(1));
    expect(picked).toHaveLength(SENTENCES.short.length - 5);
    expect(new Set(picked).size).toBe(picked.length);
    for (const s of recent) expect(picked).not.toContain(s);
    expect(picked).not.toEqual(SENTENCES.short.slice(5));
  });
});

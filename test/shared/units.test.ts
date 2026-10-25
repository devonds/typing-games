import { beforeEach, describe, expect, it } from "vitest";
import { Player } from "../../src/shared/player";
import { createProfile } from "../../src/shared/profiles";
import { seededRandom } from "../../src/shared/rng";
import { currentSession, finishStep, startSession, stepFor } from "../../src/shared/session";
import { nextWanted, pickUnit, press, unitMix } from "../../src/shared/units";

beforeEach(() => {
  const data = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
});

describe("typing a word, letter by letter", () => {
  const t = (text: string, typed = 0) => ({ text, typed });

  it("locks on to the oldest target starting with the key, then wants its next letter", () => {
    const cat = t("cat");
    const c = t("c");
    expect(press([cat, c], null, "c")).toMatchObject({ kind: "letter", target: cat, index: 0, done: false });
    cat.typed = 1;
    expect(nextWanted([cat, c], cat)).toBe("a");
    expect(press([cat, c], cat, "x")).toEqual({ kind: "wrong", expected: "a" });
    cat.typed = 2;
    expect(press([cat, c], cat, "t")).toMatchObject({ kind: "letter", index: 2, done: true });
  });

  it("reports the oldest target's first letter when nothing matches", () => {
    expect(press([t("dog"), t("s")], null, "q")).toEqual({ kind: "wrong", expected: "d" });
    expect(press([], null, "q")).toEqual({ kind: "wrong", expected: null });
  });
});

describe("units", () => {
  it("are single letters until the child is ready for sequences", () => {
    const p = new Player(createProfile("A", "fox", false));
    const practice = p.practice("mine")!;
    expect(unitMix(p, "mine", practice)).toMatchObject({ pairs: 0, words: 0 });
    const unit = pickUnit(p, practice, unitMix(p, "mine", practice), new Set(["f"]), seededRandom(1));
    expect(unit).toBe("j");
  });

  it("include pairs and words later, never starting with a letter already on screen", () => {
    const p = new Player(createProfile("B", "owl", false));
    p.path = { stage: 8 };
    const practice = p.practice("mine")!;
    const mix = unitMix(p, "mine", practice);
    expect(mix.words).toBeGreaterThan(0);
    const random = seededRandom(4);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const u = pickUnit(p, practice, mix, new Set(["a", "s"]), random)!;
      if (!u) continue;
      expect("as".includes(u[0])).toBe(false);
      expect([...u].every((c) => practice.keys.includes(c))).toBe(true);
      seen.add(u.length);
    }
    expect(seen.has(1) && seen.has(2) && [...seen].some((n) => n >= 3)).toBe(true);
  });
});

describe("today's practice", () => {
  it("steps through the games in order", () => {
    startSession("p1", 100);
    expect(stepFor("p1", 100, "word-garden")?.lesson).toBe("mine");
    expect(stepFor("p1", 100, "balloon-pop")).toBeNull();
    expect(finishStep("p1", 100, "word-garden")?.game).toBe("balloon-pop");
    expect(finishStep("p1", 100, "balloon-pop")?.game).toBe("fresh-cuts");
    expect(finishStep("p1", 100, "fresh-cuts")).toBeNull();
    expect(currentSession("p1", 100)).toBeNull();
  });

  it("doesn't carry over to another day", () => {
    startSession("p1", 100);
    expect(currentSession("p1", 101)).toBeNull();
  });
});

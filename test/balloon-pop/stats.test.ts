import { describe, expect, it } from "vitest";
import { logEvent } from "../../src/balloon-pop/game/stats";
import type { Balloon } from "../../src/balloon-pop/game/types";
import { RoundLog, emptyHistory } from "../../src/shared/history";

const balloon = (text: string, typed = 0): Balloon => ({ id: 1, text, typed, x: 0, y: 0, vx: 0, vy: 0, colour: 0, launchedAt: 0, targetAt: 0, typedAt: 0, pace: 1 });

describe("logEvent", () => {
  it("logs letters, escapes and fumbles per letter", () => {
    const log = new RoundLog();
    logEvent(log, { type: "launched", balloon: balloon("f"), launcher: 0 });
    logEvent(log, { type: "letter", balloon: balloon("f", 1), letter: "f", index: 0, seconds: 2, ok: true });
    logEvent(log, { type: "wrongKey", key: "k", expected: "j" });
    logEvent(log, { type: "escaped", balloon: balloon("j"), cost: 0 });
    logEvent(log, { type: "fizzled", key: "k" });
    const h = log.mergeInto(emptyHistory(), 100);
    expect(h.letters.f).toMatchObject({ seen: 1, hits: 1, misses: 0, fumbles: 0 });
    expect(h.letters.j).toMatchObject({ seen: 1, hits: 0, misses: 1, fumbles: 1 });
    expect(h.letters.k).toBeUndefined();
    expect(log.tricky()).toEqual(["j"]);
  });

  it("logs each letter after the first of a word as a pair, and misses the untyped rest when it escapes", () => {
    const log = new RoundLog();
    logEvent(log, { type: "letter", balloon: balloon("sad", 1), letter: "s", index: 0, seconds: 1, ok: true });
    logEvent(log, { type: "letter", balloon: balloon("sad", 2), letter: "a", index: 1, seconds: 0.4, ok: false });
    logEvent(log, { type: "escaped", balloon: balloon("sad", 2), cost: 0 });
    const h = log.mergeInto(emptyHistory(), 100);
    expect(h.pairs.sa.recent).toHaveLength(1);
    expect(h.pairs.sa.recent[0][0]).toBe(0);
    expect(h.letters.d).toMatchObject({ seen: 1, misses: 1 });
    expect(h.letters.s).toMatchObject({ hits: 1 });
  });
});

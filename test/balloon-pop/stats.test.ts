import { describe, expect, it } from "vitest";
import { recordEvent } from "../../src/balloon-pop/game/stats";
import type { Balloon } from "../../src/balloon-pop/game/types";
import type { LetterStats, Stats } from "../../src/shared/letters";

const balloon = (letter: string): Balloon => ({ id: 1, letter, x: 0, y: 0, vx: 0, vy: 0, colour: 0, launchedAt: 0 });
const stat = (s: Partial<LetterStats>): LetterStats => ({ seen: 0, hit: 0, missed: 0, fumbles: 0, reactionTotal: 0, ...s });

describe("recordEvent", () => {
  it("counts launches, pops, escapes and fumbles per letter", () => {
    const stats: Stats = {};
    recordEvent(stats, { type: "launched", balloon: balloon("f"), launcher: 0 });
    recordEvent(stats, { type: "launched", balloon: balloon("j"), launcher: 1 });
    recordEvent(stats, { type: "popped", balloon: balloon("f"), reactionTime: 2 });
    recordEvent(stats, { type: "wrongKey", key: "k", expected: "j" });
    recordEvent(stats, { type: "escaped", balloon: balloon("j") });
    expect(stats.f).toEqual(stat({ seen: 1, hit: 1, reactionTotal: 2 }));
    expect(stats.j).toEqual(stat({ seen: 1, missed: 1, fumbles: 1 }));
    expect(stats.k).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { RoundLog, emptyHistory, fromV1, type History, type Outcome } from "../../src/shared/history";
import { NEED, capShares, needOf, needWeights, pickWeighted, textNeed } from "../../src/shared/practice";
import { seededRandom } from "../../src/shared/rng";

const today = 20000;
const o = { today };
const record = (recent: Outcome[], last = today) => ({ seen: recent.length, hits: 0, misses: 0, fumbles: 0, recent, last });
const solid: Outcome[] = Array(20).fill([1, 1]);
const shaky: Outcome[] = Array.from({ length: 20 }, (_, i) => [i % 3 === 0 ? 0 : 1, 1.6] as Outcome);

describe("RoundLog", () => {
  it("records right-first-time, misses and fumbles, with speed relative to the round", () => {
    const log = new RoundLog();
    log.hit("a", 1);
    log.hit("s", 1);
    log.fumble("d");
    log.hit("d", 2);
    log.miss("f");
    const h = log.mergeInto(emptyHistory(), today);
    expect(h.letters.a.recent).toEqual([[1, 1]]);
    expect(h.letters.d).toMatchObject({ seen: 1, hits: 1, fumbles: 1, recent: [[0, 2]] });
    expect(h.letters.f).toMatchObject({ misses: 1, recent: [[0, 0]] });
    expect(log.tricky()).toEqual(expect.arrayContaining(["d", "f"]));
  });

  it("keeps only the most recent results", () => {
    let h: History = emptyHistory();
    for (let i = 0; i < 30; i++) {
      const log = new RoundLog();
      log.hit("a", 1);
      h = log.mergeInto(h, today);
    }
    expect(h.letters.a.recent).toHaveLength(20);
    expect(h.letters.a.seen).toBe(30);
  });

  it("records pairs", () => {
    const log = new RoundLog();
    for (const t of [0.2, 0.2, 0.4]) log.pair("t", "h", t, true);
    expect(log.mergeInto(emptyHistory(), today).pairs.th.recent.at(-1)).toEqual([1, 2]);
  });

  it("carries the old totals across", () => {
    const h = fromV1({ a: { seen: 10.4, hit: 9, missed: 1, fumbles: 2, reactionTotal: 30 } }, today);
    expect(h.letters.a).toMatchObject({ seen: 10, hits: 9, misses: 1, fumbles: 2, recent: [] });
  });
});

describe("need", () => {
  it("is higher for shaky, new and long-unpractised letters than for solid ones", () => {
    const solidNeed = needOf(record(solid), o);
    expect(needOf(record(shaky), o)).toBeGreaterThan(solidNeed * 2);
    expect(needOf(undefined, o)).toBeGreaterThan(solidNeed * 2);
    expect(needOf(record(solid, today - 30), o)).toBeGreaterThan(solidNeed);
    expect(solidNeed).toBeGreaterThanOrEqual(NEED.floor);
  });

  it("ignores speed for little hands", () => {
    const slow = record(Array(20).fill([1, 2.5]));
    expect(needOf(slow, { today, speedMatters: false })).toBeLessThan(needOf(slow, o));
  });

  it("mixes weak letters with known ones rather than drilling only the weak", () => {
    const h = emptyHistory();
    for (const c of "asdfghjkl") h.letters[c] = record(solid);
    h.letters.k = record(shaky);
    const w = needWeights([..."asdfghjkl"], h, o);
    expect([...w.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(w.get("k")!).toBeGreaterThan(w.get("a")! * 2);
    expect(w.get("k")!).toBeLessThanOrEqual(NEED.cap + 1e-9);
    // The known letters together still get a good share.
    expect(1 - w.get("k")!).toBeGreaterThan(0.6);
  });

  it("caps shares and spreads the rest", () => {
    const s = capShares(new Map([["a", 100], ["b", 1], ["c", 1], ["d", 1], ["e", 1]]), 0.25);
    expect(s.get("a")).toBeCloseTo(0.25);
    expect(s.get("b")).toBeCloseTo(0.1875);
  });

  it("scores text by its letters and pairs", () => {
    const h = emptyHistory();
    for (const c of "abcdefghijklmnopqrstuvwxyz") h.letters[c] = record(solid);
    h.letters.q = record(shaky);
    expect(textNeed("quiet", h, o)).toBeGreaterThan(textNeed("sad dad", h, o));
  });
});

describe("pickWeighted", () => {
  it("follows the weights and skips what it's told to", () => {
    const random = seededRandom(5);
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 3000; i++) counts[pickWeighted(["a", "b", "c"], (x) => (x === "a" ? 2 : 1), random, (x) => x === "c")!]++;
    expect(counts.c).toBe(0);
    expect(counts.a / counts.b).toBeGreaterThan(1.7);
    expect(counts.a / counts.b).toBeLessThan(2.3);
    expect(pickWeighted(["c"], () => 1, random, () => true)).toBe("c");
    expect(pickWeighted([], () => 1)).toBeNull();
  });
});

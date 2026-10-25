import { describe, expect, it } from "vitest";
import { fingerSummaries, weakestFinger } from "../../src/shared/hands";
import { emptyHistory, type Outcome } from "../../src/shared/history";

const record = (recent: Outcome[]) => ({ seen: recent.length, hits: 0, misses: 0, fumbles: 0, recent, last: 0 });

describe("hands", () => {
  it("rolls letters up into fingers and finds the one that stands out", () => {
    const h = emptyHistory();
    h.letters.f = record(Array(10).fill([1, 1]));
    h.letters.j = record(Array(10).fill([1, 1]));
    h.letters.a = record(Array.from({ length: 10 }, (_, i) => [i % 2 ? 1 : 0, 1] as Outcome));
    const left = fingerSummaries(h).find((s) => s.finger === "leftIndex")!;
    expect(left).toMatchObject({ tries: 10, accuracy: 1 });
    expect(weakestFinger(h)).toBe("leftPinky");
  });
});

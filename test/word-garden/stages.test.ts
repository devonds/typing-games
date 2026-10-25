import { describe, expect, it } from "vitest";
import { emptyHistory, type History } from "../../src/shared/history";
import { STAGES } from "../../src/shared/path";
import { MARKS } from "../../src/word-garden/config";
import { NO_MARKS, advanceMarks, capitalsReady, lettersDone, rulesFor } from "../../src/word-garden/game/stages";

const LAST = { stage: STAGES.length - 1 };
const right = (n: number): (0 | 1)[] => Array(n).fill(1);

function masteredHistory(except = ""): History {
  const h = emptyHistory();
  for (const k of STAGES.join("")) {
    const ok = except.includes(k) ? 0 : 1;
    h.letters[k] = { seen: 20, hits: 20, misses: 0, fumbles: 0, recent: Array(15).fill([ok, 1]), last: 1 };
  }
  return h;
}

describe("capitals and punctuation stages", () => {
  it("start once the Learn path is finished and every letter mastered", () => {
    expect(lettersDone(LAST, masteredHistory(), true)).toBe(true);
    expect(lettersDone(LAST, masteredHistory("q"), true)).toBe(false);
    expect(lettersDone({ stage: 5 }, masteredHistory(), true)).toBe(false);
    expect(advanceMarks(NO_MARKS, [], false, false).unlocked).toBeNull();
    const { record, unlocked } = advanceMarks(NO_MARKS, [], true, false);
    expect(unlocked).toBe("capitals");
    expect(rulesFor(record, false)).toEqual({ capitals: true, punctuation: false });
  });

  it("stay on once unlocked, even if a letter slips later", () => {
    const on = { ...NO_MARKS, capitals: true };
    expect(advanceMarks(on, [1], false, false).record.capitals).toBe(true);
  });

  it("add punctuation after enough capitals, right often enough", () => {
    const on = { ...NO_MARKS, capitals: true };
    expect(advanceMarks(on, right(MARKS.capitals - 1), true, false).unlocked).toBeNull();
    const shaky: (0 | 1)[] = [...right(MARKS.capitals - 5), 0, 0, 0, 0, 0];
    expect(capitalsReady(shaky)).toBe(false);
    const { record, unlocked } = advanceMarks(on, right(MARKS.capitals), true, false);
    expect(unlocked).toBe("punctuation");
    expect(rulesFor(record, false)).toEqual({ capitals: true, punctuation: true });
    // Only the most recent capitals are kept.
    expect(advanceMarks(record, right(100), true, false).record.recent).toHaveLength(MARKS.capitals);
  });

  it("never apply to little hands", () => {
    expect(advanceMarks(NO_MARKS, right(50), true, true).unlocked).toBeNull();
    expect(rulesFor({ capitals: true, punctuation: true, recent: [] }, true)).toEqual({ capitals: false, punctuation: false });
  });
});

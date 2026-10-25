import { describe, expect, it } from "vitest";
import { Guide } from "../../src/shared/guide";
import { KEYS, keyFor } from "../../src/shared/keyboard";
import { Ritual } from "../../src/shared/ritual";

const frame = (keys: string[], held: string[] = []) => ({ keys, caps: keys.map(() => false), clicks: [], held: new Set(held) });

describe("keyboard", () => {
  it("has every letter once, plus the space bar", () => {
    const letters = KEYS.filter((k) => /^[a-z]$/.test(k.key)).map((k) => k.key);
    expect(letters.sort().join("")).toBe("abcdefghijklmnopqrstuvwxyz");
    expect(keyFor(" ")?.finger).toBe("thumb");
  });

  it("puts the fingers on the usual keys", () => {
    expect(keyFor("f")).toMatchObject({ finger: "leftIndex", home: true, bump: true });
    expect(keyFor("g")).toMatchObject({ finger: "leftIndex", home: false });
    expect(keyFor("J")).toMatchObject({ finger: "rightIndex", bump: true });
    expect(keyFor("q")?.finger).toBe("leftPinky");
    expect(keyFor("p")?.finger).toBe("rightPinky");
    expect(keyFor("b")?.finger).toBe("leftIndex");
    expect(keyFor("n")?.finger).toBe("rightIndex");
  });
});

describe("Guide", () => {
  it("lights the target and flashes the right key after a slip", () => {
    const guide = new Guide("automatic");
    guide.setTarget("K");
    expect(guide.view()).toMatchObject({ visible: true, target: "k", targetFinger: "rightMiddle", flashKey: null });
    guide.slip("k");
    expect(guide.view()).toMatchObject({ flashKey: "k", flash: 1 });
    guide.update(5);
    expect(guide.view().flashKey).toBeNull();
  });

  it("shows nothing when switched off", () => {
    const guide = new Guide("off");
    guide.setTarget("a");
    guide.slip("a");
    expect(guide.view()).toMatchObject({ visible: false, target: null, flashKey: null });
  });
});

describe("Ritual", () => {
  it("starts once F and J are held together for a moment", () => {
    const ritual = new Ritual();
    expect(ritual.update(0.1, frame(["f"], ["f"])).done).toBe(false);
    expect(ritual.update(0.1, frame(["j"], ["f", "j"]))).toMatchObject({ f: true, j: true, done: false });
    expect(ritual.update(0.5, frame([], ["f", "j"])).done).toBe(true);
  });

  it("resets if a finger lifts", () => {
    const ritual = new Ritual();
    ritual.update(0.3, frame([], ["f", "j"]));
    ritual.update(0.1, frame([], ["f"]));
    expect(ritual.update(0.1, frame([], ["f", "j"])).done).toBe(false);
  });

  it("lets little hands press F and then J", () => {
    const ritual = new Ritual(true);
    ritual.update(0.1, frame(["j"]));
    expect(ritual.update(0.1, frame(["f"])).j).toBe(false);
    ritual.update(0.1, frame(["j"]));
    expect(ritual.update(0.5, frame([])).done).toBe(true);
  });
});

describe("capitals and punctuation", () => {
  it("knows the apostrophe, the question mark, and which Shift to use", async () => {
    const { keyFor, shiftFor } = await import("../../src/shared/keyboard");
    expect(keyFor("'")?.finger).toBe("rightPinky");
    expect(keyFor("?")?.key).toBe("/");
    expect(shiftFor("A")?.key).toBe("shiftRight");
    expect(shiftFor("J")?.key).toBe("shiftLeft");
  });
});

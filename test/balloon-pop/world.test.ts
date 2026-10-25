import { describe, expect, it } from "vitest";
import { BALLOON_RADIUS, ESCAPE_COST, FIZZLE_SECONDS, LITTLE_HANDS, LIVES, MAX_WIDE, POINTS_PER_POP, SPACING, WORD_BONUS, balloonHalfWidth } from "../../src/balloon-pop/config";
import type { GameEvent } from "../../src/balloon-pop/game/types";
import { World, type WorldOptions } from "../../src/balloon-pop/game/world";
import { seededRandom } from "../../src/shared/rng";

/** Even weights over some letters. */
function practice(letters: string, weights?: Record<string, number>): WorldOptions["practice"] {
  const keys = [...letters];
  return { keys, weights: new Map(keys.map((k) => [k, weights?.[k] ?? 1 / keys.length])) };
}

function makeWorld(overrides: Partial<WorldOptions> = {}): World {
  return new World({ practice: practice("asdf"), difficulty: "easy", speedMode: "steady", random: seededRandom(1), ...overrides });
}

/** Balloons carry these, in order (skipping any whose first letter is in the air). */
function script(...texts: string[]): WorldOptions["pick"] {
  const queue = [...texts];
  return (inUse) => {
    const i = queue.findIndex((t) => !inUse.has(t[0]));
    return i < 0 ? null : queue.splice(i, 1)[0];
  };
}

/** Step in 1/60 s ticks; optionally type every balloon as it appears (a perfect typist). */
function run(world: World, seconds: number, perfect = false): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    events.push(...world.step(1 / 60));
    if (perfect) for (const b of [...world.balloons]) for (const c of b.text.slice(b.typed)) events.push(...world.press(c));
  }
  return events;
}

const typeAll = (world: World, text: string): GameEvent[] => [...text].flatMap((c) => world.press(c));

describe("World", () => {
  it("launches from the first cannon after its first-shot delay", () => {
    const world = makeWorld();
    expect(run(world, 0.4).some((e) => e.type === "launched")).toBe(false);
    expect(run(world, 0.2).filter((e) => e.type === "launched")).toHaveLength(1);
    expect(world.balloons).toHaveLength(1);
  });

  it("pops a balloon when its letter is typed", () => {
    const world = makeWorld({ practice: practice("a") });
    run(world, 0.6);
    const balloon = world.balloons[0];
    const events = world.press("a");
    expect(events.map((e) => e.type)).toEqual(["letter", "popped"]);
    expect(events[1]).toMatchObject({ balloon, points: POINTS_PER_POP });
    expect(world.score).toBe(POINTS_PER_POP);
    expect(world.balloons).toHaveLength(0);
  });

  it("does not take points for a wrong key, but reports what was expected", () => {
    const world = makeWorld({ practice: practice("a") });
    run(world, 0.6);
    world.press("a");
    run(world, 0.5);
    const scoreBefore = world.score;
    const [event] = world.press("z");
    expect(event).toEqual({ type: "wrongKey", key: "z", expected: world.balloons[0]?.text ?? null });
    expect(world.score).toBe(scoreBefore);
    expect(world.wrongKeys).toBe(1);
  });

  it("loses a life per escaped balloon and ends at zero", () => {
    const world = makeWorld();
    const events = run(world, 120);
    expect(events.filter((e) => e.type === "escaped")).toHaveLength(LIVES);
    expect(events.at(-1)).toEqual({ type: "gameOver" });
    expect(world.over).toBe(true);
    expect(world.step(1)).toEqual([]);
    expect(world.press("a")).toEqual([]);
  });

  it("speeds up over time in ramp mode", () => {
    const world = makeWorld({ speedMode: "ramp" });
    const events = run(world, 41, true);
    expect(events.filter((e) => e.type === "speedUp")).toEqual([
      { type: "speedUp", level: 1 },
      { type: "speedUp", level: 2 },
    ]);
    expect(world.speedMultiplier).toBeCloseTo(1.2);
    expect(world.intervalMultiplier).toBeLessThan(1);
  });

  it("never speeds up in steady mode", () => {
    const world = makeWorld({ speedMode: "steady" });
    const events = run(world, 41, true);
    expect(events.some((e) => e.type === "speedUp")).toBe(false);
    expect(world.speedMultiplier).toBe(1);
  });

  it("never puts the same first letter in the air twice, and waits when there's nothing new", () => {
    const world = makeWorld({ practice: practice("ab"), difficulty: "hard" });
    run(world, 5); // plenty of cannons have fired
    const firsts = world.balloons.map((b) => b.text[0]);
    expect(firsts.length).toBe(2);
    expect(new Set(firsts).size).toBe(2);
  });

  it("picks letters by their weights", () => {
    const world = makeWorld({ practice: practice("ab", { a: 0.95, b: 0.05 }), difficulty: "hard" });
    const counts = { a: 0, b: 0 };
    for (const e of run(world, 120, true)) if (e.type === "launched") counts[e.balloon.text as "a" | "b"] += 1;
    expect(counts.a).toBeGreaterThan(counts.b * 3);
  });

  it("times a pop from when the balloon became the oldest, not from its launch", () => {
    const world = makeWorld({ practice: practice("ab"), difficulty: "hard" });
    run(world, 1.2); // two balloons up: the first at 0.5 s, the second at 1 s
    const [first, second] = world.balloons;
    run(world, 2);
    world.press(first.text);
    run(world, 0.5);
    const [event] = world.press(second.text);
    expect(event.type === "letter" && event.seconds).toBeCloseTo(0.5, 1);
  });

  it("slows balloons by their pace", () => {
    const slow = makeWorld({ pace: () => 0.5 });
    const fast = makeWorld();
    run(slow, 5);
    run(fast, 5);
    expect(slow.balloons[0].y).toBeGreaterThan(fast.balloons[0].y);
  });

  it("fizzles a wrongly pressed key for a moment", () => {
    const world = makeWorld({ practice: practice("a") });
    run(world, 0.6); // an "a" balloon is up
    expect(world.press("b")[0].type).toBe("wrongKey");
    world.step(0.1);
    expect(world.press("b")).toEqual([{ type: "fizzled", key: "b" }]);
    expect(world.wrongKeys).toBe(1);
    world.step(FIZZLE_SECONDS);
    expect(world.press("b")[0].type).toBe("wrongKey");
  });

  it("a fizzling key can't pop its balloon until the moment passes", () => {
    const world = makeWorld({ practice: practice("ab"), difficulty: "hard" });
    run(world, 0.6); // one balloon up; the other letter comes next, at 1 s
    const missing = world.balloons[0].text === "a" ? "b" : "a";
    expect(world.press(missing)[0].type).toBe("wrongKey");
    run(world, 0.45);
    expect(world.balloons.map((b) => b.text)).toContain(missing);
    expect(world.press(missing)[0].type).toBe("fizzled");
    run(world, 0.1);
    expect(world.press(missing)[0].type).toBe("letter");
  });

  describe("pairs and words", () => {
    it("locks onto a word with its first letter and pops it on the last", () => {
      const world = makeWorld({ pick: script("sad", "f"), difficulty: "hard" });
      run(world, 1.2); // "sad" and "f" are up
      const word = world.balloons.find((b) => b.text === "sad")!;
      expect(world.press("s").map((e) => e.type)).toEqual(["letter"]);
      expect(world.locked).toBe(word);
      expect(world.wanted).toBe("a");
      world.step(0.3);
      const a = world.press("a");
      expect(a[0]).toMatchObject({ type: "letter", letter: "a", index: 1, ok: true });
      expect(a[0].type === "letter" && a[0].seconds).toBeCloseTo(0.3, 1);
      const d = world.press("d");
      expect(d.map((e) => e.type)).toEqual(["letter", "popped"]);
      expect(d[1]).toMatchObject({ points: POINTS_PER_POP * 3 + WORD_BONUS });
      expect(world.locked).toBeNull();
      expect(world.wanted).toBe("f");
    });

    it("a wrong key while locked is a fumble on the wanted letter, and the lock stays", () => {
      const world = makeWorld({ pick: script("sad", "f"), difficulty: "hard" });
      run(world, 1.2);
      world.press("s");
      const locked = world.locked;
      expect(world.press("f")).toEqual([{ type: "wrongKey", key: "f", expected: "a" }]);
      expect(world.locked).toBe(locked);
      const [a] = world.press("a");
      expect(a).toMatchObject({ type: "letter", ok: false });
      expect(world.firstTime).toBe(1); // just the "s"
    });

    it("releases the lock when the word escapes, and it costs a life", () => {
      const world = makeWorld({ pick: script("sad") });
      run(world, 0.6);
      world.press("s");
      expect(world.locked).not.toBeNull();
      const events = run(world, 60);
      const escaped = events.find((e) => e.type === "escaped");
      expect(escaped).toMatchObject({ balloon: { text: "sad", typed: 1 } });
      expect(world.locked).toBeNull();
      expect(world.lives).toBe(LIVES - 1);
    });
  });

  describe("spacing", () => {
    it("eases overlapping balloons apart sideways, softly", () => {
      const world = makeWorld({ pick: script("sad", "f"), difficulty: "hard" });
      run(world, 1.2);
      const [a, b] = world.balloons;
      a.x = b.x = 128;
      a.y = b.y = 60;
      world.step(1 / 60);
      expect(Math.abs(a.x - b.x)).toBeLessThan(1); // a gentle start, no jump
      run(world, 3);
      expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(balloonHalfWidth(a.text) + balloonHalfWidth(b.text) + SPACING.gap - 1);
    });

    it("slows a balloon with another just above it", () => {
      const rise = (crowded: boolean) => {
        const world = makeWorld({ pick: script("a", "s"), difficulty: "hard" });
        run(world, 1.2);
        const [top, below] = world.balloons;
        for (const b of [top, below]) Object.assign(b, { x: 128, vx: 0, vy: -7 });
        top.y = crowded ? 70 : 20;
        below.y = 70 + BALLOON_RADIUS;
        top.x = crowded ? 128 : 40;
        const before = below.y;
        run(world, 0.5);
        return before - below.y;
      };
      expect(rise(true)).toBeLessThan(rise(false));
    });
  });

  it("fires single letters once MAX_WIDE pairs and words are up", () => {
    const asked: boolean[] = [];
    const words = ["sad", "dad", "lad", "fad", "gag"];
    const world = makeWorld({
      difficulty: "hard",
      pick: (inUse, _random, lettersOnly) => {
        asked.push(lettersOnly);
        if (lettersOnly) return "jkl".split("").find((c) => !inUse.has(c)) ?? null;
        return words.find((w) => !inUse.has(w[0])) ?? null;
      },
    });
    run(world, 3);
    expect(world.balloons.filter((b) => b.text.length > 1)).toHaveLength(MAX_WIDE);
    expect(asked.filter((x) => x).length).toBeGreaterThan(0);
  });

  describe("timed rounds", () => {
    it("end on time, and escapes cost points instead of lives", () => {
      const world = makeWorld({ seconds: 60 });
      run(world, 3, true);
      const score = world.score;
      const events = run(world, 80);
      const escapes = events.filter((e) => e.type === "escaped");
      expect(escapes.length).toBeGreaterThan(0);
      expect(world.lives).toBe(LIVES);
      expect(world.score).toBe(Math.max(0, score - escapes.length * ESCAPE_COST));
      expect(events.at(-1)).toEqual({ type: "timeUp" });
      expect(world.time).toBeCloseTo(60, 1);
    });
  });

  describe("little hands", () => {
    const little = (overrides: Partial<WorldOptions> = {}) => makeWorld({ littleHands: true, speedMode: "ramp", ...overrides });

    it("never loses a balloon: they wait near the top", () => {
      const world = little();
      const events = run(world, 120);
      expect(events.some((e) => e.type === "escaped" || e.type === "gameOver" || e.type === "speedUp")).toBe(false);
      expect(world.lives).toBe(LIVES);
      expect(world.balloons.length).toBeLessThanOrEqual(LITTLE_HANDS.maxInAir);
      for (const b of world.balloons) expect(b.y).toBeGreaterThanOrEqual(LITTLE_HANDS.hoverY);
    });

    it("doesn't fizzle wrong keys", () => {
      const world = little({ practice: practice("a") });
      run(world, 0.6);
      world.press("b");
      expect(world.press("b")[0].type).toBe("wrongKey");
    });

    it("finishes after a fixed number of balloons, and ignores a time limit", () => {
      const world = little({ seconds: 30 });
      const events = run(world, 600, true);
      expect(events.filter((e) => e.type === "launched")).toHaveLength(LITTLE_HANDS.balloons);
      expect(events.at(-1)).toEqual({ type: "finished" });
      expect(world.over).toBe(true);
    });
  });

  it("counts letters right first time", () => {
    const world = makeWorld({ practice: practice("a") });
    run(world, 0.6);
    world.press("b");
    world.step(FIZZLE_SECONDS + 0.1);
    typeAll(world, "a");
    expect(world.letters).toBe(1);
    expect(world.firstTime).toBe(0);
  });
});

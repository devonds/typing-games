import { describe, expect, it } from "vitest";
import { COMBO, FREEZE, LIVES, POINTS_PER_SLICE, WAVE } from "../../src/fresh-cuts/config";
import { recordEvent } from "../../src/fresh-cuts/game/stats";
import type { GameEvent } from "../../src/fresh-cuts/game/types";
import { World, type WorldOptions } from "../../src/fresh-cuts/game/world";
import type { Stats } from "../../src/shared/letters";
import { seededRandom } from "../../src/shared/rng";

function makeWorld(overrides: Partial<WorldOptions> = {}): World {
  return new World({ letters: [..."asdfghjkl"], difficulty: "easy", speedMode: "steady", rotten: false, random: seededRandom(3), ...overrides });
}

/** Step in 1/60 s ticks. A perfect typist slices every fresh fruit as soon as it appears. */
function run(world: World, seconds: number, perfect = false): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    events.push(...world.step(1 / 60));
    if (perfect) for (const f of world.fruit.filter((f) => !f.rotten)) events.push(...world.press(f.letter));
  }
  return events;
}

const ofType = <T extends GameEvent["type"]>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

describe("World", () => {
  it("throws the first wave after a short pause", () => {
    const world = makeWorld();
    expect(ofType(run(world, WAVE.firstAt - 0.1), "launched")).toHaveLength(0);
    expect(ofType(run(world, 0.2), "launched").length).toBeGreaterThan(0);
  });

  it("never has the same letter on two pieces of fruit", () => {
    const world = makeWorld({ difficulty: "hard", letters: [..."asdf"] });
    for (let i = 0; i < 60 * 60; i++) {
      world.step(1 / 60);
      const letters = world.fruit.map((f) => f.letter);
      expect(new Set(letters).size).toBe(letters.length);
    }
  });

  it("slices fruit for points, and a wrong key costs nothing", () => {
    const world = makeWorld();
    run(world, WAVE.firstAt + 0.1);
    const fruit = world.fruit[0];
    const wrong = world.press("z");
    expect(wrong).toEqual([{ type: "wrongKey", key: "z", expected: fruit.letter }]);
    expect(world.score).toBe(0);
    const [sliced] = world.press(fruit.letter);
    expect(sliced.type).toBe("sliced");
    expect(world.score).toBe(POINTS_PER_SLICE);
    expect(world.fruit).not.toContain(fruit);
  });

  it("takes a basket for each fruit that falls, and ends when they're gone", () => {
    const world = makeWorld();
    const events = run(world, 120);
    expect(ofType(events, "dropped")).toHaveLength(LIVES);
    expect(ofType(events, "gameOver")).toHaveLength(1);
    expect(world.over).toBe(true);
    expect(world.step(1)).toEqual([]);
  });

  it("goes on for as long as you keep slicing", () => {
    const world = makeWorld({ difficulty: "hard", speedMode: "ramp" });
    const events = run(world, 180, true);
    expect(world.over).toBe(false);
    expect(world.lives).toBe(LIVES);
    expect(ofType(events, "speedUp").length).toBeGreaterThan(5);
    expect(world.speedMultiplier).toBeGreaterThan(1);
  });

  it("pays a combo bonus for quick slices in a row", () => {
    const world = makeWorld({ difficulty: "hard" });
    let events = run(world, WAVE.firstAt + 3 * WAVE.spacing[1] + 0.1);
    expect(world.fruit.length).toBeGreaterThanOrEqual(3);
    for (const f of [...world.fruit]) events = events.concat(world.press(f.letter));
    const chain = world.combo;
    expect(chain).toBe(ofType(events, "sliced").length);
    events = run(world, COMBO.window + 0.05);
    expect(ofType(events, "comboEnd")).toEqual([{ type: "comboEnd", chain, bonus: chain * COMBO.bonusPerFruit }]);
  });

  it("only throws rotten fruit when it's switched on, and slicing it costs a basket", () => {
    expect(run(makeWorld(), 300, true).some((e) => e.type === "launched" && e.fruit.rotten)).toBe(false);

    const world = makeWorld({ rotten: true });
    let rotten;
    for (let i = 0; i < 60 * 300 && !rotten; i++) {
      world.step(1 / 60);
      rotten = world.fruit.find((f) => f.rotten);
      for (const f of world.fruit.filter((f) => !f.rotten)) world.press(f.letter);
    }
    expect(rotten).toBeDefined();
    const lives = world.lives;
    expect(world.press(rotten!.letter)[0].type).toBe("rottenSliced");
    expect(world.lives).toBe(lives - 1);
  });

  it("lets rotten fruit fall without losing a basket", () => {
    const world = makeWorld({ rotten: true });
    run(world, 600, true);
    expect(world.lives).toBe(LIVES);
  });

  it("slows everything down for a while after slicing a frozen fruit", () => {
    const world = makeWorld();
    let frozen;
    for (let i = 0; i < 60 * 300 && !frozen; i++) {
      world.step(1 / 60);
      frozen = world.fruit.find((f) => f.frozen);
      for (const f of world.fruit.filter((f) => !f.frozen)) world.press(f.letter);
    }
    expect(frozen).toBeDefined();
    const events = world.press(frozen!.letter);
    expect(events.map((e) => e.type)).toEqual(["sliced", "freeze"]);
    expect(world.score).toBeGreaterThan(0);
    expect(world.timeScale).toBe(FREEZE.speed);

    // Fruit moves at FREEZE.speed of its normal pace.
    run(world, 2, true);
    world.press("z"); // nothing
    const before = world.fruit.map((f) => ({ ...f }));
    world.step(1 / 60);
    for (const f of world.fruit) {
      const was = before.find((b) => b.id === f.id);
      if (was) expect(f.y - was.y).toBeCloseTo((was.vy + was.gravity * (FREEZE.speed / 60)) * (FREEZE.speed / 60), 6);
    }

    const rest = run(world, FREEZE.seconds, true);
    expect(rest.filter((e) => e.type === "thaw")).toHaveLength(1);
    expect(world.timeScale).toBe(1);
  });

  it("throws a burst of fresh fruit to slice in slow motion, bigger when the game is faster", () => {
    const sizes: number[] = [];
    for (const difficulty of ["easy", "hard"] as const) {
      const world = makeWorld({ difficulty, letters: [..."abcdefghijklmnopqrstuvwxyz"] });
      let frozen;
      for (let i = 0; i < 60 * 300 && !frozen; i++) {
        world.step(1 / 60);
        frozen = world.fruit.find((f) => f.frozen);
        for (const f of world.fruit.filter((f) => !f.frozen)) world.press(f.letter);
      }
      expect(frozen).toBeDefined();
      for (const f of world.fruit.filter((f) => !f.frozen)) world.press(f.letter);
      world.press(frozen!.letter);
      // The whole burst is up within a second, while everything is still slowed down.
      const launched = ofType(run(world, 1), "launched");
      expect(launched.length).toBeGreaterThanOrEqual(world.burstSize);
      expect(launched.every((e) => !e.fruit.frozen && !e.fruit.rotten)).toBe(true);
      expect(world.freezeLeft).toBeGreaterThan(0);
      sizes.push(world.burstSize);
    }
    expect(sizes[0]).toBe(FREEZE.burst[0]);
    expect(sizes[1]).toBeGreaterThan(sizes[0]);
    expect(sizes[1]).toBeLessThanOrEqual(FREEZE.burst[1]);
  });

  it("lets frozen fruit fall without losing a basket, and leaves it out of the letter history", () => {
    const stats: Stats = {};
    const world = makeWorld();
    let frozenThrown = 0;
    for (let i = 0; i < 60 * 600; i++) {
      for (const e of world.step(1 / 60)) {
        recordEvent(stats, e);
        if (e.type === "launched" && e.fruit.frozen) frozenThrown += 1;
      }
      for (const f of world.fruit.filter((f) => !f.frozen)) for (const e of world.press(f.letter)) recordEvent(stats, e);
    }
    expect(frozenThrown).toBeGreaterThan(0);
    expect(world.lives).toBe(LIVES);
    const seen = Object.values(stats).reduce((n, s) => n + s.seen, 0);
    const hit = Object.values(stats).reduce((n, s) => n + s.hit, 0);
    expect(seen).toBe(hit);
  });

  it("feeds the letter history, leaving rotten fruit out", () => {
    const stats: Stats = {};
    const world = makeWorld({ rotten: true });
    for (const e of run(world, 120)) recordEvent(stats, e);
    const seen = Object.values(stats).reduce((n, s) => n + s.seen, 0);
    const missed = Object.values(stats).reduce((n, s) => n + s.missed, 0);
    expect(missed).toBe(LIVES);
    expect(seen).toBeGreaterThanOrEqual(missed);
  });
});

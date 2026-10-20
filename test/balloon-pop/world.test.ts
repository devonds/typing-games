import { describe, expect, it } from "vitest";
import { LIVES, POINTS_PER_POP } from "../../src/balloon-pop/config";
import type { GameEvent } from "../../src/balloon-pop/game/types";
import { World, type WorldOptions } from "../../src/balloon-pop/game/world";
import { seededRandom } from "../../src/shared/rng";

function makeWorld(overrides: Partial<WorldOptions> = {}): World {
  return new World({ letters: [..."asdf"], difficulty: "easy", speedMode: "steady", random: seededRandom(1), ...overrides });
}

/** Step in 1/60 s ticks; optionally pop every balloon as it appears (a perfect typist). */
function run(world: World, seconds: number, perfect = false): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    events.push(...world.step(1 / 60));
    if (perfect) for (const b of [...world.balloons]) events.push(...world.press(b.letter));
  }
  return events;
}

describe("World", () => {
  it("launches from the first cannon after its first-shot delay", () => {
    const world = makeWorld();
    expect(run(world, 0.4).some((e) => e.type === "launched")).toBe(false);
    expect(run(world, 0.2).filter((e) => e.type === "launched")).toHaveLength(1);
    expect(world.balloons).toHaveLength(1);
  });

  it("pops the oldest balloon with the typed letter", () => {
    const world = makeWorld({ letters: ["a"], difficulty: "hard" });
    run(world, 1.2); // cannons with first shots at 0.5 s and 1 s have fired
    expect(world.balloons.length).toBeGreaterThanOrEqual(2);
    const oldest = world.balloons[0];
    const [event] = world.press("a");
    expect(event).toMatchObject({ type: "popped", balloon: oldest });
    expect(world.score).toBe(POINTS_PER_POP);
    expect(world.balloons).not.toContain(oldest);
  });

  it("does not take points for a wrong key, but reports what was expected", () => {
    const world = makeWorld({ letters: ["a"] });
    run(world, 0.6);
    world.press("a");
    run(world, 0.5);
    const scoreBefore = world.score;
    const [event] = world.press("z");
    expect(event).toEqual({ type: "wrongKey", key: "z", expected: world.balloons[0]?.letter ?? null });
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

  it("avoids putting the same letter in the air twice", () => {
    const world = makeWorld({ letters: ["a", "b", "c"], difficulty: "hard" });
    run(world, 1.6); // three cannons have fired
    const letters = world.balloons.map((b) => b.letter);
    expect(letters.length).toBe(3);
    expect(new Set(letters).size).toBe(3);
  });
});

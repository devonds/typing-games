import { describe, expect, it } from "vitest";
import { COMBO, DIFFICULTIES, FIZZLE_SECONDS, FREEZE, LITTLE_HANDS, LIVES, POINTS_PER_SLICE, SEQUENCE_BONUS, TIMED, WAVE } from "../../src/fresh-cuts/config";
import { logEvent } from "../../src/fresh-cuts/game/stats";
import type { GameEvent } from "../../src/fresh-cuts/game/types";
import { World, type WorldOptions } from "../../src/fresh-cuts/game/world";
import { RoundLog, emptyHistory, type History } from "../../src/shared/history";
import { seededRandom } from "../../src/shared/rng";

function makeWorld(overrides: Partial<WorldOptions> = {}): World {
  return new World({ keys: [..."asdfghjkl"], difficulty: "easy", speedMode: "steady", rotten: false, random: seededRandom(3), ...overrides });
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

/** What a log adds up to, as the shared history would record it. */
const merged = (log: RoundLog): History => log.mergeInto(emptyHistory(), 0);
const total = (h: History, field: "seen" | "hits" | "misses") => Object.values(h.letters).reduce((n, r) => n + r[field], 0);

const ofType = <T extends GameEvent["type"]>(events: GameEvent[], type: T) =>
  events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

describe("World", () => {
  it("throws the first wave after a short pause", () => {
    const world = makeWorld();
    expect(ofType(run(world, WAVE.firstAt - 0.1), "launched")).toHaveLength(0);
    expect(ofType(run(world, 0.2), "launched").length).toBeGreaterThan(0);
  });

  it("never has the same letter on two pieces of fruit", () => {
    const world = makeWorld({ difficulty: "hard", keys: [..."asdf"] });
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
    const sliced = world.press(fruit.letter).at(-1)!;
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

  it("points the finger guide at the oldest fruit worth slicing, skipping rotten and frozen ones", () => {
    const world = makeWorld({ rotten: true });
    expect(world.target).toBeNull();
    for (let i = 0; i < 60 * 300; i++) {
      world.step(1 / 60);
      const wanted = world.fruit.find((f) => !f.rotten && !f.frozen);
      expect(world.target).toBe(wanted?.letter ?? null);
      // Slice everything but the rotten and frozen ones, so they're sometimes first in line.
      if (i % 30 === 0 && wanted) world.press(wanted.letter);
    }
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
    expect(world.press(rotten!.letter).at(-1)!.type).toBe("rottenSliced");
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
    expect(events.map((e) => e.type)).toEqual(["typed", "sliced", "freeze"]);
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
      const world = makeWorld({ difficulty, keys: [..."abcdefghijklmnopqrstuvwxyz"] });
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
    const log = new RoundLog();
    const world = makeWorld();
    let frozenThrown = 0;
    let sliced = 0;
    for (let i = 0; i < 60 * 600; i++) {
      for (const e of world.step(1 / 60)) {
        logEvent(log, e);
        if (e.type === "launched" && e.fruit.frozen) frozenThrown += 1;
      }
      for (const f of world.fruit.filter((f) => !f.frozen)) {
        for (const e of world.press(f.letter)) {
          logEvent(log, e);
          if (e.type === "sliced") sliced += 1;
        }
      }
    }
    expect(frozenThrown).toBeGreaterThan(0);
    expect(world.lives).toBe(LIVES);
    const h = merged(log);
    expect(total(h, "misses")).toBe(0);
    expect(total(h, "hits")).toBe(sliced);
  });

  it("feeds the letter history, leaving rotten fruit out", () => {
    const log = new RoundLog();
    const world = makeWorld({ rotten: true });
    for (const e of run(world, 120)) logEvent(log, e);
    const h = merged(log);
    expect(total(h, "misses")).toBe(LIVES);
    expect(total(h, "seen")).toBe(total(h, "misses"));
  });

  it("logs a wrong key as a fumble for the letter that was wanted", () => {
    const log = new RoundLog();
    const world = makeWorld();
    run(world, WAVE.firstAt + 0.1);
    const wanted = world.target!;
    for (const e of world.press("z")) logEvent(log, e);
    expect(merged(log).letters[wanted].fumbles).toBe(1);
    expect(log.tricky()).toEqual([wanted]);
  });

  it("picks letters by need: a heavily weighted key comes up far more often", () => {
    const weights = new Map([..."asdfghjkl"].map((k) => [k, k === "j" ? 0.6 : 0.05]));
    const world = makeWorld({ weights });
    const counts: Record<string, number> = {};
    for (const e of run(world, 600, true)) if (e.type === "launched" && !e.fruit.frozen) counts[e.fruit.letter] = (counts[e.fruit.letter] ?? 0) + 1;
    const others = Object.entries(counts).filter(([k]) => k !== "j").map(([, n]) => n);
    expect(counts.j).toBeGreaterThan(3 * Math.max(...others));
  });

  it("times a reaction from when the fruit became the one to type, not from its throw", () => {
    const world = makeWorld({ difficulty: "hard", keys: [..."asdfghjkl"] });
    // Wait until two fresh fruit are up, slice the second one later than the first.
    while (world.fruit.filter((f) => !f.frozen && !f.rotten).length < 2) world.step(1 / 60);
    const [first, second] = world.fruit.filter((f) => !f.frozen && !f.rotten);
    run(world, 0.5);
    world.press(first.letter);
    run(world, 0.25);
    const sliced = world.press(second.letter).at(-1)!;
    expect(sliced.type).toBe("sliced");
    if (sliced.type === "sliced") expect(sliced.reactionTime).toBeCloseTo(0.25, 1);
    expect(world.time - second.launchedAt).toBeGreaterThan(0.6);
  });

  it("throws keys still being learned more slowly", () => {
    const slow = makeWorld({ pace: () => 0.5 });
    const fast = makeWorld();
    run(slow, WAVE.firstAt + 0.05);
    run(fast, WAVE.firstAt + 0.05);
    // The same throw (same seed) at half pace: twice the time in the air, so a quarter of the pull.
    expect(slow.fruit[0].gravity).toBeCloseTo(fast.fruit[0].gravity / 4, 5);
    const { gravity, vy } = slow.fruit[0];
    expect((-2 * vy) / gravity).toBeCloseTo(DIFFICULTIES.easy.airTime * 2, 0);
  });

  it("fizzles a wrong key for a moment, so mashing doesn't slice", () => {
    const world = makeWorld();
    run(world, WAVE.firstAt + 0.1);
    const fruit = world.fruit[0];
    const wrong = [..."asdfghjkl"].find((k) => !world.fruit.some((f) => f.letter === k))!;
    expect(world.press(wrong)[0].type).toBe("wrongKey");
    expect(world.press(wrong)).toEqual([{ type: "fizzled", key: wrong }]);
    expect(world.wrongKeys).toBe(1);
    expect(world.cooling.get(wrong)).toBeGreaterThan(0.9);
    // Other keys still work.
    expect(world.press(fruit.letter).at(-1)!.type).toBe("sliced");
    run(world, FIZZLE_SECONDS + 0.05);
    expect(world.cooling.has(wrong)).toBe(false);
    expect(world.press(wrong)[0].type).not.toBe("fizzled");
  });

  it("doesn't fizzle for little hands", () => {
    const world = makeWorld({ littleHands: true });
    run(world, WAVE.firstAt + 0.1);
    world.press("z");
    expect(world.press("z")[0].type).toBe("wrongKey");
  });

  describe("little hands", () => {
    it("hangs fruit at the top of its throw until it's sliced, and never takes a basket", () => {
      const world = makeWorld({ littleHands: true, rotten: true });
      run(world, 60);
      const fresh = world.fruit.filter((f) => !f.frozen);
      expect(fresh.length).toBeGreaterThan(0);
      expect(fresh.every((f) => f.hanging)).toBe(true);
      const ys = fresh.map((f) => f.y);
      run(world, 5);
      expect(fresh.map((f) => f.y)).toEqual(ys);
      expect(world.lives).toBe(LIVES);
    });

    it("throws no rotten fruit, and ends after a set number of fruit", () => {
      const world = makeWorld({ littleHands: true, rotten: true });
      const events = run(world, 600, true);
      expect(events.some((e) => e.type === "launched" && e.fruit.rotten)).toBe(false);
      const fresh = ofType(events, "launched").filter((e) => !e.fruit.frozen).length;
      expect(fresh).toBe(LITTLE_HANDS.fruit);
      expect(ofType(events, "roundDone")).toHaveLength(1);
      expect(world.over).toBe(true);
    });
  });

  describe("pairs and words", () => {
    /** Words to throw, each picked only if its first letter isn't already in the air. */
    const WORDS = ["fall", "jag", "sad", "dk", "lad", "had", "gas"];
    const pick = (inUse: ReadonlySet<string>) => WORDS.find((w) => !inUse.has(w[0])) ?? null;
    const wordWorld = (o: Partial<WorldOptions> = {}) => makeWorld({ pick, difficulty: "hard", ...o });
    /** Step until at least `n` fresh fruit are up. */
    const until = (world: World, n: number) => {
      for (let i = 0; i < 600 && world.fruit.filter((f) => !f.frozen && !f.rotten).length < n; i++) world.step(1 / 60);
    };

    it("never throws two fruit starting with the same letter", () => {
      const world = wordWorld();
      for (let i = 0; i < 60 * 120; i++) {
        world.step(1 / 60);
        const firsts = world.fruit.map((f) => f.letter[0]);
        expect(new Set(firsts).size).toBe(firsts.length);
      }
    });

    it("locks on with the first letter, then slices with the last, scoring more for a word", () => {
      const world = wordWorld();
      until(world, 2);
      const word = world.fruit.find((f) => f.letter.length > 2)!;
      const first = world.press(word.letter[0]);
      expect(first).toMatchObject([{ type: "typed", index: 0, done: false }]);
      expect(world.lockedFruit).toBe(word);
      expect(world.target).toBe(word.letter[1]);
      let events: GameEvent[] = [];
      for (const ch of word.letter.slice(1)) events = world.press(ch);
      const sliced = ofType(events, "sliced")[0];
      expect(sliced.points).toBe(Math.round(POINTS_PER_SLICE * word.letter.length * SEQUENCE_BONUS));
      expect(world.lockedFruit).toBeNull();
      expect(world.fruit).not.toContain(word);
    });

    it("keeps the lock through a wrong key, which counts as a fumble on the wanted letter", () => {
      const world = wordWorld();
      until(world, 2);
      const word = world.fruit.find((f) => f.letter.length > 2)!;
      const other = world.fruit.find((f) => f !== word)!;
      world.press(word.letter[0]);
      // Even another fruit's first letter is wrong while locked on.
      const wrong = world.press(other.letter[0]);
      expect(wrong).toEqual([{ type: "wrongKey", key: other.letter[0], expected: word.letter[1] }]);
      expect(world.lockedFruit).toBe(word);
      const next = world.press(word.letter[1]);
      expect(next[0]).toMatchObject({ type: "typed", index: 1, ok: false });
    });

    it("lets go of the lock when the word falls, and logs its untyped letters as misses", () => {
      const log = new RoundLog();
      const world = wordWorld({ difficulty: "easy" });
      until(world, 1);
      const word = world.fruit.find((f) => f.letter.length > 2)!;
      for (const e of world.press(word.letter[0])) logEvent(log, e);
      for (let i = 0; i < 60 * 10 && world.fruit.includes(word); i++) for (const e of world.step(1 / 60)) logEvent(log, e);
      expect(world.lockedFruit).toBeNull();
      const h = merged(log);
      for (const ch of word.letter.slice(1)) expect(h.letters[ch].misses).toBeGreaterThan(0);
      expect(h.letters[word.letter[0]].hits).toBe(1);
    });

    it("logs each letter as a hit and each step inside a word as a pair", () => {
      const log = new RoundLog();
      const world = wordWorld();
      until(world, 1);
      const word = world.fruit.find((f) => f.letter.length > 2)!;
      for (const ch of word.letter) for (const e of world.press(ch)) logEvent(log, e);
      const h = merged(log);
      expect(Object.keys(h.pairs).sort()).toEqual([...word.letter].slice(1).map((ch, i) => word.letter[i] + ch).sort());
    });

    it("counts letters right first time, for little hands' stars", () => {
      const world = wordWorld();
      until(world, 1);
      const word = world.fruit.find((f) => f.letter.length > 2)!;
      world.press(word.letter[0]);
      world.press("z");
      for (const ch of word.letter.slice(1)) world.press(ch);
      expect(world.lettersTyped).toBe(word.letter.length);
      expect(world.firstTry).toBe(word.letter.length - 1);
    });
  });

  describe("timed rounds", () => {
    it("ends on time, and a dropped fruit costs points instead of a basket", () => {
      const world = makeWorld({ seconds: 30 });
      const events = run(world, 31);
      expect(world.lives).toBe(LIVES);
      expect(ofType(events, "dropped").every((e) => e.penalty !== undefined)).toBe(true);
      expect(ofType(events, "timeUp")).toHaveLength(1);
      expect(world.over).toBe(true);
      expect(world.timeLeft).toBe(0);
    });

    it("takes points for a drop, never going below zero", () => {
      const world = makeWorld({ seconds: 120 });
      // Slice one, then let the rest fall.
      for (let i = 0; i < 600 && world.sliced === 0; i++) {
        world.step(1 / 60);
        if (world.target) world.press(world.target);
      }
      expect(world.score).toBe(POINTS_PER_SLICE);
      const events = run(world, 20);
      const lost = ofType(events, "dropped").reduce((n, e) => n + (e.penalty ?? 0), 0);
      expect(lost).toBe(Math.min(POINTS_PER_SLICE, TIMED.penalty * ofType(events, "dropped").length));
      expect(world.score).toBe(POINTS_PER_SLICE - lost);
    });
  });
});

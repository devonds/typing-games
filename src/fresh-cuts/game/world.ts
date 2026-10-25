// The rules of the game. No drawing and no browser APIs: just numbers in, events out.
import { pickWeighted } from "../../shared/practice";
import { press } from "../../shared/units";
import {
  COMBO,
  DIFFICULTIES,
  FIZZLE_SECONDS,
  FREEZE,
  FRUIT_KINDS,
  LAUNCH,
  LITTLE_HANDS,
  LIVES,
  POINTS_PER_SLICE,
  RAMP,
  ROTTEN,
  SEQUENCE_BONUS,
  TIMED,
  W,
  WAVE,
  type Difficulty,
  type FruitKindName,
  type SpeedMode,
} from "../config";
import type { Fruit, GameEvent } from "./types";

export interface WorldOptions {
  /** The keys in play... */
  keys: readonly string[];
  /** ...and how often each comes up (the player's need for it). Without weights, all come up equally. */
  weights?: ReadonlyMap<string, number>;
  difficulty: Difficulty;
  speedMode: SpeedMode;
  /** Throw the odd rotten apple, which shouldn't be sliced. */
  rotten: boolean;
  /** How fast fruit carrying a letter flies, 0..1 of full speed: keys still being learned come slower. Default 1. */
  pace?: (letter: string) => number;
  /** A wrong key does nothing for FIZZLE_SECONDS (default on). */
  fizzle?: boolean;
  /**
   * Little hands: no time pressure. Fresh fruit hangs at the top of its throw until it's sliced, so no basket is ever
   * lost; no rotten fruit; and the round ends once LITTLE_HANDS.fruit fresh fruit have been thrown and sliced.
   */
  littleHands?: boolean;
  /**
   * What a fresh fruit carries: a letter, pair or word whose first letter isn't in `inUse` (the first letters already
   * in the air), or null. Defaults to single letters from `keys`, weighted. Rotten and frozen fruit always carry one
   * letter.
   */
  pick?: (inUse: ReadonlySet<string>) => string | null;
  /** A timed round: it ends after this many seconds, and a dropped fruit costs points instead of a basket. */
  seconds?: number;
  /** Returns a number in [0, 1). Defaults to Math.random; tests pass a seeded one. */
  random?: () => number;
}

export class World {
  /** Seconds played. Runs at normal speed even in slow motion. */
  time = 0;
  score = 0;
  lives = LIVES;
  /** Fruit sliced right through. */
  sliced = 0;
  /** Right keys, and how many of those came with no wrong key while they were wanted. */
  lettersTyped = 0;
  firstTry = 0;
  wrongKeys = 0;
  over = false;
  wave = 0;
  /** 0 at the start; goes up every RAMP.secondsPerLevel in "ramp" mode. */
  speedLevel = 0;
  /** Fruit sliced in a row, each within COMBO.window of the last. */
  combo = 0;
  /** Seconds of slow motion left after slicing a frozen fruit. */
  freezeLeft = 0;

  private readonly live: Fruit[] = [];
  /** Throws still to come in this wave: when, and whether it's the rotten one. */
  private queue: { at: number; rotten: boolean; frozen: boolean }[] = [];
  /** The clock throws and waves run on: it slows down with everything else in slow motion. */
  private clock = 0;
  private nextWaveAt = WAVE.firstAt;
  private lastSliceAt = -Infinity;
  /** The last right key: combos chain while keys keep coming quickly, even across a long word. */
  private lastProgressAt = -Infinity;
  /** The pair or word being typed: the following keys must continue it. */
  private locked: Fruit | null = null;
  /** A wrong key came since the last right one. */
  private slipped = false;
  private readonly random: () => number;
  private kinds: FruitKindName[] = [];
  private nextId = 1;
  /** Keys that were just wrong, and when they work again. */
  private readonly fizzling = new Map<string, number>();
  /** Little hands: fresh fruit thrown so far this round. */
  private freshThrown = 0;

  constructor(private readonly options: WorldOptions) {
    if (options.keys.length === 0) throw new Error("World needs at least one key");
    this.random = options.random ?? Math.random;
  }

  /** Fruit in the air, in the order it was thrown. */
  get fruit(): readonly Fruit[] {
    return this.live;
  }

  /**
   * The letter to type next: the locked pair or word's next letter, or the first letter of the oldest fruit that
   * should be sliced (not rotten, not frozen), or null.
   */
  get target(): string | null {
    const f = this.targetFruit;
    return f ? f.letter[f.typed ?? 0] : null;
  }

  /** The pair or word being typed, if any. */
  get lockedFruit(): Fruit | null {
    return this.locked;
  }

  private get targetFruit(): Fruit | undefined {
    return this.locked ?? this.live.find((f) => !f.rotten && !f.frozen);
  }

  /** Seconds left of a timed round, or null. */
  get timeLeft(): number | null {
    return this.options.seconds === undefined ? null : Math.max(0, this.options.seconds - this.time);
  }

  /** Keys fizzling after a wrong press, each with the share of its rest still to go (1 -> 0). */
  get cooling(): Map<string, number> {
    const out = new Map<string, number>();
    for (const [key, until] of this.fizzling) if (until > this.time) out.set(key, (until - this.time) / FIZZLE_SECONDS);
    return out;
  }

  /** Little hands: how many of the round's fruit have been thrown, and how many there are. */
  get thrown(): { done: number; total: number } {
    return { done: Math.min(this.freshThrown, LITTLE_HANDS.fruit), total: LITTLE_HANDS.fruit };
  }

  private get littleHands(): boolean {
    return this.options.littleHands === true;
  }

  private get timed(): boolean {
    return this.options.seconds !== undefined;
  }

  /** How much faster than normal fruit flies right now (1 = normal). */
  get speedMultiplier(): number {
    return Math.min(1 + RAMP.speedPerLevel * this.speedLevel, RAMP.maxSpeed);
  }

  /** How fast fruit moves right now: 1 normally, FREEZE.speed in slow motion, easing back to 1 as it thaws. */
  get timeScale(): number {
    if (this.freezeLeft <= 0) return 1;
    return 1 - (1 - FREEZE.speed) * Math.min(1, this.freezeLeft / FREEZE.thaw);
  }

  /** Move time forward by dt seconds. */
  step(dt: number): GameEvent[] {
    if (this.over) return [];
    const events: GameEvent[] = [];
    this.time += dt;
    if (this.options.seconds !== undefined && this.time >= this.options.seconds) {
      this.over = true;
      this.locked = null;
      return [{ type: "timeUp" }];
    }
    // Everything that flies or gets thrown uses the slowed-down `gameDt`; the combo window and the speed-up don't.
    const gameDt = dt * this.timeScale;
    this.clock += gameDt;
    if (this.freezeLeft > 0) {
      this.freezeLeft = Math.max(0, this.freezeLeft - dt);
      if (this.freezeLeft === 0) events.push({ type: "thaw" });
    }

    if (this.options.speedMode === "ramp") {
      const level = Math.floor(this.time / RAMP.secondsPerLevel);
      if (level > this.speedLevel) {
        this.speedLevel = level;
        events.push({ type: "speedUp", level });
      }
    }

    if (this.combo > 0 && this.time - this.lastProgressAt > COMBO.window) {
      if (this.combo >= COMBO.min) {
        const bonus = this.combo * COMBO.bonusPerFruit;
        this.score += bonus;
        events.push({ type: "comboEnd", chain: this.combo, bonus });
      }
      this.combo = 0;
    }

    // A new wave once the last one is all sliced or fallen. Little hands rounds end after a set number of fruit.
    if (this.live.length === 0 && this.queue.length === 0 && this.littleHands && this.freshThrown >= LITTLE_HANDS.fruit) {
      this.over = true;
      events.push({ type: "roundDone" });
      return events;
    }
    if (this.live.length === 0 && this.queue.length === 0) {
      if (this.nextWaveAt === Infinity) this.nextWaveAt = this.clock + WAVE.gap;
      if (this.clock >= this.nextWaveAt) this.startWave();
    }
    while (this.queue.length > 0 && this.queue[0].at <= this.clock) {
      const fruit = this.launch(this.queue.shift()!);
      if (fruit) events.push({ type: "launched", fruit });
    }

    for (const f of [...this.live]) {
      if (f.hanging) {
        f.rot += f.spin * LITTLE_HANDS.hangSpin * gameDt;
        continue;
      }
      f.vy += f.gravity * gameDt;
      f.x += f.vx * gameDt;
      f.y += f.vy * gameDt;
      f.rot += f.spin * gameDt;
      if (this.littleHands && !f.frozen && f.vy >= 0) {
        // The top of the throw: wait here to be sliced.
        f.hanging = true;
        f.vx = 0;
        f.vy = 0;
        continue;
      }
      if (f.vy > 0 && f.y > LAUNCH.dropY) {
        this.remove(f);
        if (f.rotten || f.frozen) continue; // letting rotten fruit fall is the right thing to do; frozen is a bonus
        if (this.timed) {
          const penalty = Math.min(this.score, TIMED.penalty);
          this.score -= penalty;
          events.push({ type: "dropped", fruit: f, penalty });
          continue;
        }
        events.push({ type: "dropped", fruit: f });
        if (this.loseLife()) {
          events.push({ type: "gameOver" });
          break;
        }
      }
    }
    this.markTarget();
    return events;
  }

  /** Reaction times start when a fruit becomes the one to type, not when it's thrown. */
  private markTarget(): void {
    const t = this.targetFruit;
    if (t && t.targetSince === undefined) t.targetSince = this.time;
  }

  /**
   * The player pressed a letter key. The first letter of a fruit's tag "locks on" to the oldest fruit starting with
   * it; a pair or word's following keys must continue it. Wrong keys cost nothing, but fizzle for a moment.
   */
  press(key: string): GameEvent[] {
    if (this.over) return [];
    if ((this.fizzling.get(key) ?? -Infinity) > this.time) return [{ type: "fizzled", key }];
    const views = this.live.map((fruit) => ({ text: fruit.letter, typed: fruit.typed ?? 0, fruit }));
    const result = press(views, views.find((v) => v.fruit === this.locked) ?? null, key);
    if (result.kind === "wrong") {
      this.wrongKeys += 1;
      this.slipped = true;
      if (this.options.fizzle !== false && !this.littleHands) this.fizzling.set(key, this.time + FIZZLE_SECONDS);
      return [{ type: "wrongKey", key, expected: this.target }];
    }

    const { fruit } = result.target;
    // The first letter is timed from when the fruit became the target (or, sliced out of turn, from when the player
    // was last free to go for it); each following letter from the one before.
    const since = result.index === 0 ? (fruit.targetSince ?? Math.max(fruit.launchedAt, this.lastSliceAt)) : (fruit.lastTypedAt ?? this.time);
    const gap = this.time - this.lastProgressAt;
    const ok = !this.slipped;
    this.lastProgressAt = this.time;
    this.slipped = false;
    this.lettersTyped += 1;
    if (ok) this.firstTry += 1;
    fruit.typed = result.index + 1;
    fruit.lastTypedAt = this.time;
    const events: GameEvent[] = [{ type: "typed", fruit, letter: key, index: result.index, seconds: this.time - since, ok, done: result.done }];
    if (!result.done) {
      this.locked = fruit;
      this.markTarget();
      return events;
    }

    this.locked = null;
    this.remove(fruit);
    this.markTarget();
    if (fruit.rotten) {
      this.combo = 0;
      if (this.timed) {
        const penalty = Math.min(this.score, TIMED.penalty);
        this.score -= penalty;
        return [...events, { type: "rottenSliced", fruit, penalty }];
      }
      events.push({ type: "rottenSliced", fruit });
      if (this.loseLife()) events.push({ type: "gameOver" });
      return events;
    }
    const length = fruit.letter.length;
    const points = Math.round(POINTS_PER_SLICE * length * (length > 1 ? SEQUENCE_BONUS : 1));
    this.score += points;
    this.sliced += 1;
    this.combo = gap <= COMBO.window ? this.combo + 1 : 1;
    this.lastSliceAt = this.time;
    events.push({ type: "sliced", fruit, reactionTime: this.time - since, combo: this.combo, points });
    if (fruit.frozen) {
      this.freezeLeft = FREEZE.seconds;
      events.push({ type: "freeze", seconds: FREEZE.seconds });
      this.queueBurst();
    }
    return events;
  }

  /** Hand over every fruit still in the air (used for the game-over finale). */
  releaseAll(): Fruit[] {
    this.queue = [];
    this.freezeLeft = 0;
    this.locked = null;
    return this.live.splice(0);
  }

  private loseLife(): boolean {
    this.lives -= 1;
    if (this.lives <= 0) this.over = true;
    return this.over;
  }

  private startWave(): void {
    this.wave += 1;
    this.nextWaveAt = Infinity;
    const [min, max] = DIFFICULTIES[this.options.difficulty].perWave;
    const extra = Math.min(Math.floor(this.speedLevel / RAMP.levelsPerExtraFruit), RAMP.maxExtraFruit);
    let count = min + Math.floor(this.random() * (max - min + 1)) + extra;
    const rotten = this.options.rotten && !this.littleHands && this.wave >= ROTTEN.fromWave && this.random() < ROTTEN.chance;
    // Every letter on screen is different, so a short lesson can't fill a big wave.
    count = Math.min(count, this.options.keys.length - (rotten ? 1 : 0));
    if (this.littleHands) count = Math.max(1, Math.min(count, LITTLE_HANDS.fruit - this.freshThrown));
    const rottenSlot = rotten ? Math.floor(this.random() * (count + 1)) : -1;
    // At most one frozen fruit per wave, and none while it's still slow from the last one.
    const frozen = this.wave >= FREEZE.fromWave && this.freezeLeft === 0 && this.random() < FREEZE.chance;
    let frozenSlot = frozen ? Math.floor(this.random() * count) : -1;
    if (frozenSlot >= rottenSlot && rottenSlot >= 0) frozenSlot += 1; // skip over the rotten one
    let at = this.clock;
    for (let i = 0; i < count + (rotten ? 1 : 0); i++) {
      this.queue.push({ at, rotten: i === rottenSlot, frozen: i === frozenSlot });
      const [low, high] = WAVE.spacing;
      at += low + this.random() * (high - low);
    }
  }

  /** How many fruit the freezer burst throws: more the faster the game is going. */
  get burstSize(): number {
    const pace = (DIFFICULTIES.easy.airTime / DIFFICULTIES[this.options.difficulty].airTime) * this.speedMultiplier;
    const [min, max] = FREEZE.burst;
    return Math.min(max, min + Math.floor((pace - 1 + 1e-9) / FREEZE.burstPerSpeed));
  }

  /** A quick volley of fresh fruit, thrown alongside whatever is left of the wave, to slice in slow motion. */
  private queueBurst(): void {
    const [low, high] = FREEZE.burstSpacing;
    let at = this.clock;
    let size = this.burstSize;
    if (this.littleHands) {
      const queued = this.queue.filter((q) => !q.rotten && !q.frozen).length;
      size = Math.min(size, LITTLE_HANDS.fruit - this.freshThrown - queued);
    }
    for (let i = 0; i < size; i++) {
      this.queue.push({ at, rotten: false, frozen: false });
      at += low + this.random() * (high - low);
    }
    this.queue.sort((a, b) => a.at - b.at);
  }

  private launch({ rotten, frozen }: { rotten: boolean; frozen: boolean }): Fruit | null {
    const letter = this.pickTag(rotten || frozen);
    if (!letter) return null;
    const x = this.between(LAUNCH.xMin, LAUNCH.xMax);
    const apex = this.between(LAUNCH.apexMin, LAUNCH.apexMax);
    // Up and back down in airTime seconds: height h = g * T^2 / 8, so g = 8h / T^2. Keys still being learned fly slower.
    // A pair or word flies at the pace of its least-known letter.
    const pace = Math.min(1, Math.max(0.1, ...[...letter].map((ch) => this.options.pace?.(ch) ?? 1)));
    const airTime = DIFFICULTIES[this.options.difficulty].airTime / this.speedMultiplier / pace;
    const gravity = (8 * (LAUNCH.y - apex)) / airTime ** 2;
    // Drift towards the middle, so fruit stays on screen.
    const landX = x + (W / 2 - x) * 0.6 + this.between(-60, 60);
    const fruit: Fruit = {
      id: this.nextId++,
      kind: this.nextKind(),
      letter,
      rotten,
      frozen,
      x,
      y: LAUNCH.y,
      vx: (landX - x) / airTime,
      vy: (-gravity * airTime) / 2,
      gravity,
      rot: this.between(-0.6, 0.6),
      spin: this.between(-2.5, 2.5),
      launchedAt: this.time,
    };
    this.live.push(fruit);
    if (!rotten && !frozen) this.freshThrown += 1;
    return fruit;
  }

  /**
   * What a new fruit carries, never starting with a first letter already in the air (so the first key always picks
   * out one fruit): one letter weighted by need, or for fresh fruit whatever `pick` chooses. Null if nothing fits.
   */
  private pickTag(single: boolean): string | null {
    const inUse = new Set(this.live.map((f) => f.letter[0]));
    if (!single && this.options.pick) return this.options.pick(inUse);
    const { keys, weights } = this.options;
    if (keys.every((k) => inUse.has(k))) return null;
    return pickWeighted(keys, (k) => weights?.get(k) ?? 1, this.random, (k) => inUse.has(k));
  }

  /** Fruit kinds in a shuffled cycle, so every kind turns up regularly. */
  private nextKind(): FruitKindName {
    if (this.kinds.length === 0) {
      this.kinds = [...FRUIT_KINDS];
      for (let i = this.kinds.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.kinds[i], this.kinds[j]] = [this.kinds[j], this.kinds[i]];
      }
    }
    return this.kinds.pop()!;
  }

  private between(low: number, high: number): number {
    return low + this.random() * (high - low);
  }

  private remove(fruit: Fruit): void {
    if (fruit === this.locked) this.locked = null;
    this.live.splice(this.live.indexOf(fruit), 1);
  }
}

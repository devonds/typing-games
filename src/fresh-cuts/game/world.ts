// The rules of the game. No drawing and no browser APIs: just numbers in, events out.
import {
  COMBO,
  DIFFICULTIES,
  FREEZE,
  FRUIT_KINDS,
  LAUNCH,
  LIVES,
  POINTS_PER_SLICE,
  RAMP,
  ROTTEN,
  W,
  WAVE,
  type Difficulty,
  type FruitKindName,
  type SpeedMode,
} from "../config";
import type { Fruit, GameEvent } from "./types";

export interface WorldOptions {
  letters: readonly string[];
  difficulty: Difficulty;
  speedMode: SpeedMode;
  /** Throw the odd rotten apple, which shouldn't be sliced. */
  rotten: boolean;
  /** Returns a number in [0, 1). Defaults to Math.random; tests pass a seeded one. */
  random?: () => number;
}

export class World {
  /** Seconds played. Runs at normal speed even in slow motion. */
  time = 0;
  score = 0;
  lives = LIVES;
  sliced = 0;
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
  private readonly random: () => number;
  private kinds: FruitKindName[] = [];
  private nextId = 1;

  constructor(private readonly options: WorldOptions) {
    if (options.letters.length === 0) throw new Error("World needs at least one letter");
    this.random = options.random ?? Math.random;
  }

  /** Fruit in the air, in the order it was thrown. */
  get fruit(): readonly Fruit[] {
    return this.live;
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

    if (this.combo > 0 && this.time - this.lastSliceAt > COMBO.window) {
      if (this.combo >= COMBO.min) {
        const bonus = this.combo * COMBO.bonusPerFruit;
        this.score += bonus;
        events.push({ type: "comboEnd", chain: this.combo, bonus });
      }
      this.combo = 0;
    }

    // A new wave once the last one is all sliced or fallen.
    if (this.live.length === 0 && this.queue.length === 0) {
      if (this.nextWaveAt === Infinity) this.nextWaveAt = this.clock + WAVE.gap;
      if (this.clock >= this.nextWaveAt) this.startWave();
    }
    while (this.queue.length > 0 && this.queue[0].at <= this.clock) {
      const fruit = this.launch(this.queue.shift()!);
      if (fruit) events.push({ type: "launched", fruit });
    }

    for (const f of [...this.live]) {
      f.vy += f.gravity * gameDt;
      f.x += f.vx * gameDt;
      f.y += f.vy * gameDt;
      f.rot += f.spin * gameDt;
      if (f.vy > 0 && f.y > LAUNCH.dropY) {
        this.remove(f);
        if (f.rotten || f.frozen) continue; // letting rotten fruit fall is the right thing to do; frozen is a bonus
        events.push({ type: "dropped", fruit: f });
        if (this.loseLife()) {
          events.push({ type: "gameOver" });
          break;
        }
      }
    }
    return events;
  }

  /** The player pressed a letter key. Wrong keys cost nothing. */
  press(key: string): GameEvent[] {
    if (this.over) return [];
    const fruit = this.live.find((f) => f.letter === key);
    if (!fruit) {
      this.wrongKeys += 1;
      return [{ type: "wrongKey", key, expected: this.live.find((f) => !f.rotten && !f.frozen)?.letter ?? null }];
    }
    this.remove(fruit);
    if (fruit.rotten) {
      this.combo = 0;
      const events: GameEvent[] = [{ type: "rottenSliced", fruit }];
      if (this.loseLife()) events.push({ type: "gameOver" });
      return events;
    }
    this.score += POINTS_PER_SLICE;
    this.sliced += 1;
    this.combo = this.time - this.lastSliceAt <= COMBO.window ? this.combo + 1 : 1;
    this.lastSliceAt = this.time;
    const events: GameEvent[] = [{ type: "sliced", fruit, reactionTime: this.time - fruit.launchedAt, combo: this.combo }];
    if (fruit.frozen) {
      this.freezeLeft = FREEZE.seconds;
      events.push({ type: "freeze", seconds: FREEZE.seconds });
    }
    return events;
  }

  /** Hand over every fruit still in the air (used for the game-over finale). */
  releaseAll(): Fruit[] {
    this.queue = [];
    this.freezeLeft = 0;
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
    const rotten = this.options.rotten && this.wave >= ROTTEN.fromWave && this.random() < ROTTEN.chance;
    // Every letter on screen is different, so a short lesson can't fill a big wave.
    count = Math.min(count, this.options.letters.length - (rotten ? 1 : 0));
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

  private launch({ rotten, frozen }: { rotten: boolean; frozen: boolean }): Fruit | null {
    const letter = this.pickLetter();
    if (!letter) return null;
    const x = this.between(LAUNCH.xMin, LAUNCH.xMax);
    const apex = this.between(LAUNCH.apexMin, LAUNCH.apexMax);
    // Up and back down in airTime seconds: height h = g * T^2 / 8, so g = 8h / T^2.
    const airTime = DIFFICULTIES[this.options.difficulty].airTime / this.speedMultiplier;
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
    return fruit;
  }

  /** A letter not already in the air, or null if every lesson letter is in use. */
  private pickLetter(): string | null {
    const inAir = new Set(this.live.map((f) => f.letter));
    const free = this.options.letters.filter((l) => !inAir.has(l));
    return free.length > 0 ? free[Math.floor(this.random() * free.length)] : null;
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
    this.live.splice(this.live.indexOf(fruit), 1);
  }
}

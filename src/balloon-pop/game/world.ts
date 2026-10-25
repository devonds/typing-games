// The rules of the game. No drawing and no browser APIs: just numbers in, events out.
import {
  BALLOON_COLOUR_COUNT,
  BALLOON_RADIUS,
  DIFFICULTIES,
  ESCAPE_COST,
  ESCAPE_Y,
  FIZZLE_SECONDS,
  GROUND_Y,
  LAUNCH_DRAG,
  LAUNCH_SPEED,
  LAUNCHER_SLOTS,
  LIVES,
  LITTLE_HANDS,
  MAX_WIDE,
  POINTS_PER_POP,
  RAMP,
  RETRY_SECONDS,
  SPACING,
  W,
  WIDE_COLOURS,
  WORD_BONUS,
  balloonHalfWidth,
  type Difficulty,
  type DifficultySettings,
  type SpeedMode,
} from "../config";
import { pickWeighted } from "../../shared/practice";
import { nextWanted, press } from "../../shared/units";
import type { Balloon, GameEvent, Launcher } from "./types";

export interface WorldOptions {
  /** The letters to practise, and how often each should come up (from Player.practice). */
  practice: { keys: readonly string[]; weights: ReadonlyMap<string, number> };
  difficulty: Difficulty;
  speedMode: SpeedMode;
  /**
   * What the next balloon carries: a letter, pair or word that doesn't start with any letter in `inUse` (the first
   * letters already in the air), or null if there's nothing suitable. With `lettersOnly` (MAX_WIDE pairs and words
   * are already up), it must be a single letter. Defaults to single letters by weight.
   */
  pick?: (inUse: ReadonlySet<string>, random: () => number, lettersOnly: boolean) => string | null;
  /** Share of the normal rise speed for a balloon carrying this letter (Player.pace). Defaults to full speed. */
  pace?: (letter: string) => number;
  /** A timed round of this many seconds: it ends on time, and escapes cost points instead of lives. */
  seconds?: number | null;
  /** No time pressure: balloons hover near the top, nothing escapes, wrong keys don't fizzle, and the round is a
   *  fixed number of balloons. */
  littleHands?: boolean;
  /** Returns a number in [0, 1). Defaults to Math.random; tests pass a seeded one. */
  random?: () => number;
}

export class World {
  time = 0;
  score = 0;
  lives = LIVES;
  /** Balloons popped (a word counts once). */
  popped = 0;
  /** Right letters typed, and how many of those were right first time. */
  letters = 0;
  firstTime = 0;
  wrongKeys = 0;
  over = false;
  /** 0 at the start; goes up every RAMP.secondsPerLevel in "ramp" mode. */
  speedLevel = 0;
  /** The pair or word being typed, once its first letter is in. */
  locked: Balloon | null = null;

  readonly launchers: Launcher[];
  private readonly live: Balloon[] = [];
  private readonly settings: DifficultySettings;
  private readonly random: () => number;
  private nextId = 1;
  /** Balloons launched so far this round. */
  private launched = 0;
  /** When the last letter was typed, for timing a balloon started before it became the oldest. */
  private lastLetterAt = 0;
  /** Keys that do nothing until the given world time, after being pressed wrongly. */
  private readonly fizzling = new Map<string, number>();
  /** Letters that had a wrong key while they were wanted, so their next hit isn't right first time. */
  private readonly slipped = new Set<string>();

  constructor(private readonly options: WorldOptions) {
    if (options.practice.keys.length === 0) throw new Error("World needs at least one letter");
    this.settings = DIFFICULTIES[options.difficulty];
    this.random = options.random ?? Math.random;
    this.launchers = LAUNCHER_SLOTS.slice(0, this.settings.launchers).map((slot) => ({
      x: slot.x,
      nextShotAt: slot.firstShot,
      aim: this.randomAim(),
    }));
  }

  /** Balloons in the air, oldest first. */
  get balloons(): readonly Balloon[] {
    return this.live;
  }

  /** The letter to type next: the locked word's next letter, or the oldest balloon's first. */
  get wanted(): string | null {
    return nextWanted(this.live, this.locked);
  }

  /** A timed round's length, or null (Little hands never have one). */
  get timeLimit(): number | null {
    return this.options.littleHands ? null : (this.options.seconds ?? null);
  }

  /** How much faster than normal balloons rise right now (1 = normal). */
  get speedMultiplier(): number {
    return Math.min(1 + RAMP.speedPerLevel * this.speedLevel, RAMP.maxSpeed);
  }

  /** How much of the normal wait cannons wait between shots (1 = normal). */
  get intervalMultiplier(): number {
    return Math.max(1 / (1 + RAMP.intervalPerLevel * this.speedLevel), RAMP.minInterval);
  }

  /** Little hands: how many balloons the round still has to launch. */
  get balloonsLeft(): number {
    return Math.max(0, LITTLE_HANDS.balloons - this.launched);
  }

  /** Move time forward by dt seconds. */
  step(dt: number): GameEvent[] {
    if (this.over) return [];
    const events: GameEvent[] = [];
    this.time += dt;

    const limit = this.timeLimit;
    if (limit !== null && this.time >= limit) {
      this.over = true;
      return [{ type: "timeUp" }];
    }

    if (this.options.speedMode === "ramp" && !this.options.littleHands) {
      const level = Math.floor(this.time / RAMP.secondsPerLevel);
      if (level > this.speedLevel) {
        this.speedLevel = level;
        events.push({ type: "speedUp", level });
      }
    }

    this.launchers.forEach((launcher, index) => {
      if (this.time < launcher.nextShotAt || !this.mayFire()) return;
      const event = this.fire(launcher, index);
      if (event) events.push(event);
      else launcher.nextShotAt = this.time + RETRY_SECONDS;
    });

    const rise = this.settings.riseSpeed * this.speedMultiplier;
    const drag = 1 - Math.exp(-LAUNCH_DRAG * dt);
    for (const b of [...this.live]) {
      // Launch speed fades away and the balloon settles into a steady rise.
      b.vx -= b.vx * drag;
      const slow = this.crowdedAbove(b) ? SPACING.slowBelow : 1;
      b.vy += (-rise * b.pace * slow - b.vy) * drag;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (this.options.littleHands && b.y < LITTLE_HANDS.hoverY) {
        b.y = LITTLE_HANDS.hoverY;
        b.vy = 0;
      }
      // Bounce off the sides so every balloon stays readable.
      const half = balloonHalfWidth(b.text);
      if (b.x < half || b.x > W - half) {
        b.x = Math.min(Math.max(b.x, half), W - half);
        b.vx = -b.vx;
      }
      if (b.y < ESCAPE_Y) {
        this.remove(b);
        const cost = limit !== null ? Math.min(ESCAPE_COST, this.score) : 0;
        if (limit !== null) this.score -= cost;
        else this.lives -= 1;
        events.push({ type: "escaped", balloon: b, cost });
        if (this.lives <= 0) {
          this.over = true;
          events.push({ type: "gameOver" });
          break;
        }
      }
    }
    this.spread(dt);
    this.markTarget();
    return events;
  }

  /**
   * The player pressed a letter key. The first letter of a balloon locks onto it (the oldest starting with that
   * letter; first letters in the air are all different), and the next keys must continue it. A wrong key costs
   * nothing, but that key fizzles: pressing it again does nothing for a moment, so mashing doesn't pop balloons.
   */
  press(key: string): GameEvent[] {
    if (this.over) return [];
    if ((this.fizzling.get(key) ?? 0) > this.time) return [{ type: "fizzled", key }];
    const result = press(this.live, this.locked, key);
    if (result.kind === "wrong") {
      this.wrongKeys += 1;
      if (result.expected) this.slipped.add(result.expected);
      if (!this.options.littleHands) this.fizzling.set(key, this.time + FIZZLE_SECONDS);
      return [{ type: "wrongKey", key, expected: result.expected }];
    }

    const b = result.target;
    // The first letter is timed from when the balloon became the target (or from the last letter, if it was typed
    // out of turn); the others from the letter before.
    const since = result.index === 0 ? (b.targetAt ?? Math.max(b.launchedAt, this.lastLetterAt)) : b.typedAt;
    const ok = !this.slipped.has(key);
    this.slipped.delete(key);
    b.typed += 1;
    b.typedAt = this.time;
    this.lastLetterAt = this.time;
    this.letters += 1;
    if (ok) this.firstTime += 1;
    const events: GameEvent[] = [{ type: "letter", balloon: b, letter: key, index: result.index, seconds: this.time - since, ok }];
    if (!result.done) {
      this.locked = b;
      return events;
    }

    this.remove(b);
    const points = POINTS_PER_POP * b.text.length + (b.text.length > 1 ? WORD_BONUS : 0);
    this.score += points;
    this.popped += 1;
    this.markTarget();
    events.push({ type: "popped", balloon: b, points });
    if (this.options.littleHands && this.launched >= LITTLE_HANDS.balloons && this.live.length === 0) {
      this.over = true;
      events.push({ type: "finished" });
    }
    return events;
  }

  /** Hand over every balloon still in the air (used for the end-of-round pops). */
  releaseAll(): Balloon[] {
    this.locked = null;
    return this.live.splice(0);
  }

  /** Little hands: a fixed number of balloons, and no more than a few waiting at once. */
  private mayFire(): boolean {
    if (!this.options.littleHands) return true;
    return this.launched < LITTLE_HANDS.balloons && this.live.length < LITTLE_HANDS.maxInAir;
  }

  /** The oldest balloon is the one to type: note when it became so, for fair timing. */
  private markTarget(): void {
    const target = this.live[0];
    if (target && target.targetAt === null) target.targetAt = this.time;
  }

  /** Whether two balloons' boxes (their real widths, plus a little sky) overlap. */
  private overlap(a: Balloon, b: Balloon): boolean {
    const across = balloonHalfWidth(a.text) + balloonHalfWidth(b.text) + SPACING.gap;
    return Math.abs(a.x - b.x) < across && Math.abs(a.y - b.y) < BALLOON_RADIUS * 2 + SPACING.gap;
  }

  /** Another balloon is just above this one, in its way. */
  private crowdedAbove(b: Balloon): boolean {
    return this.live.some((o) => o !== b && o.y < b.y && this.overlap(o, b));
  }

  /** Overlapping balloons ease apart sideways, softly, so every letter stays readable. */
  private spread(dt: number): void {
    const step = SPACING.push * dt;
    for (let i = 0; i < this.live.length; i++) {
      for (let j = i + 1; j < this.live.length; j++) {
        const a = this.live[i];
        const b = this.live[j];
        if (!this.overlap(a, b)) continue;
        // The older one moves aside too, but less; exactly level, the newer one goes right.
        const dir = b.x >= a.x ? 1 : -1;
        this.nudge(a, -dir * step * 0.5);
        this.nudge(b, dir * step);
      }
    }
  }

  private nudge(b: Balloon, dx: number): void {
    const half = balloonHalfWidth(b.text);
    b.x = Math.min(Math.max(b.x + dx, half), W - half);
  }

  /** Fire a balloon, or return null if there's nothing new to carry right now. */
  private fire(launcher: Launcher, index: number): GameEvent | null {
    const inUse = new Set(this.live.map((b) => b.text[0]));
    const lettersOnly = this.live.filter((b) => b.text.length > 1).length >= MAX_WIDE;
    const text = (this.options.pick ?? ((used) => this.pickLetter(used)))(inUse, this.random, lettersOnly);
    if (!text) return null;
    this.launched += 1;
    const pace = Math.min(...[...text].map((c) => this.options.pace?.(c) ?? 1));
    const colour = text.length > 1 ? WIDE_COLOURS[Math.floor(this.random() * WIDE_COLOURS.length)] : Math.floor(this.random() * BALLOON_COLOUR_COUNT);
    const balloon: Balloon = {
      id: this.nextId++,
      text,
      typed: 0,
      x: launcher.x,
      y: GROUND_Y - 6,
      vx: Math.cos(launcher.aim) * LAUNCH_SPEED,
      vy: Math.sin(launcher.aim) * LAUNCH_SPEED,
      colour,
      launchedAt: this.time,
      targetAt: null,
      typedAt: this.time,
      pace,
    };
    this.live.push(balloon);
    this.markTarget();
    const [low, high] = this.settings.fireEvery;
    launcher.nextShotAt = this.time + (low + this.random() * (high - low)) * this.intervalMultiplier;
    launcher.aim = this.randomAim();
    return { type: "launched", balloon, launcher: index };
  }

  /** A letter weighted by how much it needs practice, never one already in the air (null if they all are). */
  private pickLetter(inUse: ReadonlySet<string>): string | null {
    const { keys, weights } = this.options.practice;
    const letter = pickWeighted(keys, (k) => weights.get(k) ?? 0, this.random, (k) => inUse.has(k));
    return letter && !inUse.has(letter) ? letter : null;
  }

  /** Somewhere between 60 degrees left and 60 degrees right of straight up. */
  private randomAim(): number {
    return -Math.PI / 2 + (this.random() - 0.5) * (Math.PI * 2) / 3;
  }

  private remove(balloon: Balloon): void {
    this.live.splice(this.live.indexOf(balloon), 1);
    if (this.locked === balloon) this.locked = null;
  }
}

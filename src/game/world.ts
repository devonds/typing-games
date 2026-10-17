// The rules of the game. No drawing and no browser APIs: just numbers in, events out.
import {
  BALLOON_COLOUR_COUNT,
  BALLOON_RADIUS,
  DIFFICULTIES,
  ESCAPE_Y,
  GROUND_Y,
  LAUNCH_DRAG,
  LAUNCH_SPEED,
  LAUNCHER_SLOTS,
  LIVES,
  POINTS_PER_POP,
  RAMP,
  W,
  type Difficulty,
  type DifficultySettings,
  type SpeedMode,
} from "../config";
import type { Balloon, GameEvent, Launcher } from "./types";

export interface WorldOptions {
  letters: readonly string[];
  difficulty: Difficulty;
  speedMode: SpeedMode;
  /** Returns a number in [0, 1). Defaults to Math.random; tests pass a seeded one. */
  random?: () => number;
}

export class World {
  time = 0;
  score = 0;
  lives = LIVES;
  popped = 0;
  wrongKeys = 0;
  over = false;
  /** 0 at the start; goes up every RAMP.secondsPerLevel in "ramp" mode. */
  speedLevel = 0;

  readonly launchers: Launcher[];
  private readonly live: Balloon[] = [];
  private readonly settings: DifficultySettings;
  private readonly random: () => number;
  private nextId = 1;

  constructor(private readonly options: WorldOptions) {
    if (options.letters.length === 0) throw new Error("World needs at least one letter");
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

  /** How much faster than normal balloons rise right now (1 = normal). */
  get speedMultiplier(): number {
    return Math.min(1 + RAMP.speedPerLevel * this.speedLevel, RAMP.maxSpeed);
  }

  /** How much of the normal wait cannons wait between shots (1 = normal). */
  get intervalMultiplier(): number {
    return Math.max(1 / (1 + RAMP.intervalPerLevel * this.speedLevel), RAMP.minInterval);
  }

  /** Move time forward by dt seconds. */
  step(dt: number): GameEvent[] {
    if (this.over) return [];
    const events: GameEvent[] = [];
    this.time += dt;

    if (this.options.speedMode === "ramp") {
      const level = Math.floor(this.time / RAMP.secondsPerLevel);
      if (level > this.speedLevel) {
        this.speedLevel = level;
        events.push({ type: "speedUp", level });
      }
    }

    this.launchers.forEach((launcher, index) => {
      if (this.time >= launcher.nextShotAt) events.push(this.fire(launcher, index));
    });

    const rise = this.settings.riseSpeed * this.speedMultiplier;
    const drag = 1 - Math.exp(-LAUNCH_DRAG * dt);
    for (const b of [...this.live]) {
      // Launch speed fades away and the balloon settles into a steady rise.
      b.vx -= b.vx * drag;
      b.vy += (-rise - b.vy) * drag;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // Bounce off the sides so every balloon stays readable.
      if (b.x < BALLOON_RADIUS || b.x > W - BALLOON_RADIUS) {
        b.x = Math.min(Math.max(b.x, BALLOON_RADIUS), W - BALLOON_RADIUS);
        b.vx = -b.vx;
      }
      if (b.y < ESCAPE_Y) {
        this.remove(b);
        this.lives -= 1;
        events.push({ type: "escaped", balloon: b });
        if (this.lives <= 0) {
          this.over = true;
          events.push({ type: "gameOver" });
          break;
        }
      }
    }
    return events;
  }

  /** The player pressed a letter key. The oldest balloon with that letter pops. Wrong keys cost nothing. */
  press(key: string): GameEvent[] {
    if (this.over) return [];
    const balloon = this.live.find((b) => b.letter === key);
    if (!balloon) {
      this.wrongKeys += 1;
      return [{ type: "wrongKey", key, expected: this.live[0]?.letter ?? null }];
    }
    this.remove(balloon);
    this.score += POINTS_PER_POP;
    this.popped += 1;
    return [{ type: "popped", balloon, reactionTime: this.time - balloon.launchedAt }];
  }

  /** Hand over every balloon still in the air (used for the game-over pops). */
  releaseAll(): Balloon[] {
    return this.live.splice(0);
  }

  private fire(launcher: Launcher, index: number): GameEvent {
    const balloon: Balloon = {
      id: this.nextId++,
      letter: this.pickLetter(),
      x: launcher.x,
      y: GROUND_Y - 6,
      vx: Math.cos(launcher.aim) * LAUNCH_SPEED,
      vy: Math.sin(launcher.aim) * LAUNCH_SPEED,
      colour: Math.floor(this.random() * BALLOON_COLOUR_COUNT),
      launchedAt: this.time,
    };
    this.live.push(balloon);
    const [low, high] = this.settings.fireEvery;
    launcher.nextShotAt = this.time + (low + this.random() * (high - low)) * this.intervalMultiplier;
    launcher.aim = this.randomAim();
    return { type: "launched", balloon, launcher: index };
  }

  /** A random letter, avoiding ones already in the air when possible, so each letter on screen is unique. */
  private pickLetter(): string {
    const inAir = new Set(this.live.map((b) => b.letter));
    const fresh = this.options.letters.filter((l) => !inAir.has(l));
    const pool = fresh.length > 0 ? fresh : this.options.letters;
    return pool[Math.floor(this.random() * pool.length)];
  }

  /** Somewhere between 60 degrees left and 60 degrees right of straight up. */
  private randomAim(): number {
    return -Math.PI / 2 + (this.random() - 0.5) * (Math.PI * 2) / 3;
  }

  private remove(balloon: Balloon): void {
    this.live.splice(this.live.indexOf(balloon), 1);
  }
}

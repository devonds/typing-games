// Short-lived things that only look nice: fruit halves, juice, slash streaks, stink puffs, pop-up words.
import { H, W } from "../config";
import type { Fruit } from "../game/types";
import { TAU, drawHalf, hash, lookFor, type FruitLook } from "./fruit";
import { GOLD, SERIF, drawWord, text } from "./ui";

type Ctx = CanvasRenderingContext2D;

const GRAVITY = 300;

interface Half {
  look: FruitLook;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  cut: number;
  side: number;
}

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  colour: string;
  life: number;
}

interface Burst {
  x: number;
  y: number;
  colour: string;
  age: number;
  seed: number;
  stinky: boolean;
}

interface Streak {
  x: number;
  y: number;
  angle: number;
  age: number;
}

interface Word {
  text: string;
  x: number;
  y: number;
  age: number;
  big: boolean;
}

const BURST_TIME = 0.4;
const STINK_TIME = 0.9;
const STREAK_TIME = 0.2;
const WORD_TIME = 0.8;
const BIG_WORD_TIME = 1.3;

export class Effects {
  private halves: Half[] = [];
  private drops: Drop[] = [];
  private bursts: Burst[] = [];
  private streaks: Streak[] = [];
  private words: Word[] = [];
  private bannerText = "";
  private bannerLeft = 0;

  /** Cut a fruit in two along a random diagonal, with a splash of juice. */
  slice(fruit: Fruit, random = Math.random): void {
    const look = lookFor(fruit.kind, fruit.rotten);
    const angle = -0.55 + (random() - 0.5) * 1.3;
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    for (const side of [-1, 1]) {
      this.halves.push({
        look,
        x: fruit.x + nx * side * 2,
        y: fruit.y + ny * side * 2,
        vx: fruit.vx * 0.4 + nx * side * 55,
        vy: Math.min(fruit.vy, 0) * 0.25 + ny * side * 55 - 30,
        rot: fruit.rot,
        spin: fruit.spin + side * 2.4,
        cut: angle - fruit.rot,
        side,
      });
    }
    for (let i = 0; i < 18; i++) {
      const a = random() * TAU;
      const speed = 50 + random() * 130;
      this.drops.push({
        x: fruit.x,
        y: fruit.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 40,
        r: 0.8 + random() * 1.8,
        colour: look.juice,
        life: 0.5 + random() * 0.4,
      });
    }
    if (fruit.frozen) {
      // Chips of ice fly off with the juice.
      for (let i = 0; i < 14; i++) {
        const a = random() * TAU;
        const speed = 40 + random() * 110;
        this.drops.push({
          x: fruit.x,
          y: fruit.y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed - 50,
          r: 1.4 + random() * 2,
          colour: random() < 0.5 ? "#f2fbff" : "#a8dcff",
          life: 0.6 + random() * 0.5,
        });
      }
    }
    this.bursts.push({ x: fruit.x, y: fruit.y, colour: fruit.frozen ? "#cfeeff" : look.juice, age: 0, seed: random() * 100, stinky: fruit.rotten });
    this.streaks.push({ x: fruit.x, y: fruit.y, angle, age: 0 });
  }

  word(s: string, x: number, y: number, big = false): void {
    this.words.push({ text: s, x: Math.min(Math.max(x, 30), W - 30), y, age: 0, big });
  }

  banner(s: string, seconds: number): void {
    this.bannerText = s;
    this.bannerLeft = seconds;
  }

  /** `slow` (1 = normal) slows the halves and juice along with the fruit in slow motion; words keep their pace. */
  update(dt: number, slow = 1): void {
    const realDt = dt;
    dt *= slow;
    for (const h of this.halves) {
      h.vy += GRAVITY * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rot += h.spin * dt;
    }
    this.halves = this.halves.filter((h) => h.y < H + 60);
    for (const d of this.drops) {
      d.vy += GRAVITY * 0.8 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
    }
    this.drops = this.drops.filter((d) => d.life > 0);
    for (const b of this.bursts) b.age += dt;
    this.bursts = this.bursts.filter((b) => b.age < (b.stinky ? STINK_TIME : BURST_TIME));
    for (const s of this.streaks) s.age += dt;
    this.streaks = this.streaks.filter((s) => s.age < STREAK_TIME);
    for (const w of this.words) {
      w.age += realDt;
      w.y -= (w.big ? 8 : 22) * realDt;
    }
    this.words = this.words.filter((w) => w.age < (w.big ? BIG_WORD_TIME : WORD_TIME));
    this.bannerLeft = Math.max(0, this.bannerLeft - realDt);
  }

  /** Halves and splashes go behind the whole fruit still flying. */
  drawBehind(ctx: Ctx): void {
    for (const h of this.halves) drawHalf(ctx, h.look, h.x, h.y, h.rot, h.cut, h.side);
    for (const b of this.bursts) (b.stinky ? drawStinkPuff : drawSplash)(ctx, b);
  }

  /** Juice drops and slash streaks go in front. */
  drawFront(ctx: Ctx): void {
    for (const d of this.drops) {
      ctx.globalAlpha = Math.min(1, d.life * 3);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, TAU);
      ctx.fillStyle = d.colour;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const s of this.streaks) drawStreak(ctx, s);
  }

  /** Words and the banner go on top of everything. */
  drawWords(ctx: Ctx): void {
    for (const w of this.words) {
      const life = w.big ? BIG_WORD_TIME : WORD_TIME;
      drawWord(ctx, w.text, w.x, w.y, Math.min(1, (life - w.age) * 4), w.big);
    }
    if (this.bannerLeft > 0) {
      ctx.globalAlpha = Math.min(1, this.bannerLeft * 3);
      text(ctx, this.bannerText, W / 2, H / 2 - 20, `italic 700 26px ${SERIF}`, GOLD.pale, "center", "rgba(10,20,15,0.9)", 4);
      ctx.globalAlpha = 1;
    }
  }
}

function drawSplash(ctx: Ctx, b: Burst): void {
  const grow = Math.min(1, b.age / 0.1);
  const radius = 9 + 16 * grow;
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const d = radius * (i % 2 ? 0.55 + 0.2 * hash(b.seed + i) : 0.9 + 0.35 * hash(b.seed + i));
    ctx.lineTo(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.globalAlpha = Math.max(0, 1 - b.age / BURST_TIME) * 0.75;
  ctx.fillStyle = b.colour;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawStinkPuff(ctx: Ctx, b: Burst): void {
  ctx.globalAlpha = Math.max(0, 0.75 - b.age);
  ctx.fillStyle = "rgba(150,170,80,0.8)";
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + b.seed;
    const d = 6 + b.age * 30;
    ctx.beginPath();
    ctx.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d - b.age * 15, 5 + b.age * 8, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A bright, tapered blade-stroke through the fruit. */
function drawStreak(ctx: Ctx, s: Streak): void {
  const k = 1 - s.age / STREAK_TIME;
  const len = 46 + 20 * (1 - k);
  const w = 3.2 * k;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.quadraticCurveTo(0, -w, len, 0);
  ctx.quadraticCurveTo(0, w, -len, 0);
  ctx.shadowColor = "rgba(255,200,110,0.9)";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#fff1c8";
  ctx.fill();
  ctx.restore();
}

// Fireworks: a little rocket climbs from the letter and bursts into glowing sparks. Three kinds of burst: a round
// peony, a ring, and a golden willow whose sparks droop and trail.
import { clamp01 } from "../ui";
import type { Palette } from "../palette";
import type { Glyph } from "../words";
import { TAU, pick, rand, shrinkLetter, type Burst, type Ctx } from "./burst";

/** Seconds from the letter to the burst, so the bang can be timed to match. */
export const RISE = 0.5;

const COLOURS = ["#ffcf5c", "#ff7aa8", "#6ff0c0", "#7cc4ff", "#c79bff", "#ff9f68"];
type Kind = "peony" | "ring" | "willow";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  colour: string;
  trail: { x: number; y: number }[];
}

export class Firework implements Burst {
  private age = 0;
  private readonly kind: Kind = pick(["peony", "peony", "ring", "willow"] as const);
  private readonly top: { x: number; y: number };
  private readonly life: number;
  private readonly drag: number;
  private readonly gravity: number;
  private readonly sparks: Spark[] = [];
  private burst = false;

  constructor(private readonly g: Glyph, private readonly font: string) {
    this.top = { x: g.cx + rand(-14, 14), y: Math.max(26, g.cy - rand(55, 95)) };
    this.life = this.kind === "willow" ? 1.9 : 1.3;
    this.drag = this.kind === "willow" ? 2.6 : 2.2;
    this.gravity = this.kind === "willow" ? 55 : 30;
  }

  private explode(): void {
    this.burst = true;
    const [main, second] = [pick(COLOURS), pick(COLOURS)];
    const add = (a: number, speed: number, colour: string) =>
      this.sparks.push({ x: this.top.x, y: this.top.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, colour, trail: [] });
    if (this.kind === "ring") {
      const tilt = rand(0, Math.PI);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * TAU;
        // A ring seen at an angle: an ellipse.
        const x = Math.cos(a);
        const y = Math.sin(a) * 0.55;
        add(Math.atan2(y * Math.cos(tilt) + x * Math.sin(tilt), x * Math.cos(tilt) - y * Math.sin(tilt)), 95 * Math.hypot(x, y), main);
      }
      for (let i = 0; i < 8; i++) add(rand(0, TAU), rand(10, 25), second);
    } else if (this.kind === "willow") {
      for (let i = 0; i < 32; i++) add((i / 32) * TAU + rand(-0.1, 0.1), rand(60, 85), "#ffcf6e");
    } else {
      for (let i = 0; i < 38; i++) add((i / 38) * TAU + rand(-0.08, 0.08), rand(70, 100), i % 4 === 0 ? second : main);
    }
  }

  update(dt: number): boolean {
    this.age += dt;
    if (!this.burst && this.age >= RISE) this.explode();
    for (const s of this.sparks) {
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > (this.kind === "willow" ? 14 : 6)) s.trail.shift();
      s.vx *= Math.exp(-this.drag * dt);
      s.vy *= Math.exp(-this.drag * dt);
      s.vy += this.gravity * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    return this.age < RISE + this.life;
  }

  draw(ctx: Ctx, p: Palette): void {
    shrinkLetter(ctx, p, this.g, this.font, this.age, 0.12);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (!this.burst) {
      // The rocket: a bright point slowing as it climbs, with a short fading tail.
      const k = this.age / RISE;
      for (let i = 0; i < 7; i++) {
        const e = 1 - (1 - Math.max(0, k - i * 0.035)) ** 2;
        const x = this.g.cx + (this.top.x - this.g.cx) * e;
        const y = this.g.cy + (this.top.y - this.g.cy) * e;
        ctx.fillStyle = `rgba(255,225,170,${(0.7 - i * 0.09).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(x, y, i === 0 ? 1.6 : 1.1, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    const t = this.age - RISE;
    // A soft flash lights the sky for a moment.
    if (t < 0.3) {
      const flash = ctx.createRadialGradient(this.top.x, this.top.y, 0, this.top.x, this.top.y, 45);
      flash.addColorStop(0, `rgba(255,240,210,${(0.3 * (1 - t / 0.3)).toFixed(3)})`);
      flash.addColorStop(1, "rgba(255,240,210,0)");
      ctx.fillStyle = flash;
      ctx.fillRect(this.top.x - 45, this.top.y - 45, 90, 90);
    }
    const fadeOut = clamp01((this.life - t) / (this.life * 0.55));
    for (const s of this.sparks) {
      // Late sparks twinkle as they die.
      const twinkle = t > this.life * 0.5 ? 0.55 + 0.45 * Math.sin(t * 40 + s.vx) : 1;
      const a = fadeOut * twinkle;
      if (s.trail.length > 1) {
        ctx.strokeStyle = s.colour;
        ctx.globalAlpha = a * 0.5;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(s.trail[0].x, s.trail[0].y);
        for (const q of s.trail) ctx.lineTo(q.x, q.y);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      // A bright core with a soft halo.
      ctx.fillStyle = s.colour;
      ctx.globalAlpha = a * 0.22;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3.6, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

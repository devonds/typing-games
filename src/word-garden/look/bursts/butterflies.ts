// Butterflies: the letter unfolds into a pair of wings and flutters up and away.
import { clamp01, easeOutBack } from "../ui";
import { wind } from "../landscape";
import type { Palette } from "../palette";
import type { Glyph } from "../words";
import { TAU, rand, shrinkLetter, type Burst, type Ctx } from "./burst";

interface Wings {
  fore: string;
  hind: string;
  edge: string;
}

const WINGS: Wings[] = [
  { fore: "#f2a24e", hind: "#e98a3c", edge: "#43302a" }, // monarch
  { fore: "#a3cbea", hind: "#7eb0dd", edge: "#2f4867" }, // blue
  { fore: "#f6e18c", hind: "#efcf68", edge: "#7a6935" }, // brimstone
  { fore: "#f5c0cd", hind: "#ea9fb5", edge: "#6d3b52" }, // pink
  { fore: "#cfbcf0", hind: "#b09ae3", edge: "#46396f" }, // lilac
];

const LIFE = 4.2;

export class Butterfly implements Burst {
  private age = 0;
  private x: number;
  private y: number;
  private vx: number;
  private vy = -18;
  private readonly wings: Wings;
  private readonly u: number;
  private readonly phase = rand(0, TAU);
  // Each one has its own way of flying, so they scatter instead of following each other.
  private readonly wanderSize = rand(18, 50);
  private readonly wanderSpeed = rand(1.2, 2.8);
  private readonly drift = rand(-28, 28);
  private readonly climb = rand(-48, -22);
  private flap = rand(0, TAU);

  constructor(private readonly g: Glyph, private readonly font: string, order: number) {
    this.x = g.cx;
    this.y = g.cy;
    this.wings = WINGS[(order + Math.floor(rand(0, 2))) % WINGS.length];
    this.u = g.size * 0.4;
    this.vx = rand(-1, 1) * 22;
  }

  update(dt: number, t: number): boolean {
    this.age += dt;
    // Flap fast while climbing, with the odd glide.
    const gliding = Math.sin(this.age * 1.7 + this.phase) > 0.75;
    this.flap += dt * (gliding ? 2 : 17);
    if (this.age > 0.3) {
      // Wander: a lazy, looping path that drifts upward and with the breeze.
      const wander = Math.sin(this.age * this.wanderSpeed + this.phase) * this.wanderSize;
      this.vx += (wander + this.drift + wind(t) * 12 - this.vx) * dt * 2;
      this.vy += (this.climb - this.vy) * dt;
      this.x += this.vx * dt;
      this.y += (this.vy + (gliding ? 6 : Math.sin(this.flap) * 14)) * dt;
    }
    return this.age < LIFE && this.y > -30;
  }

  draw(ctx: Ctx, p: Palette): void {
    shrinkLetter(ctx, p, this.g, this.font, this.age, 0.25);
    const grow = easeOutBack(clamp01((this.age - 0.05) / 0.35));
    if (grow <= 0) return;
    const u = this.u * grow;
    const open = 0.18 + 0.82 * Math.abs(Math.cos(this.flap));
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = clamp01((LIFE - this.age) / 0.7);
    ctx.rotate(clamp01(Math.abs(this.vx) / 40) * Math.sign(this.vx) * 0.35);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * open, 1);
      this.wing(ctx, u, "hind");
      this.wing(ctx, u, "fore");
      ctx.restore();
    }
    // Body and antennae.
    const ink = this.wings.edge;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(0, u * 0.12, u * 0.07, u * 0.48, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -u * 0.36, u * 0.09, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.6;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -u * 0.4);
      ctx.quadraticCurveTo(side * u * 0.12, -u * 0.8, side * u * 0.3, -u * 0.92);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(side * u * 0.3, -u * 0.92, u * 0.04, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /** One wing on the right-hand side: a dark border, the coloured middle, and pale spots near the edge. */
  private wing(ctx: Ctx, u: number, which: "fore" | "hind"): void {
    const shape = (k: number) => {
      ctx.beginPath();
      if (which === "fore") {
        ctx.moveTo(0, -0.12 * u);
        ctx.bezierCurveTo(0.25 * u * k, -0.95 * u * k, 1.0 * u * k, -1.05 * u * k, 1.08 * u * k, -0.58 * u * k);
        ctx.bezierCurveTo(1.12 * u * k, -0.2 * u * k, 0.62 * u * k, 0.04 * u, 0, 0.04 * u);
      } else {
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(0.55 * u * k, -0.02 * u, 0.9 * u * k, 0.3 * u * k, 0.74 * u * k, 0.72 * u * k);
        ctx.bezierCurveTo(0.58 * u * k, 1.02 * u * k, 0.14 * u * k, 0.78 * u * k, 0, 0.3 * u);
      }
      ctx.closePath();
    };
    shape(1);
    ctx.fillStyle = this.wings.edge;
    ctx.fill();
    shape(0.8);
    const g = ctx.createLinearGradient(0, 0, u, 0);
    const base = which === "fore" ? this.wings.fore : this.wings.hind;
    g.addColorStop(0, base);
    g.addColorStop(1, "rgba(255,255,255,0.25)");
    ctx.fillStyle = base;
    ctx.fill();
    ctx.fillStyle = g;
    ctx.globalAlpha *= 0.35;
    ctx.fill();
    ctx.globalAlpha /= 0.35;
    // Spots along the outer edge.
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const spots = which === "fore" ? [[0.95, -0.72], [1.02, -0.45], [0.78, -0.86]] : [[0.72, 0.62], [0.5, 0.82]];
    for (const [sx, sy] of spots) {
      ctx.beginPath();
      ctx.arc(sx * u, sy * u, u * 0.05, 0, TAU);
      ctx.fill();
    }
  }
}

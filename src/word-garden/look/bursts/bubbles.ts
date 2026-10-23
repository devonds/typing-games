// Bubbles: a soap bubble forms round the letter and carries it up, shimmering, until it pops.
import { clamp01, easeOutBack } from "../ui";
import { wind } from "../landscape";
import type { Palette } from "../palette";
import type { Glyph } from "../words";
import { TAU, rand, type Burst, type Ctx } from "./burst";

const POP_LENGTH = 0.32;

export class Bubble implements Burst {
  /** When it pops, so the pop sound can be timed to match. */
  readonly popAt = rand(1.2, 1.8);
  private age = 0;
  private x: number;
  private y: number;
  private vx = 0;
  private vy = 0;
  private readonly r: number;
  private readonly phase = rand(0, TAU);
  private readonly spin = rand(-0.6, 0.6);
  /** Each bubble leans its own way, so they spread out instead of queueing up. */
  private readonly lean = rand(-22, 22);
  private readonly rise = rand(-105, -70);

  constructor(private readonly g: Glyph, private readonly font: string) {
    this.x = g.cx;
    this.y = g.cy;
    this.r = g.size * rand(0.58, 0.66);
  }

  update(dt: number, t: number): boolean {
    this.age += dt;
    if (this.age < this.popAt && this.age > 0.12) {
      this.vy += (this.rise - this.vy) * dt * 2;
      this.vx += (this.lean + wind(t) * 18 + Math.sin(this.age * 3 + this.phase) * 10 - this.vx) * dt * 2;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    return this.age < this.popAt + POP_LENGTH;
  }

  draw(ctx: Ctx, p: Palette): void {
    if (this.age >= this.popAt) return this.drawPop(ctx);
    const grow = easeOutBack(clamp01(this.age / 0.22));
    const r = this.r * grow;
    // It wobbles: a little wider, then a little taller.
    const squash = 1 + Math.sin(this.age * 11 + this.phase) * 0.04 * grow;

    // The letter, carried inside.
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.font = this.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = p.accent;
    ctx.fillText(this.g.ch, 0, 1);

    ctx.scale(squash, 2 - squash);
    ctx.rotate(this.age * this.spin);
    // Clear film, just a touch of tint near the edge.
    const film = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r);
    film.addColorStop(0, "rgba(255,255,255,0.03)");
    film.addColorStop(0.8, "rgba(210,230,255,0.09)");
    film.addColorStop(1, "rgba(255,230,250,0.38)");
    ctx.fillStyle = film;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    // A rainbow sheen round the rim.
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = rimSheen(ctx, this.age * 0.8 + this.phase);
    ctx.stroke();
    // Window reflection and a tiny glint.
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.74, -2.55, -1.95);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(r * 0.42, r * 0.45, r * 0.06, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawPop(ctx: Ctx): void {
    const k = (this.age - this.popAt) / POP_LENGTH;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    // A quick ring, and a spray of tiny droplets.
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.2 * (1 - k);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * (1 + k * 0.5), 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "rgba(235,245,255,0.95)";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + this.phase;
      const d = this.r * (1 + k * (1 + (i % 3) * 0.4));
      ctx.beginPath();
      ctx.arc(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d + k * k * 6, 1.1 * (1 - k) + 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Soft pastel colours sliding round the rim, like light on soapy water. */
function rimSheen(ctx: Ctx, turn: number): CanvasGradient | string {
  if (!ctx.createConicGradient) return "rgba(255,255,255,0.7)";
  const g = ctx.createConicGradient(turn, 0, 0);
  const stops = ["rgba(255,190,230,0.75)", "rgba(255,236,170,0.7)", "rgba(180,245,215,0.7)", "rgba(170,210,255,0.75)", "rgba(215,190,255,0.7)"];
  stops.forEach((c, i) => g.addColorStop(i / stops.length, c));
  g.addColorStop(1, stops[0]);
  return g;
}

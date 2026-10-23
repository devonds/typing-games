// Flowers: a stem grows up out of the typed letter and a flower opens on top, so the sentence becomes a little
// garden. They sway together in the breeze. When the sentence moves on, the petals blow away.
import { clamp01, easeOutBack } from "../ui";
import { wind } from "../landscape";
import type { Palette } from "../palette";
import type { Glyph } from "../words";
import { TAU, pick, rand, type Burst, type Ctx } from "./burst";

interface Colours {
  petal: string;
  shade: string;
  centre: string;
}

const COLOURS: Colours[] = [
  { petal: "#f4aaa2", shade: "#e2818a", centre: "#f6d47a" }, // coral
  { petal: "#f8c9a2", shade: "#eca27b", centre: "#b9663f" }, // apricot
  { petal: "#f7e2a0", shade: "#eac66a", centre: "#b8743a" }, // butter
  { petal: "#d2bff0", shade: "#a993d9", centre: "#f3d37c" }, // lilac
  { petal: "#f5bcd0", shade: "#e48dae", centre: "#f6d47a" }, // rose
  { petal: "#fdf8f0", shade: "#e9dfd0", centre: "#efbb48" }, // white
];

/** Petal count, length and width (as fractions of the flower's radius). */
const SHAPES = [
  { name: "daisy", petals: 13, length: 1, width: 0.24 },
  { name: "cosmos", petals: 8, length: 0.95, width: 0.42 },
  { name: "buttercup", petals: 5, length: 0.82, width: 0.62 },
];

const STEM = "#6f9460";
const LEAF = "#8aae74";

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  phase: number;
}

export class Flower implements Burst {
  private age = 0;
  private t = 0;
  private released = -1;
  private readonly colours: Colours;
  private readonly shape = pick(SHAPES);
  private readonly radius: number;
  private readonly stem: number;
  private readonly baseY: number;
  private readonly turn = rand(0, TAU);
  private readonly phase = rand(0, TAU);
  private readonly leafSide: number;
  private petals: Petal[] = [];

  constructor(private readonly g: Glyph, order: number) {
    // Daisies are white or butter; the rest take any colour.
    this.colours = this.shape.name === "daisy" ? pick([COLOURS[5], COLOURS[5], COLOURS[2]]) : pick(COLOURS.slice(0, 5));
    this.radius = g.size * rand(0.42, 0.5);
    this.baseY = g.cy - g.size * 0.46;
    // Alternate short and tall stems so neighbouring flowers don't hide each other.
    this.stem = g.size * (order % 2 === 0 ? rand(0.5, 0.72) : rand(1.0, 1.25));
    this.leafSide = order % 2 === 0 ? 1 : -1;
  }

  private head(): { x: number; y: number } {
    const grow = easeOutBack(clamp01(this.age / 0.3));
    const sway = (wind(this.t) * 0.14 + Math.sin(this.t * 1.7 + this.phase) * 0.03) * this.stem;
    return { x: this.g.cx + sway * grow, y: this.baseY - this.stem * grow };
  }

  update(dt: number, t: number): boolean {
    this.age += dt;
    this.t = t;
    if (this.released < 0) return true;
    this.released += dt;
    const breeze = wind(t);
    for (const p of this.petals) {
      p.vx += (18 + breeze * 22 - p.vx) * dt * 1.5;
      p.vy += (14 - p.vy) * dt * 1.2;
      p.x += (p.vx + Math.sin(this.released * 4 + p.phase) * 14) * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    return this.released < 3;
  }

  release(): void {
    if (this.released >= 0) return;
    this.released = 0;
    const h = this.head();
    this.petals = Array.from({ length: 4 }, (_, i) => {
      const a = this.turn + (i / 4) * TAU;
      return {
        x: h.x + Math.cos(a) * this.radius * 0.6,
        y: h.y + Math.sin(a) * this.radius * 0.6,
        vx: Math.cos(a) * 20,
        vy: Math.sin(a) * 20 - 15,
        rot: a,
        spin: rand(-3, 3),
        phase: rand(0, TAU),
      };
    });
  }

  draw(ctx: Ctx, _p: Palette): void {
    const h = this.head();
    const fadeOut = this.released >= 0 ? clamp01(1 - this.released / 0.6) : 1;
    if (fadeOut > 0) {
      ctx.save();
      ctx.globalAlpha = fadeOut;
      this.drawStem(ctx, h);
      this.drawHead(ctx, h.x, h.y);
      ctx.restore();
    }
    // Loose petals drifting off on the breeze.
    if (this.released >= 0) {
      const a = clamp01((3 - this.released) / 1);
      for (const p of this.petals) {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, 0.55 + 0.45 * Math.cos(this.released * 5 + p.phase));
        this.petal(ctx, this.radius * this.shape.length, this.radius * Math.max(this.shape.width, 0.35));
        ctx.restore();
      }
    }
  }

  private drawStem(ctx: Ctx, h: { x: number; y: number }): void {
    const { cx } = this.g;
    ctx.strokeStyle = STEM;
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, this.baseY);
    ctx.quadraticCurveTo(cx - (h.x - cx) * 0.3, (this.baseY + h.y) / 2, h.x, h.y);
    ctx.stroke();
    // One leaf, part way up.
    const grow = clamp01((this.age - 0.15) / 0.3);
    if (grow > 0) {
      const ly = this.baseY + (h.y - this.baseY) * 0.35;
      const lx = cx + (h.x - cx) * 0.2;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(this.leafSide * -0.7);
      ctx.scale(grow * this.leafSide, grow);
      ctx.fillStyle = LEAF;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(this.g.size * 0.18, -this.g.size * 0.1, this.g.size * 0.32, 0);
      ctx.quadraticCurveTo(this.g.size * 0.18, this.g.size * 0.08, 0, 0);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawHead(ctx: Ctx, x: number, y: number): void {
    const c = this.colours;
    const r = this.radius;
    // A bud first, then the petals open out.
    const bud = clamp01((this.age - 0.18) / 0.15);
    const open = easeOutBack(clamp01((this.age - 0.3) / 0.55));
    if (bud <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    if (open <= 0) {
      ctx.fillStyle = c.shade;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.22 * bud, r * 0.32 * bud, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.rotate(this.turn + (1 - open) * 0.8 + Math.sin(this.t * 1.2 + this.phase) * 0.05);
    // Seen a little from the side, which reads as more natural than perfectly face-on.
    ctx.scale(1, 0.9);
    const { petals, length, width } = this.shape;
    const len = r * length * (0.3 + 0.7 * open);
    const wid = r * width * (0.5 + 0.5 * open);
    const layers = this.shape.name === "buttercup" ? 2 : 1;
    for (let layer = 0; layer < layers; layer++) {
      for (let i = 0; i < petals; i++) {
        ctx.save();
        ctx.rotate((i / petals) * TAU + (layer * Math.PI) / petals);
        const k = layer === 1 ? 0.7 : 1;
        this.petal(ctx, len * k, wid * k);
        ctx.restore();
      }
    }
    // The centre.
    const cr = r * (this.shape.name === "daisy" ? 0.3 : 0.24) * Math.min(1, open);
    ctx.fillStyle = c.centre;
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(120,70,20,0.28)";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(Math.cos(i * 2.4) * cr * 0.5, Math.sin(i * 2.4) * cr * 0.5, cr * 0.13, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(-cr * 0.3, -cr * 0.35, cr * 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /** One petal pointing along +x from the centre, with a deeper colour at its base. */
  private petal(ctx: Ctx, len: number, wid: number): void {
    const c = this.colours;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.25, -wid * 0.6, len * 0.85, -wid * 0.55, len, 0);
    ctx.bezierCurveTo(len * 0.85, wid * 0.55, len * 0.25, wid * 0.6, 0, 0);
    ctx.fillStyle = c.petal;
    ctx.fill();
    ctx.strokeStyle = "rgba(90,50,60,0.16)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.15, -wid * 0.35, len * 0.45, -wid * 0.25, len * 0.55, 0);
    ctx.bezierCurveTo(len * 0.45, wid * 0.25, len * 0.15, wid * 0.35, 0, 0);
    ctx.fillStyle = c.shade;
    ctx.globalAlpha *= 0.55;
    ctx.fill();
    ctx.globalAlpha /= 0.55;
  }
}

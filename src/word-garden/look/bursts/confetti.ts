// Confetti: the letter puffs into paper pieces in sunset colours, which flutter down like real paper.
import { clamp01 } from "../ui";
import { wind } from "../landscape";
import type { Palette } from "../palette";
import type { Glyph } from "../words";
import { TAU, pick, rand, shrinkLetter, type Burst, type Ctx } from "./burst";

/** Front and back of each colour of paper. */
const PAPER: [string, string][] = [
  ["#f6c453", "#d9a23a"], // gold
  ["#f39b86", "#d77c69"], // apricot
  ["#e86f8a", "#c4566f"], // rose
  ["#fff1d9", "#e5d2b3"], // cream
  ["#a985b9", "#8a679c"], // plum
  ["#7fc3bf", "#5fa29e"], // sea green
];

const LIFE = 2.6;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  flip: number;
  flipSpeed: number;
  w: number;
  h: number;
  paper: [string, string];
  kind: "square" | "dot" | "ribbon";
  phase: number;
}

export class Confetti implements Burst {
  private age = 0;
  private readonly pieces: Piece[];

  constructor(private readonly g: Glyph, private readonly font: string) {
    this.pieces = Array.from({ length: 13 }, (_, i) => {
      const a = -Math.PI / 2 + rand(-0.7, 0.7);
      const speed = rand(200, 320);
      return {
        x: g.cx + rand(-3, 3),
        y: g.cy + rand(-3, 3),
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        rot: rand(0, TAU),
        spin: rand(-6, 6),
        flip: rand(0, TAU),
        flipSpeed: rand(6, 12),
        w: rand(3.2, 4.4),
        h: rand(5.5, 7.5),
        paper: pick(PAPER),
        kind: i < 1 ? "ribbon" : Math.random() < 0.2 ? "dot" : "square",
        phase: rand(0, TAU),
      };
    });
  }

  update(dt: number, t: number): boolean {
    this.age += dt;
    const breeze = wind(t);
    for (const p of this.pieces) {
      // Paper falls slowly: strong air drag, a low top speed, and a side-to-side flutter.
      p.vy += 300 * dt;
      p.vx *= Math.exp(-3 * dt);
      p.vy *= Math.exp(-3 * dt);
      if (p.vy > 32) p.vy = 32;
      p.x += (p.vx + Math.sin(this.age * 5 + p.phase) * 18 * clamp01(this.age - 0.3) + breeze * 8) * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      p.flip += p.flipSpeed * dt;
    }
    return this.age < LIFE;
  }

  draw(ctx: Ctx, pal: Palette): void {
    shrinkLetter(ctx, pal, this.g, this.font, this.age, 0.1);
    const alpha = clamp01((LIFE - this.age) / 0.6);
    for (const p of this.pieces) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const turn = Math.cos(p.flip);
      // Show the darker back of the paper when it's turned away.
      ctx.fillStyle = turn > 0 ? p.paper[0] : p.paper[1];
      if (p.kind === "ribbon") {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) {
          const y = (i - 4) * 1.8;
          const x = Math.sin(i * 0.9 + p.flip) * 2.2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (p.kind === "dot") {
        ctx.scale(1, Math.abs(turn) * 0.8 + 0.2);
        ctx.beginPath();
        ctx.arc(0, 0, p.w * 0.6, 0, TAU);
        ctx.fill();
      } else {
        ctx.scale(Math.abs(turn) * 0.85 + 0.15, 1);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
  }
}

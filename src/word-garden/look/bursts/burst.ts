// What every kind of burst shares: the interface, a little randomness, and the letter shrinking away as it turns
// into something.
import type { Palette } from "../palette";
import type { Glyph } from "../words";

export type Ctx = CanvasRenderingContext2D;
export const TAU = Math.PI * 2;

export interface Burst {
  /** `t` is scene time (for the shared breeze). Returns false when finished. */
  update(dt: number, t: number): boolean;
  draw(ctx: Ctx, p: Palette): void;
  /** The sentence is done and moving on: flowers let go of their petals. Others just carry on. */
  release?(): void;
}

export const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);
export const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];

/** The typed letter shrinking into the spot the burst grows from. */
export function shrinkLetter(ctx: Ctx, p: Palette, g: Glyph, font: string, age: number, length = 0.2): void {
  const k = age / length;
  if (k >= 1) return;
  ctx.save();
  ctx.translate(g.cx, g.cy);
  ctx.scale(1 - k * 0.7, 1 - k * 0.7);
  ctx.globalAlpha = 1 - k;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = p.accent;
  ctx.fillText(g.ch, 0, 0);
  ctx.restore();
}

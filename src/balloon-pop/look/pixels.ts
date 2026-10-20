// Crisp pixel drawing on a Canvas 2D context: no anti-aliasing, every coordinate rounded to a whole pixel.
import { H, W } from "../config";
import { ADVANCE, glyphFor, textWidth } from "./font";

/** Circle half-width at row dy; the +0.5 gives rounder small circles. */
function span(r: number, dy: number): number {
  return Math.floor(Math.sqrt((r + 0.5) ** 2 - dy * dy));
}

export class Pixels {
  private fill = "";
  private readonly patterns = new Map<string, CanvasPattern>();

  constructor(readonly ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;
  }

  private use(colour: string): void {
    if (colour !== this.fill) {
      this.ctx.fillStyle = colour;
      this.fill = colour;
    }
  }

  rect(x: number, y: number, w: number, h: number, colour: string): void {
    this.use(colour);
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** 1-pixel outline of a rectangle. */
  rectb(x: number, y: number, w: number, h: number, colour: string): void {
    this.rect(x, y, w, 1, colour);
    this.rect(x, y + h - 1, w, 1, colour);
    this.rect(x, y, 1, h, colour);
    this.rect(x + w - 1, y, 1, h, colour);
  }

  pset(x: number, y: number, colour: string): void {
    this.rect(x, y, 1, 1, colour);
  }

  circ(cx: number, cy: number, r: number, colour: string): void {
    cx = Math.round(cx);
    cy = Math.round(cy);
    for (let dy = -r; dy <= r; dy++) {
      const dx = span(r, dy);
      this.rect(cx - dx, cy + dy, dx * 2 + 1, 1, colour);
    }
  }

  /** 1-pixel circle outline. */
  circb(cx: number, cy: number, r: number, colour: string): void {
    cx = Math.round(cx);
    cy = Math.round(cy);
    r = Math.round(r);
    for (let dy = -r; dy <= r; dy++) {
      const outer = span(r, dy);
      const inner = Math.abs(dy) <= r - 1 ? span(r - 1, dy) : -1;
      if (inner < 0) {
        this.rect(cx - outer, cy + dy, outer * 2 + 1, 1, colour);
      } else {
        this.rect(cx - outer, cy + dy, outer - inner, 1, colour);
        this.rect(cx + inner + 1, cy + dy, outer - inner, 1, colour);
      }
    }
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, colour: string): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.rect(x0, y0, 1, 1, colour);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Fill every other pixel in a checkerboard: the retro way to blend two colours. */
  dither(x: number, y: number, w: number, h: number, colour: string): void {
    let pattern = this.patterns.get(colour);
    if (!pattern) {
      const tile = document.createElement("canvas");
      tile.width = tile.height = 2;
      const t = tile.getContext("2d")!;
      t.fillStyle = colour;
      t.fillRect(0, 0, 1, 1);
      t.fillRect(1, 1, 1, 1);
      pattern = this.ctx.createPattern(tile, "repeat")!;
      this.patterns.set(colour, pattern);
    }
    this.ctx.fillStyle = pattern;
    this.fill = "";
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  text(s: string, x: number, y: number, colour: string, scale = 1): void {
    this.use(colour);
    x = Math.round(x);
    y = Math.round(y);
    for (let i = 0; i < s.length; i++) {
      const runs = glyphFor(s[i]);
      if (!runs) continue;
      const ox = x + i * ADVANCE * scale;
      for (const [row, col, len] of runs) this.ctx.fillRect(ox + col * scale, y + row * scale, len * scale, scale);
    }
  }

  /** Text with a drop shadow, so it reads on any background. */
  label(s: string, x: number, y: number, colour: string, shadow: string, scale = 1): void {
    this.text(s, x + scale, y + scale, shadow, scale);
    this.text(s, x, y, colour, scale);
  }

  centred(s: string, cx: number, y: number, colour: string, shadow?: string, scale = 1): void {
    const x = cx - Math.floor(textWidth(s, scale) / 2);
    if (shadow) this.label(s, x, y, colour, shadow, scale);
    else this.text(s, x, y, colour, scale);
  }
}

/** Draw something once into an off-screen canvas, to paste every frame with drawImage. */
export function prerender(draw: (p: Pixels) => void): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  draw(new Pixels(canvas.getContext("2d")!));
  return canvas;
}

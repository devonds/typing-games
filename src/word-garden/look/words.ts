// The sentence on screen: laid out on one line, with a marker gliding under the next letter to type.
import { SENTENCE, W } from "../config";
import { isTyped } from "../game/round";
import type { Palette } from "./palette";
import { SANS, clamp01, shadowScale } from "./ui";

type Ctx = CanvasRenderingContext2D;

/** A spare canvas just for measuring text, so a sentence can be laid out before it's drawn. */
let measurer: Ctx | null = null;
function measure(): Ctx {
  return (measurer ??= document.createElement("canvas").getContext("2d")!);
}

export interface Glyph {
  ch: string;
  index: number;
  /** Left edge and baseline. */
  x: number;
  y: number;
  w: number;
  /** Middle of the letter, where bursts start. */
  cx: number;
  cy: number;
  /** Height of a capital, for sizing bursts. */
  size: number;
}

export class Words {
  readonly glyphs: Glyph[] = [];
  readonly font: string;
  readonly size: number;
  /** When each letter was typed (scene time), to fade it. */
  private typedAt = new Map<number, number>();
  private caretX = 0;
  private caretW = 0;
  private shake = 0;
  private t = 0;

  /** `big`: bigger letters, for little hands. */
  constructor(readonly text: string, big = false) {
    const ctx = measure();
    // As big as possible, up to the maximum, on one line.
    const max = big ? SENTENCE.littleMaxSize : SENTENCE.maxSize;
    const min = big ? SENTENCE.littleMinSize : SENTENCE.minSize;
    let size = max;
    ctx.font = `600 ${size}px ${SANS}`;
    const width = ctx.measureText(text).width;
    if (width > SENTENCE.maxWidth) size = Math.max(min, Math.floor((size * SENTENCE.maxWidth) / width));
    this.size = size;
    this.font = `600 ${size}px ${SANS}`;
    ctx.font = this.font;
    const left = W / 2 - ctx.measureText(text).width / 2;
    const baseline = SENTENCE.y + size * 0.36;
    for (let i = 0; i < text.length; i++) {
      const x = left + ctx.measureText(text.slice(0, i)).width;
      const w = ctx.measureText(text[i]).width;
      this.glyphs.push({ ch: text[i], index: i, x, y: baseline, w, cx: x + w / 2, cy: baseline - size * 0.36, size });
    }
  }

  /** Call once the marker should sit under `pos` (the next character). */
  update(dt: number, pos: number): void {
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt);
    const g = this.glyphs[pos];
    if (!g) return;
    const targetW = g.ch === " " ? this.size * 0.42 : Math.max(g.w, this.size * 0.36);
    const targetX = g.cx - targetW / 2;
    if (this.caretW === 0) {
      this.caretX = targetX;
      this.caretW = targetW;
    }
    const k = 1 - Math.exp(-dt * 22);
    this.caretX += (targetX - this.caretX) * k;
    this.caretW += (targetW - this.caretW) * k;
  }

  typed(index: number): void {
    this.typedAt.set(index, this.t);
  }

  wrong(): void {
    this.shake = 0.35;
  }

  /**
   * `pos`: next character to type (or past the end when done). `keepTyped`: typed letters stay solid (flowers grow
   * out of them); otherwise they fade back to a whisper, having turned into something.
   */
  draw(ctx: Ctx, p: Palette, pos: number, keepTyped: boolean, alpha = 1): void {
    const wobble = this.shake > 0 ? Math.sin(this.t * 70) * 2.5 * (this.shake / 0.35) : 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = this.font;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.shadowColor = p.textGlow;
    ctx.shadowBlur = 8 * shadowScale(ctx);
    for (const g of this.glyphs) {
      if (g.ch === " ") continue;
      const i = g.index;
      if (i < pos && isTyped(g.ch)) {
        const since = this.t - (this.typedAt.get(i) ?? -10);
        // Typed letters vanish as they turn into something, then come back faintly so the sentence stays readable.
        const a = keepTyped ? 1 : 0.32 * clamp01((since - 0.25) / 0.5);
        if (a <= 0) continue;
        ctx.globalAlpha = alpha * a;
        ctx.fillStyle = keepTyped ? p.ink : p.inkSoft;
        ctx.fillText(g.ch, g.x, g.y);
        ctx.globalAlpha = alpha;
        continue;
      }
      if (i < pos) {
        // Punctuation that was filled in.
        ctx.fillStyle = keepTyped ? p.ink : p.inkSoft;
        ctx.globalAlpha = alpha * (keepTyped ? 1 : 0.32);
        ctx.fillText(g.ch, g.x, g.y);
        ctx.globalAlpha = alpha;
        continue;
      }
      if (i === pos) {
        const lift = -1.5 + Math.sin(this.t * 5) * 1;
        ctx.fillStyle = this.shake > 0 ? "#e0607a" : p.accent;
        ctx.fillText(g.ch, g.x + wobble, g.y + lift);
        continue;
      }
      ctx.fillStyle = p.ink;
      ctx.fillText(g.ch, g.x, g.y);
    }
    // The marker under the next character.
    if (pos < this.glyphs.length) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = this.shake > 0 ? "#e0607a" : p.accent;
      ctx.beginPath();
      ctx.roundRect(this.caretX + wobble, this.glyphs[0].y + this.size * 0.2, this.caretW, Math.max(2.5, this.size * 0.1), 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

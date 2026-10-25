// Type, panels and the little bits round the play: progress dots, cheers.
import { W } from "../config";
import { fade, type Palette } from "./palette";

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

/** Clean and very readable, for the sentences. */
export const SANS = `"Avenir Next", Avenir, Nunito, "Segoe UI", "Helvetica Neue", system-ui, sans-serif`;
/** A storybook serif for titles and cheers. */
export const SERIF = `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`;

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const easeOutBack = (p: number): number => 1 + 2.4 * (p - 1) ** 3 + 1.4 * (p - 1) ** 2;
export const easeOut = (p: number): number => 1 - (1 - p) ** 3;

/** Canvas shadows are measured in device pixels; this gives scene units. */
export function shadowScale(ctx: Ctx): number {
  return ctx.getTransform().a;
}

export function text(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  font: string,
  fill: string,
  align: CanvasTextAlign = "center",
  glow?: string,
): void {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 6 * shadowScale(ctx);
  }
  ctx.fillStyle = fill;
  ctx.fillText(s, x, y);
  ctx.restore();
}

/** On for half of each period: for "press Enter" prompts. */
export function blink(t: number, perSecond = 1): boolean {
  return (t * perSecond) % 1 < 0.5;
}

/** A frosted card for the menu and results. */
export function drawPanel(ctx: Ctx, p: Palette, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.shadowColor = "rgba(30,20,50,0.18)";
  ctx.shadowBlur = 14 * shadowScale(ctx);
  ctx.shadowOffsetY = 3 * shadowScale(ctx);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fillStyle = p.panel;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 13.5);
  ctx.strokeStyle = p.panelEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** One dot per sentence along the top: done, current, still to come. */
export function drawProgress(ctx: Ctx, p: Palette, count: number, current: number, doneCurrent: boolean): void {
  const gap = 11;
  const left = W / 2 - ((count - 1) * gap) / 2;
  for (let i = 0; i < count; i++) {
    const x = left + i * gap;
    const done = i < current || (i === current && doneCurrent);
    ctx.beginPath();
    ctx.arc(x, 15, done ? 2.6 : 2.4, 0, TAU);
    if (done) {
      ctx.fillStyle = fade(p.ink, 0.75);
      ctx.fill();
    } else {
      ctx.strokeStyle = fade(p.ink, i === current ? 0.75 : 0.3);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

/** The one-minute check's clock: a thin line along the top that fills gently, `p` 0..1. No numbers, no ticking. */
export function drawClock(ctx: Ctx, p: Palette, progress: number, alpha = 1): void {
  const width = 150;
  const left = W / 2 - width / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineWidth = 2;
  ctx.strokeStyle = fade(p.ink, 0.18);
  ctx.beginPath();
  ctx.moveTo(left, 15);
  ctx.lineTo(left + width, 15);
  ctx.stroke();
  const filled = Math.max(0, Math.min(1, progress)) * width;
  if (filled > 0) {
    ctx.strokeStyle = fade(p.accent, 0.8);
    ctx.beginPath();
    ctx.moveTo(left, 15);
    ctx.lineTo(left + filled, 15);
    ctx.stroke();
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(left + filled, 15, 2.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** A word of praise that swells in and fades, e.g. "Lovely!" after a sentence. */
export function drawCheer(ctx: Ctx, p: Palette, word: string, age: number, y: number): void {
  const life = 1.7;
  if (age < 0 || age > life) return;
  const s = 0.85 + 0.15 * easeOutBack(clamp01(age / 0.4));
  ctx.save();
  ctx.globalAlpha = clamp01(age / 0.2) * clamp01((life - age) / 0.45);
  ctx.translate(W / 2, y - age * 6);
  ctx.scale(s, s);
  text(ctx, word, 0, 0, `italic 600 26px ${SERIF}`, p.ink, "center", p.textGlow);
  ctx.restore();
}

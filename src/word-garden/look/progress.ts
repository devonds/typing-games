// Progress between rounds: a little keyboard where each key in play fills with its finger's colour as it's learned,
// new keys opening like flowers, and stars for little hands. Only ever drawn on the results screen, never in play.
import { KEYS, type Key } from "../../shared/keyboard";
import { fade, mix, type Palette } from "./palette";
import { tints, drawBump } from "./keyboard";
import { SANS, clamp01, easeOutBack, shadowScale } from "./ui";

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const LETTERS = KEYS.filter((k) => /^[a-z]$/.test(k.key));
/** The letter rows' width in key widths: P's right edge on the top row, M's on the bottom. */
const WIDTH = 10;

export interface KeyProgress {
  /** Each key in play, 0..1 towards mastered. */
  progress: ReadonlyMap<string, number>;
  /** Keys just unlocked: they bloom. */
  fresh: ReadonlySet<string>;
}

function box(k: Key, x: number, y: number, pitch: number) {
  const gap = pitch * 0.14;
  return { x: x + k.x * pitch + gap / 2, y: y + k.row * pitch, w: pitch - gap, h: pitch - gap };
}

/** The letter keys, centred on `cx` with their top at `y`. `age` is seconds since the screen opened. */
export function drawKeyProgress(ctx: Ctx, p: Palette, cx: number, y: number, pitch: number, keys: KeyProgress, age: number): void {
  const c = tints(p);
  const night = p.stars;
  const left = cx - (WIDTH * pitch) / 2;
  const r = pitch * 0.22;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  LETTERS.forEach((k, i) => {
    const b = box(k, left, y, pitch);
    const value = keys.progress.get(k.key);
    const fresh = keys.fresh.has(k.key);
    const inPlay = value !== undefined || fresh;
    // Keys fill one after another as the screen opens.
    const fill = clamp01((age - 0.3 - i * 0.025) / 0.6) * (value ?? 0);

    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, r);
    ctx.fillStyle = fade(c.cap[k.finger], inPlay ? 0.55 : 0.16);
    ctx.fill();
    if (fill > 0) {
      // The learned part, rising from the bottom of the key.
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, r);
      ctx.clip();
      ctx.fillStyle = fade(c.lit[k.finger], 0.85);
      ctx.fillRect(b.x, b.y + b.h * (1 - fill), b.w, b.h * fill);
      ctx.restore();
    }
    if (value !== undefined && value >= 1) {
      // Mastered: a soft white rim.
      ctx.strokeStyle = fade("#ffffff", 0.7 * clamp01((age - 0.9) / 0.4));
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.roundRect(b.x + 0.4, b.y + 0.4, b.w - 0.8, b.h - 0.8, r);
      ctx.stroke();
    }
    if (fresh) drawBloom(ctx, c.lit[k.finger], b.x + b.w / 2, b.y + b.h / 2, b.w, age, k.key.charCodeAt(0));
    if (k.bump) drawBump(ctx, b.x + b.w / 2, b.y + b.h - pitch * 0.14, pitch * 0.18, fade("#ffffff", inPlay ? 0.7 : 0.3));
    ctx.font = `600 ${pitch * 0.42}px ${SANS}`;
    ctx.fillStyle = fade(fresh && night > 0.5 ? "#ffffff" : c.ink, inPlay ? 0.8 : 0.25);
    ctx.fillText(k.key.toUpperCase(), b.x + b.w / 2, b.y + b.h / 2 - 0.3);
  });
  ctx.restore();
}

/** A new key opening like a flower: petals in its finger's colour, swelling out and turning slowly. */
function drawBloom(ctx: Ctx, colour: string, x: number, y: number, size: number, age: number, seed: number): void {
  const open = easeOutBack(clamp01((age - 0.9) / 0.9));
  if (open <= 0) return;
  const turn = age * 0.25 + seed;
  ctx.save();
  ctx.shadowColor = fade(colour, 0.8);
  ctx.shadowBlur = 8 * shadowScale(ctx) * clamp01(open);
  for (let i = 0; i < 6; i++) {
    const a = turn + (i / 6) * TAU;
    const d = size * 0.62 * open;
    ctx.save();
    ctx.translate(x + Math.cos(a) * d, y + Math.sin(a) * d);
    ctx.rotate(a);
    ctx.fillStyle = fade(mix(colour, "#ffffff", i % 2 ? 0.35 : 0.1), 0.75);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.3 * open, size * 0.17 * open, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** A five-pointed star, filled when earned. `pop` 0..1 swells it in. */
export function drawStar(ctx: Ctx, p: Palette, x: number, y: number, radius: number, earned: boolean, pop: number): void {
  const s = earned ? easeOutBack(clamp01(pop)) : 1;
  if (s <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? radius * 0.46 : radius;
    ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.lineJoin = "round";
  if (earned) {
    ctx.shadowColor = "rgba(255,210,110,0.7)";
    ctx.shadowBlur = 10 * shadowScale(ctx);
    ctx.fillStyle = "#f6cf66";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#e3a93e";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.strokeStyle = fade(p.inkSoft, 0.5);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.restore();
}

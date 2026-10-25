// "Fingers on the bumps": the home row drawn large, with two pointer fingers resting on F and J. Each key glows as
// it's held; once both are down, a soft ring blooms out from each and the row fades away for the first sentence.
import type { RitualView } from "../../shared/ritual";
import { FINGER_COLOURS, KEYS, type Key } from "../../shared/keyboard";
import { RITUAL, W } from "../config";
import { drawBump, drawKeyCap, tints, type KeyBox } from "./keyboard";
import { fade, mix, type Palette } from "./palette";
import { SANS, SERIF, clamp01, easeOut, shadowScale, text } from "./ui";

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

const HOME_ROW = KEYS.filter((k) => k.row === 1);
const FIRST_X = HOME_ROW[0].x;
const ROW_WIDTH = HOME_ROW.length * RITUAL.pitch;

function bigBox(k: Key): KeyBox {
  const size = RITUAL.pitch - 4;
  return { x: W / 2 - ROW_WIDTH / 2 + (k.x - FIRST_X) * RITUAL.pitch + 2, y: RITUAL.y - size / 2, w: size, h: size };
}

/** A pointer finger coming up from below to rest on a key, leaning in a little like a real hand. */
function drawFinger(ctx: Ctx, p: Palette, b: KeyBox, lean: number, down: number, night: number): void {
  const tipX = b.x + b.w / 2;
  const tipY = b.y + b.h * 0.42 + down;
  const width = b.w * 0.56;
  const angle = Math.atan2(lean, 120);
  const colour = mix(mix(FINGER_COLOURS.leftIndex, "#ffffff", 0.35), mix(FINGER_COLOURS.leftIndex, p.hillFar, 0.35), night);
  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(-angle);
  ctx.shadowColor = "rgba(30,20,50,0.2)";
  ctx.shadowBlur = 6 * shadowScale(ctx);
  ctx.shadowOffsetY = 1.5 * shadowScale(ctx);
  // The finger: a long rounded shape, fading away below like a ghost of a hand.
  const length = 96;
  const body = ctx.createLinearGradient(0, 0, 0, length);
  body.addColorStop(0, fade(colour, 0.92));
  body.addColorStop(0.45, fade(colour, 0.7));
  body.addColorStop(1, fade(colour, 0));
  ctx.beginPath();
  ctx.roundRect(-width / 2, 0, width, length, [width / 2, width / 2, 0, 0]);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.shadowColor = "transparent";
  // A soft shine down one side, the nail, and a knuckle crease.
  ctx.fillStyle = fade("#ffffff", 0.22);
  ctx.beginPath();
  ctx.roundRect(-width / 2 + 2, 3, width * 0.22, 40, width * 0.11);
  ctx.fill();
  ctx.fillStyle = fade("#ffffff", 0.5 - night * 0.2);
  ctx.beginPath();
  ctx.roundRect(-width * 0.27, 2.5, width * 0.54, width * 0.62, [width * 0.27, width * 0.27, 3, 3]);
  ctx.fill();
  ctx.strokeStyle = fade(mix(colour, p.ink, 0.5), 0.35);
  ctx.lineWidth = 0.8;
  ctx.lineCap = "round";
  for (const y of [width * 1.55, width * 1.7]) {
    ctx.beginPath();
    ctx.moveTo(-width * 0.18, y);
    ctx.lineTo(width * 0.18, y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The whole moment. Little hands press F, then J, rather than holding both. `glow` holds how lit F and J are (eased towards held), `t` is scene time, `outro` runs 0 -> 1
 * as the row fades away after both are held.
 */
export function drawRitual(ctx: Ctx, p: Palette, view: RitualView, glow: { f: number; j: number }, t: number, outro: number, littleHands = false): void {
  const c = tints(p);
  const night = p.stars;
  const fade0 = 1 - easeOut(outro);
  if (fade0 <= 0) return;

  ctx.save();
  ctx.globalAlpha = fade0;
  text(ctx, "Fingers on the bumps", W / 2, 62, `italic 600 24px ${SERIF}`, p.ink, "center", p.textGlow);
  text(ctx, "Rest your pointer fingers on F and J. Feel the little bumps?", W / 2, 88, `500 10px ${SANS}`, p.ink, "center", p.textGlow);
  const breathe = view.f && view.j ? 1 : 0.65 + 0.35 * Math.sin(t * 3);
  ctx.globalAlpha = fade0 * breathe;
  const ask = !littleHands ? "Hold them down to begin." : view.f ? "Now press J." : "Press F, then J.";
  text(ctx, ask, W / 2, 103, `600 10px ${SANS}`, p.ink, "center", p.textGlow);
  ctx.globalAlpha = fade0;

  // The home row, big. F and J are the stars; the rest sit back.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const k of HOME_ROW) {
    const b = bigBox(k);
    const pointer = k.bump;
    const lit = k.key === "f" ? glow.f : k.key === "j" ? glow.j : 0;
    if (pointer) {
      ctx.save();
      ctx.shadowColor = fade(c.lit[k.finger], 0.4 + 0.6 * lit);
      ctx.shadowBlur = (4 + 14 * lit) * shadowScale(ctx);
      drawKeyCap(ctx, b, 7, mix(c.cap[k.finger], c.lit[k.finger], 0.35 + 0.65 * lit), fade(c.lip, 0.45), lit * 1.2);
      ctx.restore();
      ctx.fillStyle = fade("#ffffff", 0.18 + 0.2 * lit);
      ctx.beginPath();
      ctx.roundRect(b.x + 2, b.y + 1.5 + lit * 1.2, b.w - 4, b.h * 0.4, 5.5);
      ctx.fill();
    } else {
      drawKeyCap(ctx, b, 7, fade(c.cap[k.finger], 0.5), fade(c.lip, 0.15));
    }
    const letter = /[a-z]/.test(k.key);
    ctx.font = `600 ${pointer ? 13 : 11}px ${SANS}`;
    ctx.fillStyle = fade(lit > 0.5 && night > 0.5 ? "#ffffff" : c.ink, pointer ? 0.9 : letter ? 0.45 : 0.25);
    ctx.fillText(letter ? k.key.toUpperCase() : k.key, b.x + b.w / 2, b.y + b.h * 0.38 + (pointer ? lit * 1.2 : 0));
    if (pointer) drawBump(ctx, b.x + b.w / 2, b.y + b.h - 6 + lit * 1.2, 8, fade(c.ink, 0.5));
  }

  // The fingers, resting on the bumps; they press down a touch when the key is held.
  for (const k of HOME_ROW.filter((key) => key.bump)) {
    const b = bigBox(k);
    const lit = k.key === "f" ? glow.f : glow.j;
    drawFinger(ctx, p, b, k.key === "f" ? -16 : 16, 3 + lit * 1.6, night);
  }

  // Ready: a ring blooms out of each key, and a few sparks drift up.
  if (view.ready > 0 || outro > 0) {
    const bloom = clamp01(view.ready * 0.4 + outro * 0.8);
    for (const k of HOME_ROW.filter((key) => key.bump)) {
      const b = bigBox(k);
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const r = b.w * 0.55 + easeOut(bloom) * 26;
      ctx.strokeStyle = fade(night > 0.5 ? "#fff6d8" : "#ffffff", 0.85 * (1 - bloom));
      ctx.lineWidth = 1.6 * (1 - bloom) + 0.4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + (k.key === "f" ? 0.3 : 0.9);
        const d = b.w * 0.5 + easeOut(bloom) * 30;
        ctx.fillStyle = fade(i % 2 ? c.lit[k.finger] : "#fff6d8", 0.9 * (1 - bloom));
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d - bloom * 8, 1.3, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

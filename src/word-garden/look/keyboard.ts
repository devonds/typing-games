// The finger keyboard: frosted keys resting on the meadow, each tinted by the finger that presses it, in colours
// taken from the time of day. The next key glows in its finger's colour; after a wrong key the right one pulses.
import type { GuideView } from "../../shared/guide";
import { EXTRA_KEYS, FINGER_COLOURS, KEYBOARD_WIDTH, KEYS, keyFor, type Finger, type Key } from "../../shared/keyboard";
import { KEYBOARD, W } from "../config";
import { fade, mix, type Palette } from "./palette";
import { SANS, clamp01, shadowScale } from "./ui";

type Ctx = CanvasRenderingContext2D;

/** The colours the keyboard needs for one palette. Worked out once per palette, since mixing isn't free. */
interface Tints {
  /** Each finger's colour, softened towards the sky so it sits in the scene. */
  finger: Record<Finger, string>;
  /** The same, brighter, for the key to press next. */
  lit: Record<Finger, string>;
  /** A resting key: frost with its finger's tint. */
  cap: Record<Finger, string>;
  lip: string;
  ink: string;
}

const cache = new WeakMap<Palette, Tints>();

/** How dark a palette is (night is 1): night keys glow rather than tint. */
const darkness = (p: Palette): number => p.stars;

export function tints(p: Palette): Tints {
  let t = cache.get(p);
  if (t) return t;
  const night = darkness(p);
  const finger = {} as Record<Finger, string>;
  const lit = {} as Record<Finger, string>;
  const cap = {} as Record<Finger, string>;
  const frost = mix(mix(p.haze, "#ffffff", 0.4), p.hillFar, night);
  for (const f of Object.keys(FINGER_COLOURS) as Finger[]) {
    // By day, wash the colour towards the pale sky; by night, sink it into the dark hills.
    finger[f] = mix(mix(FINGER_COLOURS[f], p.skyLow, 0.42), mix(FINGER_COLOURS[f], p.hillFar, 0.55), night);
    lit[f] = FINGER_COLOURS[f];
    cap[f] = mix(frost, finger[f], 0.6 + 0.2 * night);
  }
  t = {
    finger,
    lit,
    cap,
    lip: mix(p.hillNear, p.meadow, 0.6),
    ink: p.ink,
  };
  cache.set(p, t);
  return t;
}

/** Where a key sits on screen. */
export interface KeyBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const LEFT = W / 2 - (KEYBOARD_WIDTH * KEYBOARD.pitch) / 2;

export function keyBox(k: Key): KeyBox {
  const { pitch, gap, top, spaceH } = KEYBOARD;
  return {
    x: LEFT + k.x * pitch + gap / 2,
    y: top + k.row * pitch,
    w: k.w * pitch - gap,
    h: k.row === 3 ? spaceH : pitch - gap,
  };
}

/** Letters the games use; the punctuation keys are drawn as quiet blanks. */
const isLetter = (k: Key): boolean => /[a-z]/.test(k.key);

/** A rounded key: frosted glass tinted by its finger, with a soft lip underneath. */
export function drawKeyCap(ctx: Ctx, b: KeyBox, r: number, fill: string, lip: string, press = 0): void {
  ctx.fillStyle = lip;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y + 1.2, b.w, b.h, r);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y + press, b.w, b.h, r);
  ctx.fill();
}

/** The little raised line on F and J. */
export function drawBump(ctx: Ctx, cx: number, y: number, w: number, colour: string): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(0.9, w * 0.22);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, y);
  ctx.lineTo(cx + w / 2, y);
  ctx.stroke();
}

/** The later stages: Shift keys while capitals need Shift, and the punctuation keys once they're typed. */
export interface KeyboardExtras {
  capitals: boolean;
  punctuation: boolean;
  /** The Shift key to light ("shiftLeft" or "shiftRight"), or null. */
  shift: string | null;
  /** After a capital typed without Shift: the right Shift key flashes, 1 -> 0. */
  shiftFlash: number;
  shiftFlashKey: string | null;
}

export const NO_EXTRAS: KeyboardExtras = { capitals: false, punctuation: false, shift: null, shiftFlash: 0, shiftFlashKey: null };

const SHIFT_LABEL = "shift";
const BY_NAME = new Map(EXTRA_KEYS.map((k) => [k.key, k]));

/** After a wrong key: a key pulses twice, with a ring spreading out from it. */
function drawFlash(ctx: Ctx, b: KeyBox, colour: string, ink: string, flash: number, night: number): void {
  const pulse = ((1 - flash) * 2) % 1;
  const strength = clamp01(flash * 1.6);
  ctx.save();
  ctx.shadowColor = colour;
  ctx.shadowBlur = 10 * strength * shadowScale(ctx);
  ctx.strokeStyle = fade(night > 0.5 ? "#ffffff" : colour, strength * (1 - pulse));
  ctx.lineWidth = 1.8;
  const grow = 1 + pulse * 3.5;
  ctx.beginPath();
  ctx.roundRect(b.x - grow, b.y - grow, b.w + grow * 2, b.h + grow * 2, KEYBOARD.radius + grow);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = fade(night > 0.5 ? "#ffffff" : mix(colour, ink, 0.35), strength);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.roundRect(b.x - 0.5, b.y - 0.5, b.w + 1, b.h + 1, KEYBOARD.radius + 0.5);
  ctx.stroke();
}

/** The keyboard, lit by the guide. `t` drives the gentle breathing of the lit key; `alpha` fades it all. */
export function drawKeyboard(ctx: Ctx, p: Palette, view: GuideView, t: number, alpha = 1, extras: KeyboardExtras = NO_EXTRAS): void {
  if (!view.visible || alpha <= 0) return;
  const c = tints(p);
  const night = darkness(p);
  const homeOf = view.targetFinger && view.targetFinger !== "thumb" ? KEYS.find((k) => k.home && k.finger === view.targetFinger) : undefined;
  // "?" is typed on the "/" key, so light the key a character is on rather than the character itself.
  const targetKey = view.target ? keyFor(view.target)?.key : undefined;
  const keys = [...KEYS];
  if (extras.punctuation) keys.push(BY_NAME.get("'")!);
  if (extras.capitals) keys.push(BY_NAME.get("shiftLeft")!, BY_NAME.get("shiftRight")!);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 7px ${SANS}`;

  for (const k of keys) {
    const b = keyBox(k);
    const shiftKey = k.key.startsWith("shift");
    const letter = isLetter(k) || k.key === " " || shiftKey || extras.punctuation;
    const target = targetKey === k.key || extras.shift === k.key;
    const strength = !letter ? 0.22 : k.home ? 0.72 : 0.55;
    if (target) {
      // The key to press next, breathing softly in its finger's colour.
      const breathe = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.save();
      ctx.shadowColor = fade(c.lit[k.finger], 0.9);
      ctx.shadowBlur = (6 + breathe * 4) * shadowScale(ctx);
      drawKeyCap(ctx, b, KEYBOARD.radius, c.lit[k.finger], fade(c.lip, 0.5), -0.6);
      ctx.restore();
      ctx.strokeStyle = fade("#ffffff", 0.55 + 0.25 * breathe);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.roundRect(b.x - 0.2, b.y - 0.8, b.w + 0.4, b.h + 0.4, KEYBOARD.radius + 0.2);
      ctx.stroke();
      ctx.fillStyle = fade("#ffffff", 0.25 + 0.15 * breathe);
      ctx.beginPath();
      ctx.roundRect(b.x + 1.2, b.y + 0.6, b.w - 2.4, b.h * 0.42, KEYBOARD.radius - 1);
      ctx.fill();
    } else {
      drawKeyCap(ctx, b, KEYBOARD.radius, fade(c.cap[k.finger], strength), fade(c.lip, 0.22 * strength));
    }

    // Home keys, where fingers rest, catch a little more light along the top.
    if (k.home && k.row === 1 && !target) {
      ctx.fillStyle = fade("#ffffff", 0.16 * (1 - night * 0.5));
      ctx.beginPath();
      ctx.roundRect(b.x + 1.2, b.y + 0.6, b.w - 2.4, b.h * 0.4, KEYBOARD.radius - 1);
      ctx.fill();
    }
    if (k.bump) drawBump(ctx, b.x + b.w / 2, b.y + b.h - 2 - (target ? 0.6 : 0), 2.4, fade("#ffffff", target ? 0.9 : 0.75 - night * 0.3));

    if (k.key !== " ") {
      const ink = target ? (night > 0.5 ? "#ffffff" : mix(c.ink, c.lit[k.finger], 0.15)) : c.ink;
      ctx.fillStyle = fade(ink, target ? 0.95 : letter ? 0.62 : 0.3);
      // Once "?" is typed, its key says so (it's what a child looks for).
      const label = shiftKey ? SHIFT_LABEL : isLetter(k) ? k.key.toUpperCase() : extras.punctuation && k.key === "/" ? "?" : k.key;
      if (shiftKey) ctx.font = `600 6px ${SANS}`;
      ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - 0.8 - (target ? 0.6 : 0));
      if (shiftKey) ctx.font = `600 7px ${SANS}`;
    }

    // Where the finger for the lit key starts from: a small dot on its home key.
    if (homeOf === k && !target) {
      ctx.fillStyle = fade(c.lit[k.finger], 0.9);
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + 2.6, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // After a wrong key: the right key pulses (and the right Shift key, for a capital typed without it).
  const flashKey = view.flashKey ? keyFor(view.flashKey) : undefined;
  if (flashKey && view.flash > 0) drawFlash(ctx, keyBox(flashKey), c.lit[flashKey.finger], c.ink, view.flash, night);
  const shiftFlash = extras.shiftFlashKey ? BY_NAME.get(extras.shiftFlashKey) : undefined;
  if (shiftFlash && extras.shiftFlash > 0 && extras.capitals) drawFlash(ctx, keyBox(shiftFlash), c.lit[shiftFlash.finger], c.ink, extras.shiftFlash, night);
  ctx.restore();
}

// "Fingers on the bumps": the home row as big keycaps, F and J larger still, with a white circus glove's pointer
// finger over each. A held key sinks and lights up; with both held, rings burst out and "READY!" pops up.
import type { RitualView } from "../../shared/ritual";
import { KEYS, type Key } from "../../shared/keyboard";
import { textWidth } from "./font";
import { C, FINGER_TINTS } from "./palette";
import type { Pixels } from "./pixels";
import { drawPanel } from "./ui";
import { H, W } from "../config";

const SMALL = 16;
const BIG = 24;
const GAP = 3;
/** Every keycap's bottom edge sits on this line. */
const BASE_Y = 90;
/** How far a held key sinks. */
const SINK = 2;
/** The front edge under each keycap's face, in pixels. */
const EDGE = 3;

const HOME_ROW = KEYS.filter((k) => k.row === 1);
const sizeOf = (k: Key): number => (k.bump ? BIG : SMALL);
const ROW_WIDTH = HOME_ROW.reduce((sum, k) => sum + sizeOf(k), 0) + GAP * (HOME_ROW.length - 1);

/** `prompt` outlines the key to press next. */
function keycap(p: Pixels, k: Key, x: number, held: boolean, prompt: boolean, glow: number, t: number): void {
  const size = sizeOf(k);
  const tint = FINGER_TINTS[k.finger];
  const sink = held ? SINK : 0;
  const top = BASE_Y - size + sink;
  const face = size - EDGE - sink;
  p.rect(x, top, size, size - sink, C.black);
  p.rect(x + 1, top + 1, size - 2, face - 1, held ? tint.lit : tint.dim);
  p.rect(x + 1, top + face, size - 2, EDGE - 1, C.charcoal); // front edge
  const scale = k.bump ? 2 : 1;
  const ink = held ? C.black : k.bump ? C.white : C.silver;
  const letter = k.key.toUpperCase();
  p.text(letter, x + Math.floor((size - textWidth(letter, scale)) / 2), top + 2, ink, scale);
  if (!k.bump) return;
  p.rect(x + size / 2 - 3, top + face - 3, 6, 2, held ? C.white : C.silver); // the bump
  if (prompt && Math.floor(t * 2) % 2 === 0) p.rectb(x - 2, top - 2, size + 4, size + 4, tint.lit); // "this one!"
  if (glow > 0 && glow < 1) p.circb(x + size / 2, top + face / 2, 10 + glow * 14, C.white);
}

/** A white circus glove pointing up from the bottom of the screen; tipY is the top of the fingertip. */
function glove(p: Pixels, cx: number, tipY: number, side: -1 | 1): void {
  const x = Math.round(cx) - 5;
  const fistY = tipY + 24;
  const fistX = side < 0 ? x - 11 : x;
  // The fist: three curled fingers to the outside of the pointer finger, with a cuff below.
  const knuckles = [0, 1, 2].map((i) => (side < 0 ? fistX + 4 + i * 6 : fistX + 18 - i * 6));
  for (const kx of knuckles) p.circ(kx, fistY + 3, 4, C.black);
  p.rect(fistX - 1, fistY + 3, 24, H, C.black);
  for (const kx of knuckles) p.circ(kx, fistY + 3, 3, C.white);
  p.rect(fistX, fistY + 3, 22, H, C.white);
  for (const kx of knuckles) p.rect(kx + 3 * side * -1, fistY + 3, 1, 5, C.silver); // creases between fingers
  p.rect(side < 0 ? fistX + 18 : fistX, fistY + 6, 4, H, C.silver);
  p.rect(fistX - 1, fistY + 14, 24, 2, C.black);
  p.rect(fistX, fistY + 16, 22, H, C.red); // a circus-red cuff
  // The pointer finger: a rounded column with a shaded side.
  p.circ(x + 5, tipY + 5, 5, C.black);
  p.rect(x, tipY + 5, 11, fistY - tipY - 4, C.black);
  p.circ(x + 5, tipY + 5, 4, C.white);
  p.rect(x + 1, tipY + 5, 9, fistY - tipY + 4, C.white);
  p.rect(side < 0 ? x + 8 : x + 1, tipY + 6, 2, fistY - tipY + 2, C.silver);
  p.rect(x + 3, tipY + 15, 5, 1, C.silver); // knuckle crease
  p.rect(x + 3, tipY + 2, 2, 2, C.white);
}

/**
 * t is a running time in seconds, for blinking and the fingers' little bob. Little hands only press F, then J,
 * rather than holding both. `stepLabel` ("1 OF 3") shows this is a step of Today's practice.
 */
export function drawRitual(p: Pixels, view: RitualView, t: number, littleHands = false, stepLabel: string | null = null): void {
  drawPanel(p, 8, 6, W - 16, 100);
  p.centred(littleHands ? "PRESS F, THEN J" : "FINGERS ON F AND J", W / 2 + 1, 13, C.yellow, C.purple, 2);
  p.centred(littleHands ? "POINTER FINGERS ON THE BUMPS" : "FEEL THE BUMPS? HOLD THEM DOWN", W / 2, 33, C.white);

  const glow = view.f && view.j ? view.ready : 0;
  let x = Math.round(W / 2 - ROW_WIDTH / 2);
  const fingers: { cx: number; tip: number; side: -1 | 1 }[] = [];
  for (const k of HOME_ROW) {
    const held = k.key === "f" ? view.f : k.key === "j" ? view.j : false;
    // Little hands go in order: F first, then J.
    const prompt = !held && (!littleHands || k.key === "f" || view.f);
    keycap(p, k, x, held, prompt, glow, t);
    if (k.bump) {
      // Hovering below the key until it's held, then resting on its front edge.
      const bob = Math.round(Math.sin(t * 4 + x) * 1.5);
      const tip = held ? BASE_Y - EDGE - 2 : BASE_Y + 8 + bob;
      fingers.push({ cx: x + BIG / 2, tip, side: k.key === "f" ? -1 : 1 });
    }
    x += sizeOf(k) + GAP;
  }

  if (glow > 0) p.centred("READY!", W / 2 + 1, 46, C.lime, C.black, glow > 0.3 ? 2 : 1);
  else if (view.f !== view.j) p.centred(littleHands ? "NOW J!" : view.f ? "NOW J TOO!" : "NOW F TOO!", W / 2, 49, C.cyan);
  else if (stepLabel) p.centred(`TODAY'S PRACTICE ${stepLabel}`, W / 2, 49, C.cyan);
  else if (Math.floor(t * 2) % 2 === 0) p.centred("ESC: MENU", W / 2, 49, C.slate);

  for (const f of fingers) glove(p, f.cx, f.tip, f.side);
}

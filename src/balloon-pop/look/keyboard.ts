// The finger keyboard: a tiny pixel keyboard lying in the grass under the cannons. Keys are blocks tinted by the
// finger that presses them; the key to press next lights up in its finger's colour.
import { GROUND_Y, W } from "../config";
import type { GuideView } from "../../shared/guide";
import { KEYBOARD_WIDTH, KEYS, type Key } from "../../shared/keyboard";
import { C, FINGER_TINTS } from "./palette";
import type { Pixels } from "./pixels";

const KEY_W = 8;
const KEY_H = 4;
const PITCH_X = KEY_W + 1;
const PITCH_Y = KEY_H + 1;
const WIDTH = Math.round(KEYBOARD_WIDTH * PITCH_X) - 1;
const LEFT = Math.round(W / 2 - WIDTH / 2);
const TOP = GROUND_Y + 4;
/** The top of the keyboard's case, so effects can keep clear of it. */
export const KEYBOARD_TOP = TOP - 2;

function box(k: Key): { x: number; y: number; w: number } {
  return { x: LEFT + Math.round(k.x * PITCH_X), y: TOP + k.row * PITCH_Y, w: Math.round(k.w * PITCH_X) - 1 };
}

/** t is a running time in seconds, for the target's blink. */
export function drawKeyboard(p: Pixels, view: GuideView, t: number): void {
  // The case: a dark slab sunk into the grass, rounded at the top, with a lighter rim.
  const caseX = LEFT - 3;
  const caseW = WIDTH + 6;
  p.dither(caseX - 1, KEYBOARD_TOP - 1, caseW + 2, 30, C.black); // a soft shadow on the grass
  p.rect(caseX + 1, KEYBOARD_TOP, caseW - 2, 1, C.slate);
  p.rect(caseX, KEYBOARD_TOP + 1, caseW, 30, C.black);
  p.pset(caseX, KEYBOARD_TOP + 1, C.charcoal);
  p.pset(caseX + caseW - 1, KEYBOARD_TOP + 1, C.charcoal);

  for (const k of KEYS) {
    const { x, y, w } = box(k);
    const tint = FINGER_TINTS[k.finger];
    if (k.key === " ") {
      p.rect(x, y, w, KEY_H - 1, C.charcoal); // the space bar: there, but this game never uses it
      continue;
    }
    p.rect(x, y, w, KEY_H, tint.dim);
    if (k.home) p.rect(x, y, w, 1, tint.lit); // home keys catch the light along their top edge
    if (k.bump) p.rect(x + w / 2 - 1, y + 2, 2, 1, C.white);
  }

  const target = view.target ? KEYS.find((k) => k.key === view.target) : undefined;
  if (target) {
    // The key to press pops up a pixel and blinks its outline.
    const { x, y, w } = box(target);
    const tint = FINGER_TINTS[target.finger];
    p.rect(x - 1, y - 2, w + 2, KEY_H + 2, Math.floor(t * 3) % 2 === 0 ? C.white : C.black);
    p.rect(x, y - 1, w, KEY_H, tint.lit);
    p.rect(x, y + KEY_H - 1, w, 1, tint.dim);
    if (target.bump) p.rect(x + w / 2 - 1, y + 1, 2, 1, C.white);
  }

  const flashing = view.flashKey ? KEYS.find((k) => k.key === view.flashKey) : undefined;
  if (flashing && Math.floor(view.flash * 9) % 2 === 0) {
    const { x, y, w } = box(flashing);
    p.rectb(x - 2, y - 2, w + 4, KEY_H + 4, C.orange);
    p.rect(x - 1, y - 1, w + 2, KEY_H + 2, C.white);
  }
}

import { C } from "./palette";
import type { Pixels } from "./pixels";

/** A dark sign with a soft dithered shadow, for menus and results. */
export function drawPanel(p: Pixels, x: number, y: number, w: number, h: number): void {
  p.dither(x + 3, y + 3, w, h, C.black);
  p.rect(x, y, w, h, C.black);
  p.rectb(x + 1, y + 1, w - 2, h - 2, C.charcoal);
}

/** Blink on/off a few times a second. */
export function blink(t: number, rate = 2): boolean {
  return Math.floor(t * rate * 2) % 2 === 0;
}

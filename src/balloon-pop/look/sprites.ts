// Balloons and cannons, drawn with pixel shapes (no image files).
import { BALLOON_RADIUS, GROUND_Y, balloonHalfWidth } from "../config";
import { ADVANCE, textWidth } from "./font";
import { C, BALLOON_COLOURS } from "./palette";
import type { Pixels } from "./pixels";

export interface BalloonLike {
  x: number;
  y: number;
  /** A letter, or a pair or word (drawn on a wide balloon). */
  letter: string;
  colour: number;
  /** Letters of a pair or word typed so far: they light up. */
  typed?: number;
  /** The pair or word being typed: a white outline marks it. */
  locked?: boolean;
}

const R = BALLOON_RADIUS;

/** t is a running time in seconds, used to wiggle the string. */
export function drawBalloon(p: Pixels, b: BalloonLike, t: number): void {
  const { fill, ink } = BALLOON_COLOURS[b.colour];
  const x = Math.round(b.x);
  const y = Math.round(b.y);

  // String: a short line that sways more towards its loose end.
  let px = x;
  let py = y + R + 2;
  for (let i = 2; i <= 14; i += 2) {
    const nx = x + Math.sin(t * 4 + i * 0.35 + b.x * 0.1) * (i / 14) * 2.5;
    p.line(px, py, nx, y + R + 2 + i, C.silver);
    px = nx;
    py = y + R + 2 + i;
  }

  if (b.letter.length > 1) return drawWide(p, b, x, y);

  p.circ(x, y, R, C.black); // outline, so balloons stand out from any sky
  p.circ(x, y, R - 1, fill);
  p.rect(x - 2, y + R, 5, 1, C.black); // knot
  p.rect(x - 1, y + R, 3, 1, fill);
  p.rect(x - 1, y + R + 1, 3, 1, C.black);
  p.rect(x - 6, y - 6, 2, 2, C.white); // shine
  p.pset(x - 7, y - 3, C.white);

  p.centred(b.letter.toUpperCase(), x + 1, y - 6, ink, undefined, 2);
}

/** A long balloon for a pair or word: rounded ends, letters typed so far lit up yellow. */
function drawWide(p: Pixels, b: BalloonLike, x: number, y: number): void {
  const { fill, ink } = BALLOON_COLOURS[b.colour];
  const reach = balloonHalfWidth(b.letter) - R; // centre of each rounded end
  const outline = b.locked ? C.white : C.black;
  p.circ(x - reach, y, R, outline);
  p.circ(x + reach, y, R, outline);
  p.rect(x - reach, y - R, reach * 2, R * 2 + 1, outline);
  p.circ(x - reach, y, R - 1, fill);
  p.circ(x + reach, y, R - 1, fill);
  p.rect(x - reach, y - R + 1, reach * 2, R * 2 - 1, fill);
  p.rect(x - 2, y + R, 5, 1, outline); // knot
  p.rect(x - 1, y + R, 3, 1, fill);
  p.rect(x - 1, y + R + 1, 3, 1, outline);
  p.rect(x - reach - 6, y - 6, 2, 2, C.white); // shine
  p.pset(x - reach - 7, y - 3, C.white);

  const typed = b.typed ?? 0;
  const left = x + 1 - Math.floor(textWidth(b.letter, 2) / 2);
  for (let i = 0; i < b.letter.length; i++) {
    const ch = b.letter[i].toUpperCase();
    const lx = left + i * ADVANCE * 2;
    if (i < typed) p.label(ch, lx, y - 6, C.yellow, C.black, 2);
    else p.text(ch, lx, y - 6, ink, 2);
  }
}

/** A little circus cannon. angle is where the barrel points (radians); flash 0..1 shows a muzzle puff. */
export function drawLauncher(p: Pixels, x: number, angle: number, flash: number): void {
  const pivotY = GROUND_Y - 6;
  const ex = x + Math.cos(angle) * 9;
  const ey = pivotY + Math.sin(angle) * 9;
  p.line(x - 1, pivotY, ex - 1, ey, C.red);
  p.line(x, pivotY, ex, ey, C.white);
  p.line(x + 1, pivotY, ex + 1, ey, C.red);
  p.line(x, pivotY + 1, ex, ey + 1, C.red);
  p.rect(x - 4, GROUND_Y - 6, 9, 1, C.slate);
  p.rect(x - 5, GROUND_Y - 5, 11, 4, C.slate);
  p.rect(x - 5, GROUND_Y - 1, 11, 1, C.charcoal);
  p.pset(x - 3, GROUND_Y - 4, C.silver);
  if (flash > 0) {
    p.circ(ex, ey, Math.round(1 + flash * 3), C.silver);
    if (flash > 0.6) p.circ(ex, ey, 1, C.white);
  }
}

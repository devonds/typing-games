// The finger keyboard and the "fingers on the bumps" start, in the shop's slate and brass. Keys are tinted by the
// finger that presses them (shared/keyboard.ts), so a child learns "the blue finger" in every game.
import type { GuideView } from "../../shared/guide";
import { FINGER_COLOURS, KEYBOARD_WIDTH, KEYS, type Finger, type Key } from "../../shared/keyboard";
import type { RitualView } from "../../shared/ritual";
import { H, KEYBOARD, W } from "../config";
import { GOLD, INK, SERIF, drawPanel, roundRect, text } from "./ui";

type Ctx = CanvasRenderingContext2D;

const SLATE = "#1b2420";
const SLATE_HOME = "#232e29";

/** "#6fa8dc" -> "rgba(111,168,220,a)" */
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

/** The finger colours, warmed a touch so they sit in the lamplit shop rather than glowing like a screen. */
const WARM: Record<Finger, string> = Object.fromEntries(
  Object.entries(FINGER_COLOURS).map(([finger, hex]) => {
    const n = parseInt(hex.slice(1), 16);
    const mix = (c: number, warm: number) => Math.round(c * 0.88 + warm * 0.12);
    const out = [mix(n >> 16, 255), mix((n >> 8) & 255, 214), mix(n & 255, 150)];
    return [finger, `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`];
  }),
) as Record<Finger, string>;

/** Where a key sits on the play screen. */
function keyRect(k: Key): { x: number; y: number; w: number; h: number } {
  const { centreX, top, key, row, spaceRow } = KEYBOARD;
  const left = centreX - (KEYBOARD_WIDTH * key) / 2;
  const y = top + Math.min(k.row, 3) * row;
  return { x: left + k.x * key, y, w: k.w * key, h: k.row === 3 ? spaceRow : row };
}

/**
 * The slim keyboard across the bottom of the play screen. `alpha` fades it in after the start. `cooling` holds keys
 * resting after a wrong press (1 -> 0): they go quiet and grey for a moment.
 */
export function drawKeyboard(ctx: Ctx, view: GuideView, alpha = 1, cooling?: ReadonlyMap<string, number>): void {
  if (!view.visible || alpha <= 0) return;
  const { centreX, top, key, row, spaceRow } = KEYBOARD;
  const width = KEYBOARD_WIDTH * key;
  ctx.save();
  ctx.globalAlpha = alpha;

  // A slate board with a brass rim, like the price boards on the shelves.
  const pad = 4;
  const boardX = centreX - width / 2 - pad;
  const boardY = top - pad;
  const boardW = width + pad * 2;
  const boardH = row * 3 + spaceRow + pad * 2 - 1;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  roundRect(ctx, boardX, boardY, boardW, boardH, 4);
  ctx.fillStyle = "rgba(12,19,16,0.9)";
  ctx.fill();
  ctx.restore();
  roundRect(ctx, boardX + 1.5, boardY + 1.5, boardW - 3, boardH - 3, 3);
  ctx.strokeStyle = rgba(GOLD.brass, 0.55);
  ctx.lineWidth = 0.6;
  ctx.stroke();

  for (const k of KEYS) {
    const flashing = k.key === view.flashKey ? view.flash : 0;
    drawKey(ctx, k, k.key === view.target || flashing > 0, flashing, cooling?.get(k.key) ?? 0);
  }
  ctx.restore();
}

function drawKey(ctx: Ctx, k: Key, lit: boolean, flash: number, cool: number): void {
  const r = keyRect(k);
  const x = r.x + 0.6;
  const y = r.y + 0.6;
  const w = r.w - 1.2;
  const h = r.h - 1.2;
  const colour = WARM[k.finger];
  const space = k.key === " ";

  ctx.save();
  if (space) ctx.globalAlpha *= 0.45; // Fresh Cuts doesn't use the space bar
  if (lit) {
    ctx.shadowColor = colour;
    ctx.shadowBlur = 7;
  }
  roundRect(ctx, x, y, w, h, 1.8);
  ctx.fillStyle = lit ? colour : k.home ? SLATE_HOME : SLATE;
  ctx.fill();
  ctx.shadowBlur = 0;
  if (!lit) {
    // A gentle wash of the finger's colour, a little stronger on the home row where the fingers rest.
    ctx.fillStyle = rgba(colour, k.home && !space ? 0.3 : 0.2);
    ctx.fill();
  }
  ctx.strokeStyle = lit ? GOLD.pale : k.home && !space ? rgba(GOLD.brass, 0.85) : rgba(GOLD.brass, 0.35);
  ctx.lineWidth = lit ? 0.8 : 0.5;
  ctx.stroke();

  if (!space) {
    const letter = k.key === ";" ? ";" : k.key.toUpperCase();
    const ink = lit ? INK.dark : k.home ? INK.cream : rgba(INK.cream, 0.6);
    text(ctx, letter, x + w / 2, y + h / 2 - (k.bump ? 0.6 : 0) + 0.3, `${lit ? 700 : 600} 6px ${SERIF}`, ink);
  }
  if (k.bump) {
    // The little ridge you can feel on F and J.
    ctx.fillStyle = lit ? INK.dark : GOLD.pale;
    roundRect(ctx, x + w / 2 - 2, y + h - 2.1, 4, 0.9, 0.45);
    ctx.fill();
  }
  if (cool > 0) {
    // Resting: a soft grey veil and a wisp of smoke curling up off the key.
    roundRect(ctx, x, y, w, h, 1.8);
    ctx.fillStyle = `rgba(150,160,155,${0.55 * Math.min(1, cool * 2)})`;
    ctx.fill();
    const rise = (1 - cool) * 7;
    ctx.globalAlpha *= cool * 0.8;
    ctx.strokeStyle = "#cfd6d2";
    ctx.lineWidth = 0.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + 1 - rise);
    ctx.bezierCurveTo(x + w / 2 - 3, y - 2 - rise, x + w / 2 + 3, y - 4 - rise, x + w / 2, y - 7 - rise);
    ctx.stroke();
  }
  if (flash > 0) {
    // "This one!": the key that was wanted blinks bright three times, each blink sending out a ring of light.
    const beat = (1 - flash) * 3;
    const pulse = Math.max(0, Math.cos((beat % 1) * Math.PI * 2)) * Math.min(1, flash * 3);
    roundRect(ctx, x, y, w, h, 1.8);
    ctx.fillStyle = rgba("#fffbe8", pulse * 0.55);
    ctx.fill();
    const grow = 0.8 + (beat % 1) * 5;
    ctx.shadowColor = GOLD.pale;
    ctx.shadowBlur = 4;
    roundRect(ctx, x - grow, y - grow, w + grow * 2, h + grow * 2, 2 + grow * 0.6);
    ctx.strokeStyle = rgba(GOLD.pale, (1 - (beat % 1)) * Math.min(1, flash * 3));
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
  ctx.restore();
}

// ---- The start ----------------------------------------------------------------------------------------------------

const HOME_ROW = KEYS.filter((k) => k.row === 1);
const BIG = { pitch: 25, key: 23, y: 144 };
const PANEL = { x: 98, y: 64, w: 284, h: 156 };

function bigKeyX(k: Key): number {
  return W / 2 - (HOME_ROW.length * BIG.pitch) / 2 + (k.x - 0.25) * BIG.pitch;
}

/**
 * "Fingers on F and J": the home row drawn large, with every finger resting where it belongs and the two pointer
 * fingers on the bumps. Each key lights as it's held; `fade` (1 -> 0) lets it melt away as the round starts.
 */
export function drawRitual(ctx: Ctx, view: RitualView, t: number, fade = 1, littleHands = false): void {
  if (fade <= 0) return;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, H);
  drawPanel(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h);

  const ready = view.ready;
  const words = 1 - Math.min(1, ready * 2);
  text(ctx, "Fingers on the bumps", W / 2, 86, `italic 600 17px ${SERIF}`, GOLD.pale);
  ctx.globalAlpha = fade * words;
  text(ctx, "Fingers on F and J. Feel the bumps?", W / 2, 105, `600 9px ${SERIF}`, INK.cream);
  text(ctx, littleHands ? "Press F, then J." : "Hold them down to start.", W / 2, 117, `italic 9px ${SERIF}`, GOLD.brass);
  ctx.globalAlpha = fade * ready;
  const swell = 13 + ready * 3;
  text(ctx, "Ready!", W / 2, 111, `italic 700 ${swell}px ${SERIF}`, GOLD.pale, "center", "rgba(10,20,15,0.85)", 3);
  ctx.globalAlpha = fade;

  // Everything below the title sits inside the board, so the fingers seem to reach up from its bottom edge.
  ctx.save();
  roundRect(ctx, PANEL.x + 3, PANEL.y + 3, PANEL.w - 6, PANEL.h - 6, 4);
  ctx.clip();
  for (const k of HOME_ROW) {
    const held = (k.key === "f" && view.f) || (k.key === "j" && view.j);
    drawBigKey(ctx, k, held, ready, t);
  }
  for (const k of HOME_ROW) if (k.home) drawFinger(ctx, k, (k.key === "f" && view.f) || (k.key === "j" && view.j));
  ctx.restore();

  text(ctx, "Esc: menu", W / 2, H - 12, `8px ${SERIF}`, INK.dim);
  ctx.restore();
}

function drawBigKey(ctx: Ctx, k: Key, held: boolean, ready: number, t: number): void {
  const colour = WARM[k.finger];
  const press = held ? 1.5 : 0;
  const x = bigKeyX(k);
  const y = BIG.y + press;
  const size = BIG.key;
  const pointer = k.bump;
  ctx.save();
  if (!k.home) ctx.globalAlpha *= 0.5; // G and H: nobody rests there
  if (held) {
    ctx.shadowColor = colour;
    ctx.shadowBlur = 10 + ready * 10;
  }
  roundRect(ctx, x, y, size, size, 3);
  ctx.fillStyle = held ? colour : SLATE_HOME;
  ctx.fill();
  ctx.shadowBlur = 0;
  if (!held) {
    ctx.fillStyle = rgba(colour, pointer ? 0.32 : 0.2);
    ctx.fill();
  }
  ctx.strokeStyle = held ? GOLD.pale : pointer ? GOLD.brass : rgba(GOLD.brass, 0.5);
  ctx.lineWidth = held || pointer ? 1 : 0.6;
  ctx.stroke();
  const letter = k.key === ";" ? ";" : k.key.toUpperCase();
  text(ctx, letter, x + size / 2, y + 7.5, `${pointer ? 700 : 600} ${pointer ? 11 : 9}px ${SERIF}`, held ? INK.dark : pointer ? INK.cream : rgba(INK.cream, 0.7));
  if (pointer) {
    // The bump, glinting now and then to say "feel for me".
    const glint = held ? 0 : 0.5 + 0.5 * Math.sin(t * 4);
    ctx.fillStyle = held ? INK.dark : GOLD.pale;
    ctx.shadowColor = GOLD.pale;
    ctx.shadowBlur = glint * 6;
    roundRect(ctx, x + size / 2 - 4, y + 12.5, 8, 1.6, 0.8);
    ctx.fill();
  }
  if (held && ready > 0) {
    // The "ready" flourish: a brass ring opening out from both keys.
    const grow = ready * 7;
    roundRect(ctx, x - grow, y - grow, size + grow * 2, size + grow * 2, 3 + grow);
    ctx.strokeStyle = rgba(GOLD.pale, 1 - ready);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A finger reaching up from the bottom of the board to rest on its home key, its nail and edge in the finger's colour.
 * The pointer fingers are solid; the others are faint, showing where they'll sit.
 */
function drawFinger(ctx: Ctx, k: Key, held: boolean): void {
  const pointer = k.bump;
  const colour = WARM[k.finger];
  const cx = bigKeyX(k) + BIG.key / 2;
  const width = pointer ? 15 : 13;
  // Little fingers are shorter, so their tips sit a touch lower on the key.
  const lift = k.finger.endsWith("Pinky") ? 3 : k.finger.endsWith("Middle") ? -1 : 1;
  const tipY = BIG.y + 15 + lift + (held ? 1.5 : 0);
  const bottom = PANEL.y + PANEL.h;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, bottom);
  ctx.lineTo(cx - width / 2, tipY + width / 2);
  ctx.arc(cx, tipY + width / 2, width / 2, Math.PI, 0);
  ctx.lineTo(cx + width / 2, bottom);
  // Resting fingers are pale, so the two pointer fingers stand out.
  if (!pointer) ctx.globalAlpha *= 0.3;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;
  const skin = ctx.createLinearGradient(cx - width / 2, 0, cx + width / 2, 0);
  skin.addColorStop(0, "#e9c9a2");
  skin.addColorStop(0.5, "#f6dfc0");
  skin.addColorStop(1, "#d7b28a");
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // The nail, in the finger's colour.
  roundRect(ctx, cx - 3.5, tipY + 2, 7, 7, 3);
  ctx.fillStyle = rgba(colour, held || !pointer ? 1 : 0.85);
  ctx.fill();
  // A knuckle crease.
  ctx.beginPath();
  ctx.moveTo(cx - 3, tipY + 21);
  ctx.quadraticCurveTo(cx, tipY + 22.5, cx + 3, tipY + 21);
  ctx.strokeStyle = "rgba(120,80,50,0.45)";
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.restore();
}


// ---- Progress, between rounds ---------------------------------------------------------------------------------------

/**
 * A small keyboard for the results: each key in play fills up from the bottom in its finger's colour as it heads
 * towards mastered, and a mastered key is full with a bright rim. Keys not in play are faint outlines; keys just
 * unlocked wear a glowing brass ring.
 */
export function drawProgressKeys(
  ctx: Ctx,
  keys: readonly { key: string; progress: number }[],
  unlocked: readonly string[],
  cx: number,
  top: number,
  pitch: number,
  t: number,
): void {
  const progress = new Map(keys.map((k) => [k.key, k.progress]));
  const fresh = new Set(unlocked);
  const left = cx - (KEYBOARD_WIDTH * pitch) / 2;
  const size = pitch - 1.6;
  for (const k of KEYS) {
    if (k.row > 2) continue;
    const x = left + k.x * pitch;
    const y = top + k.row * pitch;
    const colour = WARM[k.finger];
    const p = progress.get(k.key);
    const letter = /^[a-z]$/.test(k.key) ? k.key.toUpperCase() : k.key;
    ctx.save();
    roundRect(ctx, x, y, size, size, 2);
    if (p === undefined && !fresh.has(k.key)) {
      // Not in this round.
      ctx.strokeStyle = "rgba(201,164,92,0.18)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
      text(ctx, letter, x + size / 2, y + size / 2 + 0.3, `6px ${SERIF}`, "rgba(246,239,224,0.18)");
      ctx.restore();
      continue;
    }
    ctx.fillStyle = SLATE_HOME;
    ctx.fill();
    if (p !== undefined && p > 0) {
      ctx.save();
      ctx.clip();
      const h = size * Math.max(0.08, p);
      ctx.fillStyle = p >= 1 ? colour : rgba(colour, 0.75);
      ctx.fillRect(x, y + size - h, size, h);
      ctx.restore();
    }
    const done = p !== undefined && p >= 1;
    ctx.strokeStyle = done ? GOLD.pale : rgba(GOLD.brass, 0.7);
    ctx.lineWidth = done ? 0.9 : 0.6;
    roundRect(ctx, x, y, size, size, 2);
    ctx.stroke();
    text(ctx, letter, x + size / 2, y + size / 2 + 0.3, `${done ? 700 : 600} 6.5px ${SERIF}`, done || (p ?? 0) > 0.55 ? INK.dark : INK.cream);
    if (fresh.has(k.key)) {
      const glow = 0.6 + 0.4 * Math.sin(t * 4);
      ctx.shadowColor = GOLD.pale;
      ctx.shadowBlur = 6 * glow;
      roundRect(ctx, x - 1.5, y - 1.5, size + 3, size + 3, 3);
      ctx.strokeStyle = rgba(GOLD.pale, glow);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** A finger's own colour, for naming it on the results ("your left ring finger"). */
export function fingerColour(finger: Finger): string {
  return WARM[finger];
}

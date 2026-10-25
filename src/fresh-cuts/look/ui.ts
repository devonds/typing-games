// Words and the bits around the play: letter tags, baskets, the score, panels for the menu and results.
import { H, W } from "../config";

type Ctx = CanvasRenderingContext2D;

export const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";

export const GOLD = { pale: "#fbe7b0", brass: "#c9a45c", deep: "#b8893a" };
export const INK = { cream: "#f6efe0", dark: "#13261d", slate: "#1a1a1a", dim: "#8a9a8e" };

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function text(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  font: string,
  fill: string | CanvasGradient,
  align: CanvasTextAlign = "center",
  outline?: string,
  outlineWidth = 3,
): void {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  if (outline) {
    ctx.lineJoin = "round";
    ctx.lineWidth = outlineWidth;
    ctx.strokeStyle = outline;
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(s, x, y);
}

/** On for half of each period: for "press Enter" prompts. */
export function blink(t: number, perSecond = 1): boolean {
  return (t * perSecond) % 1 < 0.5;
}

export type TagStyle = "fresh" | "rotten" | "frozen";

const TAGS: Record<TagStyle, { paper: string; edge: string; ink: string }> = {
  fresh: { paper: INK.cream, edge: GOLD.brass, ink: INK.dark },
  rotten: { paper: "#b9b08a", edge: "#6b5a2a", ink: "#4a3a1a" },
  frozen: { paper: "#eaf7ff", edge: "#5fb4e8", ink: "#123a5a" },
};

/** The paper price tag carrying a fruit's letter. Rotten fruit gets a grubby one, frozen fruit an icy one. */
export function drawTag(ctx: Ctx, letter: string, x: number, y: number, style: TagStyle): void {
  const tag = TAGS[style];
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  roundRect(ctx, x - 9.5, y - 9.5, 19, 19, 3);
  ctx.fillStyle = tag.paper;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x - 8, y - 8, 16, 16, 2);
  ctx.strokeStyle = tag.edge;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  text(ctx, letter.toUpperCase(), x, y + 1, `700 13px ${SERIF}`, tag.ink);
}

/**
 * A wider price tag for a pair or word. Typed letters fade to brass; the next one sits on a small brass rule. When
 * it's the one being typed (`locked`), the tag glows and its edge turns gold.
 */
export function drawWordTag(ctx: Ctx, word: string, typed: number, x: number, y: number, locked: boolean, t: number): void {
  const pitch = 9;
  const w = word.length * pitch + 9;
  const h = 19;
  ctx.save();
  ctx.shadowColor = locked ? `rgba(251,231,176,${0.75 + 0.25 * Math.sin(t * 6)})` : "rgba(0,0,0,0.5)";
  ctx.shadowBlur = locked ? 9 : 3;
  ctx.shadowOffsetY = locked ? 0 : 1;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 3);
  ctx.fillStyle = INK.cream;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x - w / 2 + 1.5, y - h / 2 + 1.5, w - 3, h - 3, 2);
  ctx.strokeStyle = locked ? GOLD.deep : GOLD.brass;
  ctx.lineWidth = locked ? 1.3 : 0.8;
  ctx.stroke();
  const left = x - ((word.length - 1) * pitch) / 2;
  for (let i = 0; i < word.length; i++) {
    const lx = left + i * pitch;
    const done = i < typed;
    text(ctx, word[i].toUpperCase(), lx, y + 1, `700 12px ${SERIF}`, done ? "rgba(184,137,58,0.55)" : INK.dark);
    if (locked && i === typed) {
      ctx.fillStyle = GOLD.deep;
      ctx.fillRect(lx - 3, y + 6.5, 6, 1);
    }
  }
}

/** A timed round's clock, where the baskets usually sit: a brass dial that empties, and the minutes and seconds. */
export function drawClock(ctx: Ctx, left: number, total: number): void {
  const x = W - 22;
  const y = 16;
  const r = 7;
  const share = Math.max(0, left / total);
  const urgent = left <= 10;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(14,22,18,0.85)";
  ctx.fill();
  if (share > 0) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r - 1.5, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = urgent ? "#e8a05a" : "rgba(201,164,92,0.75)";
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD.brass;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = GOLD.brass;
  ctx.fillRect(x - 1.5, y - r - 2.5, 3, 1.6);
  ctx.restore();
  const s = Math.ceil(left);
  text(ctx, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`, x - r - 5, y + 0.5, `600 13px ${SERIF}`, urgent ? "#ffb070" : GOLD.pale, "right");
}

/** A shopping basket: one life. Empty ones are just a faint outline. */
export function drawBasket(ctx: Ctx, x: number, y: number, full: boolean): void {
  ctx.save();
  ctx.globalAlpha = full ? 1 : 0.3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(x, y, 6, Math.PI, 0);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = GOLD.brass;
  ctx.stroke();
  if (full) {
    for (const [dx, colour] of [[-3.5, "#d8323a"], [0.5, "#ff961c"], [4, "#8fd13a"]] as const) {
      ctx.beginPath();
      ctx.arc(x + dx, y + 0.5, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 1);
  ctx.lineTo(x + 8, y + 1);
  ctx.lineTo(x + 6, y + 10);
  ctx.lineTo(x - 6, y + 10);
  ctx.closePath();
  ctx.fillStyle = "#3a2416";
  ctx.fill();
  ctx.strokeStyle = GOLD.brass;
  ctx.lineWidth = 0.8;
  for (const dy of [4, 7]) {
    ctx.beginPath();
    ctx.moveTo(x - 7.5 + dy * 0.2, y + 1 + dy);
    ctx.lineTo(x + 7.5 - dy * 0.2, y + 1 + dy);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawHud(ctx: Ctx, score: number, lives: number, maxLives: number, speedLevel: number | null): void {
  text(ctx, "Score", 14, 14, `italic 8px ${SERIF}`, GOLD.brass, "left");
  text(ctx, String(score), 14, 27, `600 15px ${SERIF}`, GOLD.pale, "left");
  if (speedLevel !== null) text(ctx, `Speed ${speedLevel + 1}`, 14, 41, `italic 7px ${SERIF}`, GOLD.brass, "left");
  for (let i = 0; i < maxLives; i++) drawBasket(ctx, W - 18 - i * 21, 14, i < lives);
}

/** Little hands' corner: fruit sliced so far out of the round's total, with a small filled basket. */
export function drawFruitCount(ctx: Ctx, done: number, total: number): void {
  text(ctx, "Fruit", 14, 14, `italic 8px ${SERIF}`, GOLD.brass, "left");
  ctx.font = `600 15px ${SERIF}`;
  const w = ctx.measureText(String(done)).width;
  text(ctx, String(done), 14, 27, `600 15px ${SERIF}`, GOLD.pale, "left");
  text(ctx, `of ${total}`, 14 + w + 4, 28, `italic 9px ${SERIF}`, GOLD.brass, "left");
}

/** Slow motion: a cold blue tint, frost round the edges, and a snowflake with the time left. `amount` fades it in and out. */
export function drawFrost(ctx: Ctx, amount: number, left: number, total: number, t: number): void {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.fillStyle = "rgba(90,160,230,0.16)";
  ctx.fillRect(0, 0, W, H);
  const edge = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
  edge.addColorStop(0, "rgba(200,235,255,0)");
  edge.addColorStop(1, "rgba(215,240,255,0.55)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);
  // Snow drifting down slowly.
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  for (let i = 0; i < 40; i++) {
    const seed = Math.sin(i * 91.7) * 1000;
    const fx = (seed - Math.floor(seed)) * W + Math.sin(t * 0.8 + i) * 6;
    const fy = ((i * 37 + t * (8 + (i % 5) * 3)) % (H + 10)) - 5;
    ctx.beginPath();
    ctx.arc(fx, fy, 0.6 + (i % 3) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // The timer, under the score: a snowflake and a bar that melts away.
  const x = 20;
  const y = 54;
  drawSnowflake(ctx, x, y, 6);
  roundRect(ctx, x + 10, y - 2.5, 44, 5, 2.5);
  ctx.fillStyle = "rgba(10,30,50,0.6)";
  ctx.fill();
  if (left > 0) {
    roundRect(ctx, x + 10, y - 2.5, 44 * (left / total), 5, 2.5);
    ctx.fillStyle = "#bfe6ff";
    ctx.fill();
  }
  ctx.restore();
}

export function drawSnowflake(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#e8f6ff";
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r);
    ctx.moveTo(0, -r * 0.55);
    ctx.lineTo(-r * 0.28, -r * 0.8);
    ctx.moveTo(0, -r * 0.55);
    ctx.lineTo(r * 0.28, -r * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

/** A slate board with a brass edge: behind the menu, pause and results text. */
export function drawPanel(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 12;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fillStyle = "rgba(14,22,18,0.94)";
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x + 3, y + 3, w - 6, h - 6, 4);
  ctx.strokeStyle = GOLD.brass;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

/** A pop-up word (+10, Juicy!, Yuck!). `alpha` fades it. */
export function drawWord(ctx: Ctx, s: string, x: number, y: number, alpha: number, big: boolean): void {
  ctx.globalAlpha = alpha;
  text(ctx, s, x, y, `italic 700 ${big ? 24 : 13}px ${SERIF}`, big ? GOLD.pale : "#ffffff", "center", "rgba(10,20,15,0.85)", 3);
  ctx.globalAlpha = 1;
}

/** A five-pointed star: gold when earned, a faint outline when not. */
export function drawStar(ctx: Ctx, x: number, y: number, r: number, earned: boolean): void {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.lineJoin = "round";
  if (earned) {
    const g = ctx.createLinearGradient(0, y - r, 0, y + r);
    g.addColorStop(0, GOLD.pale);
    g.addColorStop(1, GOLD.deep);
    ctx.shadowColor = "rgba(251,231,176,0.6)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.strokeStyle = earned ? GOLD.pale : "rgba(201,164,92,0.4)";
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
}

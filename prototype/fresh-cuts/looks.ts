// PROTOTYPE (throwaway): four looks for Fresh Cuts. Each one paints the store, the letter stickers, the HUD and
// pop-up words. Everything is in scene units: 480x270.
import { glyphFor, ADVANCE } from "../../src/balloon-pop/look/font";
import { KINDS, OUTLINE, drawWhole, hash, type FruitKind, type Style } from "./fruit";

type Ctx = CanvasRenderingContext2D;
export const W = 480;
export const H = 270;

export interface Look {
  id: string;
  name: string;
  blurb: string;
  style: Style;
  /** Pixel looks render at 320x180 and are reduced to a fixed palette. */
  palette?: string[];
  background(ctx: Ctx): void;
  /** Pixel looks only: crisp pixel-font words painted into the background, at 320x180. */
  backgroundPixels?(ctx: Ctx): void;
  /** Colour of the soft shadow each flying fruit casts on the store behind it. */
  shadow: string;
  /** Drawn over the world, before the letters (vignettes, lighting). */
  overlay?(ctx: Ctx): void;
  slash: { fill: string; edge?: string; glow?: string };
  sticker(ctx: Ctx, letter: string, x: number, y: number, rotten: boolean): void;
  hud(ctx: Ctx, score: number, lives: number, maxLives: number): void;
  popup(ctx: Ctx, text: string, x: number, y: number, alpha: number, big: boolean): void;
}

// ---------------------------------------------------------------------------------------------------------------
// Shared bits

const [APPLE, ORANGE, LEMON, KIWI, MELON, STRAWBERRY, PEACH, PEAR, DRAGON] = KINDS;

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function text(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  font: string,
  fill: string | CanvasGradient,
  stroke?: string,
  strokeWidth = 3,
  align: CanvasTextAlign = "center",
): void {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  if (stroke) {
    ctx.lineJoin = "round";
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(s, x, y);
}

/** A heap of fruit sitting on `y`, `w` wide. */
function pile(ctx: Ctx, k: FruitKind, cx: number, y: number, w: number, rows: number, scale: number, style: Style, seed: number): void {
  const d = k.r * 2 * scale * 0.85;
  for (let j = 0; j < rows; j++) {
    const n = Math.max(1, Math.floor(w / d) - j);
    for (let i = 0; i < n; i++) {
      const x = cx - ((n - 1) * d) / 2 + i * d + (hash(seed + i * 7 + j) - 0.5) * 2;
      const yy = y - k.r * scale * 0.7 - j * d * 0.62;
      drawWhole(ctx, k, x, yy, (hash(seed + i + j * 13) - 0.5) * 0.8, style, scale);
    }
  }
}

/** Little shopping basket: a life. */
function basket(ctx: Ctx, x: number, y: number, full: boolean, body: string, dark: string, outline?: string): void {
  ctx.save();
  ctx.globalAlpha = full ? 1 : 0.28;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(x, y, 6, Math.PI, 0);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = dark;
  ctx.stroke();
  if (full) {
    for (const [dx, c] of [[-3.5, "#d8323a"], [0.5, "#ff961c"], [4, "#8fd13a"]] as const) {
      ctx.beginPath();
      ctx.arc(x + dx, y + 0.5, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 1);
  ctx.lineTo(x + 8, y + 1);
  ctx.lineTo(x + 6, y + 10);
  ctx.lineTo(x - 6, y + 10);
  ctx.closePath();
  if (outline) {
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 0.8;
  for (const dy of [4, 7]) {
    ctx.beginPath();
    ctx.moveTo(x - 7.5 + dy * 0.2, y + 1 + dy);
    ctx.lineTo(x + 7.5 - dy * 0.2, y + 1 + dy);
    ctx.stroke();
  }
  ctx.restore();
}

function crateFront(ctx: Ctx, x: number, y: number, w: number, h: number, wood: string, dark: string, light: string, label?: string, labelColour?: string): void {
  ctx.fillStyle = wood;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = dark;
  for (let i = 1; i < 3; i++) ctx.fillRect(x, y + (h / 3) * i - 0.6, w, 1.2);
  ctx.fillRect(x, y, 3, h);
  ctx.fillRect(x + w - 3, y, 3, h);
  ctx.fillStyle = light;
  ctx.fillRect(x, y, w, 1.5);
  if (label) text(ctx, label, x + w / 2, y + h / 2, "800 9px ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif", labelColour ?? dark);
}

// ---------------------------------------------------------------------------------------------------------------
// A: Morning market. Storybook illustration, warm light, wooden crates, chalkboard prices.

const ROUNDED = "ui-rounded, 'Arial Rounded MT Bold', 'Nunito', system-ui, sans-serif";

const market: Look = {
  id: "a",
  name: "Morning market",
  blurb: "Storybook illustration: soft shading, warm morning light, wooden crates and chalkboard prices.",
  style: "soft",
  background(ctx) {
    const wall = ctx.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, "#fff5e0");
    wall.addColorStop(1, "#f0d4a8");
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);
    // Tiles behind the lower shelf.
    ctx.fillStyle = "#f8eedb";
    ctx.fillRect(0, 128, W, 90);
    ctx.strokeStyle = "#ead7b4";
    ctx.lineWidth = 0.8;
    for (let y = 128; y < 218; y += 9) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      for (let x = (y / 9) % 2 ? 0 : 9; x < W; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 9);
        ctx.stroke();
      }
    }
    // Sunbeams.
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    for (const [a, b] of [[30, 95], [120, 150], [175, 190]]) {
      ctx.beginPath();
      ctx.moveTo(a, 0);
      ctx.lineTo(b, 0);
      ctx.lineTo(b + 150, H);
      ctx.lineTo(a + 150, H);
      ctx.fill();
    }
    const tiers: [number, FruitKind[]][] = [
      [104, [APPLE, ORANGE, PEAR, LEMON, PEACH]],
      [176, [KIWI, STRAWBERRY, DRAGON, APPLE, ORANGE]],
    ];
    const prices = ["2 FOR $3", "99¢", "$1.29", "3 FOR $2", "$1.49"];
    tiers.forEach(([y, kinds], t) => {
      kinds.forEach((k, i) => {
        const x = 14 + i * 92;
        ctx.fillStyle = "#b97a45";
        ctx.fillRect(x, y - 14, 84, 14);
        pile(ctx, k, x + 42, y - 8, 84, 3, 0.42, "soft", t * 50 + i * 9);
        ctx.fillStyle = "#93582b";
        ctx.fillRect(x - 3, y - 4, 90, 7);
        ctx.fillStyle = "#c99258";
        ctx.fillRect(x - 3, y - 4, 90, 1.5);
        // Chalkboard price.
        ctx.fillStyle = "#c99a5e";
        ctx.fillRect(x + 26, y + 4, 32, 15);
        ctx.fillStyle = "#2f3b33";
        ctx.fillRect(x + 27.5, y + 5.5, 29, 12);
        text(ctx, prices[(i + t * 2) % prices.length], x + 42, y + 11.8, `700 5.6px ${ROUNDED}`, "#f4f1e6");
      });
    });
    // Haze to push the shelves back.
    ctx.fillStyle = "rgba(255,245,224,0.5)";
    ctx.fillRect(0, 60, W, 140);
    // Floor.
    ctx.fillStyle = "#e3c99c";
    ctx.fillRect(0, 210, W, 60);
    ctx.strokeStyle = "rgba(160,110,60,0.25)";
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(240 + i * 30, 210);
      ctx.lineTo(240 + i * 60, H);
      ctx.stroke();
    }
    // Hanging sign.
    ctx.strokeStyle = "#8a6a4a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(185, 0);
    ctx.lineTo(190, 14);
    ctx.moveTo(295, 0);
    ctx.lineTo(290, 14);
    ctx.stroke();
    roundRect(ctx, 166, 12, 148, 32, 6);
    ctx.fillStyle = "#3d7a4a";
    ctx.fill();
    roundRect(ctx, 169, 15, 142, 26, 4);
    ctx.strokeStyle = "#f5e9cc";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    text(ctx, "FRESH PRODUCE", 240, 28.5, `800 15px ${ROUNDED}`, "#fff3dc");
    // Front crates.
    const front = [PEACH, APPLE, MELON, ORANGE];
    front.forEach((k, i) => {
      const x = -6 + i * 124;
      pile(ctx, k, x + 60, 240, 118, 2, k === MELON ? 0.5 : 0.62, "soft", 200 + i * 11);
      crateFront(ctx, x, 236, 120, 40, "#c98d52", "#9a6334", "#e0ad74", "FARM FRESH", "#8a5530");
    });
  },
  shadow: "rgba(120,70,20,0.2)",
  slash: { fill: "#ffffff", glow: "rgba(255,255,255,0.9)" },
  sticker(ctx, letter, x, y, rotten) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 10.5, 9.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = rotten ? "#d8cfa4" : "#ffffff";
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(x, y, 9.3, 8.3, 0, 0, Math.PI * 2);
    ctx.strokeStyle = rotten ? "#6b5a2a" : "#3d7a4a";
    ctx.lineWidth = 1;
    ctx.stroke();
    text(ctx, letter.toUpperCase(), x, y + 0.8, `900 13px ${ROUNDED}`, rotten ? "#4a3a1a" : "#24352a");
  },
  hud(ctx, score, lives, max) {
    roundRect(ctx, 10, 8, 96, 24, 6);
    ctx.fillStyle = "#fff9ec";
    ctx.fill();
    ctx.strokeStyle = "#3d7a4a";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    text(ctx, "SCORE", 18, 20.5, `800 7px ${ROUNDED}`, "#3d7a4a", undefined, 0, "left");
    text(ctx, String(score), 98, 20.5, `900 14px ${ROUNDED}`, "#24352a", undefined, 0, "right");
    for (let i = 0; i < max; i++) basket(ctx, 462 - i * 22, 14, i < lives, "#d9a35c", "#8a5530");
  },
  popup(ctx, s, x, y, alpha, big) {
    ctx.globalAlpha = alpha;
    text(ctx, s, x, y, `900 ${big ? 22 : 12}px ${ROUNDED}`, big ? "#ffd23f" : "#ffffff", "#3d7a4a", big ? 5 : 3.5);
    ctx.globalAlpha = 1;
  },
};

// ---------------------------------------------------------------------------------------------------------------
// B: Pixel aisle. Hi-bit pixel art: the same drawing reduced to 320x180 and a 32-colour palette, with dithering.

const PIXEL_PALETTE = [
  "#1b1420", "#3b2a35", "#6b3e3a", "#9c5a3c", "#c98d52", "#e8b878", "#f7e3b5", "#fff8e8",
  "#7e1424", "#c42a35", "#ff5a4f", "#ff9aa0", "#c4570a", "#ff9a1f", "#ffc75a", "#d9a910",
  "#ffe14a", "#fff59a", "#17521f", "#2f8a3a", "#6cc066", "#b8e07a", "#4a6b2a", "#9a1259",
  "#ec2f8c", "#1f3a4a", "#3d7a7a", "#9fd0c8", "#5c5a7a", "#a8a6c0", "#d8d4e0", "#6a5226",
];

export const PX = 320 / W;

/** Crisp pixel text on the 320x180 canvas (identity transform). `x`,`y` are scene units. */
function pixelText(ctx: Ctx, s: string, x: number, y: number, colour: string, scale: number, shadow?: string, align: "left" | "center" | "right" = "center"): void {
  const width = (s.length * ADVANCE - 1) * scale;
  let px = Math.round(x * PX);
  if (align === "center") px -= Math.floor(width / 2);
  if (align === "right") px -= width;
  const py = Math.round(y * PX) - Math.floor((7 * scale) / 2);
  const draw = (ox: number, oy: number, c: string): void => {
    ctx.fillStyle = c;
    for (let i = 0; i < s.length; i++) {
      const runs = glyphFor(s[i]);
      if (!runs) continue;
      for (const [row, col, len] of runs) ctx.fillRect(ox + i * ADVANCE * scale + col * scale, oy + row * scale, len * scale, scale);
    }
  };
  if (shadow) draw(px + scale, py + scale, shadow);
  draw(px, py, colour);
}

const pixelAisle: Look = {
  id: "b",
  name: "Pixel aisle",
  blurb: "Hi-bit pixel art like Balloon Pop, but richer: 320x180, 32 colours, dithered shading, fluorescent supermarket.",
  style: "soft",
  palette: PIXEL_PALETTE,
  background(ctx) {
    ctx.fillStyle = "#d8d4e0";
    ctx.fillRect(0, 0, W, 30);
    for (const x of [40, 320]) {
      ctx.fillStyle = "#fff8e8";
      ctx.fillRect(x, 10, 120, 6);
    }
    ctx.fillStyle = "#9fd0c8";
    ctx.fillRect(0, 30, W, 170);
    ctx.fillStyle = "#3d7a7a";
    ctx.fillRect(0, 30, W, 6);
    // Sign board; its words are drawn crisp in hud().
    ctx.fillStyle = "#7e1424";
    ctx.fillRect(176, 39, 128, 26);
    ctx.fillStyle = "#c42a35";
    ctx.fillRect(178, 41, 124, 22);
    // Refrigerated case.
    ctx.fillStyle = "#1f3a4a";
    ctx.fillRect(12, 72, 456, 128);
    ctx.fillStyle = "#a8a6c0";
    ctx.fillRect(20, 78, 440, 18);
    ctx.fillStyle = "#d8d4e0";
    for (let x = 30; x < 450; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, 96);
      ctx.lineTo(x + 12, 78);
      ctx.lineTo(x + 20, 78);
      ctx.lineTo(x + 8, 96);
      ctx.fill();
    }
    const tiers: [number, FruitKind[]][] = [
      [140, [APPLE, LEMON, PEAR, ORANGE, KIWI]],
      [194, [STRAWBERRY, PEACH, DRAGON, APPLE, LEMON]],
    ];
    tiers.forEach(([y, kinds], t) => {
      kinds.forEach((k, i) => pile(ctx, k, 58 + i * 91, y - 4, 84, 3, 0.42, "soft", 400 + t * 30 + i * 5));
      ctx.fillStyle = "#5c5a7a";
      ctx.fillRect(16, y - 4, 448, 6);
      ctx.fillStyle = "#ffe14a";
      ctx.fillRect(16, y + 1, 448, 4);
    });
    // Mist from the sprayers.
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(16, 96, 448, 20);
    // Linoleum.
    for (let y = 200; y < H; y += 14) {
      for (let x = 0; x < W; x += 14) {
        ctx.fillStyle = ((x + y) / 14) % 2 ? "#d8d4e0" : "#a8a6c0";
        ctx.fillRect(x, y, 14, 14);
      }
    }
    const front = [APPLE, ORANGE, MELON, PEAR];
    front.forEach((k, i) => {
      const x = -6 + i * 124;
      pile(ctx, k, x + 60, 242, 118, 2, k === MELON ? 0.5 : 0.62, "soft", 600 + i);
      crateFront(ctx, x, 238, 120, 40, "#c98d52", "#6b3e3a", "#e8b878");
    });
  },
  backgroundPixels(ctx) {
    pixelText(ctx, "PRODUCE", 240, 52, "#fff8e8", 2, "#7e1424");
  },
  shadow: "rgba(20,30,40,0.25)",
  slash: { fill: "#ffffff" },
  sticker(ctx, letter, x, y, rotten) {
    const cx = Math.round(x * PX);
    const cy = Math.round(y * PX);
    ctx.fillStyle = "#1b1420";
    ctx.fillRect(cx - 6, cy - 5, 13, 12);
    ctx.fillRect(cx - 5, cy - 6, 11, 14);
    ctx.fillStyle = rotten ? "#b8a86a" : "#fff8e8";
    ctx.fillRect(cx - 5, cy - 5, 11, 11);
    ctx.fillStyle = rotten ? "#6a5226" : "#d8d4e0";
    ctx.fillRect(cx - 5, cy + 5, 11, 1);
    pixelText(ctx, letter.toUpperCase(), x + 0.75, y, rotten ? "#3b2a35" : "#1b1420", 1);
  },
  hud(ctx, score, lives, max) {
    pixelText(ctx, `SCORE ${score}`, 9, 13, "#fff8e8", 1, "#1b1420", "left");
    for (let i = 0; i < max; i++) {
      const x = Math.round((462 - i * 22) * PX);
      const y = 5;
      const full = i < lives;
      ctx.fillStyle = full ? "#1b1420" : "#5c5a7a";
      ctx.fillRect(x - 5, y, 1, 4);
      ctx.fillRect(x + 4, y, 1, 4);
      ctx.fillRect(x - 4, y - 1, 8, 1);
      ctx.fillRect(x - 6, y + 3, 12, 1);
      ctx.fillRect(x - 5, y + 4, 10, 5);
      ctx.fillStyle = full ? "#c98d52" : "#a8a6c0";
      ctx.fillRect(x - 4, y + 4, 8, 4);
      if (full) {
        ctx.fillStyle = "#ff5a4f";
        ctx.fillRect(x - 3, y + 1, 2, 2);
        ctx.fillStyle = "#ff9a1f";
        ctx.fillRect(x, y + 1, 2, 2);
        ctx.fillStyle = "#6a5226";
        ctx.fillRect(x - 4, y + 6, 8, 1);
      }
    }
  },
  popup(ctx, s, x, y, alpha, big) {
    if (alpha < 0.35) return;
    pixelText(ctx, s.toUpperCase(), x, y, big ? "#ffe14a" : "#fff8e8", big ? 2 : 1, "#1b1420");
  },
};

// ---------------------------------------------------------------------------------------------------------------
// C: Supermarket poster. Flat colours, bold outlines, mid-century signage.

const POSTER_FONT = "'Futura', 'Avenir Next', 'Trebuchet MS', system-ui, sans-serif";

function starburst(ctx: Ctx, x: number, y: number, r: number, points: number, fill: string): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2;
    const d = i % 2 ? r * 0.78 : r;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

const poster: Look = {
  id: "c",
  name: "Supermarket poster",
  blurb: "Flat graphic style: solid colours, bold outlines, mint-and-tomato 1960s supermarket signs.",
  style: "flat",
  background(ctx) {
    ctx.fillStyle = "#fbf3e4";
    ctx.fillRect(0, 0, W, 64);
    ctx.fillStyle = "#e85d4a";
    ctx.fillRect(0, 62, W, 7);
    ctx.fillStyle = "#bfe3d0";
    ctx.fillRect(0, 69, W, 140);
    // Produce case.
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OUTLINE;
    ctx.fillStyle = "#2b8c6e";
    ctx.fillRect(14, 84, 452, 118);
    ctx.strokeRect(14, 84, 452, 118);
    ctx.fillStyle = "#9fd6c6";
    ctx.fillRect(22, 90, 436, 13);
    ctx.strokeRect(22, 90, 436, 13);
    const tiers: [number, FruitKind[]][] = [
      [140, [ORANGE, APPLE, LEMON, PEAR, PEACH]],
      [196, [KIWI, STRAWBERRY, APPLE, DRAGON, LEMON]],
    ];
    tiers.forEach(([y, kinds], t) => {
      kinds.forEach((k, i) => pile(ctx, k, 60 + i * 90, y - 4, 82, 3, 0.4, "flat", 700 + t * 20 + i * 3));
      ctx.fillStyle = "#fbf3e4";
      ctx.fillRect(18, y - 4, 444, 7);
      ctx.strokeRect(18, y - 4, 444, 7);
      kinds.forEach((_, i) => {
        const x = 60 + i * 90;
        ctx.fillStyle = "#ffd23f";
        ctx.fillRect(x - 11, y - 3, 22, 10);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 11, y - 3, 22, 10);
        ctx.lineWidth = 2.5;
        text(ctx, ["49¢", "99¢", "2/$1", "79¢", "3/$2"][(i + t) % 5], x, y + 2.3, `800 6.5px ${POSTER_FONT}`, OUTLINE);
      });
    });
    ctx.fillStyle = "rgba(191,227,208,0.4)";
    ctx.fillRect(14, 104, 452, 98);
    // Checker floor in perspective.
    const rows = [[202, 12, 22], [214, 16, 28], [230, 18, 34], [248, 22, 42]];
    rows.forEach(([y, h, tile], j) => {
      for (let i = -12; i <= 12; i++) {
        ctx.fillStyle = (i + j) % 2 ? "#fbf3e4" : "#7cc4b0";
        ctx.fillRect(240 + i * tile - tile / 2, y, tile, h);
      }
    });
    // Aisle sign.
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(190, 0);
    ctx.lineTo(190, 10);
    ctx.moveTo(290, 0);
    ctx.lineTo(290, 10);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    roundRect(ctx, 148, 9, 184, 38, 8);
    ctx.fillStyle = "#23395b";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(170, 28, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd23f";
    ctx.fill();
    ctx.stroke();
    text(ctx, "1", 170, 29, `800 16px ${POSTER_FONT}`, OUTLINE);
    ctx.save();
    ctx.letterSpacing = "2px";
    text(ctx, "PRODUCE", 254, 29, `800 18px ${POSTER_FONT}`, "#fbf3e4");
    ctx.restore();
    // Front bins.
    const front = [APPLE, ORANGE, MELON, PEACH];
    front.forEach((k, i) => {
      const x = -6 + i * 124;
      pile(ctx, k, x + 60, 242, 116, 2, k === MELON ? 0.5 : 0.62, "flat", 900 + i);
      ctx.beginPath();
      ctx.moveTo(x, 236);
      ctx.lineTo(x + 120, 236);
      ctx.lineTo(x + 114, H + 4);
      ctx.lineTo(x + 6, H + 4);
      ctx.closePath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
      ctx.fillStyle = i % 2 ? "#e85d4a" : "#3aa66a";
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(x + 4, 240, 112, 3);
    });
    starburst(ctx, 446, 214, 22, 12, "#ffd23f");
    text(ctx, "SALE", 446, 215, `800 10px ${POSTER_FONT}`, "#e85d4a");
  },
  shadow: "rgba(42,34,51,0.22)",
  slash: { fill: "#ffffff", edge: OUTLINE },
  sticker(ctx, letter, x, y, rotten) {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = OUTLINE;
    ctx.fillStyle = rotten ? "#a3ad72" : "#ffd23f";
    ctx.fill();
    ctx.stroke();
    text(ctx, letter.toUpperCase(), x, y + 1, `800 14px ${POSTER_FONT}`, OUTLINE);
  },
  hud(ctx, score, lives, max) {
    roundRect(ctx, 10, 8, 104, 24, 12);
    ctx.fillStyle = "#23395b";
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    text(ctx, "SCORE", 22, 20.5, `800 7px ${POSTER_FONT}`, "#ffd23f", undefined, 0, "left");
    text(ctx, String(score), 104, 21, `800 14px ${POSTER_FONT}`, "#fbf3e4", undefined, 0, "right");
    for (let i = 0; i < max; i++) basket(ctx, 462 - i * 22, 14, i < lives, "#e85d4a", OUTLINE, OUTLINE);
  },
  popup(ctx, s, x, y, alpha, big) {
    ctx.globalAlpha = alpha;
    text(ctx, s, x, y, `800 ${big ? 22 : 12}px ${POSTER_FONT}`, big ? "#ffd23f" : "#ffffff", OUTLINE, big ? 5 : 3.5);
    ctx.globalAlpha = 1;
  },
};

// ---------------------------------------------------------------------------------------------------------------
// D: Night grocer. Moody and luxurious: dark green, brass, spotlights making the fruit glow like jewels.

const SERIF = "'Iowan Old Style', 'Palatino', Georgia, serif";
let vignette: CanvasGradient | null = null;

const nightGrocer: Look = {
  id: "d",
  name: "Night grocer",
  blurb: "Fancy grocer after dark: deep green walls, brass, slate price tags and spotlights that make the fruit glow.",
  style: "soft",
  background(ctx) {
    ctx.fillStyle = "#0f2219";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#1d3a2c";
    ctx.lineWidth = 1;
    for (let x = 6; x < W; x += 60) ctx.strokeRect(x, 64, 48, 76);
    ctx.fillStyle = "#132a20";
    ctx.fillRect(0, 150, W, 120);
    ctx.fillStyle = "#c9a45c";
    ctx.fillRect(0, 147, W, 3);
    ctx.fillStyle = "#f2d99a";
    ctx.fillRect(0, 147, W, 0.8);
    const gold = ctx.createLinearGradient(0, 22, 0, 46);
    gold.addColorStop(0, "#fbe7b0");
    gold.addColorStop(1, "#b8893a");
    text(ctx, "The Green Grocer", 240, 32, `italic 600 25px ${SERIF}`, gold);
    ctx.fillStyle = "#c9a45c";
    ctx.fillRect(150, 48, 50, 0.8);
    ctx.fillRect(280, 48, 50, 0.8);
    ctx.save();
    ctx.letterSpacing = "1.5px";
    text(ctx, "FINE FRUIT", 240, 48.5, `600 6px ${SERIF}`, "#c9a45c");
    ctx.restore();
    const tiers: [number, FruitKind[]][] = [
      [124, [PEACH, APPLE, PEAR, DRAGON, ORANGE]],
      [190, [STRAWBERRY, LEMON, KIWI, APPLE, PEACH]],
    ];
    const names = ["Peaches", "Apples", "Pears", "Pitaya", "Oranges", "Berries", "Lemons", "Kiwis", "Apples", "Peaches"];
    tiers.forEach(([y, kinds], t) => {
      kinds.forEach((k, i) => pile(ctx, k, 60 + i * 90, y - 3, 82, 3, 0.42, "soft", 1100 + t * 10 + i));
      ctx.fillStyle = "#2a1a12";
      ctx.fillRect(14, y - 3, 452, 6);
      ctx.fillStyle = "#4a3020";
      ctx.fillRect(14, y - 3, 452, 1);
      kinds.forEach((_, i) => {
        const x = 60 + i * 90;
        roundRect(ctx, x - 17, y + 5, 34, 13, 2);
        ctx.fillStyle = "#1a1a1a";
        ctx.fill();
        ctx.strokeStyle = "#c9a45c";
        ctx.lineWidth = 0.6;
        ctx.stroke();
        text(ctx, names[t * 5 + i], x, y + 9.6, `italic 5px ${SERIF}`, "#f2efe6");
        text(ctx, ["3.50", "2.25", "2.80", "6.00", "1.90"][i], x, y + 14.6, `5px ${SERIF}`, "#c9a45c");
      });
    });
    // Shadow everything, then pour the light back in.
    ctx.fillStyle = "rgba(4,12,8,0.5)";
    ctx.fillRect(0, 60, W, 150);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const x of [60, 240, 420]) {
      const cone = ctx.createLinearGradient(0, 0, 0, 200);
      cone.addColorStop(0, "rgba(255,210,140,0.12)");
      cone.addColorStop(1, "rgba(255,210,140,0)");
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(x - 8, 0);
      ctx.lineTo(x + 8, 0);
      ctx.lineTo(x + 70, 200);
      ctx.lineTo(x - 70, 200);
      ctx.fill();
      const pool = ctx.createRadialGradient(x, 110, 0, x, 110, 85);
      pool.addColorStop(0, "rgba(255,190,110,0.26)");
      pool.addColorStop(1, "rgba(255,190,110,0)");
      ctx.fillStyle = pool;
      ctx.fillRect(x - 90, 20, 180, 190);
    }
    ctx.restore();
    const front = [ORANGE, MELON, APPLE, PEAR];
    front.forEach((k, i) => {
      const x = -6 + i * 124;
      pile(ctx, k, x + 60, 242, 116, 2, k === MELON ? 0.5 : 0.62, "soft", 1300 + i);
      crateFront(ctx, x, 238, 120, 40, "#3a2416", "#22140c", "#5a3a24");
      ctx.fillStyle = "#c9a45c";
      ctx.fillRect(x + 3, 238, 6, 6);
      ctx.fillRect(x + 111, 238, 6, 6);
    });
  },
  overlay(ctx) {
    vignette ??= (() => {
      const g = ctx.createRadialGradient(W / 2, H / 2, 110, W / 2, H / 2, 300);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.6)");
      return g;
    })();
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  },
  shadow: "rgba(0,0,0,0.45)",
  slash: { fill: "#fff1c8", glow: "rgba(255,200,110,0.9)" },
  sticker(ctx, letter, x, y, rotten) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    roundRect(ctx, x - 9.5, y - 9.5, 19, 19, 3);
    ctx.fillStyle = rotten ? "#b9b08a" : "#f6efe0";
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x - 8, y - 8, 16, 16, 2);
    ctx.strokeStyle = rotten ? "#6b5a2a" : "#c9a45c";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    text(ctx, letter.toUpperCase(), x, y + 1, `700 13px ${SERIF}`, rotten ? "#4a3a1a" : "#13261d");
  },
  hud(ctx, score, lives, max) {
    text(ctx, "Score", 14, 14, `italic 8px ${SERIF}`, "#c9a45c", undefined, 0, "left");
    text(ctx, String(score), 14, 27, `600 15px ${SERIF}`, "#fbe7b0", undefined, 0, "left");
    for (let i = 0; i < max; i++) basket(ctx, 462 - i * 22, 14, i < lives, "#3a2416", "#c9a45c");
  },
  popup(ctx, s, x, y, alpha, big) {
    ctx.globalAlpha = alpha;
    text(ctx, s, x, y, `italic 700 ${big ? 24 : 13}px ${SERIF}`, big ? "#fbe7b0" : "#ffffff", "rgba(10,20,15,0.85)", 3);
    ctx.globalAlpha = 1;
  },
};

export const LOOKS: Look[] = [market, pixelAisle, poster, nightGrocer];

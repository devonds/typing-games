// PROTOTYPE (throwaway): fruit drawn in code. Each fruit has an outline, a skin and the cut face you see once
// it's sliced. Two styles: "soft" (shaded, glossy) and "flat" (solid colours with a dark outline).
export type Style = "soft" | "flat";
type Ctx = CanvasRenderingContext2D;

export const TAU = Math.PI * 2;
export const OUTLINE = "#2a2233";

export interface FruitKind {
  name: string;
  /** Radius in scene units (the scene is 480x270). */
  r: number;
  skin: { light: string; base: string; dark: string };
  juice: string;
  /** Starts a new path tracing the fruit's outline, centred on 0,0. */
  shape(ctx: Ctx, r: number): void;
  /** Spots, stripes, seeds on the skin. Called clipped to the outline. */
  skinDetail?(ctx: Ctx, r: number, style: Style): void;
  /** Stem, leaves, anything that sticks out. Called unclipped, on top. */
  top?(ctx: Ctx, r: number, style: Style): void;
  /** The cut face. Called clipped to the outline. */
  inside(ctx: Ctx, r: number, style: Style): void;
}

/** Stable pseudo-random numbers, so seeds and spots stay put from frame to frame. */
export function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------------------------------------------
// Helpers

function ellipse(ctx: Ctx, rx: number, ry: number, x = 0, y = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
}

/** Soft style: a radial gradient. Flat style: the middle colour of the same stops. */
function shade(
  ctx: Ctx,
  style: Style,
  x: number,
  y: number,
  radius: number,
  stops: [number, string][],
): CanvasGradient | string {
  if (style === "flat") return stops[Math.floor((stops.length - 1) / 2)][1];
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  return g;
}

/** Fill the fruit's own outline shrunk to `scale`, e.g. the flesh just inside the skin. */
function inset(ctx: Ctx, k: FruitKind, r: number, scale: number, fill: string | CanvasGradient): void {
  ctx.save();
  ctx.scale(scale, scale);
  k.shape(ctx, r);
  ctx.restore();
  ctx.fillStyle = fill;
  ctx.fill();
}

function fillAll(ctx: Ctx, r: number, colour: string): void {
  ctx.fillStyle = colour;
  ctx.fillRect(-2 * r, -2 * r, 4 * r, 4 * r);
}

/** A seed or leaf shape: rounded at the back, pointed towards `angle`. */
export function teardrop(ctx: Ctx, x: number, y: number, len: number, w: number, angle: number, fill: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(len / 2, 0);
  ctx.bezierCurveTo(len * 0.1, -w, -len / 2, -w, -len / 2, 0);
  ctx.bezierCurveTo(-len / 2, w, len * 0.1, w, len / 2, 0);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function leaf(ctx: Ctx, x: number, y: number, len: number, w: number, angle: number, style: Style, colour = "#4caf50"): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.45, -w, len, 0);
  ctx.quadraticCurveTo(len * 0.45, w, 0, 0);
  if (style === "flat") {
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  }
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(len * 0.1, 0);
  ctx.lineTo(len * 0.8, 0);
  ctx.strokeStyle = "rgba(0,60,0,0.35)";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.restore();
}

function stem(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, width: number, style: Style, colour = "#6b4423"): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x0, (y0 + y1) / 2, x1, y1);
  ctx.lineCap = "round";
  if (style === "flat") {
    ctx.lineWidth = width + 2.4;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  }
  ctx.lineWidth = width;
  ctx.strokeStyle = colour;
  ctx.stroke();
}

/** Orange, lemon: a ring of segments inside a white pith. */
function citrus(
  ctx: Ctx,
  k: FruitKind,
  r: number,
  style: Style,
  o: { rim: string; pith: string; flesh: [string, string, string]; vein: string; n: number; sx: number; sy: number },
): void {
  fillAll(ctx, r, o.rim);
  inset(ctx, k, r, 0.9, o.pith);
  ctx.save();
  ctx.scale(o.sx, o.sy);
  const fill = shade(ctx, style, 0, 0, 0.8 * r, [
    [0, o.flesh[0]],
    [0.6, o.flesh[1]],
    [1, o.flesh[2]],
  ]);
  for (let i = 0; i < o.n; i++) {
    const a0 = (i / o.n) * TAU + 0.05;
    const a1 = ((i + 1) / o.n) * TAU - 0.05;
    const mid = (a0 + a1) / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(mid) * 0.1 * r, Math.sin(mid) * 0.1 * r);
    ctx.arc(0, 0, 0.78 * r, a0, a1);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (style === "soft") {
      ctx.strokeStyle = o.vein;
      ctx.lineWidth = 0.025 * r;
      for (const off of [-0.12, 0.12]) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(mid + off * 0.5) * 0.28 * r, Math.sin(mid + off * 0.5) * 0.28 * r);
        ctx.lineTo(Math.cos(mid + off) * 0.66 * r, Math.sin(mid + off) * 0.66 * r);
        ctx.stroke();
      }
    }
  }
  ellipse(ctx, 0.08 * r, 0.08 * r);
  ctx.fillStyle = o.pith;
  ctx.fill();
  ctx.restore();
}

function appleShape(ctx: Ctx, r: number): void {
  ctx.beginPath();
  ctx.moveTo(0, -0.72 * r);
  ctx.bezierCurveTo(0.35 * r, -1.05 * r, 1.05 * r, -0.95 * r, 1.0 * r, -0.15 * r);
  ctx.bezierCurveTo(0.98 * r, 0.55 * r, 0.6 * r, 1.0 * r, 0.28 * r, 0.95 * r);
  ctx.bezierCurveTo(0.12 * r, 0.92 * r, -0.12 * r, 0.92 * r, -0.28 * r, 0.95 * r);
  ctx.bezierCurveTo(-0.6 * r, 1.0 * r, -0.98 * r, 0.55 * r, -1.0 * r, -0.15 * r);
  ctx.bezierCurveTo(-1.05 * r, -0.95 * r, -0.35 * r, -1.05 * r, 0, -0.72 * r);
  ctx.closePath();
}

// ---------------------------------------------------------------------------------------------------------------
// The fruit

const apple: FruitKind = {
  name: "apple",
  r: 20,
  skin: { light: "#ff8a74", base: "#d8323a", dark: "#7e1424" },
  juice: "#fbeaa8",
  shape: appleShape,
  skinDetail(ctx, r, style) {
    if (style === "flat") return;
    ctx.strokeStyle = "rgba(255,210,120,0.16)";
    ctx.lineWidth = 0.05 * r;
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 0.2 * r;
      ctx.beginPath();
      ctx.moveTo(x * 0.3, -0.7 * r);
      ctx.quadraticCurveTo(x * 1.1, 0, x * 0.8, 0.5 * r + hash(i) * 0.3 * r);
      ctx.stroke();
    }
  },
  top(ctx, r, style) {
    stem(ctx, 0, -0.68 * r, 0.1 * r, -1.12 * r, 0.1 * r, style);
    leaf(ctx, 0.06 * r, -0.95 * r, 0.55 * r, 0.2 * r, -0.45, style);
  },
  inside(ctx, r, style) {
    fillAll(ctx, r, "#c8303a");
    inset(ctx, apple, r, 0.9, shade(ctx, style, 0, 0.1 * r, r, [[0, "#fffbe8"], [0.55, "#fff1c8"], [1, "#f2d78c"]]));
    ellipse(ctx, 0.26 * r, 0.36 * r, 0, 0.05 * r);
    ctx.strokeStyle = "rgba(214,180,100,0.7)";
    ctx.lineWidth = 0.04 * r;
    ctx.stroke();
    teardrop(ctx, -0.09 * r, 0.06 * r, 0.22 * r, 0.09 * r, -Math.PI / 2 - 0.3, "#5a2b14");
    teardrop(ctx, 0.09 * r, 0.06 * r, 0.22 * r, 0.09 * r, -Math.PI / 2 + 0.3, "#5a2b14");
  },
};

const orange: FruitKind = {
  name: "orange",
  r: 19,
  skin: { light: "#ffd36a", base: "#ff961c", dark: "#c4570a" },
  juice: "#ffa526",
  shape: (ctx, r) => ellipse(ctx, r, 0.95 * r),
  skinDetail(ctx, r, style) {
    ctx.fillStyle = "rgba(160,70,0,0.22)";
    const n = style === "soft" ? 60 : 10;
    for (let i = 0; i < n; i++) {
      const a = hash(i) * TAU;
      const d = Math.sqrt(hash(i + 100)) * 0.95 * r;
      ellipse(ctx, 0.03 * r, 0.03 * r, Math.cos(a) * d, Math.sin(a) * d);
      ctx.fill();
    }
  },
  top(ctx, r, style) {
    for (let i = 0; i < 5; i++) leaf(ctx, 0, -0.9 * r, 0.22 * r, 0.08 * r, -Math.PI / 2 + (i - 2) * 0.9, style, "#3f8f3a");
  },
  inside(ctx, r, style) {
    citrus(ctx, orange, r, style, {
      rim: "#f28a10",
      pith: "#fff3d6",
      flesh: ["#ffd27a", "#ffa630", "#ff8a1c"],
      vein: "rgba(255,236,170,0.55)",
      n: 10,
      sx: 1,
      sy: 0.95,
    });
  },
};

const lemon: FruitKind = {
  name: "lemon",
  r: 17,
  skin: { light: "#fff8a8", base: "#ffdf3a", dark: "#d4a20e" },
  juice: "#fff06a",
  shape(ctx, r) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.98 * r, 0.8 * r, 0, 0, TAU);
    ctx.moveTo(1.14 * r, 0);
    ctx.ellipse(0.98 * r, 0, 0.16 * r, 0.14 * r, 0, 0, TAU);
    ctx.moveTo(-0.82 * r, 0);
    ctx.ellipse(-0.98 * r, 0, 0.16 * r, 0.14 * r, 0, 0, TAU);
  },
  skinDetail(ctx, r, style) {
    if (style === "flat") return;
    ctx.fillStyle = "rgba(170,120,0,0.18)";
    for (let i = 0; i < 40; i++) {
      ellipse(ctx, 0.025 * r, 0.025 * r, (hash(i) - 0.5) * 1.9 * r, (hash(i + 50) - 0.5) * 1.5 * r);
      ctx.fill();
    }
  },
  inside(ctx, r, style) {
    citrus(ctx, lemon, r, style, {
      rim: "#f0c814",
      pith: "#fffbe2",
      flesh: ["#fffbb0", "#fff07a", "#ffe03d"],
      vein: "rgba(255,255,230,0.6)",
      n: 8,
      sx: 1,
      sy: 0.8 / 0.98,
    });
  },
};

const kiwi: FruitKind = {
  name: "kiwi",
  r: 18,
  skin: { light: "#c4955a", base: "#8a5a2b", dark: "#4f3013" },
  juice: "#9fdc3e",
  shape: (ctx, r) => ellipse(ctx, r, 0.82 * r),
  skinDetail(ctx, r, style) {
    ctx.strokeStyle = style === "soft" ? "rgba(230,200,150,0.3)" : "rgba(60,30,10,0.35)";
    ctx.lineWidth = 0.025 * r;
    const n = style === "soft" ? 90 : 20;
    for (let i = 0; i < n; i++) {
      const x = (hash(i) - 0.5) * 2 * r;
      const y = (hash(i + 300) - 0.5) * 1.7 * r;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.05 * r, y + 0.06 * r);
      ctx.stroke();
    }
  },
  inside(ctx, r, style) {
    fillAll(ctx, r, "#6b4520");
    inset(ctx, kiwi, r, 0.93, shade(ctx, style, 0, 0, r, [[0, "#f4fbc0"], [0.22, "#cdee70"], [0.6, "#8fd13a"], [1, "#5fae1e"]]));
    ctx.save();
    ctx.scale(1, 0.82);
    if (style === "soft") {
      ctx.strokeStyle = "rgba(240,255,200,0.35)";
      ctx.lineWidth = 0.02 * r;
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 0.25 * r, Math.sin(a) * 0.25 * r);
        const d = (0.7 + 0.15 * hash(i)) * r;
        ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
        ctx.stroke();
      }
    }
    ellipse(ctx, 0.2 * r, 0.2 * r);
    ctx.fillStyle = "#f7fbe0";
    ctx.fill();
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU + hash(i) * 0.15;
      const d = (0.32 + 0.07 * hash(i + 9)) * r;
      teardrop(ctx, Math.cos(a) * d, Math.sin(a) * d, 0.1 * r, 0.035 * r, a, "#1b1410");
    }
    ctx.restore();
  },
};

const watermelon: FruitKind = {
  name: "watermelon",
  r: 24,
  skin: { light: "#7cc96e", base: "#2f8a3a", dark: "#14481b" },
  juice: "#ff4f63",
  shape: (ctx, r) => ellipse(ctx, 1.15 * r, 0.9 * r),
  skinDetail(ctx, r, style) {
    ctx.strokeStyle = style === "soft" ? "rgba(20,80,30,0.85)" : "#1b5a24";
    ctx.lineWidth = 0.13 * r;
    ctx.lineJoin = "round";
    for (let i = -5; i <= 5; i++) {
      const x0 = i * 0.24 * r;
      ctx.beginPath();
      for (let s = 0; s <= 20; s++) {
        const y = -0.9 * r + (s / 20) * 1.8 * r;
        const bow = Math.sqrt(Math.max(0, 1 - (y / (0.9 * r)) ** 2));
        const x = x0 * bow * 1.1 + Math.sin(s * 1.3 + i) * 0.04 * r;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },
  top(ctx, r, style) {
    stem(ctx, 0, -0.88 * r, 0.06 * r, -1.0 * r, 0.08 * r, style, "#5d7a2a");
  },
  inside(ctx, r, style) {
    fillAll(ctx, r, "#1f6b2a");
    inset(ctx, watermelon, r, 0.95, "#d8f0b0");
    inset(ctx, watermelon, r, 0.87, shade(ctx, style, 0, 0, r, [[0, "#ff8f94"], [0.65, "#ff4f63"], [1, "#e8344f"]]));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + hash(i) * 0.3;
      const d = (0.48 + 0.1 * hash(i + 3)) * r;
      teardrop(ctx, Math.cos(a) * d * 1.15, Math.sin(a) * d * 0.9, 0.13 * r, 0.05 * r, a, "#1b1410");
    }
  },
};

const strawberry: FruitKind = {
  name: "strawberry",
  r: 17,
  skin: { light: "#ff7466", base: "#e8262f", dark: "#8e0f1b" },
  juice: "#ff3b4a",
  shape(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(0, -0.75 * r);
    ctx.bezierCurveTo(0.55 * r, -0.95 * r, 1.0 * r, -0.65 * r, 0.9 * r, -0.15 * r);
    ctx.bezierCurveTo(0.8 * r, 0.4 * r, 0.25 * r, 0.95 * r, 0, 1.0 * r);
    ctx.bezierCurveTo(-0.25 * r, 0.95 * r, -0.8 * r, 0.4 * r, -0.9 * r, -0.15 * r);
    ctx.bezierCurveTo(-1.0 * r, -0.65 * r, -0.55 * r, -0.95 * r, 0, -0.75 * r);
    ctx.closePath();
  },
  skinDetail(ctx, r, style) {
    for (let j = -3; j <= 4; j++) {
      for (let i = -4; i <= 4; i++) {
        const x = i * 0.22 * r + (j % 2 ? 0.11 * r : 0);
        const y = j * 0.22 * r;
        if (style === "soft") teardrop(ctx, x + 0.015 * r, y + 0.02 * r, 0.09 * r, 0.035 * r, -Math.PI / 2, "rgba(110,0,10,0.35)");
        teardrop(ctx, x, y, 0.08 * r, 0.03 * r, -Math.PI / 2, "#ffd65a");
      }
    }
  },
  top(ctx, r, style) {
    for (const a of [-2.7, -2.1, -1.57, -1.05, -0.45]) leaf(ctx, 0, -0.74 * r, 0.42 * r, 0.13 * r, a + Math.PI, style, "#3fa34a");
    stem(ctx, 0, -0.78 * r, 0.06 * r, -1.08 * r, 0.08 * r, style, "#4d8a2a");
  },
  inside(ctx, r, style) {
    fillAll(ctx, r, "#e0283a");
    inset(ctx, strawberry, r, 0.86, shade(ctx, style, 0, -0.1 * r, r, [[0, "#fff0ee"], [0.35, "#ffb3b0"], [0.75, "#ff5a64"], [1, "#e8343f"]]));
    ellipse(ctx, 0.13 * r, 0.45 * r, 0, -0.08 * r);
    ctx.fillStyle = "rgba(255,236,234,0.9)";
    ctx.fill();
  },
};

const peach: FruitKind = {
  name: "peach",
  r: 19,
  skin: { light: "#ffe2a8", base: "#ffaa6e", dark: "#d9583a" },
  juice: "#ffc061",
  shape: (ctx, r) => ellipse(ctx, r, 0.95 * r),
  skinDetail(ctx, r, style) {
    if (style === "soft") {
      ctx.fillStyle = shade(ctx, style, 0.35 * r, 0.2 * r, 0.9 * r, [[0, "rgba(230,50,50,0.6)"], [1, "rgba(230,50,50,0)"]]);
      ctx.fillRect(-r, -r, 2 * r, 2 * r);
    } else {
      ellipse(ctx, 0.6 * r, 0.55 * r, 0.32 * r, 0.22 * r);
      ctx.fillStyle = "#f2704f";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-0.05 * r, -0.95 * r);
    ctx.quadraticCurveTo(-0.5 * r, -0.1 * r, -0.15 * r, 0.9 * r);
    ctx.strokeStyle = "rgba(170,60,30,0.4)";
    ctx.lineWidth = 0.05 * r;
    ctx.stroke();
  },
  top(ctx, r, style) {
    stem(ctx, -0.02 * r, -0.9 * r, 0.04 * r, -1.08 * r, 0.09 * r, style);
    leaf(ctx, 0.04 * r, -1.0 * r, 0.5 * r, 0.17 * r, -0.25, style);
  },
  inside(ctx, r, style) {
    fillAll(ctx, r, "#f07a4a");
    inset(ctx, peach, r, 0.93, shade(ctx, style, 0, 0.03 * r, r, [[0, "#ff6a34"], [0.4, "#ffb347"], [1, "#ffd472"]]));
    ellipse(ctx, 0.27 * r, 0.36 * r, 0, 0.03 * r);
    ctx.fillStyle = shade(ctx, style, -0.08 * r, -0.08 * r, 0.4 * r, [[0, "#a65a33"], [0.5, "#8a4a2a"], [1, "#5e2e18"]]);
    ctx.fill();
    ctx.strokeStyle = "#5e2e18";
    ctx.lineWidth = 0.03 * r;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const y = (i - 2) * 0.12 * r;
      ctx.moveTo(-0.18 * r, y);
      ctx.quadraticCurveTo(0, y + (hash(i) - 0.5) * 0.15 * r, 0.18 * r, y + 0.03 * r);
      ctx.stroke();
    }
  },
};

const pear: FruitKind = {
  name: "pear",
  r: 20,
  skin: { light: "#f2f59e", base: "#b8d24a", dark: "#6a9420" },
  juice: "#f3ecbe",
  shape(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(0, -0.95 * r);
    ctx.bezierCurveTo(0.25 * r, -0.95 * r, 0.3 * r, -0.55 * r, 0.45 * r, -0.25 * r);
    ctx.bezierCurveTo(0.75 * r, 0.15 * r, 0.95 * r, 0.45 * r, 0.8 * r, 0.75 * r);
    ctx.bezierCurveTo(0.6 * r, 1.05 * r, -0.6 * r, 1.05 * r, -0.8 * r, 0.75 * r);
    ctx.bezierCurveTo(-0.95 * r, 0.45 * r, -0.75 * r, 0.15 * r, -0.45 * r, -0.25 * r);
    ctx.bezierCurveTo(-0.3 * r, -0.55 * r, -0.25 * r, -0.95 * r, 0, -0.95 * r);
    ctx.closePath();
  },
  skinDetail(ctx, r, style) {
    ctx.fillStyle = "rgba(120,80,20,0.3)";
    const n = style === "soft" ? 35 : 8;
    for (let i = 0; i < n; i++) {
      ellipse(ctx, 0.025 * r, 0.025 * r, (hash(i) - 0.5) * 1.6 * r, (hash(i + 70) - 0.3) * 1.5 * r);
      ctx.fill();
    }
    if (style === "soft") {
      ctx.fillStyle = shade(ctx, style, 0.4 * r, 0.4 * r, 0.6 * r, [[0, "rgba(240,120,60,0.35)"], [1, "rgba(240,120,60,0)"]]);
      ctx.fillRect(-r, -r, 2 * r, 2 * r);
    }
  },
  top(ctx, r, style) {
    stem(ctx, 0, -0.9 * r, -0.12 * r, -1.2 * r, 0.09 * r, style);
  },
  inside(ctx, r, style) {
    fillAll(ctx, r, "#a8c43a");
    inset(ctx, pear, r, 0.92, shade(ctx, style, 0, 0.3 * r, r, [[0, "#fffcea"], [0.5, "#fbf3d0"], [1, "#efe4ae"]]));
    ctx.beginPath();
    ctx.moveTo(0, -0.85 * r);
    ctx.lineTo(0, 0.05 * r);
    ctx.strokeStyle = "#e6d89c";
    ctx.lineWidth = 0.04 * r;
    ctx.stroke();
    ellipse(ctx, 0.2 * r, 0.3 * r, 0, 0.35 * r);
    ctx.fillStyle = "#f3e8bc";
    ctx.fill();
    ctx.strokeStyle = "#e0cf8e";
    ctx.stroke();
    teardrop(ctx, -0.07 * r, 0.35 * r, 0.18 * r, 0.07 * r, -Math.PI / 2 - 0.2, "#4a2612");
    teardrop(ctx, 0.07 * r, 0.35 * r, 0.18 * r, 0.07 * r, -Math.PI / 2 + 0.2, "#4a2612");
  },
};

const dragonfruit: FruitKind = {
  name: "dragon fruit",
  r: 20,
  skin: { light: "#ff8cc8", base: "#ea2f8a", dark: "#931055" },
  juice: "#ff5fae",
  shape: (ctx, r) => ellipse(ctx, 0.85 * r, r),
  skinDetail(ctx, r, style) {
    for (let i = 0; i < 6; i++) {
      const x = (hash(i) - 0.5) * 1.1 * r;
      const y = (hash(i + 20) - 0.5) * 1.4 * r;
      leaf(ctx, x, y, 0.32 * r, 0.12 * r, -Math.PI / 2 + (hash(i + 40) - 0.5), style, style === "soft" ? "#ff6fb8" : "#ff7ec0");
      teardrop(ctx, x + Math.cos(-Math.PI / 2) * 0.26 * r, y - 0.26 * r, 0.1 * r, 0.04 * r, -Math.PI / 2, "#9ad13a");
    }
  },
  top(ctx, r, style) {
    const flaps: [number, number][] = [[-2.5, 1], [-1.57, 1], [-0.65, 1], [0.3, 0.9], [1.2, 0.8], [2.1, 0.9], [2.9, 0.9]];
    for (const [a, s] of flaps) {
      const x = Math.cos(a) * 0.8 * r;
      const y = Math.sin(a) * 0.95 * r;
      leaf(ctx, x, y, 0.4 * r * s, 0.13 * r, a - 0.5, style, "#f4519e");
      leaf(ctx, x + Math.cos(a - 0.5) * 0.25 * r * s, y + Math.sin(a - 0.5) * 0.25 * r * s, 0.17 * r * s, 0.07 * r, a - 0.5, style, "#9ad13a");
    }
  },
  inside(ctx, r, style) {
    fillAll(ctx, r, "#e8358f");
    inset(ctx, dragonfruit, r, 0.9, shade(ctx, style, 0, 0, r, [[0, "#ffffff"], [0.5, "#fbfaf4"], [1, "#ece6da"]]));
    ctx.fillStyle = "#1b1410";
    for (let i = 0; i < 110; i++) {
      const a = hash(i) * TAU;
      const d = Math.sqrt(hash(i + 500)) * 0.78 * r;
      ellipse(ctx, 0.022 * r, 0.022 * r, Math.cos(a) * d * 0.85, Math.sin(a) * d);
      ctx.fill();
    }
  },
};

export const ROTTEN: FruitKind = {
  name: "rotten apple",
  r: 20,
  skin: { light: "#ad9a5c", base: "#7d6a3a", dark: "#3a2f14" },
  juice: "#8a9a3a",
  shape: appleShape,
  skinDetail(ctx, r, style) {
    for (const [x, y, s] of [[0.35, 0.3, 0.35], [-0.4, -0.1, 0.28], [0.1, 0.65, 0.22]]) {
      ellipse(ctx, s * r, s * 0.8 * r, x * r, y * r);
      ctx.fillStyle = "rgba(40,28,10,0.5)";
      ctx.fill();
    }
    for (const [x, y, s] of [[-0.3, 0.35, 0.22], [0.45, -0.3, 0.16], [0.05, -0.15, 0.12]]) {
      ellipse(ctx, s * r, s * r, x * r, y * r);
      ctx.fillStyle = style === "soft" ? "rgba(170,205,130,0.85)" : "#a9cc84";
      ctx.fill();
      ellipse(ctx, s * 0.5 * r, s * 0.5 * r, x * r, y * r);
      ctx.fillStyle = "#eef6d8";
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(30,20,5,0.45)";
    ctx.lineWidth = 0.04 * r;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const x = (i - 1.5) * 0.35 * r;
      ctx.moveTo(x, -0.5 * r);
      ctx.quadraticCurveTo(x + 0.2 * r, -0.1 * r, x - 0.05 * r, 0.3 * r);
      ctx.stroke();
    }
  },
  top(ctx, r, style) {
    stem(ctx, 0, -0.68 * r, -0.25 * r, -0.95 * r, 0.09 * r, style, "#3d2a14");
    leaf(ctx, -0.2 * r, -0.9 * r, 0.4 * r, 0.14 * r, 2.6, style, "#7a6a2a");
  },
  inside(ctx, r, style) {
    fillAll(ctx, r, "#4a3a1a");
    inset(ctx, ROTTEN, r, 0.9, shade(ctx, style, 0, 0, r, [[0, "#c0a060"], [0.6, "#a4864a"], [1, "#7a5f2c"]]));
    for (const [x, y, s] of [[0.3, 0.3, 0.2], [-0.35, -0.2, 0.17], [-0.1, 0.5, 0.12]]) {
      ellipse(ctx, s * r, s * r, x * r, y * r);
      ctx.fillStyle = "rgba(60,40,15,0.6)";
      ctx.fill();
    }
    // A worm, peeking out.
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-0.35 * r, 0.25 * r);
    ctx.quadraticCurveTo(-0.1 * r, -0.25 * r, 0.2 * r, -0.05 * r);
    if (style === "flat") {
      ctx.lineWidth = 0.2 * r;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
    }
    ctx.lineWidth = 0.14 * r;
    ctx.strokeStyle = "#ff9db0";
    ctx.stroke();
    ellipse(ctx, 0.025 * r, 0.025 * r, 0.21 * r, -0.08 * r);
    ctx.fillStyle = "#1b1410";
    ctx.fill();
  },
};

export const KINDS: FruitKind[] = [apple, orange, lemon, kiwi, watermelon, strawberry, peach, pear, dragonfruit];

// ---------------------------------------------------------------------------------------------------------------
// Drawing whole fruit and halves

function highlight(ctx: Ctx, r: number, style: Style): void {
  ctx.save();
  ctx.translate(-0.38 * r, -0.45 * r);
  ctx.rotate(-0.7);
  ellipse(ctx, (style === "soft" ? 0.26 : 0.2) * r, (style === "soft" ? 0.13 : 0.1) * r);
  ctx.fillStyle = style === "soft" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.9)";
  ctx.fill();
  ctx.restore();
  if (style === "soft") {
    ellipse(ctx, 0.05 * r, 0.05 * r, -0.12 * r, -0.66 * r);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fill();
  }
}

/** A whole fruit at x,y. `scale` shrinks it (for piles in the background). */
export function drawWhole(ctx: Ctx, k: FruitKind, x: number, y: number, rot: number, style: Style, scale = 1): void {
  const r = k.r;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  if (style === "flat") {
    k.shape(ctx, r);
    ctx.lineWidth = 3.6 / Math.sqrt(scale);
    ctx.strokeStyle = OUTLINE;
    ctx.lineJoin = "round";
    ctx.stroke();
  }
  k.shape(ctx, r);
  ctx.fillStyle = style === "soft" ? shade(ctx, style, -0.35 * r, -0.4 * r, 1.25 * r, [[0, k.skin.light], [0.45, k.skin.base], [1, k.skin.dark]]) : k.skin.base;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (style === "flat") {
    ctx.fillStyle = k.skin.dark;
    ctx.fillRect(-2 * r, -2 * r, 4 * r, 4 * r);
    ctx.save();
    ctx.translate(-0.16 * r, -0.16 * r);
    k.shape(ctx, r);
    ctx.restore();
    ctx.fillStyle = k.skin.base;
    ctx.fill();
  }
  k.skinDetail?.(ctx, r, style);
  if (style === "soft") {
    k.shape(ctx, r);
    ctx.lineWidth = 0.16 * r;
    ctx.strokeStyle = "rgba(0,0,0,0.16)";
    ctx.stroke();
  }
  highlight(ctx, r, style);
  ctx.restore();
  k.top?.(ctx, r, style);
  ctx.restore();
}

/**
 * Half of a sliced fruit, showing its cut face. `cut` is the angle of the cut in the fruit's own frame and `side`
 * (+1 or -1) picks which half.
 */
export function drawHalf(ctx: Ctx, k: FruitKind, x: number, y: number, rot: number, cut: number, side: number, style: Style): void {
  const r = k.r;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.save();
  ctx.rotate(cut);
  ctx.beginPath();
  ctx.rect(-2 * r, side > 0 ? 0 : -2 * r, 4 * r, 2 * r);
  ctx.restore();
  ctx.clip();
  if (style === "flat") {
    k.shape(ctx, r);
    ctx.lineWidth = 4.4;
    ctx.strokeStyle = OUTLINE;
    ctx.lineJoin = "round";
    ctx.stroke();
  }
  k.shape(ctx, r);
  ctx.save();
  ctx.clip();
  k.inside(ctx, r, style);
  if (style === "soft") {
    // Wet shine across the cut face.
    ctx.fillStyle = shade(ctx, style, -0.3 * r, -0.3 * r, r, [[0, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0)"]]);
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
  }
  ctx.restore();
  // The straight edge of the cut.
  ctx.rotate(cut);
  ctx.beginPath();
  ctx.moveTo(-1.3 * r, 0);
  ctx.lineTo(1.3 * r, 0);
  ctx.lineWidth = style === "flat" ? 2.2 : 1;
  ctx.strokeStyle = style === "flat" ? OUTLINE : "rgba(255,255,255,0.6)";
  ctx.stroke();
  ctx.restore();
}

/** The fly that buzzes around rotten fruit. */
export function drawFly(ctx: Ctx, x: number, y: number, t: number): void {
  const flap = Math.abs(Math.sin(t * 50));
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(225,240,255,0.75)";
  ellipse(ctx, 2.2, 1.2 + flap, -1.4, -1.6);
  ctx.fill();
  ellipse(ctx, 2.2, 1.2 + flap, 1.4, -1.6);
  ctx.fill();
  ctx.fillStyle = "#1d1b22";
  ellipse(ctx, 2.2, 1.6);
  ctx.fill();
  ellipse(ctx, 1.2, 1.2, 2.1, 0);
  ctx.fill();
  ctx.restore();
}

/** Wavy "stinky" lines rising off rotten fruit. */
export function drawStink(ctx: Ctx, x: number, y: number, t: number, colour: string): void {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.8 + i / 3) % 1;
    ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.8;
    const bx = x + (i - 1) * 8;
    const by = y - phase * 14;
    ctx.beginPath();
    for (let s = 0; s <= 8; s++) {
      const yy = by - s * 1.2;
      const xx = bx + Math.sin(s * 0.9 + t * 6 + i) * 1.6;
      if (s === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

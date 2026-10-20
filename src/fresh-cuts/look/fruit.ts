// Fruit drawn in code: an outline, a shaded skin, and the cut face you see once it's sliced.
// Every fruit is drawn around 0,0 at its own radius; drawWhole and drawHalf move, turn and shade it.
import type { FruitKindName } from "../config";

type Ctx = CanvasRenderingContext2D;
type Stops = [at: number, colour: string][];

export const TAU = Math.PI * 2;

export interface FruitLook {
  /** Radius in scene units. */
  r: number;
  skin: { light: string; base: string; dark: string };
  juice: string;
  /** Starts a new path tracing the outline. */
  shape(ctx: Ctx, r: number): void;
  /** Spots, stripes, seeds on the skin. Called clipped to the outline. */
  skinDetail?(ctx: Ctx, r: number): void;
  /** Stem, leaves, anything that sticks out. Called unclipped, on top. */
  top?(ctx: Ctx, r: number): void;
  /** The cut face. Called clipped to the outline. */
  inside(ctx: Ctx, r: number): void;
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

function radial(ctx: Ctx, x: number, y: number, radius: number, stops: Stops): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  return g;
}

/** Fill the fruit's own outline shrunk to `scale`, e.g. the flesh just inside the skin. */
function inset(ctx: Ctx, look: FruitLook, r: number, scale: number, fill: string | CanvasGradient): void {
  ctx.save();
  ctx.scale(scale, scale);
  look.shape(ctx, r);
  ctx.restore();
  ctx.fillStyle = fill;
  ctx.fill();
}

function fillAll(ctx: Ctx, r: number, fill: string | CanvasGradient): void {
  ctx.fillStyle = fill;
  ctx.fillRect(-2 * r, -2 * r, 4 * r, 4 * r);
}

/** A seed shape: rounded at the back, pointed towards `angle`. */
function teardrop(ctx: Ctx, x: number, y: number, len: number, w: number, angle: number, fill: string): void {
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

function leaf(ctx: Ctx, x: number, y: number, len: number, w: number, angle: number, colour = "#4caf50"): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.45, -w, len, 0);
  ctx.quadraticCurveTo(len * 0.45, w, 0, 0);
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

function stem(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, width: number, colour = "#6b4423"): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(x0, (y0 + y1) / 2, x1, y1);
  ctx.lineCap = "round";
  ctx.lineWidth = width;
  ctx.strokeStyle = colour;
  ctx.stroke();
}

/** Orange, lemon: a ring of segments inside a white pith. `sy` squashes the ring to fit the outline. */
function citrus(ctx: Ctx, look: FruitLook, r: number, o: { rim: string; pith: string; flesh: Stops; vein: string; n: number; sy: number }): void {
  fillAll(ctx, r, o.rim);
  inset(ctx, look, r, 0.9, o.pith);
  ctx.save();
  ctx.scale(1, o.sy);
  const fill = radial(ctx, 0, 0, 0.8 * r, o.flesh);
  ctx.strokeStyle = o.vein;
  ctx.lineWidth = 0.025 * r;
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
    for (const off of [-0.12, 0.12]) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(mid + off * 0.5) * 0.28 * r, Math.sin(mid + off * 0.5) * 0.28 * r);
      ctx.lineTo(Math.cos(mid + off) * 0.66 * r, Math.sin(mid + off) * 0.66 * r);
      ctx.stroke();
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

/** Blush, mould, bruises: a soft round patch fading out at its edge. */
function patch(ctx: Ctx, x: number, y: number, radius: number, colour: string, alpha: number): void {
  ctx.globalAlpha = alpha;
  ellipse(ctx, radius, radius, x, y);
  ctx.fillStyle = radial(ctx, x, y, radius, [[0, colour], [1, "rgba(0,0,0,0)"]]);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------------------------------------------
// The fruit

const apple: FruitLook = {
  r: 20,
  skin: { light: "#ff8a74", base: "#d8323a", dark: "#7e1424" },
  juice: "#fbeaa8",
  shape: appleShape,
  skinDetail(ctx, r) {
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
  top(ctx, r) {
    stem(ctx, 0, -0.68 * r, 0.1 * r, -1.12 * r, 0.1 * r);
    leaf(ctx, 0.06 * r, -0.95 * r, 0.55 * r, 0.2 * r, -0.45);
  },
  inside(ctx, r) {
    fillAll(ctx, r, "#c8303a");
    inset(ctx, apple, r, 0.9, radial(ctx, 0, 0.1 * r, r, [[0, "#fffbe8"], [0.55, "#fff1c8"], [1, "#f2d78c"]]));
    ellipse(ctx, 0.26 * r, 0.36 * r, 0, 0.05 * r);
    ctx.strokeStyle = "rgba(214,180,100,0.7)";
    ctx.lineWidth = 0.04 * r;
    ctx.stroke();
    teardrop(ctx, -0.09 * r, 0.06 * r, 0.22 * r, 0.09 * r, -Math.PI / 2 - 0.3, "#5a2b14");
    teardrop(ctx, 0.09 * r, 0.06 * r, 0.22 * r, 0.09 * r, -Math.PI / 2 + 0.3, "#5a2b14");
  },
};

const orange: FruitLook = {
  r: 19,
  skin: { light: "#ffd36a", base: "#ff961c", dark: "#c4570a" },
  juice: "#ffa526",
  shape: (ctx, r) => ellipse(ctx, r, 0.95 * r),
  skinDetail(ctx, r) {
    ctx.fillStyle = "rgba(160,70,0,0.22)";
    for (let i = 0; i < 60; i++) {
      const a = hash(i) * TAU;
      const d = Math.sqrt(hash(i + 100)) * 0.95 * r;
      ellipse(ctx, 0.03 * r, 0.03 * r, Math.cos(a) * d, Math.sin(a) * d);
      ctx.fill();
    }
  },
  top(ctx, r) {
    for (let i = 0; i < 5; i++) leaf(ctx, 0, -0.9 * r, 0.22 * r, 0.08 * r, -Math.PI / 2 + (i - 2) * 0.9, "#3f8f3a");
  },
  inside(ctx, r) {
    citrus(ctx, orange, r, {
      rim: "#f28a10",
      pith: "#fff3d6",
      flesh: [[0, "#ffd27a"], [0.6, "#ffa630"], [1, "#ff8a1c"]],
      vein: "rgba(255,236,170,0.55)",
      n: 10,
      sy: 0.95,
    });
  },
};

const lemon: FruitLook = {
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
  skinDetail(ctx, r) {
    ctx.fillStyle = "rgba(170,120,0,0.18)";
    for (let i = 0; i < 40; i++) {
      ellipse(ctx, 0.025 * r, 0.025 * r, (hash(i) - 0.5) * 1.9 * r, (hash(i + 50) - 0.5) * 1.5 * r);
      ctx.fill();
    }
  },
  inside(ctx, r) {
    citrus(ctx, lemon, r, {
      rim: "#f0c814",
      pith: "#fffbe2",
      flesh: [[0, "#fffbb0"], [0.6, "#fff07a"], [1, "#ffe03d"]],
      vein: "rgba(255,255,230,0.6)",
      n: 8,
      sy: 0.8 / 0.98,
    });
  },
};

const kiwi: FruitLook = {
  r: 18,
  skin: { light: "#c4955a", base: "#8a5a2b", dark: "#4f3013" },
  juice: "#9fdc3e",
  shape: (ctx, r) => ellipse(ctx, r, 0.82 * r),
  skinDetail(ctx, r) {
    ctx.strokeStyle = "rgba(230,200,150,0.3)";
    ctx.lineWidth = 0.025 * r;
    for (let i = 0; i < 90; i++) {
      const x = (hash(i) - 0.5) * 2 * r;
      const y = (hash(i + 300) - 0.5) * 1.7 * r;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.05 * r, y + 0.06 * r);
      ctx.stroke();
    }
  },
  inside(ctx, r) {
    fillAll(ctx, r, "#6b4520");
    inset(ctx, kiwi, r, 0.93, radial(ctx, 0, 0, r, [[0, "#f4fbc0"], [0.22, "#cdee70"], [0.6, "#8fd13a"], [1, "#5fae1e"]]));
    ctx.save();
    ctx.scale(1, 0.82);
    ctx.strokeStyle = "rgba(240,255,200,0.35)";
    ctx.lineWidth = 0.02 * r;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU;
      const d = (0.7 + 0.15 * hash(i)) * r;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 0.25 * r, Math.sin(a) * 0.25 * r);
      ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      ctx.stroke();
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

const watermelon: FruitLook = {
  r: 24,
  skin: { light: "#7cc96e", base: "#2f8a3a", dark: "#14481b" },
  juice: "#ff4f63",
  shape: (ctx, r) => ellipse(ctx, 1.15 * r, 0.9 * r),
  skinDetail(ctx, r) {
    ctx.strokeStyle = "rgba(20,80,30,0.85)";
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
  top(ctx, r) {
    stem(ctx, 0, -0.88 * r, 0.06 * r, -1.0 * r, 0.08 * r, "#5d7a2a");
  },
  inside(ctx, r) {
    fillAll(ctx, r, "#1f6b2a");
    inset(ctx, watermelon, r, 0.95, "#d8f0b0");
    inset(ctx, watermelon, r, 0.87, radial(ctx, 0, 0, r, [[0, "#ff8f94"], [0.65, "#ff4f63"], [1, "#e8344f"]]));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + hash(i) * 0.3;
      const d = (0.48 + 0.1 * hash(i + 3)) * r;
      teardrop(ctx, Math.cos(a) * d * 1.15, Math.sin(a) * d * 0.9, 0.13 * r, 0.05 * r, a, "#1b1410");
    }
  },
};

const strawberry: FruitLook = {
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
  skinDetail(ctx, r) {
    for (let j = -3; j <= 4; j++) {
      for (let i = -4; i <= 4; i++) {
        const x = i * 0.22 * r + (j % 2 ? 0.11 * r : 0);
        const y = j * 0.22 * r;
        teardrop(ctx, x + 0.015 * r, y + 0.02 * r, 0.09 * r, 0.035 * r, -Math.PI / 2, "rgba(110,0,10,0.35)");
        teardrop(ctx, x, y, 0.08 * r, 0.03 * r, -Math.PI / 2, "#ffd65a");
      }
    }
  },
  top(ctx, r) {
    for (const a of [-2.7, -2.1, -1.57, -1.05, -0.45]) leaf(ctx, 0, -0.74 * r, 0.42 * r, 0.13 * r, a + Math.PI, "#3fa34a");
    stem(ctx, 0, -0.78 * r, 0.06 * r, -1.08 * r, 0.08 * r, "#4d8a2a");
  },
  inside(ctx, r) {
    fillAll(ctx, r, "#e0283a");
    inset(ctx, strawberry, r, 0.86, radial(ctx, 0, -0.1 * r, r, [[0, "#fff0ee"], [0.35, "#ffb3b0"], [0.75, "#ff5a64"], [1, "#e8343f"]]));
    ellipse(ctx, 0.13 * r, 0.45 * r, 0, -0.08 * r);
    ctx.fillStyle = "rgba(255,236,234,0.9)";
    ctx.fill();
  },
};

const peach: FruitLook = {
  r: 19,
  skin: { light: "#ffe2a8", base: "#ffaa6e", dark: "#d9583a" },
  juice: "#ffc061",
  shape: (ctx, r) => ellipse(ctx, r, 0.95 * r),
  skinDetail(ctx, r) {
    patch(ctx, 0.35 * r, 0.2 * r, 0.9 * r, "#e63232", 0.6);
    ctx.beginPath();
    ctx.moveTo(-0.05 * r, -0.95 * r);
    ctx.quadraticCurveTo(-0.5 * r, -0.1 * r, -0.15 * r, 0.9 * r);
    ctx.strokeStyle = "rgba(170,60,30,0.4)";
    ctx.lineWidth = 0.05 * r;
    ctx.stroke();
  },
  top(ctx, r) {
    stem(ctx, -0.02 * r, -0.9 * r, 0.04 * r, -1.08 * r, 0.09 * r);
    leaf(ctx, 0.04 * r, -1.0 * r, 0.5 * r, 0.17 * r, -0.25);
  },
  inside(ctx, r) {
    fillAll(ctx, r, "#f07a4a");
    inset(ctx, peach, r, 0.93, radial(ctx, 0, 0.03 * r, r, [[0, "#ff6a34"], [0.4, "#ffb347"], [1, "#ffd472"]]));
    ellipse(ctx, 0.27 * r, 0.36 * r, 0, 0.03 * r);
    ctx.fillStyle = radial(ctx, -0.08 * r, -0.08 * r, 0.4 * r, [[0, "#a65a33"], [0.5, "#8a4a2a"], [1, "#5e2e18"]]);
    ctx.fill();
    ctx.strokeStyle = "#5e2e18";
    ctx.lineWidth = 0.03 * r;
    for (let i = 0; i < 5; i++) {
      const y = (i - 2) * 0.12 * r;
      ctx.beginPath();
      ctx.moveTo(-0.18 * r, y);
      ctx.quadraticCurveTo(0, y + (hash(i) - 0.5) * 0.15 * r, 0.18 * r, y + 0.03 * r);
      ctx.stroke();
    }
  },
};

const pear: FruitLook = {
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
  skinDetail(ctx, r) {
    ctx.fillStyle = "rgba(120,80,20,0.3)";
    for (let i = 0; i < 35; i++) {
      ellipse(ctx, 0.025 * r, 0.025 * r, (hash(i) - 0.5) * 1.6 * r, (hash(i + 70) - 0.3) * 1.5 * r);
      ctx.fill();
    }
    patch(ctx, 0.4 * r, 0.4 * r, 0.6 * r, "#f0783c", 0.4);
  },
  top(ctx, r) {
    stem(ctx, 0, -0.9 * r, -0.12 * r, -1.2 * r, 0.09 * r);
  },
  inside(ctx, r) {
    fillAll(ctx, r, "#a8c43a");
    inset(ctx, pear, r, 0.92, radial(ctx, 0, 0.3 * r, r, [[0, "#fffcea"], [0.5, "#fbf3d0"], [1, "#efe4ae"]]));
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

const dragonfruit: FruitLook = {
  r: 20,
  skin: { light: "#ff8cc8", base: "#ea2f8a", dark: "#931055" },
  juice: "#ff5fae",
  shape: (ctx, r) => ellipse(ctx, 0.85 * r, r),
  skinDetail(ctx, r) {
    for (let i = 0; i < 6; i++) {
      const x = (hash(i) - 0.5) * 1.1 * r;
      const y = (hash(i + 20) - 0.5) * 1.4 * r;
      leaf(ctx, x, y, 0.32 * r, 0.12 * r, -Math.PI / 2 + (hash(i + 40) - 0.5), "#ff6fb8");
      teardrop(ctx, x, y - 0.26 * r, 0.1 * r, 0.04 * r, -Math.PI / 2, "#9ad13a");
    }
  },
  top(ctx, r) {
    const flaps: [angle: number, size: number][] = [[-2.5, 1], [-1.57, 1], [-0.65, 1], [0.3, 0.9], [1.2, 0.8], [2.1, 0.9], [2.9, 0.9]];
    for (const [a, s] of flaps) {
      const x = Math.cos(a) * 0.8 * r;
      const y = Math.sin(a) * 0.95 * r;
      leaf(ctx, x, y, 0.4 * r * s, 0.13 * r, a - 0.5, "#f4519e");
      leaf(ctx, x + Math.cos(a - 0.5) * 0.25 * r * s, y + Math.sin(a - 0.5) * 0.25 * r * s, 0.17 * r * s, 0.07 * r, a - 0.5, "#9ad13a");
    }
  },
  inside(ctx, r) {
    fillAll(ctx, r, "#e8358f");
    inset(ctx, dragonfruit, r, 0.9, radial(ctx, 0, 0, r, [[0, "#ffffff"], [0.5, "#fbfaf4"], [1, "#ece6da"]]));
    ctx.fillStyle = "#1b1410";
    for (let i = 0; i < 110; i++) {
      const a = hash(i) * TAU;
      const d = Math.sqrt(hash(i + 500)) * 0.78 * r;
      ellipse(ctx, 0.022 * r, 0.022 * r, Math.cos(a) * d * 0.85, Math.sin(a) * d);
      ctx.fill();
    }
  },
};

/** Mouldy, bruised and wrinkled, with a worm inside. */
export const ROTTEN: FruitLook = {
  r: 20,
  skin: { light: "#ad9a5c", base: "#7d6a3a", dark: "#3a2f14" },
  juice: "#8a9a3a",
  shape: appleShape,
  skinDetail(ctx, r) {
    for (const [x, y, s] of [[0.35, 0.3, 0.45], [-0.4, -0.1, 0.38], [0.1, 0.65, 0.3]]) patch(ctx, x * r, y * r, s * r, "#281c0a", 0.7);
    for (const [x, y, s] of [[-0.3, 0.35, 0.22], [0.45, -0.3, 0.16], [0.05, -0.15, 0.12]]) {
      ellipse(ctx, s * r, s * r, x * r, y * r);
      ctx.fillStyle = "rgba(170,205,130,0.85)";
      ctx.fill();
      ellipse(ctx, s * 0.5 * r, s * 0.5 * r, x * r, y * r);
      ctx.fillStyle = "#eef6d8";
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(30,20,5,0.45)";
    ctx.lineWidth = 0.04 * r;
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 0.35 * r;
      ctx.beginPath();
      ctx.moveTo(x, -0.5 * r);
      ctx.quadraticCurveTo(x + 0.2 * r, -0.1 * r, x - 0.05 * r, 0.3 * r);
      ctx.stroke();
    }
  },
  top(ctx, r) {
    stem(ctx, 0, -0.68 * r, -0.25 * r, -0.95 * r, 0.09 * r, "#3d2a14");
    leaf(ctx, -0.2 * r, -0.9 * r, 0.4 * r, 0.14 * r, 2.6, "#7a6a2a");
  },
  inside(ctx, r) {
    fillAll(ctx, r, "#4a3a1a");
    inset(ctx, ROTTEN, r, 0.9, radial(ctx, 0, 0, r, [[0, "#c0a060"], [0.6, "#a4864a"], [1, "#7a5f2c"]]));
    for (const [x, y, s] of [[0.3, 0.3, 0.2], [-0.35, -0.2, 0.17], [-0.1, 0.5, 0.12]]) {
      ellipse(ctx, s * r, s * r, x * r, y * r);
      ctx.fillStyle = "rgba(60,40,15,0.6)";
      ctx.fill();
    }
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-0.35 * r, 0.25 * r);
    ctx.quadraticCurveTo(-0.1 * r, -0.25 * r, 0.2 * r, -0.05 * r);
    ctx.lineWidth = 0.14 * r;
    ctx.strokeStyle = "#ff9db0";
    ctx.stroke();
    ellipse(ctx, 0.025 * r, 0.025 * r, 0.21 * r, -0.08 * r);
    ctx.fillStyle = "#1b1410";
    ctx.fill();
  },
};

export const FRUIT: Record<FruitKindName, FruitLook> = { apple, orange, lemon, kiwi, watermelon, strawberry, peach, pear, dragonfruit };

export function lookFor(kind: FruitKindName, rotten: boolean): FruitLook {
  return rotten ? ROTTEN : FRUIT[kind];
}

// ---------------------------------------------------------------------------------------------------------------
// Drawing whole fruit and halves

/** A whole fruit at x,y. `scale` shrinks it (for the piles on the shelves). */
export function drawWhole(ctx: Ctx, look: FruitLook, x: number, y: number, rot: number, scale = 1): void {
  const r = look.r;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  look.shape(ctx, r);
  ctx.fillStyle = radial(ctx, -0.35 * r, -0.4 * r, 1.25 * r, [[0, look.skin.light], [0.45, look.skin.base], [1, look.skin.dark]]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  look.skinDetail?.(ctx, r);
  // A darker rim makes it round; a bright spot makes it shine.
  look.shape(ctx, r);
  ctx.lineWidth = 0.16 * r;
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.stroke();
  ctx.save();
  ctx.translate(-0.38 * r, -0.45 * r);
  ctx.rotate(-0.7);
  ellipse(ctx, 0.26 * r, 0.13 * r);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fill();
  ctx.restore();
  ellipse(ctx, 0.05 * r, 0.05 * r, -0.12 * r, -0.66 * r);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fill();
  ctx.restore();
  look.top?.(ctx, r);
  ctx.restore();
}

/** The soft shadow a flying fruit casts on the store behind it. */
export function drawShadow(ctx: Ctx, look: FruitLook, x: number, y: number, rot: number): void {
  ctx.save();
  ctx.translate(x + 4, y + 6);
  ctx.rotate(rot);
  look.shape(ctx, look.r * 1.05);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fill();
  ctx.restore();
}

/**
 * Half of a sliced fruit, showing its cut face. `cut` is the angle of the cut in the fruit's own frame and `side`
 * (+1 or -1) picks which half.
 */
export function drawHalf(ctx: Ctx, look: FruitLook, x: number, y: number, rot: number, cut: number, side: number): void {
  const r = look.r;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.save();
  ctx.rotate(cut);
  ctx.beginPath();
  ctx.rect(-2 * r, side > 0 ? 0 : -2 * r, 4 * r, 2 * r);
  ctx.restore();
  ctx.clip();
  look.shape(ctx, r);
  ctx.save();
  ctx.clip();
  look.inside(ctx, r);
  fillAll(ctx, r, radial(ctx, -0.3 * r, -0.3 * r, r, [[0, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0)"]])); // wet shine
  ctx.restore();
  ctx.rotate(cut);
  ctx.beginPath();
  ctx.moveTo(-1.3 * r, 0);
  ctx.lineTo(1.3 * r, 0);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
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
export function drawStink(ctx: Ctx, x: number, y: number, t: number): void {
  ctx.save();
  ctx.strokeStyle = "rgba(120,150,60,0.9)";
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

/** A fruit frozen in a block of ice, with frost on it and a sparkle or two. Draw the fruit first, then this. */
export function drawIce(ctx: Ctx, look: FruitLook, x: number, y: number, rot: number, t: number): void {
  const s = look.r + 7;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot * 0.6);
  ctx.beginPath();
  ctx.roundRect(-s, -s, 2 * s, 2 * s, s * 0.35);
  const body = ctx.createLinearGradient(-s, -s, s, s);
  body.addColorStop(0, "rgba(230,248,255,0.62)");
  body.addColorStop(0.5, "rgba(160,215,250,0.38)");
  body.addColorStop(1, "rgba(110,175,230,0.55)");
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(240,252,255,0.95)";
  ctx.stroke();
  ctx.save();
  ctx.clip();
  // Frost creeping in from the corners.
  for (let i = 0; i < 14; i++) {
    const cx = (hash(i) * 2 - 1) * s;
    const cy = (i % 2 ? -1 : 1) * s * (0.7 + 0.3 * hash(i + 9));
    ellipse(ctx, 2 + hash(i + 3) * 5, 1.5 + hash(i + 5) * 3, cx, cy);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
  }
  // Two bright streaks along the top-left face.
  ctx.beginPath();
  ctx.moveTo(-s * 0.75, -s * 0.15);
  ctx.lineTo(-s * 0.15, -s * 0.75);
  ctx.moveTo(-s * 0.7, s * 0.2);
  ctx.lineTo(s * 0.2, -s * 0.7);
  ctx.lineCap = "round";
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  // Sparkles twinkle in turn around the block.
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.9 + i / 3) % 1;
    const size = Math.sin(phase * Math.PI) * 3.5;
    if (size <= 0.3) continue;
    const a = i * 2.1 + Math.floor(t * 0.9 + i / 3) * 1.7;
    drawSparkle(ctx, x + Math.cos(a) * s * 1.05, y + Math.sin(a) * s * 1.05, size);
  }
}

/** A four-pointed twinkle. */
export function drawSparkle(ctx: Ctx, x: number, y: number, size: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const d = i % 2 ? size * 0.25 : size;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fill();
}

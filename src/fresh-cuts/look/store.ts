// The grocer at night: dark green walls, brass, slate price tags and spotlights. Painted once into an off-screen
// canvas at the screen's resolution, then pasted every frame.
import { H, W } from "../config";
import { FRUIT, drawWhole, hash, type FruitLook } from "./fruit";
import { GOLD, SERIF, roundRect, text } from "./ui";

type Ctx = CanvasRenderingContext2D;

/** A heap of fruit sitting on `y`, `w` wide. */
function pile(ctx: Ctx, look: FruitLook, cx: number, y: number, w: number, rows: number, scale: number, seed: number): void {
  const d = look.r * 2 * scale * 0.85;
  for (let j = 0; j < rows; j++) {
    const n = Math.max(1, Math.floor(w / d) - j);
    for (let i = 0; i < n; i++) {
      const x = cx - ((n - 1) * d) / 2 + i * d + (hash(seed + i * 7 + j) - 0.5) * 2;
      const yy = y - look.r * scale * 0.7 - j * d * 0.62;
      drawWhole(ctx, look, x, yy, (hash(seed + i + j * 13) - 0.5) * 0.8, scale);
    }
  }
}

function crate(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = "#3a2416";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#22140c";
  for (let i = 1; i < 3; i++) ctx.fillRect(x, y + (h / 3) * i - 0.6, w, 1.2);
  ctx.fillRect(x, y, 3, h);
  ctx.fillRect(x + w - 3, y, 3, h);
  ctx.fillStyle = "#5a3a24";
  ctx.fillRect(x, y, w, 1.5);
  ctx.fillStyle = GOLD.brass;
  ctx.fillRect(x + 3, y, 6, 6);
  ctx.fillRect(x + w - 9, y, 6, 6);
}

const SHELVES: { y: number; fruit: (keyof typeof FRUIT)[]; names: string[]; prices: string[] }[] = [
  {
    y: 124,
    fruit: ["peach", "apple", "pear", "dragonfruit", "orange"],
    names: ["Peaches", "Apples", "Pears", "Pitaya", "Oranges"],
    prices: ["3.50", "2.25", "2.80", "6.00", "1.90"],
  },
  {
    y: 190,
    fruit: ["strawberry", "lemon", "kiwi", "apple", "peach"],
    names: ["Berries", "Lemons", "Kiwis", "Apples", "Peaches"],
    prices: ["4.20", "1.10", "2.60", "2.25", "3.50"],
  },
];

function paint(ctx: Ctx): void {
  ctx.fillStyle = "#0f2219";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#1d3a2c";
  ctx.lineWidth = 1;
  for (let x = 6; x < W; x += 60) ctx.strokeRect(x, 64, 48, 76);
  ctx.fillStyle = "#132a20";
  ctx.fillRect(0, 150, W, 120);
  ctx.fillStyle = GOLD.brass;
  ctx.fillRect(0, 147, W, 3);
  ctx.fillStyle = GOLD.pale;
  ctx.fillRect(0, 147, W, 0.8);

  // The shop sign.
  const gold = ctx.createLinearGradient(0, 20, 0, 44);
  gold.addColorStop(0, GOLD.pale);
  gold.addColorStop(1, GOLD.deep);
  text(ctx, "Fresh Cuts", W / 2, 31, `italic 600 27px ${SERIF}`, gold);
  ctx.fillStyle = GOLD.brass;
  ctx.fillRect(160, 49, 46, 0.8);
  ctx.fillRect(274, 49, 46, 0.8);
  ctx.save();
  ctx.letterSpacing = "1.5px";
  text(ctx, "FINE FRUIT", W / 2, 49.5, `600 6px ${SERIF}`, GOLD.brass);
  ctx.restore();

  for (const shelf of SHELVES) {
    const { y } = shelf;
    shelf.fruit.forEach((kind, i) => pile(ctx, FRUIT[kind], 60 + i * 90, y - 3, 82, 3, 0.42, y + i * 17));
    ctx.fillStyle = "#2a1a12";
    ctx.fillRect(14, y - 3, 452, 6);
    ctx.fillStyle = "#4a3020";
    ctx.fillRect(14, y - 3, 452, 1);
    shelf.names.forEach((name, i) => {
      const x = 60 + i * 90;
      roundRect(ctx, x - 17, y + 5, 34, 13, 2);
      ctx.fillStyle = "#1a1a1a";
      ctx.fill();
      ctx.strokeStyle = GOLD.brass;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      text(ctx, name, x, y + 9.6, `italic 5px ${SERIF}`, "#f2efe6");
      text(ctx, shelf.prices[i], x, y + 14.6, `5px ${SERIF}`, GOLD.brass);
    });
  }

  // Shadow everything, then pour the spotlights back in. The shelves stay dim so flying fruit stands out.
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

  // Crates along the front: fruit is thrown up from behind them.
  (["orange", "watermelon", "apple", "pear"] as const).forEach((kind, i) => {
    const x = -6 + i * 124;
    pile(ctx, FRUIT[kind], x + 60, 242, 116, 2, kind === "watermelon" ? 0.5 : 0.62, 1300 + i);
    crate(ctx, x, 238, 120, 40);
  });
}

let cache: HTMLCanvasElement | null = null;
let vignette: CanvasGradient | null = null;

/** Paste the store, repainting it first if the canvas changed size. Leaves the context's transform alone. */
export function drawStore(ctx: Ctx): void {
  const { width, height } = ctx.canvas;
  if (!cache || cache.width !== width || cache.height !== height) {
    cache = document.createElement("canvas");
    cache.width = width;
    cache.height = height;
    const c = cache.getContext("2d")!;
    c.scale(width / W, height / H);
    paint(c);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(cache, 0, 0);
  ctx.restore();
}

/** Darkens the corners, so the middle of the store glows. Drawn over the fruit, under the letters. */
export function drawVignette(ctx: Ctx): void {
  vignette ??= (() => {
    const g = ctx.createRadialGradient(W / 2, H / 2, 110, W / 2, H / 2, 300);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.6)");
    return g;
  })();
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

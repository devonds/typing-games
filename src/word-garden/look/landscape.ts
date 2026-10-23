// The garden backdrop: sky, sun or moon, a few streaks of cloud, three layers of hills fading into the haze, a
// meadow edge of swaying grass, drifting motes of light (fireflies at night), and a fine paper grain over it all.
// Everything takes its colours from the current Palette, so it can ease between times of day.
import { H, W } from "../config";
import { fade, mix, type Palette } from "./palette";

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

/** The breeze: one gentle, uneven sway shared by grass, flowers and drifting petals. -1..1-ish. */
export function wind(t: number): number {
  return Math.sin(t * 0.55) * 0.6 + Math.sin(t * 1.35 + 1) * 0.3 + Math.sin(t * 3.1) * 0.08;
}

// Hill outlines, as heights at x.
const far = (x: number) => 172 + 9 * Math.sin(x / 58 + 1) + 6 * Math.sin(x / 21 + 2);
const mid = (x: number) => 194 + 11 * Math.sin(x / 83 + 4) + 4 * Math.sin(x / 29);
const near = (x: number) => 219 + 7 * Math.sin(x / 105 + 2) + 3 * Math.sin(x / 37 + 1);
const meadow = (x: number) => 246 + 3 * Math.sin(x / 70 + 3);

/** Where the hills begin: words and bursts stay above this. */
export const HORIZON = 160;

// Fixed scatter, so stars and grass don't jump about between frames.
function scatter(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const r = scatter(11);
const STARS = Array.from({ length: 80 }, () => ({ x: r() * W, y: r() * 165, size: 0.3 + r() ** 3 * 1.1, phase: r() * TAU, speed: 0.8 + r() * 2 }));
const BLADES = Array.from({ length: 170 }, (_, i) => ({ x: i * (W / 168) + r() * 2, h: 3 + r() * 7, lean: r() * 0.6 - 0.3, phase: r() * 2 }));
const CLOUDS = [
  { x: 70, y: 52, w: 1.0, speed: 2.2 },
  { x: 250, y: 30, w: 0.75, speed: 1.6 },
  { x: 420, y: 74, w: 0.6, speed: 2.8 },
  { x: 560, y: 44, w: 0.85, speed: 1.9 },
];
// Each cloud is a few long, soft streaks.
const STREAKS = [
  [0, 0, 52, 6.5],
  [-18, 6, 40, 4.5],
  [22, 5, 34, 4],
  [6, -5, 26, 4],
];

interface Mote {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
}

let grain: CanvasPattern | null = null;

/** A tile of soft noise, laid over the whole scene so flat colour feels like paper. */
function grainPattern(ctx: Ctx): CanvasPattern | null {
  if (grain) return grain;
  const tile = document.createElement("canvas");
  tile.width = tile.height = 128;
  const t = tile.getContext("2d")!;
  const img = t.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 90;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  t.putImageData(img, 0, 0);
  grain = ctx.createPattern(tile, "repeat");
  return grain;
}

export class Landscape {
  t = 0;
  private readonly motes: Mote[] = Array.from({ length: 16 }, () => ({
    x: Math.random() * W,
    y: 40 + Math.random() * 200,
    size: 0.6 + Math.random() * 1.1,
    phase: Math.random() * TAU,
    speed: 3 + Math.random() * 5,
  }));
  private readonly flies: Mote[] = Array.from({ length: 11 }, () => ({
    x: Math.random() * W,
    y: 175 + Math.random() * 80,
    size: 1 + Math.random() * 0.8,
    phase: Math.random() * TAU,
    speed: 0.5 + Math.random(),
  }));

  update(dt: number): void {
    this.t += dt;
    const breeze = wind(this.t);
    for (const m of this.motes) {
      m.y -= m.speed * dt;
      m.x += (breeze * 6 + Math.sin(this.t * 0.8 + m.phase) * 3) * dt;
      if (m.y < 20) {
        m.y = H - 10;
        m.x = Math.random() * W;
      }
      m.x = (m.x + W) % W;
    }
    for (const f of this.flies) {
      f.x += Math.cos(this.t * f.speed + f.phase) * 9 * dt;
      f.y += Math.sin(this.t * f.speed * 1.3 + f.phase * 2) * 6 * dt;
    }
  }

  /** Sky, hills and meadow. */
  draw(ctx: Ctx, p: Palette): void {
    this.drawSky(ctx, p);
    this.drawHills(ctx, p);
  }

  /** Motes, fireflies, grain and vignette: drawn after the words and bursts. */
  drawAtmosphere(ctx: Ctx, p: Palette): void {
    const t = this.t;
    if (p.moteAlpha > 0.01) {
      for (const m of this.motes) {
        const a = p.moteAlpha * (0.35 + 0.35 * Math.sin(t * 1.3 + m.phase));
        ctx.fillStyle = fade(p.motes, a);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, TAU);
        ctx.fill();
      }
    }
    if (p.fireflies > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const f of this.flies) {
        const glow = Math.max(0, Math.sin(t * 1.1 * f.speed + f.phase * 3)) ** 2 * p.fireflies;
        if (glow < 0.02) continue;
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 7);
        g.addColorStop(0, `rgba(255,240,150,${0.9 * glow})`);
        g.addColorStop(0.25, `rgba(220,255,120,${0.35 * glow})`);
        g.addColorStop(1, "rgba(200,255,120,0)");
        ctx.fillStyle = g;
        ctx.fillRect(f.x - 7, f.y - 7, 14, 14);
      }
      ctx.restore();
    }
    // Paper grain.
    const pattern = grainPattern(ctx);
    if (pattern) {
      ctx.save();
      ctx.globalCompositeOperation = "soft-light";
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // A soft vignette.
    const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.5, W * 0.62);
    v.addColorStop(0, "rgba(30,20,40,0)");
    v.addColorStop(1, `rgba(30,20,40,${0.16 + p.stars * 0.12})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  private drawSky(ctx: Ctx, p: Palette): void {
    const t = this.t;
    const sky = ctx.createLinearGradient(0, 0, 0, 200);
    sky.addColorStop(0, p.skyTop);
    sky.addColorStop(0.55, p.skyMid);
    sky.addColorStop(1, p.skyLow);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 205);

    if (p.stars > 0.01) {
      for (const s of STARS) {
        ctx.fillStyle = `rgba(255,252,235,${(p.stars * (0.45 + 0.45 * Math.sin(t * s.speed + s.phase))).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, TAU);
        ctx.fill();
      }
    }

    // Glow round the sun or moon.
    const glowR = p.sunR * (5 - p.moon * 2);
    const glow = ctx.createRadialGradient(p.sunX, p.sunY, p.sunR * 0.5, p.sunX, p.sunY, glowR);
    glow.addColorStop(0, fade(p.sunGlow, 0.65));
    glow.addColorStop(0.4, fade(p.sunGlow, 0.18));
    glow.addColorStop(1, fade(p.sunGlow, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(p.sunX - glowR, p.sunY - glowR, glowR * 2, glowR * 2);
    if (p.moon < 0.99) {
      ctx.fillStyle = fade(p.sun, 1 - p.moon);
      ctx.beginPath();
      ctx.arc(p.sunX, p.sunY, p.sunR, 0, TAU);
      ctx.fill();
    }
    if (p.moon > 0.01) {
      // A crescent: the disc with an offset circle taken out of it.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(p.sunX + p.sunR * 0.55, p.sunY - p.sunR * 0.25, p.sunR * 0.88, 0, TAU);
      ctx.clip("evenodd");
      ctx.fillStyle = fade(p.sun, p.moon);
      ctx.beginPath();
      ctx.arc(p.sunX, p.sunY, p.sunR, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // Clouds, drifting slowly.
    ctx.fillStyle = fade(p.cloud, p.cloudAlpha);
    for (const c of CLOUDS) {
      const x = ((c.x + t * c.speed + 80) % (W + 160)) - 80;
      for (const [dx, dy, rx, ry] of STREAKS) {
        ctx.beginPath();
        ctx.ellipse(x + dx * c.w, c.y + dy * c.w, rx * c.w, ry * c.w, 0, 0, TAU);
        ctx.fill();
      }
    }
  }

  private drawHills(ctx: Ctx, p: Palette): void {
    const t = this.t;
    const ridge = (fn: (x: number) => number, colour: string, bottom = H) => {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(0, bottom);
      for (let x = 0; x <= W; x += 6) ctx.lineTo(x, fn(x));
      ctx.lineTo(W, bottom);
      ctx.closePath();
      ctx.fill();
    };
    const haze = (top: number, bottom: number, strength: number) => {
      const g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, fade(p.haze, 0));
      g.addColorStop(0.6, fade(p.haze, strength));
      g.addColorStop(1, fade(p.haze, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, top, W, bottom - top);
    };

    haze(130, 190, 0.55);
    ridge(far, p.hillFar);
    haze(165, 215, 0.4);
    ridge(mid, p.hillMid);
    this.drawTree(ctx, 74, mid(74), mix(p.hillMid, p.hillNear, 0.55));
    this.drawTree(ctx, 92, mid(92) + 1, mix(p.hillMid, p.hillNear, 0.4), 0.7);
    haze(195, 235, 0.22);
    ridge(near, p.hillNear);
    this.drawTree(ctx, 410, near(410), mix(p.hillNear, p.meadow, 0.6), 0.85);
    ridge(meadow, p.meadow);

    // Grass along the meadow's edge, swaying in the breeze.
    const breeze = wind(t);
    ctx.strokeStyle = p.meadow;
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const b of BLADES) {
      const base = meadow(b.x) + 1;
      const sway = (breeze * 2.2 + Math.sin(t * 2 + b.phase) * 0.6) * (b.h / 8);
      ctx.moveTo(b.x, base);
      ctx.quadraticCurveTo(b.x + b.lean * b.h * 0.5, base - b.h * 0.6, b.x + b.lean * b.h + sway, base - b.h);
    }
    ctx.stroke();
  }

  /** A round, soft tree in silhouette, a shade darker than its hill. */
  private drawTree(ctx: Ctx, x: number, ground: number, colour: string, scale = 1): void {
    const sway = wind(this.t) * 0.6 * scale;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(x - 1.2 * scale, ground + 2);
    ctx.lineTo(x - 0.8 * scale, ground - 10 * scale);
    ctx.lineTo(x + 0.8 * scale, ground - 10 * scale);
    ctx.lineTo(x + 1.2 * scale, ground + 2);
    ctx.fill();
    for (const [dx, dy, rad] of [[0, -18, 9], [-6, -13, 6.5], [6, -13, 6.5], [0, -25, 6]]) {
      ctx.beginPath();
      ctx.arc(x + (dx + sway * (-dy / 25)) * scale, ground + dy * scale, rad * scale, 0, TAU);
      ctx.fill();
    }
  }
}

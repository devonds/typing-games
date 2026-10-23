// The garden at five times of day, one for each kind of burst. Every colour and position here can be blended, so
// the scene eases from one time of day to the next between sentences.
import type { BurstKind } from "../config";

export interface Palette {
  skyTop: string;
  skyMid: string;
  skyLow: string;
  /** The soft glow along the horizon. */
  haze: string;
  sun: string;
  sunGlow: string;
  sunX: number;
  sunY: number;
  sunR: number;
  /** 0 = sun, 1 = moon. */
  moon: number;
  stars: number;
  cloud: string;
  cloudAlpha: number;
  hillFar: string;
  hillMid: string;
  hillNear: string;
  meadow: string;
  /** Floating motes of light by day, fireflies by night. */
  motes: string;
  moteAlpha: number;
  fireflies: number;
  /** Words: letters still to type, typed letters, the next-letter marker. */
  ink: string;
  inkSoft: string;
  accent: string;
  /** A glow behind the words so they read against any sky. */
  textGlow: string;
  /** Menu and results panels. */
  panel: string;
  panelEdge: string;
}

export const PALETTES: Record<BurstKind, Palette> = {
  // Dawn: blush sky, sage hills, the sun just up.
  flowers: {
    skyTop: "#e9c9c4",
    skyMid: "#f6dccb",
    skyLow: "#fcefd9",
    haze: "#fff4dc",
    sun: "#fff3d6",
    sunGlow: "#ffe2b0",
    sunX: 372,
    sunY: 150,
    sunR: 17,
    moon: 0,
    stars: 0,
    cloud: "#fff7ee",
    cloudAlpha: 0.75,
    hillFar: "#cbd2b8",
    hillMid: "#a9bc95",
    hillNear: "#8aa67c",
    meadow: "#6f8f66",
    motes: "#fff1c2",
    moteAlpha: 0.7,
    fireflies: 0,
    ink: "#3b3a46",
    inkSoft: "#7d7584",
    accent: "#d9687a",
    textGlow: "rgba(255,248,236,0.85)",
    panel: "rgba(255,250,242,0.72)",
    panelEdge: "rgba(160,120,110,0.25)",
  },
  // Midday: clear sky, fresh greens, the sun high.
  butterflies: {
    skyTop: "#9fcde6",
    skyMid: "#c4e2ef",
    skyLow: "#eaf5ef",
    haze: "#f4fbf3",
    sun: "#fffbea",
    sunGlow: "#fff2bf",
    sunX: 360,
    sunY: 46,
    sunR: 15,
    moon: 0,
    stars: 0,
    cloud: "#ffffff",
    cloudAlpha: 0.85,
    hillFar: "#b4d1bb",
    hillMid: "#8fbe95",
    hillNear: "#6ea77a",
    meadow: "#548f63",
    motes: "#ffffff",
    moteAlpha: 0.55,
    fireflies: 0,
    ink: "#2f3e48",
    inkSoft: "#6f8592",
    accent: "#e08a3c",
    textGlow: "rgba(245,252,250,0.85)",
    panel: "rgba(248,253,252,0.72)",
    panelEdge: "rgba(90,130,140,0.25)",
  },
  // Misty morning by the water: pale blues and soft blue-green hills.
  bubbles: {
    skyTop: "#bcd3e6",
    skyMid: "#d7e5ee",
    skyLow: "#f0f1ea",
    haze: "#f6f5ee",
    sun: "#fffdf3",
    sunGlow: "#f3efdc",
    sunX: 118,
    sunY: 86,
    sunR: 16,
    moon: 0,
    stars: 0,
    cloud: "#f8fbfc",
    cloudAlpha: 0.7,
    hillFar: "#b9cad2",
    hillMid: "#97b2bb",
    hillNear: "#7b9ca3",
    meadow: "#5f8287",
    motes: "#ffffff",
    moteAlpha: 0.45,
    fireflies: 0,
    ink: "#2e3d4f",
    inkSoft: "#6e8296",
    accent: "#4f8fc0",
    textGlow: "rgba(246,249,250,0.85)",
    panel: "rgba(247,250,252,0.72)",
    panelEdge: "rgba(80,110,140,0.25)",
  },
  // Sunset: apricot and rose sky, plum hills, a big low sun.
  confetti: {
    skyTop: "#c98a9b",
    skyMid: "#eeaa95",
    skyLow: "#fbd5a5",
    haze: "#ffe3b3",
    sun: "#fff0c8",
    sunGlow: "#ffc785",
    sunX: 112,
    sunY: 176,
    sunR: 24,
    moon: 0,
    stars: 0.12,
    cloud: "#ffd9c0",
    cloudAlpha: 0.6,
    hillFar: "#c88c8e",
    hillMid: "#a46d7c",
    hillNear: "#7f5668",
    meadow: "#5f4157",
    motes: "#ffe2b8",
    moteAlpha: 0.6,
    fireflies: 0,
    ink: "#45283f",
    inkSoft: "#8a5f74",
    accent: "#b8325e",
    textGlow: "rgba(255,226,196,0.75)",
    panel: "rgba(255,240,228,0.7)",
    panelEdge: "rgba(120,70,90,0.25)",
  },
  // Night: deep blue, a crescent moon, stars and fireflies.
  fireworks: {
    skyTop: "#10152f",
    skyMid: "#1d2248",
    skyLow: "#33335e",
    haze: "#3e3a68",
    sun: "#f4f1de",
    sunGlow: "#8d93c4",
    sunX: 384,
    sunY: 54,
    sunR: 13,
    moon: 1,
    stars: 1,
    cloud: "#5a5c8c",
    cloudAlpha: 0.25,
    hillFar: "#262a50",
    hillMid: "#1d2041",
    hillNear: "#161833",
    meadow: "#100f25",
    motes: "#fff3a8",
    moteAlpha: 0,
    fireflies: 1,
    ink: "#f2eee6",
    inkSoft: "#9b9cc2",
    accent: "#ffd27a",
    textGlow: "rgba(10,12,32,0.7)",
    panel: "rgba(24,26,56,0.72)",
    panelEdge: "rgba(180,180,230,0.22)",
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Blending

type Rgba = [number, number, number, number];
const parsed = new Map<string, Rgba>();

function parse(colour: string): Rgba {
  let c = parsed.get(colour);
  if (c) return c;
  if (colour.startsWith("#")) {
    c = [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16)).concat(1) as Rgba;
  } else {
    const [r, g, b, a = 1] = colour.match(/[\d.]+/g)!.map(Number);
    c = [r, g, b, a];
  }
  parsed.set(colour, c);
  return c;
}

type Hsla = [h: number, s: number, l: number, a: number];

function toHsl([r, g, b, a]: Rgba): Hsla {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l, a];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l, a];
}

function fromHsl([h, s, l, a]: Hsla): Rgba {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255, a];
}

/**
 * Blend two colours (hex or rgba()); p = 0 gives a, 1 gives b. Between two daytime colours this goes the short way
 * round the colour wheel rather than straight through grey, so green hills turn golden on their way to plum. Going
 * between light and dark (day to night) it blends straight, which reads as the light fading.
 */
export function mix(a: string, b: string, p: number): string {
  if (p <= 0) return a;
  if (p >= 1) return b;
  const ra = parse(a);
  const rb = parse(b);
  const straight = ra.map((x, i) => x + (rb[i] - x) * p) as Rgba;
  const ca = toHsl(ra);
  const cb = toHsl(rb);
  const wheel = Math.max(0, 1 - Math.abs(ca[2] - cb[2]) * 4);
  if (wheel === 0) return rgba(straight);
  // A grey has no real hue: borrow the other colour's so it doesn't swing round the wheel.
  if (ca[1] < 0.05) ca[0] = cb[0];
  if (cb[1] < 0.05) cb[0] = ca[0];
  let dh = cb[0] - ca[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  // Ease off the colour a little in the middle, so the in-between reads as soft rather than vivid.
  const dip = 1 - 0.3 * Math.sin(p * Math.PI) * Math.min(1, Math.abs(dh) / 90);
  const round = fromHsl([(ca[0] + dh * p + 360) % 360, (ca[1] + (cb[1] - ca[1]) * p) * dip, ca[2] + (cb[2] - ca[2]) * p, 1]);
  return rgba(straight.map((x, i) => (i < 3 ? x + (round[i] - x) * wheel : x)) as Rgba);
}

const rgba = ([r, g, b, a]: Rgba) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a.toFixed(3)})`;

/** A colour with its alpha multiplied by `alpha`. */
export function fade(colour: string, alpha: number): string {
  const [r, g, b, a] = parse(colour);
  return `rgba(${r},${g},${b},${(a * alpha).toFixed(3)})`;
}

export function blend(a: Palette, b: Palette, p: number): Palette {
  if (p <= 0) return a;
  if (p >= 1) return b;
  const out = {} as Record<string, string | number>;
  for (const key of Object.keys(a) as (keyof Palette)[]) {
    const x = a[key];
    const y = b[key];
    out[key] = typeof x === "number" ? x + ((y as number) - x) * p : mix(x, y as string, p);
  }
  return out as unknown as Palette;
}

/** Eases from one palette to another over `seconds`. */
export class Sky {
  private from: Palette;
  private to: Palette;
  private p = 1;
  current: Palette;

  /** Where the sky is heading: the words use its colours straight away so they always read clearly. */
  get target(): Palette {
    return this.to;
  }

  constructor(start: BurstKind, private readonly seconds = 1.6) {
    this.from = this.to = this.current = PALETTES[start];
  }

  go(kind: BurstKind): void {
    if (PALETTES[kind] === this.to) return;
    this.from = this.current;
    this.to = PALETTES[kind];
    this.p = 0;
  }

  update(dt: number): void {
    if (this.p >= 1) return;
    this.p = Math.min(1, this.p + dt / this.seconds);
    const e = this.p * this.p * (3 - 2 * this.p);
    this.current = blend(this.from, this.to, e);
    // The sun (or moon) travels in an arc over the top, not straight across behind the words.
    const travel = Math.abs(this.to.sunX - this.from.sunX) / 300;
    if (this.p < 1) this.current.sunY -= Math.sin(e * Math.PI) * 60 * Math.min(1, travel);
  }
}

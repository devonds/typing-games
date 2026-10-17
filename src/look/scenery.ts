// The dusk city backdrop. The sky slowly turns from dusk to night as a round goes on.
import { GROUND_Y, H, W } from "../config";
import { seededRandom } from "../rng";
import { C } from "./palette";
import { prerender, type Pixels } from "./pixels";

interface SkyStage {
  /** Horizontal colour bands: [top y, colour]. */
  bands: [number, string][];
  sun?: { x: number; y: number; r: number; glow: string; core: string };
  moon?: { x: number; y: number };
  stars: number;
  cloud: string;
  haze: string; // far-away buildings
  ground: string;
  grassEdge: string;
  /** Fraction of windows with the lights on. */
  litWindows: number;
}

const STAGES: SkyStage[] = [
  {
    bands: [[0, C.navy], [28, C.blue], [58, C.sky], [90, C.orange]],
    sun: { x: 204, y: 98, r: 16, glow: C.yellow, core: C.white },
    stars: 0,
    cloud: C.white,
    haze: C.slate,
    ground: C.green,
    grassEdge: C.lime,
    litWindows: 0.25,
  },
  {
    bands: [[0, C.black], [22, C.navy], [52, C.purple], [86, C.red]],
    sun: { x: 204, y: 112, r: 14, glow: C.orange, core: C.yellow },
    stars: 24,
    cloud: C.silver,
    haze: C.purple,
    ground: C.teal,
    grassEdge: C.green,
    litWindows: 0.5,
  },
  {
    bands: [[0, C.black], [44, C.navy], [96, C.charcoal]],
    moon: { x: 50, y: 30 },
    stars: 60,
    cloud: C.slate,
    haze: C.charcoal,
    ground: C.teal,
    grassEdge: C.green,
    litWindows: 0.7,
  },
];

/** Round time (seconds) at which each sky stage begins. */
const STAGE_STARTS = [0, 75, 150];
const FADE_SECONDS = 3;

interface Building {
  x: number;
  w: number;
  h: number;
  windows: { x: number; y: number; on: number; warm: boolean }[];
}

interface Cloud {
  x: number;
  y: number;
  speed: number;
  width: number;
  puffs: { dx: number; r: number }[];
}

function makeBuildings(seed: number, minH: number, maxH: number, withWindows: boolean): Building[] {
  const rnd = seededRandom(seed);
  const list: Building[] = [];
  for (let x = -4; x < W; ) {
    const w = 10 + Math.floor(rnd() * 13);
    const h = minH + Math.floor(rnd() * (maxH - minH));
    const windows: Building["windows"] = [];
    if (withWindows) {
      for (let wx = x + 2; wx + 2 <= x + w - 2; wx += 4) {
        for (let wy = GROUND_Y - h + 3; wy + 2 <= GROUND_Y - 3; wy += 5) {
          windows.push({ x: wx, y: wy, on: rnd(), warm: rnd() < 0.8 });
        }
      }
    }
    list.push({ x, w, h, windows });
    x += w + Math.floor(rnd() * 3) - 1;
  }
  return list;
}

const FAR = makeBuildings(5, 30, 58, false);
const NEAR = makeBuildings(3, 12, 42, true);
const STARS = (() => {
  const rnd = seededRandom(11);
  return Array.from({ length: 60 }, () => ({ x: Math.floor(rnd() * W), y: Math.floor(rnd() * 80), bright: rnd() < 0.3 }));
})();

function bandAt(stage: SkyStage, y: number): string {
  let colour = stage.bands[0][1];
  for (const [top, c] of stage.bands) if (y >= top) colour = c;
  return colour;
}

function drawSky(p: Pixels, s: SkyStage): void {
  s.bands.forEach(([top, colour], i) => {
    const bottom = s.bands[i + 1]?.[0] ?? GROUND_Y;
    p.rect(0, top, W, bottom - top, colour);
    if (i > 0) p.dither(0, top - 4, W, 4, colour); // soften the seam
  });
  for (const star of STARS.slice(0, s.stars)) p.pset(star.x, star.y, star.bright ? C.white : C.silver);
  if (s.sun) {
    p.circ(s.sun.x, s.sun.y, s.sun.r, s.sun.glow);
    p.circ(s.sun.x, s.sun.y, s.sun.r - 5, s.sun.core);
  }
  if (s.moon) {
    p.circ(s.moon.x, s.moon.y, 8, C.white);
    p.circ(s.moon.x + 4, s.moon.y - 3, 7, bandAt(s, s.moon.y)); // bite out a crescent
  }
}

function drawCity(p: Pixels, s: SkyStage): void {
  for (const b of FAR) p.rect(b.x, GROUND_Y - b.h, b.w, b.h, s.haze);
  for (const b of NEAR) {
    p.rect(b.x, GROUND_Y - b.h, b.w, b.h, C.black);
    for (const win of b.windows) {
      if (win.on < s.litWindows) p.rect(win.x, win.y, 2, 2, win.warm ? C.yellow : C.orange);
    }
  }
  p.rect(0, GROUND_Y, W, H - GROUND_Y, s.ground);
  p.rect(0, GROUND_Y, W, 2, s.grassEdge);
  for (let x = 3; x < W; x += 9) p.pset(x + (x % 4), GROUND_Y + 5 + (x % 7), s.grassEdge);
}

function makeCloud(rnd: () => number, x: number): Cloud {
  const puffs: Cloud["puffs"] = [];
  let dx = 0;
  const count = 3 + Math.floor(rnd() * 2);
  for (let i = 0; i < count; i++) {
    const r = 3 + Math.floor(rnd() * 4);
    puffs.push({ dx: dx + r, r });
    dx += r + 2 + Math.floor(rnd() * 3);
  }
  const last = puffs[puffs.length - 1];
  return { x, y: 14 + Math.floor(rnd() * 44), speed: 2 + rnd() * 3, width: last.dx + last.r, puffs };
}

export class Scenery {
  private readonly layers = STAGES.map((s) => ({ sky: prerender((p) => drawSky(p, s)), city: prerender((p) => drawCity(p, s)) }));
  private readonly rnd = seededRandom(21);
  private readonly clouds: Cloud[] = Array.from({ length: 4 }, (_, i) => makeCloud(this.rnd, i * 70 + 10));
  private stage = 0;
  private previous = 0;
  private fade = 1;

  /** Move clouds; if a round time is given, pick the sky stage for it. */
  update(dt: number, roundTime?: number): void {
    for (const c of this.clouds) {
      c.x -= c.speed * dt;
      if (c.x + c.width < 0) Object.assign(c, makeCloud(this.rnd, W + this.rnd() * 40));
    }
    if (roundTime !== undefined) {
      let stage = 0;
      STAGE_STARTS.forEach((start, i) => roundTime >= start && (stage = i));
      if (stage !== this.stage) {
        this.previous = this.stage;
        this.stage = stage;
        this.fade = 0;
      }
    }
    this.fade = Math.min(1, this.fade + dt / FADE_SECONDS);
  }

  draw(p: Pixels): void {
    this.drawLayer(p, "sky");
    const colour = STAGES[this.stage].cloud;
    for (const c of this.clouds) {
      // Puffs sit on a shared baseline at c.y; a strip along the bottom flattens it.
      for (const puff of c.puffs) p.circ(c.x + puff.dx, c.y - puff.r, puff.r, colour);
      const first = c.puffs[0];
      const last = c.puffs[c.puffs.length - 1];
      p.rect(c.x + first.dx, c.y - 2, last.dx - first.dx, 3, colour);
    }
    this.drawLayer(p, "city");
  }

  private drawLayer(p: Pixels, which: "sky" | "city"): void {
    if (this.fade < 1) {
      p.ctx.drawImage(this.layers[this.previous][which], 0, 0);
      p.ctx.globalAlpha = this.fade;
    }
    p.ctx.drawImage(this.layers[this.stage][which], 0, 0);
    p.ctx.globalAlpha = 1;
  }
}

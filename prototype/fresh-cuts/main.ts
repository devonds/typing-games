// PROTOTYPE (throwaway): just enough of Fresh Cuts to judge the look. Fruit is thrown in waves; type a letter to
// slice it, or leave autoplay on and watch. Switch looks with the bar at the bottom, ?look=a|b|c|d, or keys 1-4.
import { KINDS, ROTTEN, TAU, drawFly, drawHalf, drawStink, drawWhole, hash, type FruitKind } from "./fruit";
import { H, LOOKS, PX, W, type Look } from "./looks";

const GRAVITY = 300;
const MAX_LIVES = 3;
const ROTTEN_CHANCE = 0.2;

interface Flyer {
  kind: FruitKind;
  rotten: boolean;
  letter: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  /** When autoplay slices it (never, for rotten fruit or deliberate misses). */
  autoAt: number;
}
interface Half {
  kind: FruitKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  cut: number;
  side: number;
}
interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  colour: string;
  life: number;
}
interface Burst {
  x: number;
  y: number;
  colour: string;
  age: number;
  seed: number;
  stinky: boolean;
}
interface Streak {
  x: number;
  y: number;
  angle: number;
  age: number;
}
interface Popup {
  text: string;
  x: number;
  y: number;
  age: number;
  big: boolean;
}

// ---------------------------------------------------------------------------------------------------------------
// State

const params = new URLSearchParams(location.search);
let look: Look = LOOKS.find((l) => l.id === params.get("look")) ?? LOOKS[0];
let rottenOn = params.get("rotten") !== "off";
let autoplay = params.get("auto") !== "off";

let t = 0;
let flyers: Flyer[] = [];
let halves: Half[] = [];
let drops: Drop[] = [];
let bursts: Burst[] = [];
let streaks: Streak[] = [];
let popups: Popup[] = [];
let launches: number[] = [];
let score = 0;
let lives = MAX_LIVES;
let chain = 0;
let lastSlice = -10;

function pickLetter(): string {
  const used = new Set(flyers.map((f) => f.letter));
  const free = "abcdefghijklmnopqrstuvwxyz".split("").filter((c) => !used.has(c));
  return free[Math.floor(Math.random() * free.length)];
}

function launch(): void {
  const rotten = rottenOn && Math.random() < ROTTEN_CHANCE;
  const kind = rotten ? ROTTEN : KINDS[Math.floor(Math.random() * KINDS.length)];
  const x = 70 + Math.random() * 340;
  const apex = 45 + Math.random() * 70;
  const y = H + 25;
  const vy = -Math.sqrt(2 * GRAVITY * (y - apex));
  const flight = (-2 * vy) / GRAVITY;
  const vx = ((W / 2 - x) * 0.7 + (Math.random() - 0.5) * 120) / flight;
  const slicedByAuto = !rotten && Math.random() < 0.88;
  flyers.push({
    kind,
    rotten,
    letter: pickLetter(),
    x,
    y,
    vx,
    vy,
    rot: (Math.random() - 0.5) * 1.2,
    spin: (Math.random() - 0.5) * 2.5,
    autoAt: slicedByAuto ? t + 0.55 + Math.random() * 1.1 : Infinity,
  });
}

function slice(f: Flyer): void {
  flyers = flyers.filter((o) => o !== f);
  const angle = -0.55 + (Math.random() - 0.5) * 1.3;
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  for (const side of [-1, 1]) {
    halves.push({
      kind: f.kind,
      x: f.x + nx * side * 2,
      y: f.y + ny * side * 2,
      vx: f.vx * 0.4 + nx * side * 55,
      vy: Math.min(f.vy, 0) * 0.25 + ny * side * 55 - 30,
      rot: f.rot,
      spin: f.spin + side * 2.4,
      cut: angle - f.rot,
      side,
    });
  }
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * TAU;
    const speed = 50 + Math.random() * 130;
    drops.push({ x: f.x, y: f.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 40, r: 0.8 + Math.random() * 1.8, colour: f.kind.juice, life: 0.5 + Math.random() * 0.4 });
  }
  bursts.push({ x: f.x, y: f.y, colour: f.kind.juice, age: 0, seed: Math.random() * 100, stinky: f.rotten });
  streaks.push({ x: f.x, y: f.y, angle, age: 0 });
  if (f.rotten) {
    popups.push({ text: "YUCK!", x: f.x, y: f.y - 26, age: 0, big: false });
    loseLife();
    chain = 0;
    return;
  }
  score += 10;
  chain = t - lastSlice < 0.7 ? chain + 1 : 1;
  lastSlice = t;
  popups.push({ text: "+10", x: f.x, y: f.y - 26, age: 0, big: false });
  if (chain >= 3) popups.push({ text: `JUICY x${chain}!`, x: W / 2, y: 90, age: 0, big: true });
}

function loseLife(): void {
  lives--;
  if (lives <= 0) {
    popups.push({ text: "FRESH START!", x: W / 2, y: H / 2, age: 0, big: true });
    lives = MAX_LIVES;
    score = 0;
  }
}

function press(key: string): void {
  const f = flyers.find((o) => o.letter === key);
  if (f) slice(f);
}

// ---------------------------------------------------------------------------------------------------------------
// Simulation

function step(dt: number): void {
  t += dt;
  if (flyers.length === 0 && launches.length === 0) {
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) launches.push(t + 0.9 + i * 0.35);
  }
  launches = launches.filter((at) => {
    if (at > t) return true;
    launch();
    return false;
  });

  for (const f of [...flyers]) {
    f.vy += GRAVITY * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.rot += f.spin * dt;
    if (autoplay && t >= f.autoAt) slice(f);
    else if (f.vy > 0 && f.y > H + 40) {
      flyers = flyers.filter((o) => o !== f);
      if (!f.rotten) {
        popups.push({ text: "OOPS!", x: Math.min(Math.max(f.x, 30), W - 30), y: H - 50, age: 0, big: false });
        loseLife();
        chain = 0;
      }
    }
  }
  for (const h of halves) {
    h.vy += GRAVITY * dt;
    h.x += h.vx * dt;
    h.y += h.vy * dt;
    h.rot += h.spin * dt;
  }
  halves = halves.filter((h) => h.y < H + 60);
  for (const d of drops) {
    d.vy += GRAVITY * 0.8 * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.life -= dt;
  }
  drops = drops.filter((d) => d.life > 0);
  for (const b of bursts) b.age += dt;
  bursts = bursts.filter((b) => b.age < (b.stinky ? 0.9 : 0.4));
  for (const s of streaks) s.age += dt;
  streaks = streaks.filter((s) => s.age < 0.2);
  for (const p of popups) {
    p.age += dt;
    p.y -= (p.big ? 8 : 22) * dt;
  }
  popups = popups.filter((p) => p.age < (p.big ? 1.3 : 0.8));
}

// ---------------------------------------------------------------------------------------------------------------
// Drawing

function drawBurst(ctx: CanvasRenderingContext2D, b: Burst): void {
  const flat = look.style === "flat";
  if (b.stinky) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + b.seed;
      const d = 6 + b.age * 30;
      ctx.globalAlpha = Math.max(0, 0.75 - b.age);
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d - b.age * 15, 5 + b.age * 8, 0, TAU);
      ctx.fillStyle = flat ? "#a3ad72" : "rgba(150,170,80,0.8)";
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }
  const grow = Math.min(1, b.age / 0.1);
  const fade = 1 - b.age / 0.4;
  const R = 9 + 16 * grow;
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const d = R * (i % 2 ? 0.55 + 0.2 * hash(b.seed + i) : 0.9 + 0.35 * hash(b.seed + i));
    ctx.lineTo(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.globalAlpha = Math.max(0, fade) * (flat ? 1 : 0.75);
  ctx.fillStyle = b.colour;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawStreak(ctx: CanvasRenderingContext2D, s: Streak): void {
  const k = 1 - s.age / 0.2;
  const len = 46 + 20 * (1 - k);
  const w = 3.2 * k;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.quadraticCurveTo(0, -w, len, 0);
  ctx.quadraticCurveTo(0, w, -len, 0);
  if (look.slash.glow) {
    ctx.shadowColor = look.slash.glow;
    ctx.shadowBlur = 8;
  }
  if (look.slash.edge) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = look.slash.edge;
    ctx.stroke();
  }
  ctx.fillStyle = look.slash.fill;
  ctx.fill();
  ctx.restore();
}

function drawWorld(ctx: CanvasRenderingContext2D): void {
  for (const h of halves) drawHalf(ctx, h.kind, h.x, h.y, h.rot, h.cut, h.side, look.style);
  for (const b of bursts) drawBurst(ctx, b);
  for (const f of flyers) {
    // A shadow on the store behind, so flying fruit stands out from the fruit on the shelves.
    ctx.save();
    ctx.translate(f.x + 4, f.y + 6);
    ctx.rotate(f.rot);
    f.kind.shape(ctx, f.kind.r * 1.05);
    ctx.fillStyle = look.shadow;
    ctx.fill();
    ctx.restore();
    drawWhole(ctx, f.kind, f.x, f.y, f.rot, look.style);
    if (f.rotten) {
      drawStink(ctx, f.x, f.y - 22, t, look.style === "flat" ? "#5a6b2a" : "rgba(120,150,60,0.9)");
      drawFly(ctx, f.x + Math.cos(t * 7) * 26, f.y - 12 + Math.sin(t * 11) * 12, t);
    }
  }
  for (const d of drops) {
    ctx.globalAlpha = Math.min(1, d.life * 3);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, TAU);
    ctx.fillStyle = d.colour;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const s of streaks) drawStreak(ctx, s);
}

/** The letters, words and HUD go on last so nothing covers them. */
function drawText(ctx: CanvasRenderingContext2D): void {
  for (const f of flyers) look.sticker(ctx, f.letter, f.x, f.y + 1, f.rotten);
  for (const p of popups) {
    const life = p.big ? 1.3 : 0.8;
    look.popup(ctx, p.text, p.x, p.y, Math.min(1, (life - p.age) * 4), p.big);
  }
  look.hud(ctx, score, lives, MAX_LIVES);
}

// ---------------------------------------------------------------------------------------------------------------
// Canvas, pixel reduction, loop

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const low = document.createElement("canvas");
low.width = 320;
low.height = 180;
const lowCtx = low.getContext("2d", { willReadFrequently: true })!;
const bg = document.createElement("canvas");
let scale = 1;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const luts = new Map<string, Uint32Array>();

/** For every 15-bit colour, the nearest palette colour, packed as a little-endian RGBA pixel. */
function lutFor(palette: string[]): Uint32Array {
  const key = palette.join();
  let lut = luts.get(key);
  if (lut) return lut;
  const rgb = palette.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
  lut = new Uint32Array(32768);
  for (let i = 0; i < 32768; i++) {
    const r = ((i >> 10) & 31) * 8.2;
    const g = ((i >> 5) & 31) * 8.2;
    const b = (i & 31) * 8.2;
    let best = 0;
    let bestD = Infinity;
    rgb.forEach(([pr, pg, pb], j) => {
      const d = 2 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 3 * (b - pb) ** 2;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    const [pr, pg, pb] = rgb[best];
    lut[i] = (255 << 24) | (pb << 16) | (pg << 8) | pr;
  }
  luts.set(key, lut);
  return lut;
}

function reduceToPalette(c: CanvasRenderingContext2D, palette: string[]): void {
  const lut = lutFor(palette);
  const img = c.getImageData(0, 0, 320, 180);
  const px = new Uint32Array(img.data.buffer);
  for (let y = 0; y < 180; y++) {
    for (let x = 0; x < 320; x++) {
      const i = y * 320 + x;
      const p = px[i];
      const o = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * 26;
      const r = Math.min(255, Math.max(0, (p & 255) + o));
      const g = Math.min(255, Math.max(0, ((p >> 8) & 255) + o));
      const b = Math.min(255, Math.max(0, ((p >> 16) & 255) + o));
      px[i] = lut[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)];
    }
  }
  c.putImageData(img, 0, 0);
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const bar = document.getElementById("bar")!.offsetHeight;
  const availW = window.innerWidth - 24;
  const availH = window.innerHeight - bar - 24;
  if (look.palette) {
    const k = Math.max(1, Math.floor(Math.min((availW * dpr) / 320, (availH * dpr) / 180)));
    canvas.width = 320 * k;
    canvas.height = 180 * k;
    bg.width = 320;
    bg.height = 180;
  } else {
    scale = Math.min(availW / W, availH / H);
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
    scale *= dpr;
    bg.width = canvas.width;
    bg.height = canvas.height;
  }
  canvas.style.width = `${canvas.width / dpr}px`;
  canvas.style.height = `${canvas.height / dpr}px`;
  const b = bg.getContext("2d")!;
  const k = look.palette ? PX : scale;
  b.setTransform(k, 0, 0, k, 0, 0);
  look.background(b);
  if (look.backgroundPixels) {
    reduceToPalette(b, look.palette!);
    b.setTransform(1, 0, 0, 1, 0, 0);
    look.backgroundPixels(b);
  }
}

function render(): void {
  if (look.palette) {
    lowCtx.setTransform(1, 0, 0, 1, 0, 0);
    lowCtx.drawImage(bg, 0, 0);
    lowCtx.setTransform(PX, 0, 0, PX, 0, 0);
    drawWorld(lowCtx);
    look.overlay?.(lowCtx);
    reduceToPalette(lowCtx, look.palette);
    lowCtx.setTransform(1, 0, 0, 1, 0, 0);
    drawText(lowCtx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, canvas.width, canvas.height);
    return;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(bg, 0, 0);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawWorld(ctx);
  look.overlay?.(ctx);
  drawText(ctx);
}

let last = performance.now();
let acc = 0;
function frame(now: number): void {
  acc = Math.min(acc + (now - last) / 1000, 0.25);
  last = now;
  while (acc >= 1 / 60) {
    step(1 / 60);
    acc -= 1 / 60;
  }
  render();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------------------------------------------
// The bar at the bottom

function syncBar(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-look]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.look === look.id)));
  (document.getElementById("rotten") as HTMLInputElement).checked = rottenOn;
  (document.getElementById("auto") as HTMLInputElement).checked = autoplay;
  document.getElementById("blurb")!.textContent = look.blurb;
  const url = new URL(location.href);
  url.searchParams.set("look", look.id);
  url.searchParams.set("rotten", rottenOn ? "on" : "off");
  url.searchParams.set("auto", autoplay ? "on" : "off");
  history.replaceState(null, "", url);
}

function setLook(id: string): void {
  look = LOOKS.find((l) => l.id === id) ?? look;
  resize();
  syncBar();
}

const bar = document.getElementById("looks")!;
for (const l of LOOKS) {
  const b = document.createElement("button");
  b.dataset.look = l.id;
  b.textContent = `${l.id.toUpperCase()} · ${l.name}`;
  b.addEventListener("click", () => {
    setLook(l.id);
    b.blur();
  });
  bar.append(b);
}
document.getElementById("rotten")!.addEventListener("change", (e) => {
  rottenOn = (e.target as HTMLInputElement).checked;
  if (!rottenOn) flyers = flyers.filter((f) => !f.rotten);
  syncBar();
});
document.getElementById("auto")!.addEventListener("change", (e) => {
  autoplay = (e.target as HTMLInputElement).checked;
  syncBar();
});

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const n = Number(e.key);
  if (n >= 1 && n <= LOOKS.length) setLook(LOOKS[n - 1].id);
  else if (/^[a-z]$/i.test(e.key)) press(e.key.toLowerCase());
});
window.addEventListener("resize", resize);

resize();
syncBar();
requestAnimationFrame(frame);

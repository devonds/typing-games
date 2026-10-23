// PROTOTYPE (throwaway): a sentence-typing game, to judge two ideas before building it properly.
//   Bursts: every letter you type turns into something (a flower, confetti, a bubble, a butterfly, a firework).
//           One kind per sentence, picked at random unless you choose one in the bar.
//   Comes alive: a picture-book page. Typing a thing's name makes it pop into the picture; finishing the
//           sentence makes the picture act it out.
// Type the sentence (no shift needed). Enter skips to the next sentence. ?mode=alive, ?theme=flower etc. work too.
import { Stage, SCENES } from "./alive";
import { BUBBLE_POP_AT, Bursts, FIREWORK_BURST_AT, THEMES, THEME_NAMES, star, type Theme } from "./bursts";
import { Sounds } from "./sound";
import { FONT_FAMILY, Line } from "./typing";

const W = 480;
const H = 270;
const TAU = Math.PI * 2;

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const main = document.querySelector("main")!;
let scale = 1;

function fit(): void {
  const box = main.getBoundingClientRect();
  scale = Math.min(box.width / W, box.height / H);
  const dpr = devicePixelRatio || 1;
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
  canvas.width = Math.floor(W * scale * dpr);
  canvas.height = Math.floor(H * scale * dpr);
}
new ResizeObserver(fit).observe(main);
fit();

const sounds = new Sounds();
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutBack = (p: number) => 1 + 2.4 * (p - 1) ** 3 + 1.4 * (p - 1) ** 2;

/** Shuffled cycle, so nothing repeats until everything has had a turn. */
function cycle<T>(items: readonly T[]): () => T {
  let bag: T[] = [];
  let last: T | undefined;
  return () => {
    if (bag.length === 0) {
      bag = [...items].sort(() => Math.random() - 0.5);
      if (bag.length > 1 && bag[bag.length - 1] === last) bag.unshift(bag.pop()!);
    }
    last = bag.pop()!;
    return last;
  };
}

const CHEERS = ["Lovely!", "Great typing!", "Hooray!", "Super!", "Well done!", "Wow!"];

interface Mode {
  readonly line: Line;
  press(key: string): void;
  next(): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

// ---------------------------------------------------------------------------------------------------------------
// Bursts

const BURST_SENTENCES = [
  "The sun is up.",
  "I can hop and skip.",
  "We like to play.",
  "My dog has a red ball.",
  "Look at the big moon.",
  "A fish can swim fast.",
  "I love my little cat.",
  "The bus is yellow.",
  "Let us bake a cake.",
  "Birds sing in the tree.",
];
const BRIGHT = ["#ff6b8b", "#ffd23f", "#4ecdc4", "#a37cf0", "#ff9f43", "#7bd88f", "#5fa8ff"];
const NIGHT_STARS = Array.from({ length: 50 }, () => ({ x: rand(0, W), y: rand(0, H * 0.8), r: rand(0.4, 1.2), p: rand(0, TAU) }));

let themeChoice: Theme | "random" = "random";

class BurstsMode implements Mode {
  line!: Line;
  theme: Theme = "flower";
  private readonly bursts = new Bursts();
  private readonly sentence = cycle(BURST_SENTENCES);
  private readonly randomTheme = cycle(THEMES);
  private t = 0;
  private doneAt: number | null = null;
  private typed = 0;
  private cheer = { text: "", at: -10 };
  private themeShownAt = 0;

  constructor() {
    this.next();
  }

  next(): void {
    this.bursts.release();
    this.theme = themeChoice === "random" ? this.randomTheme() : themeChoice;
    this.line = new Line(this.sentence(), ctx, 30, { x: W / 2, y: 178 }, 430, BRIGHT);
    this.doneAt = null;
    this.typed = 0;
    this.themeShownAt = this.t;
  }

  press(key: string): void {
    if (this.doneAt !== null) return;
    const r = this.line.press(key);
    if (r.kind === "miss") sounds.boop();
    if (r.kind !== "hit") return;
    if (r.glyph.ch !== " ") {
      const i = this.typed++;
      this.bursts.spawn(this.theme, r.glyph, this.line.font, this.line.size, i);
      if (this.theme === "flower") sounds.bell(i);
      else if (this.theme === "confetti") sounds.confetti(i);
      else if (this.theme === "bubble") sounds.bubble(i, BUBBLE_POP_AT);
      else if (this.theme === "butterfly") sounds.butterfly(i);
      else sounds.firework(i, FIREWORK_BURST_AT);
    }
    if (this.line.done) {
      this.doneAt = this.t;
      this.cheer = { text: pick(CHEERS), at: this.t + 0.3 };
      sounds.hooray();
    }
  }

  update(dt: number): void {
    this.t += dt;
    this.line.update(dt);
    this.bursts.update(dt);
    // Give the last few effects time to finish (flowers get a moment to be admired).
    if (this.doneAt !== null && this.t - this.doneAt > (this.theme === "flower" ? 2.4 : 2)) this.next();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#1d2350");
    sky.addColorStop(1, "#4a3f7a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    for (const s of NIGHT_STARS) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(this.t * 1.5 + s.p);
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Soft hill the sentence sits above.
    ctx.fillStyle = "#2c2a5c";
    ctx.beginPath();
    ctx.ellipse(W / 2, H + 120, W, 165, 0, 0, TAU);
    ctx.fill();

    // Which kind this sentence is, faded in at the start.
    const a = clamp01((this.t - this.themeShownAt) / 0.4);
    ctx.globalAlpha = a * 0.85;
    ctx.font = `700 11px ${FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#cfc8ff";
    ctx.fillText(THEME_NAMES[this.theme].toUpperCase(), 14, 16);
    ctx.globalAlpha = 1;

    this.line.draw(ctx, this.t, { ink: "#f4f1ff", typedAlpha: this.theme === "flower" ? 1 : 0.3, typedInk: this.theme === "flower" ? undefined : () => "#ffffff" });
    this.bursts.draw(ctx);
    drawCheer(ctx, this.cheer, this.t, 80, "#ffffff");
  }
}

function drawCheer(ctx: CanvasRenderingContext2D, cheer: { text: string; at: number }, t: number, y: number, colour: string): void {
  const age = t - cheer.at;
  if (age < 0 || age > 1.8) return;
  const s = easeOutBack(clamp01(age / 0.35));
  ctx.save();
  ctx.globalAlpha = clamp01((1.8 - age) / 0.4);
  ctx.translate(W / 2, y);
  ctx.scale(s, s);
  ctx.rotate(Math.sin(age * 5) * 0.04);
  ctx.font = `800 30px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(60,40,110,0.6)";
  ctx.strokeText(cheer.text, 0, 0);
  ctx.fillStyle = colour;
  ctx.fillText(cheer.text, 0, 0);
  ctx.fillStyle = "#ffd23f";
  for (const side of [-1, 1]) star(ctx, side * (ctx.measureText(cheer.text).width / 2 + 16), -4, 4);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------------------------
// Comes alive

const INKY = ["#e63973", "#e07a00", "#1e9e8f", "#7b4fd6", "#2d7fe0", "#3a9b4a"];

class AliveMode implements Mode {
  line!: Line;
  stage!: Stage;
  private readonly scene = cycle(SCENES);
  private t = 0;
  private typed = 0;
  private cheer = { text: "", at: -10 };

  constructor() {
    this.next();
  }

  next(): void {
    const def = this.scene();
    this.stage = new Stage(def, sounds);
    this.line = new Line(def.text, ctx, 24, { x: W / 2, y: 236 }, 420, INKY);
    this.typed = 0;
  }

  press(key: string): void {
    if (this.stage.finishedAt !== null) return;
    const r = this.line.press(key);
    if (r.kind === "miss") sounds.boop();
    if (r.kind !== "hit") return;
    if (r.glyph.ch !== " ") {
      sounds.bell(this.typed++, 0.07);
      this.stage.letterSparkle(r.glyph.cx, r.glyph.cy, r.glyph.colour);
    }
    if (r.wordDone) this.stage.appear(r.wordDone);
    if (this.line.done) {
      this.stage.finish();
      this.cheer = { text: pick(CHEERS), at: this.t + this.stage.def.finaleLength - 1.6 };
    }
  }

  update(dt: number): void {
    this.t += dt;
    this.line.update(dt);
    this.stage.update(dt);
    if (this.stage.finaleDone) this.next();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.stage.draw(ctx, W, H);
    // The page of the book: a cream panel with the sentence.
    ctx.save();
    ctx.shadowColor = "rgba(40,60,30,0.25)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.roundRect(16, 208, W - 32, 54, 14);
    ctx.fillStyle = "#fffaf0";
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#e9dcc0";
    ctx.stroke();
    this.line.draw(ctx, this.t, { ink: "#2b2d42", typedAlpha: 1 });
    this.stage.drawOverlay(ctx);
    drawCheer(ctx, this.cheer, this.t, 40, "#ffffff");
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Page: bar, keys, loop

type ModeName = "bursts" | "alive";
const params = new URLSearchParams(location.search);
let modeName: ModeName = params.get("mode") === "alive" ? "alive" : "bursts";
const themeParam = params.get("theme");
if (themeParam && (THEMES as readonly string[]).includes(themeParam)) themeChoice = themeParam as Theme;
let mode: Mode = modeName === "alive" ? new AliveMode() : new BurstsMode();

const modesEl = document.getElementById("modes")!;
const themesEl = document.getElementById("themes")!;
const blurb = document.getElementById("blurb")!;
const autoBox = document.getElementById("auto") as HTMLInputElement;
const soundBox = document.getElementById("sound") as HTMLInputElement;

const BLURBS: Record<ModeName, string> = {
  bursts: "Type the sentence. Each letter turns into something: one kind per sentence, random unless you pick one. Enter skips.",
  alive: "Type the sentence. Naming something pops it into the picture; finishing the sentence makes it happen. Enter skips.",
};

function button(label: string, pressed: boolean, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  b.setAttribute("aria-pressed", String(pressed));
  b.addEventListener("click", () => {
    onClick();
    b.blur(); // keep keys going to the game
    renderBar();
  });
  return b;
}

function renderBar(): void {
  modesEl.replaceChildren(
    button("Bursts", modeName === "bursts", () => setMode("bursts")),
    button("Comes alive", modeName === "alive", () => setMode("alive")),
  );
  themesEl.hidden = modeName !== "bursts";
  themesEl.replaceChildren(
    button("Random", themeChoice === "random", () => setTheme("random")),
    ...THEMES.map((th) => button(THEME_NAMES[th], themeChoice === th, () => setTheme(th))),
  );
  blurb.textContent = BLURBS[modeName];
}

function setMode(m: ModeName): void {
  if (m === modeName) return;
  modeName = m;
  mode = m === "alive" ? new AliveMode() : new BurstsMode();
  syncUrl();
}

function setTheme(th: Theme | "random"): void {
  themeChoice = th;
  if (mode instanceof BurstsMode) mode.next();
  syncUrl();
}

function syncUrl(): void {
  const q = new URLSearchParams();
  if (modeName === "alive") q.set("mode", "alive");
  if (modeName === "bursts" && themeChoice !== "random") q.set("theme", themeChoice);
  history.replaceState(null, "", q.size ? `?${q}` : location.pathname);
}

soundBox.addEventListener("change", () => {
  sounds.enabled = soundBox.checked;
  soundBox.blur();
});
autoBox.addEventListener("change", () => {
  autoBox.blur();
  sounds.unlock();
});

addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  sounds.unlock();
  if (e.key === "Enter") {
    mode.next();
    e.preventDefault();
    return;
  }
  if (e.key.length !== 1) return;
  e.preventDefault(); // space shouldn't scroll or press buttons
  mode.press(e.key);
});
addEventListener("pointerdown", () => sounds.unlock());

// Autoplay: types steadily, with the odd wrong key.
let autoTimer = 0;
function autoplay(dt: number): void {
  if (!autoBox.checked) return;
  autoTimer -= dt;
  const next = mode.line.next;
  if (autoTimer > 0 || !next) return;
  autoTimer = rand(0.18, 0.38);
  mode.press(Math.random() < 0.05 ? "q" : next.ch);
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  autoplay(dt);
  mode.update(dt);
  const dpr = devicePixelRatio || 1;
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  mode.draw(ctx);
  requestAnimationFrame(frame);
}

renderBar();
requestAnimationFrame(frame);

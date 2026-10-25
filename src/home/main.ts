// The home page: a little live scene on each game's card, drawn with that game's own code.
import * as Balloon from "../balloon-pop/config";
import { Effects as BalloonEffects } from "../balloon-pop/look/effects";
import { BALLOON_COLOURS } from "../balloon-pop/look/palette";
import { Pixels } from "../balloon-pop/look/pixels";
import { Scenery } from "../balloon-pop/look/scenery";
import { drawBalloon, drawLauncher, type BalloonLike } from "../balloon-pop/look/sprites";
import * as Fresh from "../fresh-cuts/config";
import type { Fruit } from "../fresh-cuts/game/types";
import { Effects as FruitEffects } from "../fresh-cuts/look/effects";
import { drawIce, drawShadow, drawWhole, lookFor } from "../fresh-cuts/look/fruit";
import { drawStore, drawVignette } from "../fresh-cuts/look/store";
import { drawTag } from "../fresh-cuts/look/ui";
import { Players } from "./players";
import * as Garden from "../word-garden/config";
import { isTyped } from "../word-garden/game/round";
import { Bursts } from "../word-garden/look/bursts";
import { Landscape } from "../word-garden/look/landscape";
import { Sky } from "../word-garden/look/palette";
import { Words } from "../word-garden/look/words";

const LETTERS = "asdfghjkl";
const randomLetter = () => LETTERS[Math.floor(Math.random() * LETTERS.length)];
const between = (low: number, high: number) => low + Math.random() * (high - low);

interface Preview {
  update(dt: number): void;
  draw(): void;
}

// ---------------------------------------------------------------------------------------------------------------
// Balloon Pop: balloons drift up from the cannons and pop now and then.

const LAUNCHERS = [64, 128, 192];

class BalloonPreview implements Preview {
  private readonly pixels: Pixels;
  private readonly scenery = new Scenery();
  private readonly effects = new BalloonEffects(LAUNCHERS.length);
  private balloons: (BalloonLike & { popAt: number })[] = [];
  private untilNext = 0.3;
  private t = 0;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = Balloon.W;
    canvas.height = Balloon.H;
    this.pixels = new Pixels(canvas.getContext("2d", { alpha: false })!);
    // Start with a sky that already has balloons in it.
    for (let i = 0; i < 4; i++) this.add(30 + i * 22);
  }

  private add(y: number = Balloon.GROUND_Y - 14): void {
    const x = LAUNCHERS[Math.floor(Math.random() * LAUNCHERS.length)] + between(-14, 14);
    this.balloons.push({ x, y, letter: randomLetter(), colour: Math.floor(Math.random() * BALLOON_COLOURS.length), popAt: between(18, 70) });
  }

  update(dt: number): void {
    this.t += dt;
    this.scenery.update(dt);
    this.effects.update(dt);
    this.untilNext -= dt;
    if (this.untilNext <= 0) {
      this.add();
      this.untilNext = between(0.9, 1.6);
    }
    for (const b of this.balloons) b.y -= 16 * dt;
    for (const b of this.balloons.filter((b) => b.y < b.popAt)) this.effects.pop(b.x, b.y, BALLOON_COLOURS[b.colour].fill);
    this.balloons = this.balloons.filter((b) => b.y >= b.popAt);
  }

  draw(): void {
    const p = this.pixels;
    this.scenery.draw(p);
    for (const x of LAUNCHERS) drawLauncher(p, x, -Math.PI / 2, 0);
    for (const b of this.balloons) drawBalloon(p, b, this.t);
    this.effects.draw(p);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Fresh Cuts: fruit is tossed up in the shop and sliced at the top of its arc.

const AIR_TIME = 3;

class FruitPreview implements Preview {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly effects = new FruitEffects();
  private fruit: (Fruit & { sliceAt: number })[] = [];
  private untilNext = 0.2;
  private nextId = 1;
  private t = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.fit();
    new ResizeObserver(() => this.fit()).observe(canvas);
  }

  /** Draw at the card's real size and the screen's full resolution. */
  private fit(): void {
    const dpr = devicePixelRatio || 1;
    const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    this.canvas.width = width;
    this.canvas.height = Math.round((width * Fresh.H) / Fresh.W);
  }

  private toss(): void {
    const x = between(120, 360);
    const apex = between(60, 110);
    const gravity = (8 * (Fresh.LAUNCH.y - apex)) / AIR_TIME ** 2;
    const n = this.nextId++;
    this.fruit.push({
      id: n,
      kind: Fresh.FRUIT_KINDS[n % Fresh.FRUIT_KINDS.length],
      letter: randomLetter(),
      rotten: false,
      frozen: n % 7 === 0,
      x,
      y: Fresh.LAUNCH.y,
      vx: between(-30, 30),
      vy: (-gravity * AIR_TIME) / 2,
      gravity,
      rot: between(-0.5, 0.5),
      spin: between(-2, 2),
      launchedAt: this.t,
      sliceAt: this.t + AIR_TIME * between(0.4, 0.65),
    });
  }

  update(dt: number): void {
    this.t += dt;
    this.effects.update(dt);
    this.untilNext -= dt;
    if (this.untilNext <= 0) {
      this.toss();
      this.untilNext = between(0.7, 1.3);
    }
    for (const f of this.fruit) {
      f.vy += f.gravity * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.spin * dt;
      if (this.t >= f.sliceAt) this.effects.slice(f);
    }
    this.fruit = this.fruit.filter((f) => this.t < f.sliceAt);
  }

  draw(): void {
    const ctx = this.ctx;
    ctx.setTransform(this.canvas.width / Fresh.W, 0, 0, this.canvas.height / Fresh.H, 0, 0);
    drawStore(ctx);
    this.effects.drawBehind(ctx);
    for (const f of this.fruit) {
      const look = lookFor(f.kind, false);
      drawShadow(ctx, look, f.x, f.y, f.rot);
      drawWhole(ctx, look, f.x, f.y, f.rot);
      if (f.frozen) drawIce(ctx, look, f.x, f.y, f.rot, this.t);
    }
    this.effects.drawFront(ctx);
    drawVignette(ctx);
    for (const f of this.fruit) drawTag(ctx, f.letter, f.x, f.y + 1, f.frozen ? "frozen" : "fresh");
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Word Garden: short sentences type themselves, each in a different kind of burst and time of day.

const GARDEN_SENTENCES = ["I love my dog.", "Birds can sing.", "The sun is up.", "Kites fly high.", "We sing a song."];

class GardenPreview implements Preview {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly landscape = new Landscape();
  private readonly bursts = new Bursts();
  private readonly sky = new Sky(Garden.BURSTS[0]);
  private words: Words;
  private sentence = 0;
  private pos = 0;
  private order = 0;
  private untilKey = 0.8;
  private doneFor = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.words = new Words(GARDEN_SENTENCES[0]);
    this.fit();
    new ResizeObserver(() => this.fit()).observe(canvas);
  }

  private fit(): void {
    const dpr = devicePixelRatio || 1;
    const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    this.canvas.width = width;
    this.canvas.height = Math.round((width * Garden.H) / Garden.W);
  }

  private get kind(): Garden.BurstKind {
    return Garden.BURSTS[this.sentence % Garden.BURSTS.length];
  }

  update(dt: number): void {
    this.landscape.update(dt);
    this.sky.update(dt);
    this.bursts.update(dt, this.landscape.t);
    const text = this.words.text;
    if (this.pos >= text.length) {
      this.doneFor += dt;
      if (this.doneFor > 2.2) {
        this.bursts.release();
        this.sentence += 1;
        this.words = new Words(GARDEN_SENTENCES[this.sentence % GARDEN_SENTENCES.length]);
        this.sky.go(this.kind);
        this.pos = this.order = this.doneFor = 0;
        this.untilKey = 1;
      }
    } else {
      this.untilKey -= dt;
      if (this.untilKey <= 0) {
        const g = this.words.glyphs[this.pos];
        if (g.ch !== " ") {
          this.bursts.spawn(this.kind, g, this.words.font, this.order++);
          this.words.typed(this.pos);
        }
        this.pos += 1;
        while (this.pos < text.length && !isTyped(text[this.pos])) this.pos += 1;
        this.untilKey = between(0.18, 0.3);
      }
    }
    this.words.update(dt, this.pos);
  }

  draw(): void {
    const ctx = this.ctx;
    ctx.setTransform(this.canvas.width / Garden.W, 0, 0, this.canvas.height / Garden.H, 0, 0);
    const p = this.sky.current;
    this.landscape.draw(ctx, p);
    this.words.draw(ctx, this.sky.target, this.pos, this.kind === "flowers");
    this.bursts.draw(ctx, p);
    this.landscape.drawAtmosphere(ctx, p);
  }
}

// ---------------------------------------------------------------------------------------------------------------

const previews: Preview[] = [];
const balloonCanvas = document.querySelector<HTMLCanvasElement>("#preview-balloon-pop");
const fruitCanvas = document.querySelector<HTMLCanvasElement>("#preview-fresh-cuts");
if (balloonCanvas) previews.push(new BalloonPreview(balloonCanvas));
if (fruitCanvas) previews.push(new FruitPreview(fruitCanvas));
const gardenCanvas = document.querySelector<HTMLCanvasElement>("#preview-word-garden");
if (gardenCanvas) previews.push(new GardenPreview(gardenCanvas));

const playersRoot = document.querySelector<HTMLElement>("#players");
if (playersRoot) new Players(playersRoot);

// Number keys pick a game, for anyone who'd rather not reach for the mouse (but not while typing a name).
addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const link = document.querySelector<HTMLAnchorElement>(`[data-key="${e.key}"]`);
  if (link && !e.metaKey && !e.ctrlKey && !e.altKey) location.href = link.href;
});

const still = matchMedia("(prefers-reduced-motion: reduce)");
let last = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (!still.matches) for (const p of previews) p.update(dt);
  for (const p of previews) p.draw();
  requestAnimationFrame(frame);
}
// Run a moment ahead so the very first frame already has something flying.
for (let i = 0; i < 90; i++) for (const p of previews) p.update(1 / 60);
requestAnimationFrame(frame);

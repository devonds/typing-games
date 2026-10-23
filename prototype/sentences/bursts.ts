// PROTOTYPE (throwaway): five ways a typed letter turns into something nice.
// flower: grows on a stem out of the letter and stays, so the sentence becomes a garden
// confetti: a little puff of paper confetti
// bubble: the letter floats up inside a soap bubble, which pops
// butterfly: the letter grows wings and flutters off
// firework: a tiny rocket goes up and bursts into sparkles
import type { Glyph } from "./typing";

export const THEMES = ["flower", "confetti", "bubble", "butterfly", "firework"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_NAMES: Record<Theme, string> = {
  flower: "Flowers",
  confetti: "Confetti",
  bubble: "Bubbles",
  butterfly: "Butterflies",
  firework: "Fireworks",
};

/** When the bubble pops and the firework bursts, so sounds can be timed to match. */
export const BUBBLE_POP_AT = 0.8;
export const FIREWORK_BURST_AT = 0.45;

const TAU = Math.PI * 2;
const PARTY = ["#ff6b8b", "#ffd23f", "#4ecdc4", "#a37cf0", "#ff9f43", "#7bd88f", "#5fa8ff"];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutBack = (p: number) => 1 + 2.4 * (p - 1) ** 3 + 1.4 * (p - 1) ** 2;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

interface Effect {
  age: number;
  /** Returns false when it's finished. */
  update(dt: number): boolean;
  draw(ctx: CanvasRenderingContext2D): void;
  /** The sentence is done: flowers drift off; everything else just carries on. */
  release?(): void;
}

/** The letter shrinking away during the first moment, so it reads as the letter turning into the thing. */
function drawShrinkingLetter(ctx: CanvasRenderingContext2D, g: Glyph, font: string, age: number, length = 0.18): void {
  const p = age / length;
  if (p >= 1) return;
  ctx.save();
  ctx.translate(g.cx, g.cy);
  ctx.scale(1 - p, 1 - p);
  ctx.globalAlpha = 1 - p;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = g.colour;
  ctx.fillText(g.ch, 0, 0);
  ctx.restore();
}

class Flower implements Effect {
  age = 0;
  private released = -1;
  private readonly petals = pick([5, 5, 6, 8]);
  private readonly spin = rand(0, TAU);
  private readonly size: number;
  private readonly centre: string;
  private readonly sway = rand(0, TAU);
  /** The stem grows up from the top of the letter, so the word stays readable under its flowers. */
  private readonly baseY: number;
  private readonly stem: number;
  private vx = 0;
  private vy = 0;
  private dx = 0;
  private dy = 0;

  constructor(private readonly g: Glyph, letterSize: number, index: number) {
    this.size = letterSize * 0.34;
    this.centre = g.colour === "#ffd23f" ? "#ff9f43" : "#ffe680";
    this.baseY = g.cy - letterSize * 0.42;
    // Alternate tall and short stems so neighbouring flowers don't sit on top of each other.
    this.stem = letterSize * (index % 2 === 0 ? rand(0.55, 0.75) : rand(1.0, 1.25));
  }

  update(dt: number): boolean {
    this.age += dt;
    if (this.released < 0) return true;
    this.released += dt;
    this.vy -= 30 * dt;
    this.dx += this.vx * dt;
    this.dy += this.vy * dt;
    return this.released < 2.2;
  }

  release(): void {
    if (this.released >= 0) return;
    this.released = 0;
    this.vx = rand(-15, 15);
    this.vy = rand(-30, -5);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const swayX = Math.sin(this.age * 1.6 + this.sway) * 1.5;
    const grow = clamp01(this.age / 0.25);
    const headX = this.g.cx + swayX;
    const headY = this.baseY - this.stem * grow;
    // Stem and a leaf; they fade once the flower floats off.
    ctx.save();
    ctx.globalAlpha = this.released >= 0 ? clamp01(1 - this.released * 2) : 1;
    ctx.strokeStyle = "#5fbf5a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(this.g.cx, this.baseY);
    ctx.quadraticCurveTo(this.g.cx - 2, (this.baseY + headY) / 2, headX, headY);
    ctx.stroke();
    if (grow > 0.6) {
      ctx.fillStyle = "#7bd88f";
      ctx.beginPath();
      ctx.ellipse(this.g.cx + 3, this.baseY - this.stem * 0.35, 4, 1.8, -0.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    const bloom = easeOutBack(clamp01((this.age - 0.2) / 0.45));
    if (bloom <= 0) return;
    const s = this.size * bloom;
    const turn = this.spin + Math.sin(this.age * 1.6 + this.sway) * 0.12 + (this.released > 0 ? this.released * 2 : 0);
    ctx.save();
    ctx.translate(headX + this.dx, headY + this.dy);
    if (this.released > 0) ctx.globalAlpha = clamp01(1 - (this.released - 1.2));
    ctx.rotate(turn);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < this.petals; i++) {
      ctx.save();
      ctx.rotate((i / this.petals) * TAU);
      ctx.beginPath();
      ctx.ellipse(s * 0.62, 0, s * 0.58, s * (this.petals > 6 ? 0.24 : 0.36), 0, 0, TAU);
      ctx.fillStyle = this.g.colour;
      ctx.fill();
      ctx.stroke();
      // A lighter stripe down each petal.
      ctx.beginPath();
      ctx.ellipse(s * 0.66, 0, s * 0.36, s * 0.08, 0, 0, TAU);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.34, 0, TAU);
    ctx.fillStyle = this.centre;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(120,70,0,0.35)";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(Math.cos(i * 2.4) * s * 0.15, Math.sin(i * 2.4) * s * 0.15, s * 0.05, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

class Confetti implements Effect {
  age = 0;
  private readonly bits = Array.from({ length: 18 }, () => ({
    x: 0,
    y: 0,
    vx: rand(-90, 90),
    vy: rand(-210, -90),
    rot: rand(0, TAU),
    spin: rand(-10, 10),
    flip: rand(0, TAU),
    w: rand(3, 5),
    h: rand(5, 8),
    colour: Math.random() < 0.4 ? "" : pick(PARTY),
    round: Math.random() < 0.25,
  }));

  constructor(private readonly g: Glyph, private readonly font: string) {}

  update(dt: number): boolean {
    this.age += dt;
    for (const b of this.bits) {
      b.vy += 300 * dt;
      b.vx *= 1 - 2.5 * dt;
      b.vy *= 1 - 2.5 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.spin * dt;
      b.flip += 9 * dt;
    }
    return this.age < 1.8;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawShrinkingLetter(ctx, this.g, this.font, this.age, 0.1);
    ctx.save();
    ctx.globalAlpha = clamp01((1.8 - this.age) / 0.5);
    for (const b of this.bits) {
      ctx.save();
      ctx.translate(this.g.cx + b.x, this.g.cy + b.y);
      ctx.rotate(b.rot);
      ctx.scale(Math.cos(b.flip), 1);
      ctx.fillStyle = b.colour || this.g.colour;
      if (b.round) {
        ctx.beginPath();
        ctx.arc(0, 0, b.w * 0.6, 0, TAU);
        ctx.fill();
      } else ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
    ctx.restore();
  }
}

class Bubble implements Effect {
  age = 0;
  private readonly drift = rand(-12, 12);
  private readonly phase = rand(0, TAU);
  private readonly r: number;

  constructor(private readonly g: Glyph, private readonly font: string, letterSize: number) {
    this.r = letterSize * 0.55;
  }

  update(dt: number): boolean {
    this.age += dt;
    return this.age < BUBBLE_POP_AT + 0.35;
  }

  private pos(): { x: number; y: number } {
    const rise = Math.min(this.age, BUBBLE_POP_AT);
    return {
      x: this.g.cx + this.drift * rise + Math.sin(rise * 7 + this.phase) * 3,
      y: this.g.cy - 55 * rise ** 1.3,
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.pos();
    if (this.age < BUBBLE_POP_AT) {
      const grow = easeOutBack(clamp01(this.age / 0.2));
      const r = this.r * grow;
      // Wobbly bubble: slightly squashed one way then the other.
      const squash = 1 + Math.sin(this.age * 14) * 0.05;
      // The letter, floating inside.
      ctx.save();
      ctx.font = this.font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = this.g.colour;
      ctx.fillText(this.g.ch, x, y + 1);
      ctx.restore();
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(squash, 2 - squash);
      const fill = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      fill.addColorStop(0, "rgba(255,255,255,0.05)");
      fill.addColorStop(0.75, "rgba(170,220,255,0.12)");
      fill.addColorStop(1, "rgba(255,170,240,0.35)");
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.stroke();
      // Shine.
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, -2.6, -1.9);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.35, -r * 0.5, r * 0.08, 0, TAU);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.restore();
      return;
    }
    // Pop: a ring and a few droplets.
    const p = (this.age - BUBBLE_POP_AT) / 0.35;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2 * (1 - p);
    ctx.beginPath();
    ctx.arc(x, y, this.r * (1 + p * 0.6), 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "rgba(220,240,255,0.95)";
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.3;
      const d = this.r * (1 + p * 1.2);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 * (1 - p) + 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

class Butterfly implements Effect {
  age = 0;
  private x: number;
  private y: number;
  private readonly heading = rand(-0.9, 0.9);
  private readonly wiggle = rand(0, TAU);
  private readonly lower: string;

  constructor(private readonly g: Glyph, private readonly font: string, private readonly size: number) {
    this.x = g.cx;
    this.y = g.cy;
    this.lower = pick(PARTY.filter((c) => c !== g.colour));
  }

  update(dt: number): boolean {
    this.age += dt;
    if (this.age > 0.25) {
      const a = -Math.PI / 2 + this.heading + Math.sin(this.age * 2.5 + this.wiggle) * 0.9;
      const speed = 55;
      this.x += Math.cos(a) * speed * dt;
      // Flutter: bob up and down with each flap.
      this.y += Math.sin(a) * speed * dt + Math.sin(this.age * 14) * 20 * dt;
    }
    return this.age < 3.5 && this.y > -30;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawShrinkingLetter(ctx, this.g, this.font, this.age, 0.25);
    const grow = easeOutBack(clamp01(this.age / 0.35));
    if (grow <= 0) return;
    const s = this.size * 0.42 * grow;
    const flap = 0.25 + 0.75 * Math.abs(Math.sin(this.age * 14));
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = clamp01((3.5 - this.age) / 0.6);
    ctx.rotate(this.heading * 0.4);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * flap, 1);
      // Upper wing.
      ctx.beginPath();
      ctx.ellipse(s * 0.55, -s * 0.35, s * 0.6, s * 0.45, -0.5, 0, TAU);
      ctx.fillStyle = this.g.colour;
      ctx.fill();
      ctx.stroke();
      // Lower wing.
      ctx.beginPath();
      ctx.ellipse(s * 0.45, s * 0.35, s * 0.4, s * 0.32, 0.5, 0, TAU);
      ctx.fillStyle = this.lower;
      ctx.fill();
      ctx.stroke();
      // Spot.
      ctx.beginPath();
      ctx.arc(s * 0.6, -s * 0.4, s * 0.15, 0, TAU);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
      ctx.restore();
    }
    // Body and antennae.
    ctx.fillStyle = "#3b2f4a";
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.1, s * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#3b2f4a";
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.quadraticCurveTo(side * s * 0.15, -s * 0.85, side * s * 0.3, -s * 0.95);
      ctx.stroke();
    }
    ctx.restore();
  }
}

class Firework implements Effect {
  age = 0;
  private readonly height = rand(45, 75);
  private readonly lean = rand(-12, 12);
  private readonly sparks = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * TAU + rand(-0.1, 0.1);
    const v = rand(60, 95);
    return { a, v, colour: Math.random() < 0.3 ? "#fff6c8" : "" };
  });

  constructor(private readonly g: Glyph, private readonly font: string) {}

  update(dt: number): boolean {
    this.age += dt;
    return this.age < FIREWORK_BURST_AT + 1.2;
  }

  private top(): { x: number; y: number } {
    return { x: this.g.cx + this.lean, y: this.g.cy - this.height };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawShrinkingLetter(ctx, this.g, this.font, this.age, 0.12);
    const top = this.top();
    if (this.age < FIREWORK_BURST_AT) {
      // Rocket: a bright dot with a fading trail, slowing as it rises.
      const p = this.age / FIREWORK_BURST_AT;
      const e = 1 - (1 - p) ** 2;
      const x = this.g.cx + this.lean * e;
      const y = this.g.cy - this.height * e;
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const q = Math.max(0, e - i * 0.05);
        ctx.globalAlpha = 0.6 - i * 0.1;
        ctx.fillStyle = "#ffe9a8";
        ctx.beginPath();
        ctx.arc(this.g.cx + this.lean * q, this.g.cy - this.height * q, 2 - i * 0.25, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }
    const t = this.age - FIREWORK_BURST_AT;
    // Sparks fly out, slow down, sag, twinkle and fade.
    const dist = (v: number) => (v * (1 - Math.exp(-3.5 * t))) / 3.5;
    ctx.save();
    if (t < 0.12) {
      ctx.globalAlpha = 1 - t / 0.12;
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(top.x, top.y, 10 * (t / 0.12) + 3, 0, TAU);
      ctx.fill();
    }
    for (const s of this.sparks) {
      const d = dist(s.v);
      const x = top.x + Math.cos(s.a) * d;
      const y = top.y + Math.sin(s.a) * d + 18 * t * t;
      const twinkle = 0.8 + 0.2 * Math.sin(t * 30 + s.a * 5);
      ctx.globalAlpha = clamp01((1.2 - t) / 0.7) * twinkle;
      ctx.fillStyle = s.colour || this.g.colour;
      star(ctx, x, y, t < 0.5 ? 3.4 : 2.6);
      // A short tail back towards the centre.
      ctx.globalAlpha *= 0.4;
      const d2 = dist(s.v * 0.8);
      ctx.beginPath();
      ctx.arc(top.x + Math.cos(s.a) * d2, top.y + Math.sin(s.a) * d2 + 18 * t * t, 1, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2;
    const d = i % 2 === 0 ? r * 1.6 : r * 0.5;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
}

export class Bursts {
  private effects: Effect[] = [];

  /** `index`: how many letters of this sentence came before (flowers alternate stem heights with it). */
  spawn(theme: Theme, g: Glyph, font: string, letterSize: number, index: number): void {
    switch (theme) {
      case "flower":
        this.effects.push(new Flower(g, letterSize, index));
        break;
      case "confetti":
        this.effects.push(new Confetti(g, font));
        break;
      case "bubble":
        this.effects.push(new Bubble(g, font, letterSize));
        break;
      case "butterfly":
        this.effects.push(new Butterfly(g, font, letterSize));
        break;
      case "firework":
        this.effects.push(new Firework(g, font));
        break;
    }
  }

  /** Sentence done: let the flowers float away. */
  release(): void {
    for (const e of this.effects) e.release?.();
  }

  update(dt: number): void {
    this.effects = this.effects.filter((e) => e.update(dt));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const e of this.effects) e.draw(ctx);
  }
}

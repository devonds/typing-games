// PROTOTYPE (throwaway): "the sentence comes alive". Typing a noun makes it pop into the picture; finishing the
// sentence makes the picture act it out.
import { star } from "./bursts";
import type { Sounds } from "./sound";

const TAU = Math.PI * 2;
export const GROUND_Y = 132;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const easeOutBack = (p: number) => 1 + 2.4 * (p - 1) ** 3 + 1.4 * (p - 1) ** 2;
const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/** Something in the picture. (x, y) is where it touches the ground. */
interface Prop {
  kind: string;
  x: number;
  y: number;
  shownAt: number;
  flip: boolean;
  /** Squash and stretch: 1 = normal. */
  sx: number;
  sy: number;
  /** Kind-specific pose flags. */
  pose: Record<string, number | boolean>;
}

interface Particle {
  kind: "sparkle" | "drop" | "heart" | "text" | "ripple";
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  age: number;
  life: number;
  colour: string;
  size: number;
  text?: string;
  /** Drawn on top of the text panel rather than in the picture. */
  overlay?: boolean;
}

interface SceneDef {
  text: string;
  /** Typing one of these words makes its prop appear. */
  props: Record<string, { kind: string; x: number; y: number; flip?: boolean }>;
  /** Seconds the finale lasts before the next sentence. */
  finaleLength: number;
  /** Called every frame of the finale with seconds since it started. */
  finale(stage: Stage, t: number, dt: number): void;
}

/** Arc from a to b, `height` above the higher of the two, over p = 0..1. */
function hopPos(a: { x: number; y: number }, b: { x: number; y: number }, height: number, p: number): { x: number; y: number } {
  const top = Math.min(a.y, b.y) - height;
  // Quadratic through a, the peak, and b.
  const y = (1 - p) ** 2 * a.y + 2 * (1 - p) * p * (2 * top - (a.y + b.y) / 2) + p * p * b.y;
  return { x: lerp(a.x, b.x, p), y };
}

/** Run `fn` once when t first passes `at`. */
function once(stage: Stage, key: string, t: number, at: number, fn: () => void): void {
  if (t >= at && !stage.flags.has(key)) {
    stage.flags.add(key);
    fn();
  }
}

export const SCENES: SceneDef[] = [
  {
    text: "The pig jumps in the mud.",
    props: { pig: { kind: "pig", x: 130, y: 180 }, mud: { kind: "mud", x: 335, y: 186 } },
    finaleLength: 4,
    finale(stage, t) {
      const pig = stage.prop("pig");
      if (!pig) return;
      const start = { x: 130, y: 180 };
      const end = { x: 330, y: 184 };
      if (t < 0.35) {
        // Crouch...
        pig.sy = 1 - 0.25 * Math.sin((t / 0.35) * Math.PI * 0.5);
        pig.sx = 2 - pig.sy;
      } else if (t < 1.25) {
        once(stage, "hop", t, 0.35, () => stage.sounds.hop());
        const p = (t - 0.35) / 0.9;
        Object.assign(pig, hopPos(start, end, 70, p));
        pig.sx = 0.9;
        pig.sy = 1.12;
      } else {
        once(stage, "splash", t, 1.25, () => {
          stage.sounds.splash();
          pig.pose.muddy = true;
          for (let i = 0; i < 22; i++) stage.burst("drop", end.x + rand(-20, 20), end.y - 4, rand(-110, 110), rand(-200, -80), pick(["#7a5230", "#5e3d22", "#94683e"]), rand(2, 4.5));
        });
        // Land with a squash, then wiggle happily in the mud.
        const since = t - 1.25;
        const squash = Math.exp(-since * 6) * Math.cos(since * 20) * 0.3;
        pig.sx = 1 + squash;
        pig.sy = 1 - squash;
        pig.y = end.y;
        pig.pose.happy = true;
        pig.pose.roll = since > 0.6 ? Math.sin((since - 0.6) * 8) * 0.12 : 0;
        once(stage, "hearts", t, 1.9, () => {
          for (let i = 0; i < 3; i++) stage.burst("heart", end.x + 25 + i * 8, end.y - 55, rand(-10, 10), -30, "#ff6b8b", 6);
        });
      }
    },
  },
  {
    text: "A frog hops onto a log.",
    props: { frog: { kind: "frog", x: 110, y: 184 }, log: { kind: "log", x: 330, y: 188 } },
    finaleLength: 3.8,
    finale(stage, t) {
      const frog = stage.prop("frog");
      if (!frog) return;
      const a = { x: 110, y: 184 };
      const b = { x: 215, y: 184 };
      const c = { x: 322, y: 160 };
      const hop = (from: typeof a, to: typeof a, start: number, length: number, height: number, key: string) => {
        if (t < start || t > start + length) return false;
        once(stage, key, t, start, () => stage.sounds.hop());
        Object.assign(frog, hopPos(from, to, height, (t - start) / length));
        frog.sy = 1.2;
        frog.sx = 0.85;
        frog.pose.legs = true;
        return true;
      };
      if (hop(a, b, 0.2, 0.55, 40, "hop1") || hop(b, c, 1.05, 0.65, 55, "hop2")) return;
      frog.pose.legs = false;
      const landed = t > 1.7 ? t - 1.7 : t > 0.75 && t < 1.05 ? t - 0.75 : -1;
      const squash = landed >= 0 ? Math.exp(-landed * 8) * Math.cos(landed * 22) * 0.25 : 0;
      frog.sx = 1 + squash;
      frog.sy = 1 - squash;
      once(stage, "ribbit", t, 2.1, () => {
        stage.sounds.ribbit();
        stage.say("Ribbit!", c.x + 18, c.y - 48);
      });
    },
  },
  {
    text: "The cat naps in the sun.",
    props: { cat: { kind: "cat", x: 190, y: 184 }, sun: { kind: "sun", x: 385, y: 58 } },
    finaleLength: 4.5,
    finale(stage, t) {
      const cat = stage.prop("cat");
      const sun = stage.prop("sun");
      if (sun) sun.pose.glow = clamp01(t / 1.2);
      if (!cat) return;
      // Stretch, then curl up and sleep.
      if (t < 0.6) {
        cat.sx = 1 + Math.sin((t / 0.6) * Math.PI) * 0.15;
        cat.sy = 1 - Math.sin((t / 0.6) * Math.PI) * 0.1;
      } else {
        cat.sx = 1;
        cat.sy = 1 + Math.sin(t * 2.5) * 0.03; // breathing
        cat.pose.asleep = true;
      }
      for (let i = 0; i < 6; i++) {
        once(stage, `z${i}`, t, 0.9 + i * 0.6, () => {
          if (i % 2 === 0) stage.sounds.snore();
          const p = stage.burst("text", cat.x - 22, cat.y - 38, rand(4, 12), -22, "#5b6fae", 9 + (i % 3) * 2);
          p.text = "z";
          p.gravity = 0;
          p.life = 1.8;
        });
      }
    },
  },
  {
    text: "A duck swims in the pond.",
    props: { duck: { kind: "duck", x: 80, y: 182 }, pond: { kind: "pond", x: 305, y: 190 } },
    finaleLength: 4.6,
    finale(stage, t, dt) {
      const duck = stage.prop("duck");
      if (!duck) return;
      if (t < 1.2) {
        // Waddle to the water's edge.
        const p = t / 1.2;
        duck.x = lerp(80, 205, p);
        duck.y = 182 - Math.abs(Math.sin(p * Math.PI * 5)) * 3;
        duck.pose.tilt = Math.sin(p * Math.PI * 5) * 0.12;
      } else {
        once(stage, "plop", t, 1.2, () => {
          stage.sounds.splash();
          for (let i = 0; i < 10; i++) stage.burst("drop", 215, 190, rand(-60, 60), rand(-120, -50), "#bfe6ff", rand(1.5, 3));
        });
        // Glide across, leaving ripples.
        const p = easeInOut(clamp01((t - 1.2) / 2.6));
        duck.x = lerp(215, 390, p);
        duck.y = 193 + Math.sin(t * 4) * 0.8;
        duck.pose.tilt = 0;
        duck.pose.swimming = true;
        stage.rippleTimer -= dt;
        if (stage.rippleTimer <= 0 && p < 1) {
          stage.rippleTimer = 0.3;
          const r = stage.burst("ripple", duck.x - 12, duck.y, 0, 0, "rgba(255,255,255,0.8)", 6);
          r.life = 1.2;
        }
        once(stage, "quack", t, 2.4, () => {
          stage.sounds.quack();
          stage.say("Quack!", duck.x + 10, duck.y - 46);
        });
      }
    },
  },
  {
    text: "The bee flies to a red flower.",
    props: { bee: { kind: "bee", x: 90, y: 72 }, flower: { kind: "flower", x: 355, y: 186 } },
    finaleLength: 4,
    finale(stage, t) {
      const bee = stage.prop("bee");
      const flower = stage.prop("flower");
      if (!bee) return;
      once(stage, "buzz", t, 0, () => stage.sounds.buzz(2));
      const target = { x: 355, y: 186 - 66 };
      if (t < 2.2) {
        // A loop-the-loop on the way over.
        const p = easeInOut(t / 2.2);
        const loop = clamp01((p - 0.3) / 0.35);
        bee.x = lerp(90, target.x, p) + Math.sin(loop * TAU) * 35;
        bee.y = lerp(72, target.y, p) - Math.sin(p * Math.PI) * 30 + (1 - Math.cos(loop * TAU)) * -22;
        bee.flip = false;
      } else {
        bee.x = target.x;
        bee.y = target.y + Math.sin((t - 2.2) * 8) * 1.5;
        if (flower) flower.pose.wiggle = Math.exp(-(t - 2.2) * 2) * Math.sin((t - 2.2) * 14) * 0.15;
        once(stage, "hearts", t, 2.3, () => {
          stage.sounds.hooray();
          for (let i = 0; i < 4; i++) stage.burst("heart", target.x + rand(-15, 15), target.y - 10, rand(-20, 20), rand(-45, -25), "#ff6b8b", 5);
        });
      }
    },
  },
];

const pick = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

export class Stage {
  t = 0;
  finishedAt: number | null = null;
  readonly flags = new Set<string>();
  rippleTimer = 0;
  private readonly props = new Map<string, Prop>();
  private particles: Particle[] = [];

  constructor(readonly def: SceneDef, readonly sounds: Sounds) {}

  prop(word: string): Prop | undefined {
    return this.props.get(word);
  }

  /** A word was typed: if it names something, pop it into the picture. */
  appear(word: string): boolean {
    const spec = this.def.props[word];
    if (!spec || this.props.has(word)) return false;
    this.props.set(word, { kind: spec.kind, x: spec.x, y: spec.y, shownAt: this.t, flip: spec.flip ?? false, sx: 1, sy: 1, pose: {} });
    this.sounds.boing();
    const cy = spec.kind === "sun" || spec.kind === "bee" ? spec.y : spec.y - 20;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      this.burst("sparkle", spec.x, cy, Math.cos(a) * rand(60, 110), Math.sin(a) * rand(60, 110), pick(["#ffd23f", "#ffffff", "#ffb3c6"]), rand(1.6, 2.6)).gravity = 0;
    }
    return true;
  }

  finish(): void {
    this.finishedAt = this.t;
    // Anything the player somehow skipped still turns up for the finale.
    for (const w of Object.keys(this.def.props)) if (!this.props.has(w)) this.appear(w);
  }

  get finaleDone(): boolean {
    return this.finishedAt !== null && this.t - this.finishedAt > this.def.finaleLength;
  }

  burst(kind: Particle["kind"], x: number, y: number, vx: number, vy: number, colour: string, size: number): Particle {
    const p: Particle = { kind, x, y, vx, vy, gravity: kind === "drop" ? 420 : kind === "heart" ? -10 : 0, age: 0, life: kind === "drop" ? 0.9 : 1.2, colour, size };
    this.particles.push(p);
    return p;
  }

  /** A speech bubble that floats up and fades. */
  say(text: string, x: number, y: number): void {
    const p = this.burst("text", x, y, 0, -8, "#2b2d42", 13);
    p.text = text;
    p.life = 1.6;
  }

  /** Little sparkle when a letter is typed (inside the text panel). */
  letterSparkle(x: number, y: number, colour: string): void {
    for (let i = 0; i < 5; i++) {
      const a = rand(0, TAU);
      const p = this.burst("sparkle", x, y, Math.cos(a) * rand(30, 60), Math.sin(a) * rand(30, 60) - 20, colour, rand(1, 1.6));
      p.life = 0.5;
      p.overlay = true;
    }
  }

  update(dt: number): void {
    this.t += dt;
    if (this.finishedAt !== null) this.def.finale(this, this.t - this.finishedAt, dt);
    for (const p of this.particles) {
      p.age += dt;
      p.vy += p.gravity * dt;
      if (p.kind === "sparkle") {
        p.vx *= 1 - 4 * dt;
        p.vy *= 1 - 4 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    drawBackground(ctx, w, h, this.t, this.prop("sun")?.pose.glow as number | undefined);
    // Flat things (mud, pond, log) first, then everything else in front, nearest the bottom last.
    const order = [...this.props.values()].sort((a, b) => layer(a) - layer(b) || a.y - b.y);
    for (const p of order) this.drawProp(ctx, p);
    for (const p of this.particles) if (!p.overlay) drawParticle(ctx, p);
  }

  /** Sparkles from typed letters, drawn after the text panel. */
  drawOverlay(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) if (p.overlay) drawParticle(ctx, p);
  }

  private drawProp(ctx: CanvasRenderingContext2D, p: Prop): void {
    const age = this.t - p.shownAt;
    const grow = easeOutBack(clamp01(age / 0.45));
    // Idle: a gentle breathing bob.
    const idle = p.kind === "bee" ? Math.sin(this.t * 5) * 3 : 0;
    ctx.save();
    ctx.translate(p.x, p.y + idle);
    ctx.scale(grow * p.sx * (p.flip ? -1 : 1), grow * p.sy);
    const blink = (this.t + p.x * 0.01) % 3.2 < 0.12;
    DRAW[p.kind]?.(ctx, p, this.t, blink);
    ctx.restore();
  }
}

function layer(p: Prop): number {
  return p.kind === "mud" || p.kind === "pond" || p.kind === "log" || p.kind === "sun" ? 0 : 1;
}

// ---------------------------------------------------------------------------------------------------------------
// Drawing. Each draws with its feet at (0, 0), facing right.

const OUTLINE = "rgba(40,30,50,0.55)";

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, closed: boolean): void {
  if (closed) {
    ctx.beginPath();
    ctx.arc(x, y - r * 0.3, r, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#2b2d42";
    ctx.stroke();
    return;
  }
  dot(ctx, x, y, r, "#2b2d42");
  dot(ctx, x + r * 0.35, y - r * 0.35, r * 0.35, "white");
}

function shadow(ctx: CanvasRenderingContext2D, w: number): void {
  ctx.beginPath();
  ctx.ellipse(0, 0, w, w * 0.18, 0, 0, TAU);
  ctx.fillStyle = "rgba(30,80,30,0.2)";
  ctx.fill();
}

const DRAW: Record<string, (ctx: CanvasRenderingContext2D, p: Prop, t: number, blink: boolean) => void> = {
  pig(ctx, p, _t, blink) {
    shadow(ctx, 34);
    ctx.save();
    ctx.rotate((p.pose.roll as number) || 0);
    for (const x of [-20, -8, 8, 20]) {
      ctx.fillStyle = "#f58fab";
      ctx.beginPath();
      ctx.roundRect(x - 4, -12, 8, 12, 3);
      ctx.fill();
    }
    // Curly tail.
    ctx.beginPath();
    ctx.arc(-33, -28, 4, 0, Math.PI * 1.6);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#e57391";
    ctx.stroke();
    blob(ctx, 0, -24, 31, 19, "#ffb3c6");
    if (p.pose.muddy) {
      for (const [x, y, r] of [[-12, -30, 6], [8, -16, 5], [-20, -15, 4], [15, -32, 3.5], [30, -40, 3]]) dot(ctx, x, y, r, "rgba(110,72,38,0.8)");
    }
    // Head.
    blob(ctx, 25, -33, 15, 14, "#ffb3c6");
    ctx.fillStyle = "#ff9ab5";
    for (const x of [17, 30]) {
      ctx.beginPath();
      ctx.moveTo(x - 5, -42);
      ctx.lineTo(x + 1, -54);
      ctx.lineTo(x + 6, -42);
      ctx.fill();
    }
    blob(ctx, 37, -29, 7, 6, "#ff8fab");
    dot(ctx, 35, -29, 1.4, "#b5466a");
    dot(ctx, 39.5, -29, 1.4, "#b5466a");
    eye(ctx, 27, -37, 2.3, blink || !!p.pose.happy);
    dot(ctx, 22, -28, 3, "rgba(255,100,140,0.35)");
    ctx.restore();
  },
  mud(ctx) {
    blob(ctx, 0, 0, 58, 13, "#7a5230");
    dot(ctx, -20, -2, 9, "#5e3d22");
    dot(ctx, 18, 3, 7, "#5e3d22");
    ctx.beginPath();
    ctx.ellipse(-8, -5, 20, 3, 0, 0, TAU);
    ctx.fillStyle = "rgba(255,230,190,0.25)";
    ctx.fill();
  },
  frog(ctx, p, _t, blink) {
    shadow(ctx, 22);
    const legs = !!p.pose.legs;
    // Back legs: tucked, or stretched out behind mid-hop.
    if (legs) {
      blob(ctx, -22, -2, 12, 4, "#58b041", 0.4);
    } else {
      blob(ctx, -16, -6, 10, 7, "#58b041");
      blob(ctx, 16, -6, 10, 7, "#58b041");
    }
    blob(ctx, 0, -15, 22, 14, "#6cc551");
    blob(ctx, 0, -10, 13, 7, "#c9f0a0");
    // Eye bumps.
    for (const x of [-9, 9]) {
      blob(ctx, x, -29, 7.5, 7, "#6cc551");
      dot(ctx, x, -29, 5, "white");
      eye(ctx, x + 1, -29, 2.5, blink);
    }
    ctx.beginPath();
    ctx.arc(0, -19, 9, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#2b5a20";
    ctx.stroke();
    dot(ctx, -14, -16, 2.5, "rgba(255,120,140,0.4)");
    dot(ctx, 14, -16, 2.5, "rgba(255,120,140,0.4)");
  },
  log(ctx) {
    shadow(ctx, 55);
    ctx.beginPath();
    ctx.roundRect(-55, -26, 105, 26, 12);
    ctx.fillStyle = "#9a6331";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.strokeStyle = "rgba(60,30,10,0.35)";
    for (const y of [-18, -9]) {
      ctx.beginPath();
      ctx.moveTo(-45, y);
      ctx.lineTo(30, y);
      ctx.stroke();
    }
    blob(ctx, 48, -13, 8, 13, "#d9a066");
    ctx.beginPath();
    ctx.ellipse(48, -13, 4, 7, 0, 0, TAU);
    ctx.strokeStyle = "#a8743f";
    ctx.stroke();
    // A little sprout.
    ctx.strokeStyle = "#4f9a3a";
    ctx.beginPath();
    ctx.moveTo(-30, -26);
    ctx.quadraticCurveTo(-32, -34, -26, -38);
    ctx.stroke();
    blob(ctx, -24, -38, 4, 2.5, "#7bd88f", -0.5);
  },
  cat(ctx, p, t, blink) {
    shadow(ctx, 30);
    const asleep = !!p.pose.asleep;
    if (asleep) {
      // Curled up: a round loaf with the tail wrapped round the front.
      blob(ctx, 0, -14, 30, 14, "#f4a259");
      for (const x of [-10, 2, 14]) {
        ctx.beginPath();
        ctx.moveTo(x, -27);
        ctx.lineTo(x + 3, -20);
        ctx.strokeStyle = "rgba(170,90,30,0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      blob(ctx, -24, -16, 13, 11, "#f4a259");
      ear(ctx, -32, -24, -0.6);
      ear(ctx, -20, -27, 0.1);
      eye(ctx, -28, -16, 2.4, true);
      eye(ctx, -19, -16, 2.4, true);
      ctx.beginPath();
      ctx.moveTo(28, -6);
      ctx.quadraticCurveTo(10, 4, -14, -2);
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#e08a43";
      ctx.stroke();
      return;
    }
    // Sitting, tail swishing.
    ctx.beginPath();
    ctx.moveTo(18, -6);
    ctx.quadraticCurveTo(38, -10, 34 + Math.sin(t * 2) * 6, -34);
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#e08a43";
    ctx.stroke();
    blob(ctx, 4, -20, 20, 20, "#f4a259");
    blob(ctx, 0, -6, 10, 6, "#ffd9b0");
    blob(ctx, -6, -46, 15, 13, "#f4a259");
    ear(ctx, -16, -55, -0.3);
    ear(ctx, 3, -56, 0.3);
    eye(ctx, -12, -47, 2.4, blink);
    eye(ctx, -1, -47, 2.4, blink);
    dot(ctx, -6.5, -42, 1.8, "#e86a8a");
    ctx.strokeStyle = "rgba(60,40,30,0.6)";
    ctx.lineWidth = 0.8;
    for (const s of [-1, 1]) {
      for (const dy of [-1.5, 1.5]) {
        ctx.beginPath();
        ctx.moveTo(-6.5 + s * 4, -41 + dy);
        ctx.lineTo(-6.5 + s * 15, -42 + dy * 2.2);
        ctx.stroke();
      }
    }
  },
  sun(ctx, p, t) {
    const glow = (p.pose.glow as number) || 0;
    if (glow > 0) {
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 60 + glow * 50);
      g.addColorStop(0, `rgba(255,236,150,${0.6 * glow})`);
      g.addColorStop(1, "rgba(255,236,150,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 110, 0, TAU);
      ctx.fill();
    }
    ctx.save();
    ctx.rotate(t * 0.4);
    ctx.fillStyle = "#ffc93c";
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath();
      ctx.moveTo(-4, -25);
      ctx.lineTo(0, -34 - glow * 8 - (i % 2) * 4);
      ctx.lineTo(4, -25);
      ctx.fill();
    }
    ctx.restore();
    blob(ctx, 0, 0, 23, 23, "#ffd93d");
    eye(ctx, -7, -4, 2.2, glow > 0.5);
    eye(ctx, 7, -4, 2.2, glow > 0.5);
    ctx.beginPath();
    ctx.arc(0, 3, 7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#b5651d";
    ctx.stroke();
    dot(ctx, -12, 4, 3, "rgba(255,120,80,0.35)");
    dot(ctx, 12, 4, 3, "rgba(255,120,80,0.35)");
  },
  duck(ctx, p, _t, blink) {
    const swimming = !!p.pose.swimming;
    if (!swimming) {
      shadow(ctx, 18);
      ctx.fillStyle = "#ff9f1c";
      for (const x of [-5, 5]) {
        ctx.beginPath();
        ctx.ellipse(x + 3, -1, 5, 2, 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.save();
    ctx.rotate((p.pose.tilt as number) || 0);
    const lift = swimming ? 0 : -5;
    if (swimming) {
      // Only the top half shows above the water.
      ctx.beginPath();
      ctx.rect(-40, -80, 80, 78);
      ctx.clip();
    }
    blob(ctx, 0, lift - 12, 20, 12, "#ffe066");
    // Tail tip.
    ctx.beginPath();
    ctx.moveTo(-17, lift - 16);
    ctx.lineTo(-26, lift - 22);
    ctx.lineTo(-18, lift - 9);
    ctx.fillStyle = "#ffe066";
    ctx.fill();
    blob(ctx, -2, lift - 13, 10, 6, "#ffd23f", -0.2);
    blob(ctx, 14, lift - 29, 10, 10, "#ffe066");
    blob(ctx, 25, lift - 27, 7, 3.2, "#ff9f1c");
    eye(ctx, 16, lift - 31, 2, blink);
    dot(ctx, 12, lift - 26, 2.4, "rgba(255,130,100,0.4)");
    ctx.restore();
  },
  pond(ctx) {
    blob(ctx, 0, 0, 115, 22, "#5dade2");
    ctx.beginPath();
    ctx.ellipse(0, 3, 100, 15, 0, 0, TAU);
    ctx.fillStyle = "#4a9bd4";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.5;
    for (const [x, y, w] of [[-60, -6, 18], [40, 6, 24], [-10, 10, 12]]) {
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x + w / 2, y);
      ctx.stroke();
    }
    // Lily pad.
    ctx.beginPath();
    ctx.ellipse(-80, 4, 12, 5, 0, 0.3, TAU - 0.3);
    ctx.lineTo(-80, 4);
    ctx.fillStyle = "#6cc551";
    ctx.fill();
    dot(ctx, -76, 2, 3, "#ffb3c6");
  },
  bee(ctx, _p, t, blink) {
    // Wings flap fast.
    const flap = 0.4 + 0.6 * Math.abs(Math.sin(t * 40));
    ctx.save();
    ctx.globalAlpha = 0.75;
    for (const x of [-4, 4]) {
      ctx.beginPath();
      ctx.ellipse(x, -12, 6, 10 * flap, x * 0.08, 0, TAU);
      ctx.fillStyle = "#e8f6ff";
      ctx.fill();
      ctx.strokeStyle = "rgba(80,120,160,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 10, 0, 0, TAU);
    ctx.fillStyle = "#ffd23f";
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = "#3b2f4a";
    ctx.fillRect(-6, -12, 4, 24);
    ctx.fillRect(2, -12, 4, 24);
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 10, 0, 0, TAU);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(-19, 1);
    ctx.lineTo(-14, 3);
    ctx.fillStyle = "#3b2f4a";
    ctx.fill();
    eye(ctx, 9, -2, 1.8, blink);
    ctx.beginPath();
    ctx.arc(9, 2, 3, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "#2b2d42";
    ctx.stroke();
  },
  flower(ctx, p) {
    const wiggle = (p.pose.wiggle as number) || 0;
    shadow(ctx, 12);
    ctx.save();
    ctx.rotate(wiggle);
    ctx.strokeStyle = "#4f9a3a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-6, -28, 0, -52);
    ctx.stroke();
    blob(ctx, -9, -22, 9, 4, "#7bd88f", -0.5);
    blob(ctx, 8, -32, 8, 3.5, "#7bd88f", 0.5);
    ctx.translate(0, -58);
    ctx.rotate(wiggle * 2);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      blob(ctx, Math.cos(a) * 9, Math.sin(a) * 9, 8, 6, "#ff4d6d", a);
    }
    blob(ctx, 0, 0, 6, 6, "#ffd23f");
    ctx.restore();
  },
};

function ear(ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.beginPath();
  ctx.moveTo(-6, 4);
  ctx.lineTo(0, -8);
  ctx.lineTo(6, 4);
  ctx.closePath();
  ctx.fillStyle = "#f4a259";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3, 3);
  ctx.lineTo(0, -4);
  ctx.lineTo(3, 3);
  ctx.fillStyle = "#ffb3a0";
  ctx.fill();
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const fade = clamp01((p.life - p.age) / 0.35);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = p.colour;
  switch (p.kind) {
    case "sparkle":
      star(ctx, p.x, p.y, p.size);
      break;
    case "drop":
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
      break;
    case "heart": {
      const s = p.size * (0.6 + 0.4 * clamp01(p.age / 0.2));
      ctx.translate(p.x, p.y);
      ctx.beginPath();
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(-s * 1.2, -s * 0.4, -s * 0.5, -s * 1.1, 0, -s * 0.45);
      ctx.bezierCurveTo(s * 0.5, -s * 1.1, s * 1.2, -s * 0.4, 0, s * 0.35);
      ctx.fill();
      break;
    }
    case "text": {
      ctx.font = `700 ${p.size}px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if ((p.text?.length ?? 0) > 1) {
        // Speech bubble.
        const w = ctx.measureText(p.text!).width + 14;
        ctx.beginPath();
        ctx.roundRect(p.x - w / 2, p.y - 11, w, 22, 10);
        ctx.moveTo(p.x - 6, p.y + 10);
        ctx.lineTo(p.x - 12, p.y + 18);
        ctx.lineTo(p.x + 2, p.y + 10);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.fillStyle = p.colour;
      }
      ctx.fillText(p.text ?? "", p.x, p.y + 1);
      break;
    }
    case "ripple": {
      const r = p.size + p.age * 18;
      ctx.strokeStyle = p.colour;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.25, 0, 0, TAU);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// Clouds and hills are fixed; clouds drift slowly.
const CLOUDS = [
  { x: 60, y: 35, s: 1 },
  { x: 230, y: 22, s: 0.8 },
  { x: 330, y: 50, s: 0.6 },
];

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, warmth = 0): void {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, warmth > 0 ? mix("#8fd3ff", "#ffd59e", warmth * 0.5) : "#8fd3ff");
  sky.addColorStop(1, "#e3f6ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, GROUND_Y + 2);
  for (const c of CLOUDS) {
    const x = ((c.x + t * 6 * c.s + 60) % (w + 120)) - 60;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (const [dx, dy, r] of [[-14, 2, 10], [0, -4, 14], [15, 1, 11], [5, 5, 10]]) {
      ctx.beginPath();
      ctx.arc(x + dx * c.s, c.y + dy * c.s, r * c.s, 0, TAU);
      ctx.fill();
    }
  }
  // Rolling hills.
  ctx.fillStyle = "#a8e08a";
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x <= w; x += 10) ctx.lineTo(x, GROUND_Y - 18 - Math.sin(x / 70) * 12);
  ctx.lineTo(w, GROUND_Y + 5);
  ctx.lineTo(0, GROUND_Y + 5);
  ctx.fill();
  ctx.fillStyle = "#8ed16f";
  ctx.fillRect(0, GROUND_Y, w, h - GROUND_Y);
  // Tufts of grass.
  ctx.strokeStyle = "#6fb752";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) {
    const x = (i * 97) % w;
    const y = GROUND_Y + 10 + ((i * 53) % 60);
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x - 1, y - 5);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 1, y - 7);
    ctx.moveTo(x + 3, y);
    ctx.lineTo(x + 4, y - 4);
    ctx.stroke();
  }
}

function mix(a: string, b: string, p: number): string {
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${ca.map((v, i) => Math.round(lerp(v, cb[i], p))).join(",")})`;
}

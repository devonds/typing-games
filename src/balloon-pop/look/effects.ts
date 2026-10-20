// Short-lived visual effects: pop bursts, darts, floating text, banners.
import { GROUND_Y, H, W } from "../config";
import { C } from "./palette";
import type { Pixels } from "./pixels";

interface Particle { x: number; y: number; vx: number; vy: number; age: number; life: number; colour: string }
interface FloatingText { x: number; y: number; text: string; colour: string; age: number; life: number; vy: number; scale: number }
interface Dart { x0: number; y0: number; x1: number; y1: number; age: number }
interface Ring { x: number; y: number; age: number }

const DART_SECONDS = 0.1;
const RING_SECONDS = 0.12;

export class Effects {
  private particles: Particle[] = [];
  private texts: FloatingText[] = [];
  private darts: Dart[] = [];
  private rings: Ring[] = [];
  private bannerText = "";
  private bannerLeft = 0;
  /** Seconds left of the red "a balloon got away" flash. */
  escapeFlash = 0;
  /** Seconds left of each cannon's muzzle flash. */
  private readonly muzzles: number[];

  constructor(launcherCount: number) {
    this.muzzles = new Array<number>(launcherCount).fill(0);
  }

  pop(x: number, y: number, colour: string): void {
    this.rings.push({ x, y, age: 0 });
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 30 + Math.random() * 45;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 10,
        age: 0,
        life: 0.4 + Math.random() * 0.3,
        colour: i % 4 === 0 ? C.white : colour,
      });
    }
  }

  dart(fromX: number, toX: number, toY: number): void {
    this.darts.push({ x0: fromX, y0: GROUND_Y - 8, x1: toX, y1: toY, age: 0 });
  }

  floatText(x: number, y: number, text: string, colour: string, scale = 1): void {
    this.texts.push({ x, y, text, colour, age: 0, life: 0.8, vy: -14, scale });
  }

  /** The key that didn't match anything drifts down and fades. No penalty, just feedback. */
  wrongKey(key: string): void {
    this.texts.push({ x: W / 2, y: H - 34, text: key.toUpperCase(), colour: C.silver, age: 0, life: 0.6, vy: 16, scale: 2 });
  }

  escaped(): void {
    this.escapeFlash = 0.6;
  }

  muzzle(launcher: number): void {
    this.muzzles[launcher] = 0.25;
  }

  /** 0..1 strength of a cannon's muzzle flash. */
  muzzleFlash(launcher: number): number {
    return this.muzzles[launcher] / 0.25;
  }

  banner(text: string, seconds: number): void {
    this.bannerText = text;
    this.bannerLeft = seconds;
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.age += dt;
      p.vy += 70 * dt; // a little gravity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (const t of this.texts) {
      t.age += dt;
      t.y += t.vy * dt;
    }
    for (const d of this.darts) d.age += dt;
    for (const r of this.rings) r.age += dt;
    this.particles = this.particles.filter((p) => p.age < p.life);
    this.texts = this.texts.filter((t) => t.age < t.life);
    this.darts = this.darts.filter((d) => d.age < DART_SECONDS);
    this.rings = this.rings.filter((r) => r.age < RING_SECONDS);
    this.muzzles.forEach((m, i) => (this.muzzles[i] = Math.max(0, m - dt)));
    this.bannerLeft = Math.max(0, this.bannerLeft - dt);
    this.escapeFlash = Math.max(0, this.escapeFlash - dt);
  }

  draw(p: Pixels): void {
    for (const d of this.darts) {
      const f = Math.min(1, (d.age + 1 / 60) / DART_SECONDS);
      const x = d.x0 + (d.x1 - d.x0) * f;
      const y = d.y0 + (d.y1 - d.y0) * f;
      p.line(d.x0 + (d.x1 - d.x0) * f * 0.6, d.y0 + (d.y1 - d.y0) * f * 0.6, x, y, C.white);
    }
    for (const r of this.rings) p.circb(r.x, r.y, 10 + r.age * 70, C.white);
    for (const pt of this.particles) {
      const fading = pt.age > pt.life * 0.6;
      if (fading && Math.floor(pt.age * 30) % 2 === 0) continue; // flicker out
      p.rect(pt.x, pt.y, fading ? 1 : 2, fading ? 1 : 2, pt.colour);
    }
    for (const t of this.texts) {
      if (t.age > t.life * 0.7 && Math.floor(t.age * 20) % 2 === 0) continue;
      p.centred(t.text, t.x, t.y, t.colour, C.black, t.scale);
    }
    if (this.bannerLeft > 0 && (this.bannerLeft > 0.5 || Math.floor(this.bannerLeft * 10) % 2 === 0)) {
      p.centred(this.bannerText, W / 2, 46, C.yellow, C.black, 2);
    }
    if (this.escapeFlash > 0 && Math.floor(this.escapeFlash * 10) % 2 === 0) p.rect(0, 0, W, 2, C.red);
  }
}

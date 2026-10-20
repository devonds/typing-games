// Kitchen sounds made on the fly with the Web Audio API: a knife swish, a juicy squish, a thud, the freezer's chime.
// No sound files.
import { Synth } from "../shared/synth";

export class Sfx extends Synth {
  /** A soft "whoomp" as fruit is tossed up from a crate. */
  toss(): void {
    this.noise(0.14, 0.08, 350);
    this.tone(110, 70, 0.14, "triangle", 0.12);
  }

  /** Knife swish, then the squish. Combos pitch the squish up a little each time. */
  slice(combo = 1): void {
    this.noise(0.09, 0.22, 3500, "highpass");
    this.noise(0.14, 0.2, 900, "lowpass", 0.02);
    const lift = Math.min(combo - 1, 6) * 60;
    this.tone(520 + lift, 900 + lift, 0.06, "sine", 0.08, 0.02);
  }

  /** Squelch and a buzz: you sliced the rotten one. */
  yuck(): void {
    this.noise(0.25, 0.25, 500);
    this.tone(160, 70, 0.35, "sawtooth", 0.06);
    this.tone(330, 300, 0.4, "square", 0.025, 0.05);
  }

  /** Fruit landing on the floor. */
  thud(): void {
    this.tone(140, 55, 0.22, "sine", 0.3);
    this.noise(0.12, 0.15, 250);
  }

  /** Soft and low: a nudge, not a punishment. */
  wrong(): void {
    this.tone(150, 130, 0.1, "triangle", 0.15);
  }

  combo(chain: number): void {
    const notes = [523, 659, 784, 1047, 1319].slice(0, Math.min(chain, 5));
    notes.forEach((f, i) => this.tone(f, f, 0.08, "triangle", 0.12, i * 0.06));
  }

  /** Ice cracking, then a cold, sparkly chime sliding down: everything slows. */
  freeze(): void {
    this.noise(0.12, 0.25, 5000, "highpass");
    [1568, 1319, 1047, 880, 784].forEach((f, i) => this.tone(f, f * 0.97, 0.22, "sine", 0.09, 0.05 + i * 0.09));
    this.tone(400, 200, 0.6, "triangle", 0.06, 0.05);
  }

  /** A little rising chime as things speed back up. */
  thaw(): void {
    [784, 1047, 1319].forEach((f, i) => this.tone(f, f, 0.08, "sine", 0.07, i * 0.06));
  }

  faster(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.07, "triangle", 0.1, i * 0.07));
  }

  gameOver(): void {
    [523, 440, 349, 262].forEach((f, i) => this.tone(f, f * 0.98, 0.18, "triangle", 0.2, i * 0.18));
  }

  click(): void {
    this.tone(1200, 1100, 0.03, "sine", 0.08);
  }
}

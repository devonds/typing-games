// Chiptune sound effects made on the fly with the Web Audio API. No sound files.
import { Synth } from "../shared/synth";

export class Sfx extends Synth {
  pop(): void {
    this.tone(700, 1400, 0.07, "square", 0.12);
    this.noise(0.06, 0.18, 4000);
  }

  launch(): void {
    this.noise(0.18, 0.12, 500);
    this.tone(120, 50, 0.16, "triangle", 0.2);
  }

  /** Soft and low: a nudge, not a punishment. */
  wrong(): void {
    this.tone(150, 130, 0.1, "triangle", 0.15);
  }

  escape(): void {
    this.tone(520, 130, 0.4, "square", 0.05);
  }

  faster(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.07, "square", 0.07, i * 0.07));
  }

  gameOver(): void {
    [523, 440, 349, 262].forEach((f, i) => this.tone(f, f * 0.98, 0.18, "triangle", 0.2, i * 0.18));
  }

  click(): void {
    this.tone(880, 880, 0.03, "square", 0.05);
  }
}

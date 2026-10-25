// Gentle sounds made on the fly with the Web Audio API. Each typed letter plays the next note of a wandering
// pentatonic tune, so typing steadily makes a little melody; each kind of burst has its own voice. No sound files.
import { Synth } from "../shared/synth";
import type { BurstKind } from "./config";

// G A C D E over two octaves: any walk through these sounds pleasant.
const SCALE = [392, 440, 523, 587, 659, 784, 880, 1047, 1175, 1319];
const START = 4;

export class Sfx extends Synth {
  private step = START;

  /** The next note of the tune: mostly small steps up or down, never leaving the scale. */
  private nextNote(): number {
    const moves = [-2, -1, -1, 1, 1, 1, 2];
    const move = moves[Math.floor(Math.random() * moves.length)];
    this.step += this.step + move < 0 || this.step + move >= SCALE.length ? -move : move;
    return SCALE[this.step];
  }

  /** Each sentence starts its tune from the same place. */
  newTune(): void {
    this.step = START;
  }

  /** A typed letter. `later` is when the burst's second moment comes (a bubble pops, a firework bursts). */
  letter(kind: BurstKind, later: number): void {
    const f = this.nextNote();
    switch (kind) {
      case "flowers":
        // A soft bell.
        this.tone(f, f, 0.9, "sine", 0.1);
        this.tone(f * 2, f * 2, 0.4, "sine", 0.025);
        this.tone(f * 3, f * 3, 0.2, "triangle", 0.01);
        break;
      case "butterflies":
        // Airy and light, with a little lift.
        this.tone(f, f * 1.03, 0.45, "sine", 0.08);
        this.tone(f * 2, f * 2.04, 0.2, "triangle", 0.02, 0.04);
        break;
      case "bubbles":
        // A rounded blip now, a tiny pop later.
        this.tone(f * 0.5, f, 0.16, "sine", 0.09);
        this.tone(1700, 650, 0.05, "sine", 0.07, later);
        this.noise(0.03, 0.03, 3500, "bandpass", later);
        break;
      case "confetti":
        // A pluck, and the rustle of paper.
        this.tone(f, f, 0.35, "triangle", 0.08);
        this.noise(0.16, 0.025, 5000, "highpass", 0.01);
        break;
      case "fireworks":
        // A quiet whistle up, then a soft, distant bloom of sound.
        this.tone(f * 0.5, f * 1.4, later, "sine", 0.02);
        this.noise(0.5, 0.07, 380, "lowpass", later);
        this.tone(f, f, 0.6, "sine", 0.07, later);
        this.noise(0.3, 0.015, 7000, "highpass", later + 0.12);
        break;
    }
  }

  space(): void {
    this.noise(0.05, 0.02, 1400);
  }

  /** Soft and low: a nudge, never a buzzer. */
  wrong(): void {
    this.tone(196, 180, 0.16, "triangle", 0.08);
  }

  /** A sentence finished: a warm, rising chord. */
  sentenceDone(): void {
    [523, 659, 784, 1047].forEach((f, i) => {
      this.tone(f, f, 1.1, "sine", 0.07, 0.05 + i * 0.08);
      this.tone(f * 2, f * 2, 0.4, "triangle", 0.012, 0.05 + i * 0.08);
    });
  }

  /** A pointer finger settles on its bump: a quiet, low touch. */
  fingerDown(): void {
    this.tone(392, 392, 0.25, "sine", 0.05);
  }

  /** Both fingers are on the bumps: a soft two-note chime, and off we go. */
  fingersReady(): void {
    [784, 1175].forEach((f, i) => {
      this.tone(f, f, 1.2, "sine", 0.07, i * 0.11);
      this.tone(f * 2, f * 2, 0.5, "sine", 0.012, i * 0.11);
    });
  }

  /** New keys unlocked: a slow, rising sparkle of bells. */
  newKeys(): void {
    [784, 988, 1175, 1568].forEach((f, i) => {
      this.tone(f, f, 1.4, "sine", 0.06, i * 0.16);
      this.tone(f * 2, f * 2, 0.6, "sine", 0.012, i * 0.16 + 0.02);
    });
  }

  /** The round is over: a short tune. */
  roundDone(): void {
    [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.5, "sine", 0.08, i * 0.14));
  }

  click(): void {
    this.tone(1320, 1250, 0.04, "sine", 0.05);
  }
}

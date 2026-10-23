// PROTOTYPE (throwaway): soft sounds for the sentence prototypes. Letters play a rising tune as you type.
import { Synth } from "../../src/shared/synth";

// C major pentatonic over two octaves: any run of these sounds pleasant.
const NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];

export class Sounds extends Synth {
  note(i: number): number {
    return NOTES[i % NOTES.length];
  }

  /** A soft bell: used for flowers and plain letters. */
  bell(i: number, volume = 0.12): void {
    const f = this.note(i);
    this.tone(f, f, 0.6, "sine", volume);
    this.tone(f * 2, f * 2, 0.25, "triangle", volume * 0.25);
  }

  confetti(i: number): void {
    this.bell(i, 0.08);
    this.noise(0.18, 0.06, 4000, "highpass");
  }

  /** Blowing the bubble now; the pop when it bursts. */
  bubble(i: number, popDelay: number): void {
    const f = this.note(i);
    this.tone(f * 0.5, f, 0.2, "sine", 0.1);
    this.tone(1400, 500, 0.06, "sine", 0.18, popDelay);
    this.noise(0.04, 0.05, 3000, "bandpass", popDelay);
  }

  butterfly(i: number): void {
    const f = this.note(i);
    this.tone(f, f * 1.5, 0.3, "sine", 0.09);
    this.tone(f * 1.5, f * 2, 0.25, "sine", 0.05, 0.08);
  }

  /** A little whistle up, then a sparkly crackle when it bursts. */
  firework(i: number, burstDelay: number): void {
    const f = this.note(i);
    this.tone(f * 0.6, f * 1.6, burstDelay, "sine", 0.04);
    this.tone(f * 2, f * 2, 0.4, "triangle", 0.07, burstDelay);
    this.noise(0.35, 0.05, 6000, "highpass", burstDelay);
  }

  /** Wrong key: a gentle "boop", never a buzzer. */
  boop(): void {
    this.tone(260, 200, 0.14, "triangle", 0.1);
  }

  /** Something appears in the picture. */
  boing(): void {
    this.tone(300, 700, 0.18, "sine", 0.14);
    this.tone(700, 600, 0.15, "sine", 0.06, 0.12);
  }

  /** Sentence finished: a little arpeggio. */
  hooray(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.5, "triangle", 0.1, i * 0.09));
  }

  hop(): void {
    this.tone(350, 800, 0.15, "sine", 0.1);
  }

  splash(): void {
    this.noise(0.4, 0.15, 900, "lowpass");
    this.tone(200, 90, 0.25, "sine", 0.1);
  }

  buzz(seconds: number): void {
    this.tone(220, 240, seconds, "sawtooth", 0.015);
  }

  quack(): void {
    this.tone(500, 350, 0.12, "square", 0.04);
    this.tone(500, 350, 0.12, "square", 0.04, 0.18);
  }

  ribbit(): void {
    this.tone(180, 300, 0.1, "square", 0.04);
    this.tone(180, 320, 0.12, "square", 0.04, 0.14);
  }

  snore(): void {
    this.tone(160, 120, 0.6, "sine", 0.06);
  }
}

// Chiptune sound effects made on the fly with the Web Audio API. No sound files.

export class Sfx {
  enabled = true;
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  /** Call from a key press or click: browsers keep audio locked until the player does something. */
  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.5;
      this.out.connect(this.ctx.destination);
      this.noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

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

  private ready(): AudioContext | null {
    return this.enabled && this.ctx && this.ctx.state === "running" ? this.ctx : null;
  }

  private tone(from: number, to: number, seconds: number, type: OscillatorType, volume: number, delay = 0): void {
    const ctx = this.ready();
    if (!ctx || !this.out) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + seconds);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain).connect(this.out);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  private noise(seconds: number, volume: number, cutoff: number): void {
    const ctx = this.ready();
    if (!ctx || !this.out || !this.noiseBuffer) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    src.connect(filter).connect(gain).connect(this.out);
    src.start(t);
    src.stop(t + seconds + 0.02);
  }
}

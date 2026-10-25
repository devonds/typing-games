// Tiny Web Audio synth for game sound effects: sweeping tones and filtered noise. No sound files.

export class Synth {
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

  private context(): AudioContext | null {
    return this.enabled && this.ctx && this.ctx.state === "running" ? this.ctx : null;
  }

  /** A note sliding from one pitch to another while it fades out. */
  protected tone(from: number, to: number, seconds: number, type: OscillatorType, volume: number, delay = 0): void {
    const ctx = this.context();
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

  /** A burst of hiss through a filter: low cutoffs thud, high ones swish. */
  protected noise(seconds: number, volume: number, cutoff: number, filterType: BiquadFilterType = "lowpass", delay = 0): void {
    const ctx = this.context();
    if (!ctx || !this.out || !this.noiseBuffer) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    src.connect(filter).connect(gain).connect(this.out);
    src.start(t);
    src.stop(t + seconds + 0.02);
  }
}

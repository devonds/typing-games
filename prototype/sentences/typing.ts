// PROTOTYPE (throwaway): one sentence to type. Lays the letters out, tracks the next one, and draws them.

export const FONT_FAMILY = `ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;

export interface Glyph {
  ch: string;
  /** Left edge and baseline. */
  x: number;
  y: number;
  w: number;
  /** Middle of the letter, for effects. */
  cx: number;
  cy: number;
  typed: boolean;
  /** Punctuation is filled in for you. */
  skip: boolean;
  /** Which word it belongs to (-1 for spaces). */
  word: number;
  colour: string;
}

export type PressResult =
  | { kind: "hit"; glyph: Glyph; index: number; wordDone: string | null }
  | { kind: "miss" }
  | { kind: "ignored" };

export class Line {
  readonly glyphs: Glyph[] = [];
  readonly words: string[] = [];
  readonly font: string;
  /** Index of the next glyph to type. */
  pos = 0;
  /** Seconds left of the wobble on the next letter after a wrong key. */
  private shake = 0;

  constructor(
    readonly text: string,
    ctx: CanvasRenderingContext2D,
    readonly size: number,
    centre: { x: number; y: number },
    maxWidth: number,
    palette: readonly string[],
  ) {
    this.font = `700 ${size}px ${FONT_FAMILY}`;
    ctx.save();
    ctx.font = this.font;
    // Wrap on spaces.
    const rows: string[] = [];
    let row = "";
    for (const word of text.split(" ")) {
      const tryRow = row ? `${row} ${word}` : word;
      if (row && ctx.measureText(tryRow).width > maxWidth) {
        rows.push(row);
        row = word;
      } else row = tryRow;
    }
    rows.push(row);

    const lineHeight = size * 1.45;
    let word = 0;
    let colourIndex = 0;
    rows.forEach((r, ri) => {
      const width = ctx.measureText(r).width;
      const left = centre.x - width / 2;
      const y = centre.y + (ri - (rows.length - 1) / 2) * lineHeight + size * 0.35;
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        const x = left + ctx.measureText(r.slice(0, i)).width;
        const w = ctx.measureText(ch).width;
        const isLetter = /[a-z0-9']/i.test(ch);
        this.glyphs.push({
          ch,
          x,
          y,
          w,
          cx: x + w / 2,
          cy: y - size * 0.35,
          typed: false,
          skip: !isLetter && ch !== " ",
          word: ch === " " ? -1 : word,
          colour: palette[colourIndex++ % palette.length],
        });
        if (ch === " ") word += 1;
      }
      // The line break stands in for a space between rows.
      if (ri < rows.length - 1) {
        const last = this.glyphs[this.glyphs.length - 1];
        this.glyphs.push({ ...last, ch: " ", x: last.x + last.w, w: size * 0.3, cx: last.x + last.w + size * 0.15, skip: false, word: -1 });
        word += 1;
      }
    });
    ctx.restore();
    for (const g of this.glyphs) if (g.word >= 0 && !g.skip) this.words[g.word] = (this.words[g.word] ?? "") + g.ch.toLowerCase();
    this.skipPunctuation();
  }

  get done(): boolean {
    return this.pos >= this.glyphs.length;
  }

  get next(): Glyph | undefined {
    return this.glyphs[this.pos];
  }

  /** Capitals don't need shift: kids are learning letters, not the shift key. */
  press(key: string): PressResult {
    const g = this.next;
    if (!g) return { kind: "ignored" };
    if (key.toLowerCase() !== g.ch.toLowerCase()) {
      this.shake = 0.35;
      return { kind: "miss" };
    }
    const index = this.pos;
    g.typed = true;
    this.pos += 1;
    this.skipPunctuation();
    const after = this.glyphs[this.pos];
    const wordDone = g.word >= 0 && (!after || after.word !== g.word) ? this.words[g.word] : null;
    return { kind: "hit", glyph: g, index, wordDone };
  }

  update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt);
  }

  /**
   * `typedAlpha`: how visible typed letters stay (0 = gone, they've turned into something).
   * `ink`: colour of letters still to type. `typedInk`: colour of typed letters (defaults to their own colour).
   */
  draw(ctx: CanvasRenderingContext2D, t: number, opts: { ink: string; typedAlpha: number; typedInk?: (g: Glyph) => string }): void {
    ctx.save();
    ctx.font = this.font;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    this.glyphs.forEach((g, i) => {
      if (g.ch === " ") {
        if (i === this.pos) this.drawSpaceHint(ctx, g, t);
        return;
      }
      if (g.typed) {
        if (opts.typedAlpha <= 0) return;
        ctx.globalAlpha = opts.typedAlpha;
        ctx.fillStyle = opts.typedInk ? opts.typedInk(g) : g.colour;
        ctx.fillText(g.ch, g.x, g.y);
        ctx.globalAlpha = 1;
        return;
      }
      if (i === this.pos) {
        // The next letter: in its own colour, bobbing, with a bar underneath.
        const bob = Math.sin(t * 6) * 1.5;
        const wobble = this.shake > 0 ? Math.sin(t * 70) * 3 * (this.shake / 0.35) : 0;
        ctx.fillStyle = this.shake > 0 ? "#ff8fb1" : g.colour;
        roundRect(ctx, g.x - 1, g.y + 5, g.w + 2, 4, 2);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineJoin = "round";
        ctx.strokeText(g.ch, g.x + wobble, g.y - 2 + bob);
        ctx.fillText(g.ch, g.x + wobble, g.y - 2 + bob);
        return;
      }
      ctx.fillStyle = opts.ink;
      ctx.fillText(g.ch, g.x, g.y);
    });
    ctx.restore();
  }

  private drawSpaceHint(ctx: CanvasRenderingContext2D, g: Glyph, t: number): void {
    // A little bouncing dot says "press space".
    const bob = Math.abs(Math.sin(t * 6)) * 4;
    const wobble = this.shake > 0 ? Math.sin(t * 70) * 3 * (this.shake / 0.35) : 0;
    ctx.fillStyle = this.shake > 0 ? "#ff8fb1" : "#ffd23f";
    ctx.beginPath();
    ctx.arc(g.cx + wobble, g.y - 3 - bob, 3.5, 0, Math.PI * 2);
    ctx.fill();
    roundRect(ctx, g.x + 1, g.y + 5, Math.max(6, g.w - 2), 4, 2);
    ctx.fill();
  }

  private skipPunctuation(): void {
    while (this.next?.skip) {
      this.next.typed = true;
      this.pos += 1;
    }
  }
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

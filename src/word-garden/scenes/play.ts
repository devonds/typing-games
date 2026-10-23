import type { Frame } from "../../shared/input";
import { lettersFor } from "../../shared/lessons";
import { trickyLetters, type Stats } from "../../shared/letters";
import { BURSTS, H, SENTENCE, W, type BurstKind } from "../config";
import { Round } from "../game/round";
import { SENTENCES, pickSentences } from "../game/sentences";
import { recordEvent } from "../game/stats";
import type { RoundEvent } from "../game/types";
import { Bursts } from "../look/bursts";
import { Landscape } from "../look/landscape";
import { Sky } from "../look/palette";
import { SANS, SERIF, clamp01, drawCheer, drawPanel, drawProgress, text } from "../look/ui";
import { Words } from "../look/words";
import type { App, Scene } from "./scene";

const CHEERS = ["Lovely!", "Beautiful!", "Wonderful!", "Well done!", "Splendid!", "Super!"];

/** A kind for each sentence: the chosen one, or a shuffled cycle through all five that never repeats back to back. */
function kindsFor(choice: App["settings"]["bursts"], count: number): BurstKind[] {
  if (choice !== "random") return Array(count).fill(choice);
  const kinds: BurstKind[] = [];
  while (kinds.length < count) {
    const bag = [...BURSTS].sort(() => Math.random() - 0.5);
    if (bag[0] === kinds[kinds.length - 1]) bag.push(bag.shift()!);
    kinds.push(...bag);
  }
  return kinds.slice(0, count);
}

export class PlayScene implements Scene {
  private readonly round: Round;
  private readonly kinds: BurstKind[];
  private readonly sky: Sky;
  private readonly landscape = new Landscape();
  private readonly bursts = new Bursts();
  private words: Words;
  /** Letters typed in this sentence, for flower stems and the tune. */
  private order = 0;
  /** This round's per-letter stats. */
  private readonly stats: Stats = {};
  private t = 0;
  private sentenceAt = 0;
  private doneAt: number | null = null;
  private cheer = { word: "", at: -10 };
  private perfect = 0;
  private endAt: number | null = null;
  private paused = false;
  /** The "how to play" line shows until the first space. */
  private showHelp = true;

  constructor(private readonly app: App) {
    const { lesson, level, length, bursts } = app.settings;
    const focus = lesson === "all" ? null : lettersFor(lesson, app.stats);
    const sentences = pickSentences(SENTENCES[level], length, focus, app.recent);
    app.recent = sentences;
    this.round = new Round(sentences);
    this.kinds = kindsFor(bursts, sentences.length);
    this.sky = new Sky(this.kinds[0]);
    this.words = new Words(this.round.text);
    // Let the grass and motes settle into motion before the first frame.
    for (let i = 0; i < 60; i++) this.landscape.update(1 / 60);
    app.sfx.newTune();
  }

  private get kind(): BurstKind {
    return this.kinds[this.round.sentence];
  }

  pause(): void {
    if (this.endAt === null) this.paused = true;
  }

  update(dt: number, input: Frame): void {
    for (const key of input.keys) {
      if (this.paused) {
        if (key === "Enter" || key === " ") this.paused = false;
        else if (key === "Escape") return this.quit();
      } else if (key === "Escape") {
        this.pause();
      } else if (key === " " || /^[a-z]$/.test(key)) {
        this.handle(this.round.press(key));
      }
    }
    if (this.paused) {
      if (input.clicks.length > 0) this.paused = false;
      return;
    }

    this.t += dt;
    this.round.step(dt);
    this.sky.update(dt);
    this.landscape.update(dt);
    this.bursts.update(dt, this.landscape.t);
    this.words.update(dt, this.round.pos);

    // After a pause to enjoy the bursts, on to the next sentence.
    const linger = this.kind === "flowers" ? SENTENCE.celebrateFlowers : SENTENCE.celebrate;
    if (this.doneAt !== null && this.t - this.doneAt > linger) {
      this.doneAt = null;
      this.bursts.release();
      this.handle(this.round.advance());
    }
    if (this.endAt !== null && this.t > this.endAt) this.finish();
  }

  private handle(events: RoundEvent[]): void {
    const { sfx } = this.app;
    for (const e of events) {
      recordEvent(this.stats, e);
      switch (e.type) {
        case "letter": {
          const g = this.words.glyphs[e.index];
          const later = this.bursts.spawn(this.kind, g, this.words.font, this.order++);
          this.words.typed(e.index);
          sfx.letter(this.kind, later);
          break;
        }
        case "space":
          this.showHelp = false;
          sfx.space();
          break;
        case "wrongKey":
          this.words.wrong();
          sfx.wrong();
          break;
        case "sentenceDone":
          this.doneAt = this.t;
          if (e.mistakes === 0) this.perfect += 1;
          this.cheer = { word: e.mistakes === 0 ? "Perfect!" : CHEERS[Math.floor(Math.random() * CHEERS.length)], at: this.t + 0.35 };
          sfx.sentenceDone();
          break;
        case "nextSentence":
          this.words = new Words(this.round.text);
          this.sentenceAt = this.t;
          this.order = 0;
          this.sky.go(this.kind);
          sfx.newTune();
          break;
        case "roundDone":
          this.endAt = this.t + 0.8;
          sfx.roundDone();
          break;
      }
    }
  }

  private finish(): void {
    const r = this.round;
    this.app.finishRound(this.stats);
    const wpm = Math.round(r.wpm);
    const best = this.app.submitWpm(wpm);
    this.app.showResults({
      sentences: r.sentences.length,
      seconds: r.typingTime,
      wpm,
      accuracy: r.accuracy,
      perfect: this.perfect,
      best: Math.max(best, wpm),
      newBest: wpm > best && wpm > 0,
      tricky: trickyLetters(this.stats),
      lastKind: this.kinds[this.kinds.length - 1],
    });
  }

  /** Leaving mid-round still counts the letters typed so far towards "weak letters". */
  private quit(): void {
    this.app.finishRound(this.stats);
    this.app.showMenu();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const p = this.sky.current;
    this.landscape.draw(ctx, p);

    // The sentence fades in when it arrives, and out once the round is over.
    const fadeIn = clamp01((this.t - this.sentenceAt) / 0.5);
    const fadeOut = this.endAt !== null ? clamp01((this.endAt - this.t) / 0.6) : 1;
    const pos = this.round.waiting || this.round.over ? this.words.glyphs.length : this.round.pos;
    this.words.draw(ctx, this.sky.target, pos, this.kind === "flowers", fadeIn * fadeOut);
    this.bursts.draw(ctx, p);

    drawCheer(ctx, p, this.cheer.word, this.t - this.cheer.at, 64);
    drawProgress(ctx, p, this.round.sentences.length, this.round.sentence, this.round.waiting || this.round.over);
    if (this.showHelp) {
      const a = clamp01((this.t - 0.6) / 0.6);
      ctx.save();
      ctx.globalAlpha = a;
      text(ctx, "Type each letter. Press the space bar between words.", W / 2, SENTENCE.y + 32, `600 9px ${SANS}`, this.sky.target.ink, "center", this.sky.target.textGlow);
      ctx.restore();
    }
    this.landscape.drawAtmosphere(ctx, p);

    if (this.paused) {
      ctx.fillStyle = "rgba(20,15,35,0.35)";
      ctx.fillRect(0, 0, W, H);
      drawPanel(ctx, p, 160, 92, 160, 86);
      text(ctx, "Paused", W / 2, 116, `italic 600 22px ${SERIF}`, p.ink);
      text(ctx, "Enter: keep typing", W / 2, 143, `600 9px ${SANS}`, p.ink);
      text(ctx, "Esc: menu", W / 2, 159, `500 9px ${SANS}`, p.inkSoft);
    }
  }
}

import { Guide } from "../../shared/guide";
import { RoundLog } from "../../shared/history";
import type { Frame } from "../../shared/input";
import { Ritual, type RitualView } from "../../shared/ritual";
import { BURSTS, CHECK, H, KEYBOARD, RITUAL, SENTENCE, W, type BurstKind } from "../config";
import { Round } from "../game/round";
import { TYPED_MARKS } from "../game/round";
import { advanceMarks, capitalsReady, lettersDone } from "../game/stages";
import { logEvent } from "../game/stats";
import type { RoundEvent } from "../game/types";
import { Bursts } from "../look/bursts";
import { drawKeyboard, type KeyboardExtras } from "../look/keyboard";
import { FLASH_SECONDS } from "../../shared/guide";
import { shiftFor } from "../../shared/keyboard";
import { finishPractice } from "../../shared/session";
import { saveMarks } from "../storage";
import { setUpRound, type RoundSetup } from "./setup";
import { Landscape } from "../look/landscape";
import { Sky } from "../look/palette";
import { drawRitual } from "../look/ritual";
import { SANS, SERIF, clamp01, drawCheer, drawClock, drawPanel, drawProgress, text } from "../look/ui";
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
  /** What happened this round, for the player's history. */
  private readonly log = new RoundLog();
  /** The keys this round practises. */
  private readonly keys: string[];
  private readonly littleHands: boolean;
  /** How visible the keyboard is, easing as the guide shows or hides it. */
  private shown = 0;
  private t = 0;
  private sentenceAt = 0;
  private doneAt: number | null = null;
  private cheer = { word: "", at: -10 };
  private perfect = 0;
  private endAt: number | null = null;
  private paused = false;
  /** The "how to play" line shows until the first space. */
  private showHelp = true;
  private readonly guide: Guide;
  /** "Fingers on the bumps" before the first sentence; null once the round is under way. */
  private ritual: Ritual | null;
  private ritualView: RitualView = { f: false, j: false, ready: 0, done: false };
  /** How lit F and J are, easing towards held. */
  private readonly glow = { f: 0, j: 0 };
  /** When both fingers were in place, for the fade from the ritual to the first sentence. */
  private readyAt: number | null = null;
  /** When the first sentence arrived. */
  private playAt = 0;
  /** Today's practice, the one-minute check, capitals and punctuation: see setup.ts. */
  private readonly setup: RoundSetup;
  /** Capitals typed this round: 1 if right first time. */
  private readonly capitals: (0 | 1)[] = [];
  /** After a capital typed without Shift: which Shift key to flash, and for how long. */
  private shiftFlash = { key: null as string | null, left: 0 };

  constructor(private readonly app: App) {
    const { player } = app;
    this.littleHands = player.littleHands;
    this.setup = setUpRound(app);
    const { sentences } = this.setup;
    this.keys = this.setup.keys;
    // The check runs through the whole bank: only the start of it counts as recent.
    app.recent = sentences.slice(0, 10);
    this.round = new Round(sentences, this.setup.rules);
    const { bursts } = app.settings;
    this.kinds = kindsFor(bursts, sentences.length);
    this.sky = new Sky(this.kinds[0]);
    this.words = new Words(this.round.text, this.littleHands);
    // Little hands always get the full finger guide.
    this.guide = new Guide(this.littleHands ? "always" : app.settings.guide, player.history, this.littleHands, this.keys);
    this.ritual = new Ritual(this.littleHands);
    // Let the grass and motes settle into motion before the first frame.
    for (let i = 0; i < 60; i++) this.landscape.update(1 / 60);
    app.sfx.newTune();
  }

  private get kind(): BurstKind {
    return this.kinds[this.round.sentence];
  }

  /** The ritual just waits, so there's nothing to pause until the round starts. */
  pause(): void {
    if (this.endAt === null && !this.ritual) this.paused = true;
  }

  update(dt: number, input: Frame): void {
    if (this.ritual) return this.updateRitual(dt, input, this.ritual);
    for (const [i, key] of input.keys.entries()) {
      if (this.paused) {
        if (key === "Enter" || key === " ") this.paused = false;
        else if (key === "Escape") return this.quit();
      } else if (key === "Escape") {
        this.pause();
      } else if (key === " " || /^[a-z]$/.test(key) || (this.round.rules.punctuation && TYPED_MARKS.includes(key))) {
        // Punctuation keys only count once punctuation is asked for: before that it's filled in, so ignore them.
        this.handle(this.round.press(key, input.caps[i] ?? false));
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
    this.guide.setTarget(this.round.next);
    this.guide.update(dt);
    this.shiftFlash.left = Math.max(0, this.shiftFlash.left - dt);
    const view = this.guide.view();
    // Shift and punctuation are new skills even when every letter is known, so they bring the keyboard back.
    const extra = this.extras();
    const needed = view.visible || extra.shift !== null || extra.shiftFlash > 0 || (view.target !== null && TYPED_MARKS.includes(view.target));
    this.shown += ((needed && this.guide.mode !== "off" ? 1 : 0) - this.shown) * (1 - Math.exp(-dt * 8));

    // The one-minute check stops at a minute of typing, mid-sentence if need be.
    if (this.setup.check && this.endAt === null && this.round.typingTime >= CHECK.seconds) this.handle(this.round.end());

    // After a pause to enjoy the bursts, on to the next sentence.
    const linger = this.setup.check ? CHECK.celebrate : this.kind === "flowers" ? SENTENCE.celebrateFlowers : SENTENCE.celebrate;
    if (this.doneAt !== null && this.t - this.doneAt > linger) {
      this.doneAt = null;
      this.bursts.release();
      this.handle(this.round.advance());
    }
    if (this.endAt !== null && this.t > this.endAt) this.finish();
  }

  /** Wait for both pointer fingers on the bumps. Keys pressed now never reach the round, and its clock stays still. */
  private updateRitual(dt: number, input: Frame, ritual: Ritual): void {
    if (input.keys.includes("Escape")) return this.app.showMenu();
    this.t += dt;
    this.sky.update(dt);
    this.landscape.update(dt);
    if (this.readyAt === null) {
      const before = this.ritualView;
      this.ritualView = ritual.update(dt, input);
      if ((this.ritualView.f && !before.f) || (this.ritualView.j && !before.j)) this.app.sfx.fingerDown();
      if (this.ritualView.done) {
        this.readyAt = this.t;
        this.app.sfx.fingersReady();
      }
    }
    const k = 1 - Math.exp(-dt * 14);
    const done = this.readyAt !== null;
    this.glow.f += ((this.ritualView.f || done ? 1 : 0) - this.glow.f) * k;
    this.glow.j += ((this.ritualView.j || done ? 1 : 0) - this.glow.j) * k;
    if (this.readyAt !== null && this.t - this.readyAt >= RITUAL.outro) {
      this.ritual = null;
      this.sentenceAt = this.playAt = this.t;
    }
  }

  private handle(events: RoundEvent[]): void {
    const { sfx } = this.app;
    for (const e of events) {
      logEvent(this.log, e, this.round.text);
      switch (e.type) {
        case "letter":
        case "mark": {
          if (e.type === "letter" && e.capital) this.capitals.push(e.fumbled ? 0 : 1);
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
          this.guide.slip(e.expected);
          if (e.wrongCase || this.round.needsShift) {
            const shift = shiftFor(this.round.next ?? e.expected);
            if (shift) this.shiftFlash = { key: shift.key, left: FLASH_SECONDS };
          }
          sfx.wrong();
          break;
        case "sentenceDone":
          this.doneAt = this.t;
          if (e.mistakes === 0) this.perfect += 1;
          this.cheer = { word: e.mistakes === 0 ? "Perfect!" : CHEERS[Math.floor(Math.random() * CHEERS.length)], at: this.t + 0.35 };
          sfx.sentenceDone();
          break;
        case "nextSentence":
          this.words = new Words(this.round.text, this.littleHands);
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

  /** Capitals and punctuation: which keys to draw, and whether to light a Shift key. */
  private extras(): KeyboardExtras {
    const { rules } = this.round;
    const next = this.round.next;
    // Shift is lit while capitals are still new (or with the guide always on); "?" always shows its Shift.
    const help = this.guide.mode === "always" || !capitalsReady(this.setup.marks.recent) || next === "?";
    const shift = next && this.round.needsShift && help && this.guide.mode !== "off" ? (shiftFor(next)?.key ?? null) : null;
    return { capitals: rules.capitals, punctuation: rules.punctuation, shift, shiftFlash: this.shiftFlash.left / FLASH_SECONDS, shiftFlashKey: this.shiftFlash.key };
  }

  /** Round over: fold it into the history, move along the path, and on to the results. */
  private finish(): void {
    const r = this.round;
    const { player } = this.app;
    // The previous check, read before this one is recorded.
    const previous = Object.entries(player.days()).sort((a, b) => +a[0] - +b[0]).flatMap(([, d]) => d.checks).at(-1) ?? null;
    const { unlocked } = this.app.finishRound(this.log, r.typingTime);
    const marks = advanceMarks(this.setup.marks, this.capitals, lettersDone(player.path, player.history, player.speedMatters), this.littleHands);
    saveMarks(player, marks.record);
    const wpm = Math.round(r.wpm);
    if (this.setup.check) player.recordCheck(wpm);
    // Little hands don't race the clock, so there's no words-per-minute best to keep; a check isn't a round's best.
    const best = this.littleHands || this.setup.check ? 0 : this.app.submitWpm(wpm);
    const sessionDone = this.setup.practice;
    if (sessionDone) finishPractice(player.profile.id, player.today);
    this.app.showResults({
      // A check can end mid-sentence: count the whole ones.
      sentences: this.setup.check ? r.sentence : r.sentences.length,
      seconds: r.typingTime,
      wpm,
      accuracy: r.accuracy,
      perfect: this.perfect,
      best: Math.max(best, wpm),
      newBest: wpm > best && wpm > 0,
      tricky: this.log.tricky(),
      keys: this.keys,
      unlocked,
      marks: marks.unlocked,
      check: this.setup.check ? { previous } : null,
      sessionDone,
      lastKind: this.kinds[this.kinds.length - 1],
    });
  }

  /** Leaving mid-round still counts the letters typed so far. */
  private quit(): void {
    this.app.finishRound(this.log, this.round.typingTime);
    this.app.showMenu();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const p = this.sky.current;
    this.landscape.draw(ctx, p);

    if (this.ritual) {
      const outro = this.readyAt === null ? 0 : (this.t - this.readyAt) / RITUAL.outro;
      if (!this.setup.check) drawProgress(ctx, p, this.round.sentences.length, 0, false);
      drawRitual(ctx, p, this.ritualView, this.glow, this.t, outro, this.littleHands);
      const intro = this.setup.check ? "One-minute check" : this.setup.practice ? "Today's practice" : null;
      if (intro) text(ctx, intro, W / 2, 34, `italic 600 10px ${SERIF}`, p.inkSoft, "center", p.textGlow);
      this.landscape.drawAtmosphere(ctx, p);
      return;
    }

    // The sentence fades in when it arrives, and out once the round is over.
    const fadeIn = clamp01((this.t - this.sentenceAt) / 0.5);
    const fadeOut = this.endAt !== null ? clamp01((this.endAt - this.t) / 0.6) : 1;
    const pos = this.round.waiting || this.round.over ? this.words.glyphs.length : this.round.pos;
    // The keyboard sits on the meadow, behind the bursts, so falling confetti and petals drift over it.
    const keyboardIn = clamp01((this.t - this.playAt) / KEYBOARD.fadeIn);
    // A slip flashes a hidden keyboard back, so it eases in and out rather than popping.
    drawKeyboard(ctx, p, { ...this.guide.view(), visible: this.shown > 0.01 }, this.t, keyboardIn * fadeOut * this.shown, this.extras());
    this.words.draw(ctx, this.sky.target, pos, this.kind === "flowers", fadeIn * fadeOut);
    this.bursts.draw(ctx, p);

    drawCheer(ctx, p, this.cheer.word, this.t - this.cheer.at, 64);
    if (this.setup.check) drawClock(ctx, p, this.round.typingTime / CHECK.seconds, fadeOut);
    else drawProgress(ctx, p, this.round.sentences.length, this.round.sentence, this.round.waiting || this.round.over);
    if (this.showHelp) {
      const a = clamp01((this.t - this.playAt - 0.6) / 0.6);
      ctx.save();
      ctx.globalAlpha = a;
      const help = this.round.rules.capitals ? "Hold Shift with your other hand for a capital." : "Type each letter. Press the space bar between words.";
      text(ctx, help, W / 2, SENTENCE.y + 10 + this.words.size * 0.75, `600 9px ${SANS}`, this.sky.target.ink, "center", this.sky.target.textGlow);
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

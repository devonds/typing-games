// After a round: how it went on the left, and on the right the player's keys filling towards learned, with any new
// keys opening like flowers. This is the only place progress shows: never during play.
import { FINGER_COLOURS, FINGER_NAMES } from "../../shared/keyboard";
import { weakestFinger } from "../../shared/hands";
import type { Finger } from "../../shared/keyboard";
import type { Frame } from "../../shared/input";
import { masteryProgress } from "../../shared/path";
import { GAME_NAMES, gameUrl } from "../../shared/session";
import { H, STARS, W } from "../config";
import { Bursts } from "../look/bursts";
import { Landscape } from "../look/landscape";
import type { Glyph } from "../look/words";
import { Sky, fade } from "../look/palette";
import { drawKeyProgress, drawStar, type KeyProgress } from "../look/progress";
import { SANS, SERIF, drawPanel, text } from "../look/ui";
import type { App, RoundResult, Scene } from "./scene";

const LEFT = { x: 36, y: 52, w: 188, h: 152 };
const RIGHT = { x: 236, y: 52, w: 208, h: 152 };
const BUTTONS_Y = 232;
/** When the new-keys chime plays, as the keys open. */
const BLOOM_AT = 0.9;
/** Today's practice done: flowers come up across the meadow, one after another. */
const MEADOW = { flowers: 13, left: 118, right: 362, every: 0.12, from: 0.5, size: 24 };

/** What capitals and punctuation say when they unlock. */
const MARKS_NEWS = {
  capitals: ["New: capitals!", "Hold Shift with your other hand"],
  punctuation: ["New: punctuation!", "Type . , ? and ' too"],
} as const;

function clock(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** ["g", "h", "x"] -> "G, H and X" */
function listKeys(keys: readonly string[]): string {
  const up = keys.map((k) => k.toUpperCase());
  return up.length < 2 ? up.join("") : `${up.slice(0, -1).join(", ")} and ${up[up.length - 1]}`;
}

export class ResultsScene implements Scene {
  private t = 0;
  private readonly landscape = new Landscape();
  private readonly sky: Sky;
  private readonly keys: KeyProgress;
  private readonly finger: Finger | null;
  private readonly littleHands: boolean;
  private chimed = false;
  /** Flowers for finishing today's practice. */
  private readonly meadow = new Bursts();
  private planted = 0;

  constructor(
    private readonly app: App,
    private readonly result: RoundResult,
  ) {
    this.sky = new Sky(result.lastKind);
    for (let i = 0; i < 60; i++) this.landscape.update(1 / 60);
    const { player } = app;
    this.littleHands = player.littleHands;
    const progress = new Map(result.keys.map((k) => [k, masteryProgress(player.history.letters[k], player.speedMatters)]));
    this.keys = { progress, fresh: new Set(result.unlocked) };
    this.finger = weakestFinger(player.history, player.speedMatters);
  }

  update(dt: number, input: Frame): void {
    this.t += dt;
    this.landscape.update(dt);
    const news = this.result.unlocked.length > 0 || this.result.marks !== null || this.result.sessionDone;
    if (!this.chimed && news && this.t > BLOOM_AT) {
      this.chimed = true;
      this.app.sfx.newKeys();
    }
    this.plant();
    this.meadow.update(dt, this.landscape.t);
    if (this.t < 0.6) return; // don't let a last keypress skip the results
    for (const key of input.keys) {
      if (key === "Enter" || key === " ") return this.goOn();
      if (key === "Escape") return this.app.showMenu();
    }
    for (const { x, y } of input.clicks) {
      if (y >= BUTTONS_Y - 12) return x < W / 2 ? this.goOn() : this.app.showMenu();
    }
  }

  /** Enter: on to the next game of today's practice, otherwise another round. */
  private goOn(): void {
    const next = this.result.nextGame;
    if (next) location.href = gameUrl(next);
    else this.app.startGame();
  }

  /** Today's practice is done: a row of flowers comes up along the meadow, each with a soft note. */
  private plant(): void {
    if (!this.result.sessionDone) return;
    while (this.planted < MEADOW.flowers && this.t > MEADOW.from + this.planted * MEADOW.every) {
      const i = this.planted++;
      // A little scatter, so it looks planted by hand.
      const x = MEADOW.left + ((MEADOW.right - MEADOW.left) * (i + 0.5)) / MEADOW.flowers + Math.sin(i * 7.3) * 4;
      const size = MEADOW.size * (0.8 + 0.25 * Math.abs(Math.sin(i * 3.1)));
      const g: Glyph = { ch: "*", index: i, x, y: H - 6, w: 8, cx: x, cy: H - 4, size };
      this.meadow.spawn("flowers", g, "", i);
      this.app.sfx.letter("flowers", 0);
    }
  }

  /** The one-minute check: words per minute, big, with accuracy and how it compares with last time. */
  private drawCheck(ctx: CanvasRenderingContext2D, previous: number | null): void {
    const p = this.sky.current;
    const r = this.result;
    const { x, y, w } = LEFT;
    const cx = x + w / 2;
    text(ctx, "One-minute check", cx, y + 18, `italic 600 13px ${SERIF}`, p.ink);
    text(ctx, String(r.wpm), cx, y + 56, `italic 600 38px ${SERIF}`, p.ink);
    text(ctx, "words per minute", cx, y + 82, `500 9px ${SANS}`, p.inkSoft);
    const accuracy = r.accuracy === null ? "–" : `${Math.round(r.accuracy * 100)}%`;
    text(ctx, `Accuracy ${accuracy}`, cx, y + 102, `600 10px ${SANS}`, p.ink);
    const trend = previous === null ? "Your first check: well done!" : `Last time ${previous}  →  today ${r.wpm}`;
    text(ctx, trend, cx, y + 128, `italic 600 11px ${SERIF}`, previous !== null && r.wpm > previous ? p.accent : p.inkSoft);
  }

  /** How it went: numbers for most players, stars for little hands. */
  private drawRound(ctx: CanvasRenderingContext2D): void {
    const p = this.sky.current;
    const r = this.result;
    if (r.check) return this.drawCheck(ctx, r.check.previous);
    const { x, y, w } = LEFT;
    const cx = x + w / 2;
    text(ctx, "This round", cx, y + 18, `italic 600 13px ${SERIF}`, p.ink);
    const left = x + 22;
    const right = x + w - 22;
    const row = (i: number, label: string, value: string) => {
      text(ctx, label, left, y + 46 + i * 16, `500 9.5px ${SANS}`, p.inkSoft, "left");
      text(ctx, value, right, y + 46 + i * 16, `600 10px ${SANS}`, p.ink, "right");
    };

    if (this.littleHands) {
      const accuracy = r.accuracy ?? 0;
      const stars = 1 + STARS.filter((s) => accuracy >= s).length;
      for (let i = 0; i < 3; i++) drawStar(ctx, p, cx + (i - 1) * 40, y + 66 + (i === 1 ? -6 : 0), 15, i < stars, (this.t - 0.4 - i * 0.25) / 0.5);
      row(4, "Sentences", String(r.sentences));
      row(5, "Perfect ones", String(r.perfect));
      return;
    }
    row(0, "Sentences", String(r.sentences));
    row(1, "Time", clock(r.seconds));
    row(2, "Words per minute", String(r.wpm));
    row(3, "Accuracy", r.accuracy === null ? "–" : `${Math.round(r.accuracy * 100)}%`);
    if (r.newBest) {
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.t * 4);
      text(ctx, "New best!", cx, y + 46 + 4 * 16 + 2, `italic 700 12px ${SERIF}`, p.accent);
      ctx.restore();
    } else row(4, "Best", `${r.best} wpm`);
    row(5.3, "Perfect sentences", String(r.perfect));
  }

  /** The player's keys, any new ones, a finger to practise and this round's tricky letters. */
  private drawKeys(ctx: CanvasRenderingContext2D): void {
    const p = this.sky.current;
    const r = this.result;
    const { x, y, w } = RIGHT;
    const cx = x + w / 2;
    text(ctx, "Your keys", cx, y + 18, `italic 600 13px ${SERIF}`, p.ink);
    drawKeyProgress(ctx, p, cx, y + 32, 17, this.keys, this.t);
    text(ctx, "Each key fills up as you learn it", cx, y + 90, `500 7.5px ${SANS}`, p.inkSoft);

    let line = y + 108;
    if (r.unlocked.length > 0) {
      const a = Math.min(1, Math.max(0, (this.t - BLOOM_AT) / 0.5));
      ctx.save();
      ctx.globalAlpha = a * (0.8 + 0.2 * Math.sin(this.t * 3));
      text(ctx, `${r.unlocked.length > 1 ? "New keys" : "New key"}: ${listKeys(r.unlocked)}!`, cx, line, `italic 700 13px ${SERIF}`, p.accent);
      ctx.restore();
      line += 18;
    }
    if (r.marks) {
      const [news, how] = MARKS_NEWS[r.marks];
      const a = Math.min(1, Math.max(0, (this.t - BLOOM_AT) / 0.5));
      ctx.save();
      ctx.globalAlpha = a;
      text(ctx, news, cx, line, `italic 700 13px ${SERIF}`, p.accent);
      text(ctx, how, cx, line + 14, `500 8.5px ${SANS}`, p.ink);
      ctx.restore();
      line += 32;
    }
    // One piece of news at a time: the finger line waits for a quieter round.
    if (this.finger && !r.marks) {
      const name = FINGER_NAMES[this.finger];
      text(ctx, `Your ${name} needs a little practice`, cx + 4, line, `500 8.5px ${SANS}`, p.inkSoft);
      ctx.save();
      ctx.font = `500 8.5px ${SANS}`;
      const dotX = cx + 4 - ctx.measureText(`Your ${name} needs a little practice`).width / 2 - 6;
      ctx.restore();
      ctx.fillStyle = fade(FINGER_COLOURS[this.finger], 0.95);
      ctx.beginPath();
      ctx.arc(dotX, line, 2.4, 0, Math.PI * 2);
      ctx.fill();
      line += 14;
    }
    const practice = r.tricky.length > 0 ? `Letters to practise: ${r.tricky.join(" ").toUpperCase()}` : "Not a single slip!";
    text(ctx, practice, cx, line, `600 9px ${SANS}`, p.accent);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const p = this.sky.current;
    this.landscape.draw(ctx, p);
    const r = this.result;
    const title = r.sessionDone ? "Today's practice done!" : r.check ? "Well typed!" : r.perfect === r.sentences ? "Perfect garden!" : "Lovely typing!";
    text(ctx, title, W / 2, 28, `italic 600 22px ${SERIF}`, p.ink, "center", p.textGlow);
    this.meadow.draw(ctx, p);
    drawPanel(ctx, p, LEFT.x, LEFT.y, LEFT.w, LEFT.h);
    drawPanel(ctx, p, RIGHT.x, RIGHT.y, RIGHT.w, RIGHT.h);
    this.drawRound(ctx);
    this.drawKeys(ctx);

    if (r.sessionDone) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0, (this.t - 1.2) / 0.8));
      text(ctx, "See you tomorrow", W / 2, LEFT.y + LEFT.h + 12, `italic 600 12px ${SERIF}`, p.ink, "center", p.textGlow);
      ctx.restore();
    }
    if (r.nextGame) {
      text(ctx, `Today's practice  ·  Next: ${GAME_NAMES[r.nextGame]}`, W / 2, LEFT.y + LEFT.h + 12, `italic 600 12px ${SERIF}`, p.ink, "center", p.textGlow);
    }
    const enter = r.nextGame ? `Enter: ${GAME_NAMES[r.nextGame]}` : "Enter: again";
    text(ctx, enter, LEFT.x + 22, BUTTONS_Y, `italic 600 11px ${SERIF}`, p.ink, "left", p.textGlow);
    text(ctx, "Esc: menu", RIGHT.x + RIGHT.w - 22, BUTTONS_Y, `italic 11px ${SERIF}`, p.inkSoft, "right", p.textGlow);
    this.landscape.drawAtmosphere(ctx, p);
  }
}

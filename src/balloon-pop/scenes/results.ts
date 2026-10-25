// After a round, two pages: how the round went (score, or stars for little hands), then "your keys": each key in
// play filling towards mastered, any keys just unlocked, and the finger that needs practice. Progress shows here,
// between rounds, never during play.
import { weakestFinger } from "../../shared/hands";
import type { Frame } from "../../shared/input";
import { FINGER_NAMES, KEYS } from "../../shared/keyboard";
import { masteryProgress } from "../../shared/path";
import { STARS, W } from "../config";
import { C, FINGER_TINTS } from "../look/palette";
import type { Pixels } from "../look/pixels";
import type { Scenery } from "../look/scenery";
import { blink, drawPanel } from "../look/ui";
import type { App, RoundResult, Scene } from "./scene";

const PANEL = { x: 12, y: 8, w: 232, h: 126 };
const BUTTONS_Y = 122;
/** The progress keyboard: keycap size and spacing. */
const CAP = 13;
const CAP_PITCH = 15;
const BOARD_Y = 36;

function clock(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** A five-pointed pixel star, 11 pixels wide, top-left at x, y. */
const STAR = ["....#....", "...###...", "#########", ".#######.", "..#####..", "..##.##..", ".##...##."];
function drawStar(p: Pixels, x: number, y: number, lit: boolean, scale: number): void {
  STAR.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      if (line[col] === "#") p.rect(x + col * scale, y + row * scale, scale, scale, lit ? C.yellow : C.charcoal);
    }
  });
}

export class ResultsScene implements Scene {
  private t = 0;
  /** 0: the round; 1: your keys. */
  private page = 0;
  /** Each key's mastery after this round, 0..1. */
  private readonly progress = new Map<string, number>();
  private readonly weakFinger: string | null;

  constructor(
    private readonly app: App,
    private readonly result: RoundResult,
    private readonly scenery: Scenery,
  ) {
    const { player } = app;
    for (const k of [...result.keys, ...result.unlocked]) this.progress.set(k, masteryProgress(player.history.letters[k], player.speedMatters));
    const finger = weakestFinger(player.history);
    this.weakFinger = finger ? FINGER_NAMES[finger].toUpperCase() : null;
  }

  update(dt: number, input: Frame): void {
    this.t += dt;
    this.scenery.update(dt);
    if (this.t < 0.6) return; // don't let a last frantic keypress skip the results
    for (const key of input.keys) {
      if (key === "Enter" || key === " ") return this.advance();
      if (key === "ArrowRight") this.turn(1);
      if (key === "ArrowLeft") this.turn(0);
      if (key === "Escape") return this.app.showMenu();
    }
    for (const { x, y } of input.clicks) {
      if (y >= BUTTONS_Y - 4) return x < W / 2 ? this.advance() : this.app.showMenu();
    }
  }

  /** Enter: page 1 -> page 2 -> another round. */
  private advance(): void {
    if (this.page === 0) this.turn(1);
    else this.app.startGame();
  }

  private turn(page: number): void {
    if (page === this.page) return;
    this.page = page;
    this.app.sfx.click();
  }

  draw(p: Pixels): void {
    this.scenery.draw(p);
    drawPanel(p, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    if (this.page === 0) this.drawRound(p);
    else this.drawKeys(p);
    // Two dots show which page this is.
    for (let i = 0; i < 2; i++) p.rect(W / 2 - 4 + i * 6, BUTTONS_Y + 2, 3, 3, i === this.page ? C.white : C.charcoal);
    const enter = this.page === 0 ? "ENTER: YOUR KEYS" : "ENTER: AGAIN";
    p.text(enter, PANEL.x + 8, BUTTONS_Y, C.lime);
    p.text("ESC: MENU", PANEL.x + PANEL.w - 8 - (9 * 6 - 1), BUTTONS_Y, C.silver);
  }

  private drawRound(p: Pixels): void {
    const r = this.result;
    const left = PANEL.x + 40;
    const right = PANEL.x + PANEL.w - 40;
    const row = (label: string, value: string, y: number) => {
      p.text(label, left, y, C.silver);
      p.text(value, right - (value.length * 6 - 1), y, C.white);
    };

    if (r.littleHands) {
      p.centred("WELL DONE!", W / 2 + 1, 15, C.yellow, C.purple, 2);
      // Stars count keys right first time, so mashing can't buy them.
      const firstTime = r.firstTime ?? 0;
      const stars = firstTime >= STARS.three ? 3 : firstTime >= STARS.two ? 2 : 1;
      for (let i = 0; i < 3; i++) drawStar(p, W / 2 - 50 + i * 36, 36, i < stars, 3);
      p.centred(`${r.popped} BALLOONS POPPED`, W / 2, 66, C.white);
    } else {
      p.centred(r.round.seconds ? "TIME'S UP!" : "GAME OVER", W / 2 + 1, 15, C.orange, C.purple, 2);
      row("TIME", clock(r.seconds), 36);
      row("BALLOONS", String(r.popped), 46);
      row("ACCURACY", r.accuracy === null ? "-" : `${Math.round(r.accuracy * 100)}%`, 56);
      row("SCORE", String(r.score), 66);
      if (r.newBest) {
        if (blink(this.t, 2)) p.centred("NEW BEST!", W / 2, 77, C.yellow);
      } else row("BEST", String(r.best), 77);
    }

    const tricky = r.tricky.length > 0 ? `PRACTICE: ${r.tricky.join(" ").toUpperCase()}` : "NONE GOT AWAY!";
    p.centred(tricky, W / 2, 90, r.tricky.length > 0 ? C.orange : C.lime);
    if (r.unlocked.length > 0 && blink(this.t, 2)) p.centred("NEW KEYS! PRESS ENTER", W / 2, 104, C.yellow);
  }

  private drawKeys(p: Pixels): void {
    const r = this.result;
    if (r.unlocked.length > 0) {
      const title = `NEW KEYS: ${r.unlocked.join(" ").toUpperCase()}!`;
      p.centred(title, W / 2 + 1, 15, blink(this.t, 3) ? C.yellow : C.lime, C.purple, 2);
    } else {
      p.centred("YOUR KEYS", W / 2 + 1, 15, C.yellow, C.purple, 2);
    }

    // A keyboard of letters: keys in play fill up in their finger's colour as they're mastered.
    const left = Math.round(W / 2 - (10.75 * CAP_PITCH) / 2);
    for (const k of KEYS) {
      if (!/^[a-z]$/.test(k.key)) continue;
      const x = left + Math.round(k.x * CAP_PITCH);
      const y = BOARD_Y + k.row * CAP_PITCH;
      const letter = k.key.toUpperCase();
      const isNew = r.unlocked.includes(k.key);
      const p01 = this.progress.get(k.key);
      if (p01 === undefined && !isNew) {
        p.dither(x, y, CAP, CAP, C.charcoal); // not in play
        continue;
      }
      const tint = FINGER_TINTS[k.finger];
      p.rect(x, y, CAP, CAP, C.black);
      p.rect(x + 1, y + 1, CAP - 2, CAP - 2, tint.dim);
      // Only a mastered key fills to the top.
      const fill = p01 === 1 ? CAP - 2 : Math.min(CAP - 3, Math.floor((CAP - 2) * (p01 ?? 0)));
      if (fill > 0) p.rect(x + 1, y + CAP - 1 - fill, CAP - 2, fill, tint.lit);
      if (p01 === 1) p.rectb(x - 1, y - 1, CAP + 2, CAP + 2, C.white); // mastered
      if (isNew && blink(this.t, 3)) p.rectb(x - 1, y - 1, CAP + 2, CAP + 2, C.yellow);
      p.text(letter, x + 5, y + 4, C.black);
      p.text(letter, x + 4, y + 3, C.white);
    }

    p.centred("FILLED KEYS ARE LEARNED", W / 2, 86, C.slate);
    if (this.weakFinger) p.centred(`${this.weakFinger} NEEDS PRACTICE`, W / 2, 97, C.orange);
    else if (r.unlocked.length > 0) p.centred("THEY JOIN IN NEXT ROUND", W / 2, 97, C.lime);
  }
}

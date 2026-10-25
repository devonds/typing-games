import type { Frame } from "../../shared/input";
import { FINGER_NAMES } from "../../shared/keyboard";
import { H, W } from "../config";
import { drawProgressKeys, fingerColour } from "../look/keyboard";
import { drawStore, drawVignette } from "../look/store";
import { GOLD, INK, SERIF, blink, drawPanel, drawStar, text } from "../look/ui";
import type { App, RoundResult, Scene } from "./scene";

const PANEL = { x: 86, y: 60, w: 308, h: 198 };
const STATS_Y = 101;
const NEWS_Y = 128;
const KEYS_TOP = 139;
const KEY_PITCH = 13;
const NOTES_Y = 203;
const BUTTONS_Y = 240;

function clock(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "g", "h" -> "G and H"; three or more -> "D, K and S" */
function listKeys(keys: readonly string[]): string {
  const up = keys.map((k) => k.toUpperCase());
  return up.length < 2 ? up.join("") : `${up.slice(0, -1).join(", ")} and ${up[up.length - 1]}`;
}

export class ResultsScene implements Scene {
  private t = 0;

  constructor(
    private readonly app: App,
    private readonly result: RoundResult,
  ) {
    if (result.unlocked.length > 0) app.sfx.allDone();
  }

  update(dt: number, input: Frame): void {
    this.t += dt;
    if (this.t < 0.6) return; // don't let a last frantic keypress skip the results
    for (const key of input.keys) {
      if (key === "Enter" || key === " ") return this.app.startGame();
      if (key === "Escape") return this.app.showMenu();
    }
    for (const { x, y } of input.clicks) {
      if (y >= BUTTONS_Y - 10) return x < W / 2 ? this.app.startGame() : this.app.showMenu();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawStore(ctx);
    drawVignette(ctx);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 0, W, H);
    drawPanel(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    const r = this.result;
    text(ctx, r.littleHands ? "Well sliced!" : "Closing time", W / 2, 78, `italic 600 19px ${SERIF}`, GOLD.pale);

    if (r.littleHands) this.drawStars(ctx);
    else this.drawStats(ctx);

    // The news: new keys, or how the keys in play are coming along.
    const learned = r.keys.filter((k) => k.progress >= 1).length;
    if (r.unlocked.length > 0) {
      text(ctx, `New keys: ${listKeys(r.unlocked)}!`, W / 2, NEWS_Y, `italic 700 13px ${SERIF}`, GOLD.pale, "center", "rgba(10,20,15,0.8)", 3);
    } else {
      const stage = r.stage ? `Stage ${r.stage.now} of ${r.stage.of}   ·   ` : "";
      text(ctx, `${stage}${learned} of ${r.keys.length} keys learned`, W / 2, NEWS_Y, `italic 9px ${SERIF}`, GOLD.brass);
    }
    drawProgressKeys(ctx, r.keys, r.unlocked, W / 2, KEYS_TOP, KEY_PITCH, this.t);

    // A word on the weakest finger, and the letters to practise, centred in the space under the keys.
    const practice = r.tricky.length > 0 ? `Practice: ${r.tricky.join(" ").toUpperCase()}` : "Nothing got away!";
    const lines = r.weakestFinger ? 2 : 1;
    let y = NOTES_Y - (lines - 1) * 7;
    if (r.weakestFinger) {
      const line = `Your ${FINGER_NAMES[r.weakestFinger]} needs practice`;
      ctx.font = `600 9px ${SERIF}`;
      const width = ctx.measureText(line).width;
      ctx.beginPath();
      ctx.arc(W / 2 - width / 2 - 7, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = fingerColour(r.weakestFinger);
      ctx.fill();
      text(ctx, line, W / 2, y, `600 9px ${SERIF}`, INK.cream);
      y += 14;
    }
    text(ctx, practice, W / 2, y, `600 9px ${SERIF}`, r.tricky.length > 0 ? "#ff9a5a" : "#9ad13a");

    text(ctx, "Enter: again", PANEL.x + 24, BUTTONS_Y, `italic 600 10px ${SERIF}`, GOLD.pale, "left");
    text(ctx, "Esc: menu", PANEL.x + PANEL.w - 24, BUTTONS_Y, `italic 10px ${SERIF}`, INK.dim, "right");
  }

  /** Time, fruit, accuracy, score and best, side by side. */
  private drawStats(ctx: CanvasRenderingContext2D): void {
    const r = this.result;
    const cells: [string, string][] = [
      ["Time", clock(r.seconds)],
      ["Sliced", String(r.sliced)],
      ["Accuracy", r.accuracy === null ? "–" : `${Math.round(r.accuracy * 100)}%`],
      ["Score", String(r.score)],
      ["Best", String(r.best)],
    ];
    const step = (PANEL.w - 40) / cells.length;
    cells.forEach(([label, value], i) => {
      const x = PANEL.x + 20 + step * (i + 0.5);
      const isBest = label === "Best" && r.newBest;
      text(ctx, isBest ? "New best!" : label, x, STATS_Y - 6, `italic ${isBest ? 700 : 400} 8px ${SERIF}`, isBest && blink(this.t, 2) ? GOLD.pale : GOLD.brass);
      text(ctx, value, x, STATS_Y + 6, `600 12px ${SERIF}`, INK.cream);
    });
  }

  /** Little hands: up to three stars and how many fruit they sliced, no score. */
  private drawStars(ctx: CanvasRenderingContext2D): void {
    const r = this.result;
    for (let i = 0; i < 3; i++) {
      // Each star pops in a moment after the last.
      const appear = Math.min(1, Math.max(0, (this.t - 0.2 - i * 0.25) * 5));
      if (appear > 0) drawStar(ctx, W / 2 - 60 + i * 20, STATS_Y + 1, 8 * appear, i < r.stars);
    }
    text(ctx, `${r.sliced} fruit sliced`, W / 2 + 4, STATS_Y + 1, `600 11px ${SERIF}`, INK.cream, "left");
  }
}

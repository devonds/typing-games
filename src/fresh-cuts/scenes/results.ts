import type { Frame } from "../../shared/input";
import { H, W } from "../config";
import { drawStore, drawVignette } from "../look/store";
import { GOLD, INK, SERIF, blink, drawPanel, text } from "../look/ui";
import type { App, RoundResult, Scene } from "./scene";

const PANEL = { x: 130, y: 62, w: 220, h: 176 };
const BUTTONS_Y = 220;

function clock(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export class ResultsScene implements Scene {
  private t = 0;

  constructor(
    private readonly app: App,
    private readonly result: RoundResult,
  ) {}

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
    text(ctx, "Closing time", W / 2, 84, `italic 600 20px ${SERIF}`, GOLD.pale);

    const r = this.result;
    const rows: [string, string][] = [
      ["Time", clock(r.seconds)],
      ["Fruit sliced", String(r.sliced)],
      ["Accuracy", r.accuracy === null ? "–" : `${Math.round(r.accuracy * 100)}%`],
      ["Score", String(r.score)],
    ];
    if (!r.newBest) rows.push(["Best", String(r.best)]);
    const left = PANEL.x + 24;
    const right = PANEL.x + PANEL.w - 24;
    rows.forEach(([label, value], i) => {
      const y = 108 + i * 15;
      text(ctx, label, left, y, `italic 10px ${SERIF}`, GOLD.brass, "left");
      text(ctx, value, right, y, `600 10px ${SERIF}`, INK.cream, "right");
    });
    if (r.newBest && blink(this.t, 2)) text(ctx, "New best!", W / 2, 108 + 4 * 15, `italic 700 12px ${SERIF}`, GOLD.pale);

    const practice = r.tricky.length > 0 ? `Practice: ${r.tricky.join(" ").toUpperCase()}` : "Nothing got away!";
    text(ctx, practice, W / 2, 196, `600 10px ${SERIF}`, r.tricky.length > 0 ? "#ff9a5a" : "#9ad13a");

    text(ctx, "Enter: again", PANEL.x + 24, BUTTONS_Y, `italic 600 10px ${SERIF}`, GOLD.pale, "left");
    text(ctx, "Esc: menu", PANEL.x + PANEL.w - 24, BUTTONS_Y, `italic 10px ${SERIF}`, INK.dim, "right");
  }
}

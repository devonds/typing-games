import type { Frame } from "../../shared/input";
import { W } from "../config";
import { Landscape } from "../look/landscape";
import { Sky } from "../look/palette";
import { SANS, SERIF, drawPanel, text } from "../look/ui";
import type { App, RoundResult, Scene } from "./scene";

const PANEL = { x: 135, y: 58, w: 210, h: 170 };
const BUTTONS_Y = 212;

function clock(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export class ResultsScene implements Scene {
  private t = 0;
  private readonly landscape = new Landscape();
  private readonly sky: Sky;

  constructor(
    private readonly app: App,
    private readonly result: RoundResult,
  ) {
    this.sky = new Sky(result.lastKind);
    for (let i = 0; i < 60; i++) this.landscape.update(1 / 60);
  }

  update(dt: number, input: Frame): void {
    this.t += dt;
    this.landscape.update(dt);
    if (this.t < 0.6) return; // don't let a last keypress skip the results
    for (const key of input.keys) {
      if (key === "Enter" || key === " ") return this.app.startGame();
      if (key === "Escape") return this.app.showMenu();
    }
    for (const { x, y } of input.clicks) {
      if (y >= BUTTONS_Y - 12) return x < W / 2 ? this.app.startGame() : this.app.showMenu();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const p = this.sky.current;
    this.landscape.draw(ctx, p);
    drawPanel(ctx, p, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    const r = this.result;
    const title = r.perfect === r.sentences ? "Perfect garden!" : "Lovely typing!";
    text(ctx, title, W / 2, PANEL.y + 24, `italic 600 21px ${SERIF}`, p.ink);

    const rows: [string, string][] = [
      ["Sentences", String(r.sentences)],
      ["Time", clock(r.seconds)],
      ["Words per minute", String(r.wpm)],
      ["Accuracy", r.accuracy === null ? "–" : `${Math.round(r.accuracy * 100)}%`],
    ];
    if (!r.newBest) rows.push(["Best", `${r.best} wpm`]);
    const left = PANEL.x + 24;
    const right = PANEL.x + PANEL.w - 24;
    rows.forEach(([label, value], i) => {
      const y = PANEL.y + 52 + i * 16;
      text(ctx, label, left, y, `500 9.5px ${SANS}`, p.inkSoft, "left");
      text(ctx, value, right, y, `600 10px ${SANS}`, p.ink, "right");
    });
    if (r.newBest) {
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.t * 4);
      text(ctx, "New best!", W / 2, PANEL.y + 52 + 4 * 16, `italic 700 12px ${SERIF}`, p.accent);
      ctx.restore();
    }

    const practice = r.tricky.length > 0 ? `Letters to practice: ${r.tricky.join(" ").toUpperCase()}` : "Not a single slip!";
    text(ctx, practice, W / 2, PANEL.y + 136, `600 9px ${SANS}`, p.accent);

    text(ctx, "Enter: again", left, BUTTONS_Y, `italic 600 11px ${SERIF}`, p.ink, "left");
    text(ctx, "Esc: menu", right, BUTTONS_Y, `italic 11px ${SERIF}`, p.inkSoft, "right");
    this.landscape.drawAtmosphere(ctx, p);
  }
}

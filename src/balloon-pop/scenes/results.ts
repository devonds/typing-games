import type { Frame } from "../../shared/input";
import { W } from "../config";
import { C } from "../look/palette";
import type { Pixels } from "../look/pixels";
import type { Scenery } from "../look/scenery";
import { blink, drawPanel } from "../look/ui";
import type { App, RoundResult, Scene } from "./scene";

const PANEL = { x: 44, y: 18, w: 168, h: 100 };
const BUTTONS_Y = 106;

function clock(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export class ResultsScene implements Scene {
  private t = 0;

  constructor(
    private readonly app: App,
    private readonly result: RoundResult,
    private readonly scenery: Scenery,
  ) {}

  update(dt: number, input: Frame): void {
    this.t += dt;
    this.scenery.update(dt);
    if (this.t < 0.6) return; // don't let a last frantic keypress skip the results
    for (const key of input.keys) {
      if (key === "Enter" || key === " ") return this.app.startGame();
      if (key === "Escape") return this.app.showMenu();
    }
    for (const { x, y } of input.clicks) {
      if (y >= BUTTONS_Y - 4) return x < W / 2 ? this.app.startGame() : this.app.showMenu();
    }
  }

  draw(p: Pixels): void {
    this.scenery.draw(p);
    drawPanel(p, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    p.centred("GAME OVER", W / 2, 25, C.orange, C.purple, 2);

    const r = this.result;
    const rows: [string, string][] = [
      ["TIME", clock(r.seconds)],
      ["BALLOONS", String(r.popped)],
      ["ACCURACY", r.accuracy === null ? "-" : `${Math.round(r.accuracy * 100)}%`],
      ["SCORE", String(r.score)],
    ];
    const left = PANEL.x + 14;
    const right = PANEL.x + PANEL.w - 14;
    rows.forEach(([label, value], i) => {
      const y = 46 + i * 10;
      p.text(label, left, y, C.silver);
      p.text(value, right - (value.length * 6 - 1), y, C.white);
    });
    if (r.newBest) {
      if (blink(this.t, 2)) p.centred("NEW BEST!", W / 2, 88, C.yellow);
    } else {
      p.text("BEST", left, 86, C.silver);
      p.text(String(r.best), right - (String(r.best).length * 6 - 1), 86, C.white);
    }

    const tricky = r.tricky.length > 0 ? `PRACTICE: ${r.tricky.join(" ").toUpperCase()}` : "NONE GOT AWAY!";
    p.centred(tricky, W / 2, 96, r.tricky.length > 0 ? C.orange : C.lime);

    p.text("ENTER: AGAIN", PANEL.x + 8, BUTTONS_Y, C.lime);
    p.text("ESC: MENU", PANEL.x + PANEL.w - 8 - (9 * 6 - 1), BUTTONS_Y, C.silver);
  }
}

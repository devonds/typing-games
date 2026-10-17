import { POINTS_PER_POP, W } from "../config";
import { recordEvent, trickyLetters, type Stats } from "../game/stats";
import type { Balloon, GameEvent } from "../game/types";
import { World } from "../game/world";
import type { Frame } from "../input";
import { Effects } from "../look/effects";
import { drawHud } from "../look/hud";
import { BALLOON_COLOURS, C } from "../look/palette";
import type { Pixels } from "../look/pixels";
import { Scenery } from "../look/scenery";
import { drawBalloon, drawLauncher } from "../look/sprites";
import { drawPanel } from "../look/ui";
import type { App, Scene } from "./scene";

/** After the last life: pause, pop what's left one by one, then show results. */
interface Ending {
  balloons: Balloon[];
  untilNextPop: number;
  untilResults: number;
}

export class PlayScene implements Scene {
  private readonly world: World;
  private readonly scenery = new Scenery();
  private readonly effects: Effects;
  /** Where each cannon's barrel points right now; it turns smoothly towards the world's aim. */
  private readonly barrels: number[];
  /** This round's per-letter stats. */
  private readonly round: Stats = {};
  private paused = false;
  private ending: Ending | null = null;
  private t = 0;

  constructor(private readonly app: App, letters: readonly string[]) {
    const { difficulty, speedMode } = app.settings;
    this.world = new World({ letters, difficulty, speedMode });
    this.effects = new Effects(this.world.launchers.length);
    this.barrels = this.world.launchers.map((l) => l.aim);
    this.effects.banner("TYPE THE LETTERS!", 2.5);
  }

  pause(): void {
    if (!this.ending) this.paused = true;
  }

  update(dt: number, input: Frame): void {
    for (const key of input.keys) {
      if (this.paused) {
        if (key === "Enter" || key === " ") this.paused = false;
        else if (key === "Escape") return this.quit();
      } else if (key === "Escape") {
        this.pause();
      } else if (/^[a-z]$/.test(key)) {
        this.handle(this.world.press(key));
      }
    }
    if (this.paused) {
      if (input.clicks.length > 0) this.paused = false;
      return;
    }

    this.t += dt;
    this.handle(this.world.step(dt));
    this.scenery.update(dt, this.world.time);
    this.effects.update(dt);
    const turn = 1 - Math.exp(-6 * dt);
    this.world.launchers.forEach((l, i) => (this.barrels[i] += (l.aim - this.barrels[i]) * turn));
    if (this.ending) this.updateEnding(dt);
  }

  private handle(events: GameEvent[]): void {
    const { sfx } = this.app;
    for (const e of events) {
      recordEvent(this.round, e);
      switch (e.type) {
        case "launched":
          this.effects.muzzle(e.launcher);
          sfx.launch();
          break;
        case "popped": {
          const b = e.balloon;
          const nearest = this.world.launchers.reduce((a, l) => (Math.abs(l.x - b.x) < Math.abs(a.x - b.x) ? l : a));
          this.effects.dart(nearest.x, b.x, b.y);
          this.effects.pop(b.x, b.y, BALLOON_COLOURS[b.colour].fill);
          this.effects.floatText(b.x, b.y - 18, `+${POINTS_PER_POP}`, C.yellow);
          sfx.pop();
          break;
        }
        case "wrongKey":
          this.effects.wrongKey(e.key);
          sfx.wrong();
          break;
        case "escaped":
          this.effects.escaped();
          sfx.escape();
          break;
        case "speedUp":
          this.effects.banner("FASTER!", 1.5);
          sfx.faster();
          break;
        case "gameOver":
          this.ending = { balloons: this.world.releaseAll(), untilNextPop: 0.6, untilResults: 2.5 };
          sfx.gameOver();
          break;
      }
    }
  }

  private updateEnding(dt: number): void {
    const end = this.ending!;
    end.untilNextPop -= dt;
    end.untilResults -= dt;
    if (end.untilNextPop <= 0 && end.balloons.length > 0) {
      const b = end.balloons.shift()!;
      this.effects.pop(b.x, b.y, BALLOON_COLOURS[b.colour].fill);
      this.app.sfx.pop();
      end.untilNextPop = 0.12;
    }
    if (end.untilResults <= 0 && end.balloons.length === 0) this.finish();
  }

  private finish(): void {
    const w = this.world;
    this.app.finishRound(this.round);
    const best = this.app.submitScore(w.score);
    const keys = w.popped + w.wrongKeys;
    this.app.showResults(
      {
        score: w.score,
        popped: w.popped,
        seconds: w.time,
        accuracy: keys > 0 ? w.popped / keys : null,
        best: Math.max(best, w.score),
        newBest: w.score > best && w.score > 0,
        tricky: trickyLetters(this.round),
      },
      this.scenery,
    );
  }

  /** Leaving mid-round still counts the letters seen so far towards "weak letters". */
  private quit(): void {
    this.app.finishRound(this.round);
    this.app.showMenu();
  }

  draw(p: Pixels): void {
    this.scenery.draw(p);
    const balloons = this.ending ? this.ending.balloons : this.world.balloons;
    for (const b of balloons) drawBalloon(p, b, this.t);
    this.world.launchers.forEach((l, i) => drawLauncher(p, l.x, this.barrels[i], this.effects.muzzleFlash(i)));
    this.effects.draw(p);
    drawHud(p, this.world, this.app.settings.speedMode === "ramp", this.effects.escapeFlash);

    if (this.paused) {
      p.dither(0, 0, W, p.ctx.canvas.height, C.black);
      drawPanel(p, 58, 40, 140, 56);
      p.centred("PAUSED", W / 2, 48, C.yellow, undefined, 2);
      p.centred("ENTER: KEEP PLAYING", W / 2, 70, C.white);
      p.centred("ESC: MENU", W / 2, 82, C.silver);
    }
  }
}

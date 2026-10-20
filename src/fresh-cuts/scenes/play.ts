import type { Frame } from "../../shared/input";
import { trickyLetters, type Stats } from "../../shared/letters";
import { FREEZE, H, LIVES, POINTS_PER_SLICE, W } from "../config";
import { recordEvent } from "../game/stats";
import type { Fruit, GameEvent } from "../game/types";
import { World } from "../game/world";
import { Effects } from "../look/effects";
import { drawFly, drawIce, drawShadow, drawStink, drawWhole, lookFor } from "../look/fruit";
import { drawStore, drawVignette } from "../look/store";
import { GOLD, INK, SERIF, drawFrost, drawHud, drawPanel, drawTag, text } from "../look/ui";
import type { App, Scene } from "./scene";

/** Words for a chain of quick slices. */
const COMBO_WORDS = ["", "", "", "Juicy!", "Fresh!", "Delicious!", "Scrumptious!"];

/** After the last basket: slice whatever's left one by one, then show results. */
interface Ending {
  fruit: Fruit[];
  untilNextSlice: number;
  untilResults: number;
}

export class PlayScene implements Scene {
  private readonly world: World;
  private readonly effects = new Effects();
  /** This round's per-letter stats. */
  private readonly round: Stats = {};
  private paused = false;
  private ending: Ending | null = null;
  private t = 0;

  constructor(private readonly app: App, letters: readonly string[]) {
    const { difficulty, speedMode, rotten } = app.settings;
    this.world = new World({ letters, difficulty, speedMode, rotten });
    this.effects.banner("Type the letters!", 2);
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
    this.effects.update(dt, this.world.timeScale);
    if (this.ending) this.updateEnding(dt);
  }

  private handle(events: GameEvent[]): void {
    const { sfx } = this.app;
    for (const e of events) {
      recordEvent(this.round, e);
      switch (e.type) {
        case "launched":
          sfx.toss();
          break;
        case "sliced":
          this.effects.slice(e.fruit);
          this.effects.word(`+${POINTS_PER_SLICE}`, e.fruit.x, e.fruit.y - 26);
          if (e.combo >= 3) this.effects.word(COMBO_WORDS[Math.min(e.combo, COMBO_WORDS.length - 1)], W / 2, 86, true);
          sfx.slice(e.combo);
          break;
        case "rottenSliced":
          this.effects.slice(e.fruit);
          this.effects.word("Yuck!", e.fruit.x, e.fruit.y - 26);
          sfx.yuck();
          break;
        case "dropped":
          this.effects.word("Oops!", e.fruit.x, H - 50);
          sfx.thud();
          break;
        case "comboEnd":
          this.effects.word(`+${e.bonus} bonus`, W / 2, 106);
          sfx.combo(e.chain);
          break;
        case "wrongKey":
          sfx.wrong();
          break;
        case "freeze":
          this.effects.banner("Freezer aisle!", 1.4);
          this.effects.word("Slow motion", W / 2, H / 2 + 8);
          sfx.freeze();
          break;
        case "thaw":
          sfx.thaw();
          break;
        case "speedUp":
          this.effects.banner("Faster!", 1.2);
          sfx.faster();
          break;
        case "gameOver":
          this.ending = { fruit: this.world.releaseAll(), untilNextSlice: 0.6, untilResults: 2.2 };
          this.effects.banner("Out of baskets!", 2);
          sfx.gameOver();
          break;
      }
    }
  }

  /** The finale: everything still flying gets sliced, one after another. */
  private updateEnding(dt: number): void {
    const end = this.ending!;
    end.untilNextSlice -= dt;
    end.untilResults -= dt;
    for (const f of end.fruit) {
      f.vy += f.gravity * dt * 0.3;
      f.x += f.vx * dt * 0.3;
      f.y += f.vy * dt * 0.3;
    }
    if (end.untilNextSlice <= 0 && end.fruit.length > 0) {
      this.effects.slice(end.fruit.shift()!);
      this.app.sfx.slice();
      end.untilNextSlice = 0.15;
    }
    if (end.untilResults <= 0 && end.fruit.length === 0) this.finish();
  }

  private finish(): void {
    const w = this.world;
    this.app.finishRound(this.round);
    const best = this.app.submitScore(w.score);
    const keys = w.sliced + w.wrongKeys;
    this.app.showResults({
      score: w.score,
      sliced: w.sliced,
      seconds: w.time,
      accuracy: keys > 0 ? w.sliced / keys : null,
      best: Math.max(best, w.score),
      newBest: w.score > best && w.score > 0,
      tricky: trickyLetters(this.round),
    });
  }

  /** Leaving mid-round still counts the letters seen so far towards "weak letters". */
  private quit(): void {
    this.app.finishRound(this.round);
    this.app.showMenu();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawStore(ctx);
    this.effects.drawBehind(ctx);
    const flying = this.ending ? this.ending.fruit : this.world.fruit;
    for (const f of flying) {
      const look = lookFor(f.kind, f.rotten);
      drawShadow(ctx, look, f.x, f.y, f.rot);
      drawWhole(ctx, look, f.x, f.y, f.rot);
      if (f.frozen) drawIce(ctx, look, f.x, f.y, f.rot, this.t);
      if (f.rotten) {
        drawStink(ctx, f.x, f.y - 22, this.t);
        drawFly(ctx, f.x + Math.cos(this.t * 7 + f.id) * 26, f.y - 12 + Math.sin(this.t * 11 + f.id) * 12, this.t);
      }
    }
    this.effects.drawFront(ctx);
    drawVignette(ctx);
    const scale = this.world.timeScale;
    drawFrost(ctx, (1 - scale) / (1 - FREEZE.speed), this.world.freezeLeft, FREEZE.seconds, this.t);
    // Letters go on last so nothing ever covers them.
    if (!this.ending) {
      for (const f of flying) drawTag(ctx, f.letter, f.x, f.y + 1, f.rotten ? "rotten" : f.frozen ? "frozen" : "fresh");
    }
    this.effects.drawWords(ctx);
    drawHud(ctx, this.world.score, this.world.lives, LIVES, this.app.settings.speedMode === "ramp" ? this.world.speedLevel : null);

    if (this.paused) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, W, H);
      drawPanel(ctx, 150, 92, 180, 86);
      text(ctx, "Paused", W / 2, 114, `italic 600 22px ${SERIF}`, GOLD.pale);
      text(ctx, "Enter: keep slicing", W / 2, 142, `600 9px ${SERIF}`, INK.cream);
      text(ctx, "Esc: menu", W / 2, 158, `9px ${SERIF}`, INK.dim);
    }
  }
}

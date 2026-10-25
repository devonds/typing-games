import { Guide } from "../../shared/guide";
import type { Frame } from "../../shared/input";
import { RoundLog } from "../../shared/history";
import type { Practice } from "../../shared/player";
import { Ritual, type RitualView } from "../../shared/ritual";
import { pickUnit, unitMix } from "../../shared/units";
import { LITTLE_HANDS, W } from "../config";
import { logEvent } from "../game/stats";
import type { Balloon, GameEvent } from "../game/types";
import { World } from "../game/world";
import { Effects } from "../look/effects";
import { drawHud } from "../look/hud";
import { drawKeyboard, KEYBOARD_TOP } from "../look/keyboard";
import { BALLOON_COLOURS, C } from "../look/palette";
import type { Pixels } from "../look/pixels";
import { drawRitual } from "../look/ritual";
import { Scenery } from "../look/scenery";
import { drawBalloon, drawLauncher } from "../look/sprites";
import { drawPanel } from "../look/ui";
import type { App, Round, Scene } from "./scene";

/** A mix with no pairs or words, for when enough are already in the air. */
const LETTERS_ONLY = { pairs: 0, words: 0, maxWord: 0 };

/** After the last life, the clock, or (little hands) the last balloon: pause, pop what's left, then results. */
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
  /** Everything that happened this round, for the player's history. */
  private readonly log = new RoundLog();
  private readonly guide: Guide;
  private readonly littleHands: boolean;
  /** "Fingers on the bumps" before the round; null once it's done and the world is running. */
  private ritual: Ritual | null;
  private ritualView: RitualView;
  private paused = false;
  private ending: Ending | null = null;
  private t = 0;

  constructor(
    private readonly app: App,
    private readonly practice: Practice,
    private readonly round: Round,
  ) {
    const { player, settings } = app;
    this.littleHands = player.littleHands;
    // Pairs and words join in once the child is ready for them (none before).
    const mix = unitMix(player, round.lesson, practice);
    this.world = new World({
      practice,
      difficulty: settings.difficulty,
      speedMode: settings.speedMode,
      pick: (inUse, random, lettersOnly) => pickUnit(player, practice, lettersOnly ? LETTERS_ONLY : mix, inUse, random),
      pace: (letter) => player.pace(letter),
      seconds: round.seconds,
      littleHands: this.littleHands,
    });
    this.effects = new Effects(this.world.launchers.length);
    this.barrels = this.world.launchers.map((l) => l.aim);
    // Little hands always get the guide.
    this.guide = new Guide(this.littleHands ? "always" : settings.guide, player.history, this.littleHands, practice.keys);
    this.ritual = new Ritual(this.littleHands);
    this.ritualView = this.ritual.view();
  }

  pause(): void {
    if (!this.ending && !this.ritual) this.paused = true;
  }

  update(dt: number, input: Frame): void {
    if (this.ritual) return this.updateRitual(dt, input);
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
    this.guide.setTarget(this.ending ? null : this.world.wanted);
    this.guide.update(dt);
    this.scenery.update(dt, this.world.time);
    this.effects.update(dt);
    const turn = 1 - Math.exp(-6 * dt);
    this.world.launchers.forEach((l, i) => (this.barrels[i] += (l.aim - this.barrels[i]) * turn));
    if (this.ending) this.updateEnding(dt);
  }

  /** Wait for both pointer fingers on F and J. Keys pressed meanwhile never reach the world, and it doesn't step. */
  private updateRitual(dt: number, input: Frame): void {
    if (input.keys.includes("Escape")) return this.app.showMenu();
    this.t += dt;
    this.scenery.update(dt);
    this.ritualView = this.ritual!.update(dt, input);
    if (this.ritualView.done) {
      this.ritual = null;
      this.app.sfx.fingersReady();
      this.effects.banner("TYPE THE LETTERS!", 2.5);
    }
  }

  private handle(events: GameEvent[]): void {
    const { sfx } = this.app;
    for (const e of events) {
      logEvent(this.log, e);
      switch (e.type) {
        case "launched":
          this.effects.muzzle(e.launcher);
          sfx.launch();
          break;
        case "letter":
          // A letter of a pair or word: a little tick that climbs as the word goes on. The last one pops.
          if (e.balloon.typed < e.balloon.text.length) sfx.letter(e.index);
          break;
        case "popped": {
          const b = e.balloon;
          const nearest = this.world.launchers.reduce((a, l) => (Math.abs(l.x - b.x) < Math.abs(a.x - b.x) ? l : a));
          this.effects.dart(nearest.x, b.x, b.y);
          this.effects.pop(b.x, b.y, BALLOON_COLOURS[b.colour].fill, b.text.length);
          this.effects.floatText(b.x, b.y - 18, `+${e.points}`, C.yellow);
          sfx.pop();
          break;
        }
        case "wrongKey":
          this.guide.slip(e.expected);
          this.effects.wrongKey(e.key, this.guide.view().visible ? KEYBOARD_TOP - 28 : undefined);
          sfx.wrong();
          break;
        case "fizzled":
          this.effects.fizz(this.guide.view().visible ? KEYBOARD_TOP - 32 : undefined);
          sfx.fizz();
          break;
        case "escaped":
          if (e.cost > 0) this.effects.floatText(e.balloon.x, 14, `-${e.cost}`, C.orange);
          if (this.round.seconds === null) this.effects.escaped();
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
        case "timeUp":
          this.ending = { balloons: this.world.releaseAll(), untilNextPop: 0.6, untilResults: 2.5 };
          this.effects.banner("TIME!", 2);
          sfx.cheer();
          break;
        case "finished":
          this.ending = { balloons: [], untilNextPop: 0, untilResults: 2 };
          this.effects.banner("ALL DONE!", 2);
          sfx.cheer();
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
      this.effects.pop(b.x, b.y, BALLOON_COLOURS[b.colour].fill, b.text.length);
      this.app.sfx.pop();
      end.untilNextPop = 0.12;
    }
    if (end.untilResults <= 0 && end.balloons.length === 0) this.finish();
  }

  private finish(): void {
    const w = this.world;
    const { unlocked } = this.app.finishRound(this.log, w.time);
    const best = this.littleHands ? 0 : this.app.submitScore(w.score, this.round);
    const keys = w.letters + w.wrongKeys;
    this.app.showResults(
      {
        round: this.round,
        littleHands: this.littleHands,
        score: w.score,
        popped: w.popped,
        seconds: w.time,
        accuracy: keys > 0 ? w.letters / keys : null,
        firstTime: keys > 0 ? w.firstTime / keys : null,
        best: Math.max(best, w.score),
        newBest: !this.littleHands && w.score > best && w.score > 0,
        tricky: this.log.tricky(),
        keys: this.practice.keys,
        unlocked,
      },
      this.scenery,
    );
  }

  /** Leaving mid-round still counts what was typed so far. */
  private quit(): void {
    this.app.finishRound(this.log, this.world.time);
    this.app.showMenu();
  }

  draw(p: Pixels): void {
    this.scenery.draw(p);
    if (this.ritual) {
      this.world.launchers.forEach((l, i) => drawLauncher(p, l.x, this.barrels[i], 0));
      return drawRitual(p, this.ritualView, this.t, this.littleHands);
    }
    const balloons = this.ending ? this.ending.balloons : this.world.balloons;
    for (const b of balloons) {
      // Little hands: balloons waiting at the top bob gently. The word being typed wobbles.
      const hovering = this.littleHands && b.y <= LITTLE_HANDS.hoverY + 0.5;
      const locked = b === this.world.locked;
      drawBalloon(
        p,
        {
          x: b.x + (locked ? Math.round(Math.sin(this.t * 18)) : 0),
          y: b.y + (hovering ? Math.sin(this.t * 2.5 + b.id) * 1.5 : 0),
          letter: b.text,
          colour: b.colour,
          typed: b.typed,
          locked,
        },
        this.t,
      );
    }
    this.world.launchers.forEach((l, i) => drawLauncher(p, l.x, this.barrels[i], this.effects.muzzleFlash(i)));
    const guide = this.guide.view();
    if (guide.visible) drawKeyboard(p, guide, this.t);
    this.effects.draw(p);
    const w = this.world;
    if (this.littleHands) drawHud(p, { label: `POPPED ${w.popped}/${LITTLE_HANDS.balloons}`, lives: null, clock: null, speedLevel: null }, 0);
    else {
      const speedLevel = this.app.settings.speedMode === "ramp" ? w.speedLevel : null;
      // A timed round shows the time left instead of lives.
      const clock = w.timeLimit === null ? null : Math.max(0, Math.ceil(w.timeLimit - w.time));
      drawHud(p, { label: `SCORE ${w.score}`, lives: clock === null ? w.lives : null, clock, speedLevel }, this.effects.escapeFlash);
    }

    if (this.paused) {
      p.dither(0, 0, W, p.ctx.canvas.height, C.black);
      drawPanel(p, 58, 40, 140, 56);
      p.centred("PAUSED", W / 2, 48, C.yellow, undefined, 2);
      p.centred("ENTER: KEEP PLAYING", W / 2, 70, C.white);
      p.centred("ESC: MENU", W / 2, 82, C.silver);
    }
  }
}

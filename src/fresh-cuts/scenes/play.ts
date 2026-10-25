import { Guide } from "../../shared/guide";
import { weakestFinger } from "../../shared/hands";
import { RoundLog } from "../../shared/history";
import type { Frame } from "../../shared/input";
import { STAGES, masteryProgress } from "../../shared/path";
import { Ritual, type RitualView } from "../../shared/ritual";
import { finishStep } from "../../shared/session";
import { pickUnit, unitMix } from "../../shared/units";
import { FREEZE, H, LITTLE_HANDS, LIVES, RITUAL, W } from "../config";
import { logEvent } from "../game/stats";
import type { Fruit, GameEvent } from "../game/types";
import { World } from "../game/world";
import { Effects } from "../look/effects";
import { drawKeyboard, drawRitual } from "../look/keyboard";
import { drawFly, drawIce, drawShadow, drawStink, drawWhole, lookFor } from "../look/fruit";
import { drawStore, drawVignette } from "../look/store";
import { GOLD, INK, SERIF, drawClock, drawFrost, drawFruitCount, drawHud, drawPanel, drawTag, drawWordTag, text } from "../look/ui";
import type { App, RoundPlan, Scene } from "./scene";

/** Words for a chain of quick slices. */
const COMBO_WORDS = ["", "", "", "Juicy!", "Fresh!", "Delicious!", "Scrumptious!"];

/** At the end of a round: slice whatever's left one by one, then show results. */
interface Ending {
  fruit: Fruit[];
  untilNextSlice: number;
  untilResults: number;
}

export class PlayScene implements Scene {
  private readonly world: World;
  private readonly effects = new Effects();
  /** Every hit, miss and fumble this round, for the player's history. */
  private readonly log = new RoundLog();
  private readonly guide: Guide;
  private readonly littleHands: boolean;
  /** Fresh fruit sliced: little hands see this count instead of a score. */
  private freshSliced = 0;
  /** "Fingers on the bumps" before the first throw. Null once the round is under way. */
  private ritual: Ritual | null;
  private ritualView: RitualView;
  /** Seconds left of the start screen melting away, once the round has begun. */
  private ritualFade = 0;
  private paused = false;
  private ending: Ending | null = null;
  private t = 0;

  constructor(
    private readonly app: App,
    private readonly plan: RoundPlan,
  ) {
    const { difficulty, speedMode, rotten, guide } = app.settings;
    const { player } = app;
    const { practice } = plan;
    this.littleHands = player.littleHands;
    // Pairs and words join the letters once the player is ready for them.
    const mix = unitMix(player, plan.lesson, practice);
    this.world = new World({
      keys: practice.keys,
      weights: practice.weights,
      difficulty,
      speedMode,
      rotten,
      pace: (ch) => player.pace(ch),
      littleHands: this.littleHands,
      pick: (inUse) => pickUnit(player, practice, mix, inUse),
      seconds: plan.seconds ?? undefined,
    });
    // Little hands always get the whole guide.
    this.guide = new Guide(this.littleHands ? "always" : guide, player.history, this.littleHands, practice.keys);
    this.ritual = new Ritual(this.littleHands);
    this.ritualView = this.ritual.view();
  }

  pause(): void {
    // The start waits anyway, so there's nothing to pause.
    if (!this.ending && !this.ritual) this.paused = true;
  }

  update(dt: number, input: Frame): void {
    if (this.ritual) return this.updateRitual(dt, input);
    this.ritualFade = Math.max(0, this.ritualFade - dt);
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
    this.guide.setTarget(this.ending ? null : this.world.target);
    this.guide.update(dt);
  }

  /** Before the round: nothing is thrown and no key reaches the world until F and J are held. */
  private updateRitual(dt: number, input: Frame): void {
    if (input.keys.includes("Escape")) return this.app.showMenu();
    this.t += dt;
    this.ritualView = this.ritual!.update(dt, input);
    if (!this.ritualView.done) return;
    this.ritual = null;
    this.ritualFade = RITUAL.fadeOut;
    this.effects.banner("Type the letters!", 2);
    this.app.sfx.fingersReady();
  }

  private handle(events: GameEvent[]): void {
    const { sfx } = this.app;
    for (const e of events) {
      logEvent(this.log, e);
      switch (e.type) {
        case "launched":
          sfx.toss();
          break;
        case "typed":
          // Each letter of a pair or word nicks the fruit; the last one slices it through (below).
          if (!e.done) {
            this.effects.nick(e.fruit);
            sfx.nick(e.index);
          }
          break;
        case "sliced": {
          if (!e.fruit.frozen) this.freshSliced += 1;
          const word = e.fruit.letter.length > 2;
          this.effects.slice(e.fruit, Math.random, word);
          this.effects.word(`+${e.points}`, e.fruit.x, e.fruit.y - 26, false);
          if (word) this.effects.word(e.fruit.letter, e.fruit.x, e.fruit.y - 44);
          if (e.combo >= 3) this.effects.word(COMBO_WORDS[Math.min(e.combo, COMBO_WORDS.length - 1)], W / 2, 86, true);
          sfx.slice(e.combo);
          if (word) sfx.wordDone();
          break;
        }
        case "rottenSliced":
          this.effects.slice(e.fruit);
          this.effects.word(e.penalty ? `Yuck! -${e.penalty}` : "Yuck!", e.fruit.x, e.fruit.y - 26);
          sfx.yuck();
          break;
        case "dropped":
          this.effects.word(e.penalty ? `Oops! -${e.penalty}` : "Oops!", e.fruit.x, H - 64);
          sfx.thud();
          break;
        case "comboEnd":
          this.effects.word(`+${e.bonus} bonus`, W / 2, 106);
          sfx.combo(e.chain);
          break;
        case "wrongKey":
          this.guide.slip(e.expected);
          sfx.wrong();
          break;
        case "fizzled":
          sfx.fizzle();
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
        case "timeUp":
          this.ending = { fruit: this.world.releaseAll(), untilNextSlice: 0.6, untilResults: 2.2 };
          this.effects.banner("Time's up!", 2);
          sfx.allDone();
          break;
        case "roundDone":
          this.ending = { fruit: [], untilNextSlice: 0, untilResults: 1.8 };
          this.effects.banner("All sliced!", 1.8);
          sfx.allDone();
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
    const { player, settings } = this.app;
    const { plan } = this;
    const { unlocked } = player.finishRound(this.log, w.time);
    const { difficulty, speedMode, rotten } = settings;
    const best = this.littleHands ? 0 : this.app.submitScore(w.score, `${plan.lesson}/${difficulty}/${speedMode}/${rotten ? "rotten" : "fresh"}${plan.seconds ? `/${plan.seconds}s` : ""}`);
    const presses = w.lettersTyped + w.wrongKeys;
    // Stars count keys right first time, so mashing can't buy them.
    const firstTry = presses > 0 ? w.firstTry / presses : 0;
    const [two, three] = LITTLE_HANDS.stars;
    const next = plan.session ? finishStep(player.profile.id, player.today, "fresh-cuts") : null;
    this.app.showResults({
      score: w.score,
      sliced: this.littleHands ? this.freshSliced : w.sliced,
      seconds: w.time,
      accuracy: presses > 0 ? w.lettersTyped / presses : null,
      best: Math.max(best, w.score),
      newBest: !this.littleHands && w.score > best && w.score > 0,
      littleHands: this.littleHands,
      stars: firstTry >= three ? 3 : firstTry >= two ? 2 : 1,
      tricky: this.log.tricky(),
      keys: plan.practice.keys.map((key) => ({ key, progress: masteryProgress(player.history.letters[key], player.speedMatters) })),
      unlocked,
      weakestFinger: weakestFinger(player.history),
      stage: plan.lesson === "mine" ? { now: player.path.stage + 1, of: STAGES.length } : null,
      session: plan.session ? { next: next?.game ?? null } : null,
    });
  }

  /** Leaving mid-round still counts what was typed so far. */
  private quit(): void {
    this.app.player.finishRound(this.log, this.world.time);
    this.app.showMenu();
  }

  /** Hanging fruit (little hands) bobs gently, so it still looks alive while it waits. */
  private bob(f: Fruit): number {
    return f.hanging ? f.y + Math.sin(this.t * 2.2 + f.id) * 1.5 : f.y;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawStore(ctx);
    this.effects.drawBehind(ctx);
    const flying = this.ending ? this.ending.fruit : this.world.fruit;
    for (const f of flying) {
      const look = lookFor(f.kind, f.rotten);
      const y = this.bob(f);
      drawShadow(ctx, look, f.x, y, f.rot);
      drawWhole(ctx, look, f.x, y, f.rot);
      if (f.frozen) drawIce(ctx, look, f.x, y, f.rot, this.t);
      if (f.rotten) {
        drawStink(ctx, f.x, f.y - 22, this.t);
        drawFly(ctx, f.x + Math.cos(this.t * 7 + f.id) * 26, f.y - 12 + Math.sin(this.t * 11 + f.id) * 12, this.t);
      }
    }
    this.effects.drawFront(ctx);
    drawVignette(ctx);
    const scale = this.world.timeScale;
    drawFrost(ctx, (1 - scale) / (1 - FREEZE.speed), this.world.freezeLeft, FREEZE.seconds, this.t);
    // The keyboard sits over the crates, under the letter tags, and fades in as the start screen melts away.
    if (!this.ritual) drawKeyboard(ctx, this.guide.view(), 1 - this.ritualFade / RITUAL.fadeOut, this.world.cooling);
    // Letters go on last so nothing ever covers them.
    if (!this.ending) {
      for (const f of flying) {
        const y = this.bob(f) + 1;
        if (f.letter.length > 1) drawWordTag(ctx, f.letter, f.typed ?? 0, f.x, y, f === this.world.lockedFruit, this.t);
        else drawTag(ctx, f.letter, f.x, y, f.rotten ? "rotten" : f.frozen ? "frozen" : "fresh");
      }
    }
    this.effects.drawWords(ctx);
    // Little hands lose nothing, so there are no baskets: just how many fruit are sliced so far.
    if (this.littleHands) drawFruitCount(ctx, this.freshSliced, LITTLE_HANDS.fruit);
    else {
      // A timed round loses no baskets: a small clock takes their place.
      const timeLeft = this.world.timeLeft;
      drawHud(ctx, this.world.score, this.world.lives, timeLeft === null ? LIVES : 0, this.app.settings.speedMode === "ramp" ? this.world.speedLevel : null);
      if (timeLeft !== null) drawClock(ctx, timeLeft, this.plan.seconds!);
    }
    if (this.ritual || this.ritualFade > 0) {
      const session = this.plan.session ? `Today's practice  ·  ${this.plan.session.step} of ${this.plan.session.of}` : undefined;
      drawRitual(ctx, this.ritualView, this.t, this.ritual ? 1 : this.ritualFade / RITUAL.fadeOut, this.littleHands, session);
    }

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

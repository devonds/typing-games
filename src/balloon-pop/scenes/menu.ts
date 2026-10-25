import { GUIDE_MODE_NAMES, GUIDE_MODES } from "../../shared/guide";
import type { Frame } from "../../shared/input";
import { LESSON_IDS, lessonById, type LessonId } from "../../shared/lessons";
import { STAGES, newestKeys } from "../../shared/path";
import { listProfiles } from "../../shared/profiles";
import { BALLOON_COLOUR_COUNT, H, LIVES, ROUND_SECONDS, W } from "../config";
import { textWidth } from "../look/font";
import { C } from "../look/palette";
import type { Pixels } from "../look/pixels";
import { Scenery } from "../look/scenery";
import { drawBalloon, type BalloonLike } from "../look/sprites";
import { blink, drawPanel } from "../look/ui";
import type { Difficulty, SpeedMode } from "../config";
import type { RoundLength } from "../storage";
import type { App, Scene } from "./scene";

type Row = "player" | "lesson" | "difficulty" | "speedMode" | "length" | "guide" | "littleHands" | "sound";

const ROW_LABELS: Record<Row, string> = {
  player: "PLAYER",
  lesson: "LESSON",
  difficulty: "LEVEL",
  speedMode: "SPEED",
  length: "ROUND",
  guide: "FINGER GUIDE",
  littleHands: "LITTLE HANDS",
  sound: "SOUND",
};
const DIFFICULTY_OPTIONS: Difficulty[] = ["easy", "medium", "hard"];
const SPEED_OPTIONS: SpeedMode[] = ["ramp", "steady"];
const LENGTH_OPTIONS: RoundLength[] = ["lives", "timed"];

const PANEL = { x: 28, y: 23, w: 200, h: 113 };
const ROW_Y = 29;
const ROW_STEP = 10;
/** Where each row's "<", value (centred) and ">" go, from the panel's left edge. */
const LEFT_ARROW = 90;
const VALUE_X = 138;
const RIGHT_ARROW = 184;
/** The longest value that fits between the arrows. */
const VALUE_CHARS = 13;
/** Two lines under the rows that explain the selected row (or show the lesson's letters). */
const HINT_Y = 109;
const PLAY_Y = 127;

function cycle<T>(options: readonly T[], current: T, step: number): T {
  const i = options.indexOf(current);
  return options[(i + step + options.length) % options.length];
}

export class MenuScene implements Scene {
  private readonly scenery = new Scenery();
  private selected = 0;
  private t = 0;
  /** Seconds left of the "need more rounds" nudge. */
  private nudge = 0;
  private readonly decor: BalloonLike[] = Array.from({ length: 7 }, (_, i) => ({
    x: 16 + i * 37,
    y: 30 + ((i * 53) % 110),
    letter: "pop"[i % 3],
    colour: i % BALLOON_COLOUR_COUNT,
  }));

  constructor(private readonly app: App) {
    this.selected = this.rows().indexOf("lesson");
  }

  /** Little hands always play 20 balloons without a rush and with the guide, so those rows go away. */
  private rows(): Row[] {
    const all: Row[] = ["player", "lesson", "difficulty", "speedMode", "length", "guide", "littleHands", "sound"];
    return this.app.player.littleHands ? all.filter((r) => r !== "speedMode" && r !== "length" && r !== "guide") : all;
  }

  update(dt: number, input: Frame): void {
    this.t += dt;
    this.nudge = Math.max(0, this.nudge - dt);
    this.scenery.update(dt);
    for (const b of this.decor) {
      b.y -= 9 * dt;
      if (b.y < -24) b.y = H + 20;
    }

    const rows = this.rows();
    for (const key of input.keys) {
      if (key === "ArrowUp") this.select(-1);
      else if (key === "ArrowDown") this.select(1);
      else if (key === "ArrowLeft") this.change(rows[this.selected], -1);
      else if (key === "ArrowRight") this.change(rows[this.selected], 1);
      else if (key === "Enter" || key === " ") this.start();
    }
    for (const { x, y } of input.clicks) {
      if (x < PANEL.x || x > PANEL.x + PANEL.w) continue;
      const row = Math.floor((y - ROW_Y + 2) / ROW_STEP);
      if (row >= 0 && row < rows.length) {
        this.selected = row;
        const nearLeftArrow = x >= PANEL.x + LEFT_ARROW - 6 && x < PANEL.x + LEFT_ARROW + 24;
        this.change(rows[row], nearLeftArrow ? -1 : 1);
      } else if (y >= PLAY_Y - 3 && y <= PLAY_Y + 10) {
        this.start();
      }
    }
  }

  private select(step: number): void {
    const count = this.rows().length;
    this.selected = (this.selected + step + count) % count;
    this.app.sfx.click();
  }

  private change(row: Row, step: number): void {
    const { app } = this;
    if (row === "player") {
      const profiles = listProfiles();
      const next = cycle(profiles.map((p) => p.id), app.player.profile.id, step);
      if (next) app.switchPlayer(next);
    } else if (row === "littleHands") {
      app.setLittleHands(!app.player.littleHands);
    } else {
      const s = app.settings;
      if (row === "lesson") s.lesson = cycle<LessonId>(LESSON_IDS, s.lesson, step);
      if (row === "difficulty") s.difficulty = cycle(DIFFICULTY_OPTIONS, s.difficulty, step);
      if (row === "speedMode") s.speedMode = cycle(SPEED_OPTIONS, s.speedMode, step);
      if (row === "length") s.length = cycle(LENGTH_OPTIONS, s.length, step);
      if (row === "guide") s.guide = cycle(GUIDE_MODES, s.guide, step);
      if (row === "sound") s.sound = !s.sound;
      app.saveSettings();
    }
    // Rows come and go with Little hands; stay on the row that was changed.
    this.selected = Math.max(0, this.rows().indexOf(row));
    app.sfx.click();
  }

  private start(): void {
    if (!this.app.player.practice(this.app.settings.lesson)) {
      this.nudge = 2;
      this.app.sfx.wrong();
      return;
    }
    this.app.startGame();
  }

  private valueLabel(row: Row): string {
    const s = this.app.settings;
    if (row === "player") return this.app.player.profile.name.toUpperCase().slice(0, VALUE_CHARS);
    if (row === "lesson") return lessonById(s.lesson).name;
    if (row === "difficulty") return s.difficulty.toUpperCase();
    if (row === "speedMode") return s.speedMode === "ramp" ? "SPEEDS UP" : "STEADY";
    if (row === "length") return s.length === "timed" ? `${ROUND_SECONDS / 60} MINUTES` : `${LIVES} LIVES`;
    if (row === "guide") return GUIDE_MODE_NAMES[s.guide].toUpperCase();
    if (row === "littleHands") return this.app.player.littleHands ? "ON" : "OFF";
    return s.sound ? "ON" : "OFF";
  }

  /** Two lines about the selected row: who's playing, what Little hands does, or the lesson's letters. */
  private drawHint(p: Pixels): void {
    // The Tricky letters nudge always shows, whichever row is selected.
    const row = this.nudge > 0 ? "lesson" : this.rows()[this.selected];
    if (row === "player") {
      p.centred("ADD PLAYERS ON THE HOME PAGE", W / 2, HINT_Y, C.slate);
      return;
    }
    if (row === "littleHands") {
      p.centred("GENTLER PLAY FOR YOUNGER", W / 2, HINT_Y, C.slate);
      p.centred("CHILDREN: NO RUSH, NO LIVES", W / 2, HINT_Y + 9, C.slate);
      return;
    }
    if (row === "length") {
      const timed = this.app.settings.length === "timed";
      p.centred(timed ? "ESCAPED BALLOONS COST POINTS" : "PLAY UNTIL THE LIVES RUN OUT", W / 2, HINT_Y, C.slate);
      return;
    }
    const { player, settings } = this.app;
    const nudging = this.nudge > 0;
    const practice = player.practice(settings.lesson);
    if (!practice) {
      p.centred("PLAY A FEW ROUNDS FIRST", W / 2, HINT_Y, nudging ? (blink(this.t, 4) ? C.orange : C.yellow) : C.slate);
      return;
    }
    const mine = settings.lesson === "mine";
    const newest = mine ? newestKeys(player.path) : [];
    if (settings.lesson === "all") p.centred("A TO Z", W / 2, HINT_Y, C.slate);
    else this.drawLetters(p, practice.keys, newest);
    if (mine) {
      const stage = `STAGE ${player.path.stage + 1} OF ${STAGES.length}`;
      p.centred(newest.length > 0 && player.path.stage > 0 ? `${stage}  NEW: ${newest.join(" ").toUpperCase()}` : stage, W / 2, HINT_Y + 9, C.slate);
    }
  }

  /** The lesson's letters in a centred line, the newest ones picked out in yellow. */
  private drawLetters(p: Pixels, keys: readonly string[], newest: readonly string[]): void {
    const spaced = keys.length <= 15;
    const step = spaced ? 12 : 6;
    let x = W / 2 - Math.floor(textWidth(spaced ? keys.join(" ") : keys.join("")) / 2);
    for (const k of keys) {
      p.text(k.toUpperCase(), x, HINT_Y, newest.includes(k) ? C.yellow : C.silver);
      x += step;
    }
  }

  draw(p: Pixels): void {
    this.scenery.draw(p);
    for (const b of this.decor) drawBalloon(p, b, this.t);

    p.centred("BALLOON POP", W / 2 + 1, 4, C.yellow, C.purple, 2);

    drawPanel(p, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    this.rows().forEach((row, i) => {
      const y = ROW_Y + i * ROW_STEP;
      const active = i === this.selected;
      if (active) p.rect(PANEL.x + 3, y - 2, PANEL.w - 6, ROW_STEP, C.navy);
      p.text(ROW_LABELS[row], PANEL.x + 10, y, active ? C.yellow : C.silver);
      p.text("<", PANEL.x + LEFT_ARROW, y, active ? C.yellow : C.charcoal);
      p.text(">", PANEL.x + RIGHT_ARROW, y, active ? C.yellow : C.charcoal);
      p.centred(this.valueLabel(row), PANEL.x + VALUE_X, y, C.white);
    });

    this.drawHint(p);
    if (blink(this.t, 1) || this.nudge > 0) p.centred("PRESS ENTER TO PLAY", W / 2, PLAY_Y, C.lime);
  }
}

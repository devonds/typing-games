import { BALLOON_COLOUR_COUNT, H, W } from "../config";
import { weakLetters } from "../game/stats";
import type { Frame } from "../input";
import { LESSON_IDS, lessonById, type LessonId } from "../lessons";
import { C } from "../look/palette";
import type { Pixels } from "../look/pixels";
import { Scenery } from "../look/scenery";
import { drawBalloon, type BalloonLike } from "../look/sprites";
import { blink, drawPanel } from "../look/ui";
import type { Difficulty, SpeedMode } from "../config";
import type { App, Scene } from "./scene";

const ROWS = ["lesson", "difficulty", "speedMode", "sound"] as const;
type Row = (typeof ROWS)[number];

const ROW_LABELS: Record<Row, string> = { lesson: "LESSON", difficulty: "LEVEL", speedMode: "SPEED", sound: "SOUND" };
const DIFFICULTY_OPTIONS: Difficulty[] = ["easy", "medium", "hard"];
const SPEED_OPTIONS: SpeedMode[] = ["ramp", "steady"];

const PANEL = { x: 40, y: 32, w: 176, h: 82 };
const ROW_Y = 40;
const ROW_STEP = 12;
const PLAY_Y = 102;

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

  constructor(private readonly app: App) {}

  update(dt: number, input: Frame): void {
    this.t += dt;
    this.nudge = Math.max(0, this.nudge - dt);
    this.scenery.update(dt);
    for (const b of this.decor) {
      b.y -= 9 * dt;
      if (b.y < -24) b.y = H + 20;
    }

    for (const key of input.keys) {
      if (key === "ArrowUp") this.select(-1);
      else if (key === "ArrowDown") this.select(1);
      else if (key === "ArrowLeft") this.change(ROWS[this.selected], -1);
      else if (key === "ArrowRight") this.change(ROWS[this.selected], 1);
      else if (key === "Enter" || key === " ") this.start();
    }
    for (const { x, y } of input.clicks) {
      if (x < PANEL.x || x > PANEL.x + PANEL.w) continue;
      const row = Math.floor((y - ROW_Y + 2) / ROW_STEP);
      if (row >= 0 && row < ROWS.length) {
        this.selected = row;
        const nearLeftArrow = x >= PANEL.x + 70 && x < PANEL.x + 100;
        this.change(ROWS[row], nearLeftArrow ? -1 : 1);
      } else if (y >= PLAY_Y - 3 && y <= PLAY_Y + 10) {
        this.start();
      }
    }
  }

  private select(step: number): void {
    this.selected = (this.selected + step + ROWS.length) % ROWS.length;
    this.app.sfx.click();
  }

  private change(row: Row, step: number): void {
    const s = this.app.settings;
    if (row === "lesson") s.lesson = cycle<LessonId>(LESSON_IDS, s.lesson, step);
    if (row === "difficulty") s.difficulty = cycle(DIFFICULTY_OPTIONS, s.difficulty, step);
    if (row === "speedMode") s.speedMode = cycle(SPEED_OPTIONS, s.speedMode, step);
    if (row === "sound") s.sound = !s.sound;
    this.app.saveSettings();
    this.app.sfx.click();
  }

  private start(): void {
    if (this.app.settings.lesson === "weak" && !weakLetters(this.app.stats)) {
      this.nudge = 2;
      this.app.sfx.wrong();
      return;
    }
    this.app.startGame();
  }

  private valueLabel(row: Row): string {
    const s = this.app.settings;
    if (row === "lesson") return lessonById(s.lesson).name;
    if (row === "difficulty") return s.difficulty.toUpperCase();
    if (row === "speedMode") return s.speedMode === "ramp" ? "SPEEDS UP" : "STEADY";
    return s.sound ? "ON" : "OFF";
  }

  /** The letters the chosen lesson will use, shown under the options. */
  private lessonHint(): string {
    const lesson = lessonById(this.app.settings.lesson);
    if (lesson.id === "all") return "A TO Z";
    const letters = lesson.letters ?? weakLetters(this.app.stats)?.join("");
    return letters ? letters.toUpperCase().split("").join(" ") : "PLAY A FEW ROUNDS FIRST";
  }

  draw(p: Pixels): void {
    this.scenery.draw(p);
    for (const b of this.decor) drawBalloon(p, b, this.t);

    p.centred("BALLOON POP", W / 2 + 1, 9, C.yellow, C.purple, 2);

    drawPanel(p, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    ROWS.forEach((row, i) => {
      const y = ROW_Y + i * ROW_STEP;
      const active = i === this.selected;
      if (active) p.rect(PANEL.x + 3, y - 2, PANEL.w - 6, 11, C.navy);
      p.text(ROW_LABELS[row], PANEL.x + 10, y, active ? C.yellow : C.silver);
      p.text("<", PANEL.x + 76, y, active ? C.yellow : C.charcoal);
      p.text(">", PANEL.x + 160, y, active ? C.yellow : C.charcoal);
      p.centred(this.valueLabel(row), PANEL.x + 121, y, C.white);
    });

    const hintColour = this.nudge > 0 ? (blink(this.t, 4) ? C.orange : C.yellow) : C.slate;
    p.centred(this.lessonHint(), W / 2, ROW_Y + ROWS.length * ROW_STEP + 2, hintColour);
    if (blink(this.t, 1) || this.nudge > 0) p.centred("PRESS ENTER TO PLAY", W / 2, PLAY_Y, C.lime);
  }
}

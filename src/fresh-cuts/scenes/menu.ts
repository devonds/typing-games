import type { Frame } from "../../shared/input";
import { LESSON_IDS, lessonById, type LessonId } from "../../shared/lessons";
import { weakLetters } from "../../shared/letters";
import { FRUIT_KINDS, H, W, type Difficulty, type SpeedMode } from "../config";
import { FRUIT, drawShadow, drawWhole } from "../look/fruit";
import { drawStore, drawVignette } from "../look/store";
import { GOLD, INK, SERIF, blink, drawPanel, roundRect, text } from "../look/ui";
import type { App, Scene } from "./scene";

const ROWS = ["lesson", "difficulty", "speedMode", "rotten", "sound"] as const;
type Row = (typeof ROWS)[number];

const ROW_LABELS: Record<Row, string> = {
  lesson: "Lesson",
  difficulty: "Level",
  speedMode: "Speed",
  rotten: "Rotten fruit",
  sound: "Sound",
};
const DIFFICULTY_OPTIONS: Difficulty[] = ["easy", "medium", "hard"];
const SPEED_OPTIONS: SpeedMode[] = ["ramp", "steady"];

const PANEL = { x: 110, y: 64, w: 260, h: 172 };
const ROW_Y = 86;
const ROW_STEP = 19;
const VALUE_X = 300;
const PLAY_Y = 216;

function cycle<T>(options: readonly T[], current: T, step: number): T {
  const i = options.indexOf(current);
  return options[(i + step + options.length) % options.length];
}

/** "HOME ROW" -> "Home row" */
function sentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export class MenuScene implements Scene {
  private selected = 0;
  private t = 0;
  /** Seconds left of the "need more rounds" nudge. */
  private nudge = 0;

  constructor(private readonly app: App) {}

  update(dt: number, input: Frame): void {
    this.t += dt;
    this.nudge = Math.max(0, this.nudge - dt);
    for (const key of input.keys) {
      if (key === "ArrowUp") this.select(-1);
      else if (key === "ArrowDown") this.select(1);
      else if (key === "ArrowLeft") this.change(ROWS[this.selected], -1);
      else if (key === "ArrowRight") this.change(ROWS[this.selected], 1);
      else if (key === "Enter" || key === " ") this.start();
    }
    for (const { x, y } of input.clicks) {
      if (x < PANEL.x || x > PANEL.x + PANEL.w) continue;
      const row = Math.round((y - ROW_Y) / ROW_STEP);
      if (row >= 0 && row < ROWS.length && Math.abs(y - (ROW_Y + row * ROW_STEP)) < ROW_STEP / 2) {
        this.selected = row;
        this.change(ROWS[row], x < VALUE_X ? -1 : 1);
      } else if (Math.abs(y - PLAY_Y) < 10) {
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
    if (row === "rotten") s.rotten = !s.rotten;
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
    if (row === "lesson") return sentenceCase(lessonById(s.lesson).name);
    if (row === "difficulty") return sentenceCase(s.difficulty);
    if (row === "speedMode") return s.speedMode === "ramp" ? "Speeds up" : "Steady";
    if (row === "rotten") return s.rotten ? "On" : "Off";
    return s.sound ? "On" : "Off";
  }

  /** The letters the chosen lesson will use, shown under the options. */
  private lessonHint(): string {
    const lesson = lessonById(this.app.settings.lesson);
    if (lesson.id === "all") return "A to Z";
    const letters = lesson.letters ?? weakLetters(this.app.stats)?.join("");
    return letters ? letters.toUpperCase().split("").join(" ") : "Play a few rounds first";
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawStore(ctx);
    // A few pieces of fruit turning slowly either side of the menu.
    FRUIT_KINDS.slice(0, 6).forEach((kind, i) => {
      const x = i < 3 ? 52 : W - 52;
      const y = 92 + (i % 3) * 56 + Math.sin(this.t * 1.3 + i) * 4;
      const rot = Math.sin(this.t * 0.7 + i * 2) * 0.4;
      drawShadow(ctx, FRUIT[kind], x, y, rot);
      drawWhole(ctx, FRUIT[kind], x, y, rot, 1.15);
    });
    drawVignette(ctx);

    drawPanel(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    ROWS.forEach((row, i) => {
      const y = ROW_Y + i * ROW_STEP;
      const active = i === this.selected;
      if (active) {
        roundRect(ctx, PANEL.x + 8, y - 8, PANEL.w - 16, 16, 3);
        ctx.fillStyle = "rgba(201,164,92,0.16)";
        ctx.fill();
      }
      text(ctx, ROW_LABELS[row], PANEL.x + 20, y, `italic 10px ${SERIF}`, active ? GOLD.pale : GOLD.brass, "left");
      text(ctx, "‹", VALUE_X - 52, y - 1, `13px ${SERIF}`, active ? GOLD.pale : INK.dim);
      text(ctx, "›", VALUE_X + 52, y - 1, `13px ${SERIF}`, active ? GOLD.pale : INK.dim);
      text(ctx, this.valueLabel(row), VALUE_X, y, `600 10px ${SERIF}`, INK.cream);
    });

    const hintColour = this.nudge > 0 ? (blink(this.t, 4) ? "#ff9a5a" : GOLD.pale) : INK.dim;
    text(ctx, this.lessonHint(), W / 2, ROW_Y + ROWS.length * ROW_STEP + 1, `9px ${SERIF}`, hintColour);
    if (blink(this.t, 1) || this.nudge > 0) text(ctx, "Press Enter to play", W / 2, PLAY_Y, `italic 600 12px ${SERIF}`, GOLD.pale);
    text(ctx, "↑ ↓ choose   ← → change", W / 2, H - 14, `8px ${SERIF}`, INK.dim);
  }
}

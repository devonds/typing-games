import type { Frame } from "../../shared/input";
import { LESSON_IDS, lessonById, type LessonId } from "../../shared/lessons";
import { weakLetters } from "../../shared/letters";
import { BURSTS, BURST_NAMES, H, LEVEL_NAMES, ROUND_LENGTHS, W, type BurstChoice, type Level } from "../config";
import { Landscape } from "../look/landscape";
import { Sky } from "../look/palette";
import { SANS, SERIF, drawPanel, text } from "../look/ui";
import type { App, Scene } from "./scene";

const ROWS = ["lesson", "level", "length", "bursts", "sound"] as const;
type Row = (typeof ROWS)[number];

const ROW_LABELS: Record<Row, string> = {
  lesson: "Focus",
  level: "Sentences",
  length: "Round",
  bursts: "Letters turn into",
  sound: "Sound",
};
const LEVELS: Level[] = ["short", "long"];
const BURST_CHOICES: BurstChoice[] = ["random", ...BURSTS];

const PANEL = { x: 120, y: 86, w: 240, h: 113 };
const ROW_Y = 104;
const ROW_STEP = 19;
const VALUE_X = 296;
const PLAY_Y = 232;
/** With "random" chosen, the menu's sky drifts through every time of day. */
const SKY_CYCLE = 6;

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
  private readonly landscape = new Landscape();
  private readonly sky: Sky;
  private skyIndex = 0;

  constructor(private readonly app: App) {
    const b = app.settings.bursts;
    this.skyIndex = b === "random" ? 0 : BURSTS.indexOf(b);
    this.sky = new Sky(BURSTS[this.skyIndex], 2.5);
    for (let i = 0; i < 60; i++) this.landscape.update(1 / 60);
  }

  update(dt: number, input: Frame): void {
    this.t += dt;
    this.nudge = Math.max(0, this.nudge - dt);
    this.landscape.update(dt);
    this.sky.update(dt);
    const b = this.app.settings.bursts;
    if (b === "random") {
      const index = Math.floor(this.t / SKY_CYCLE) % BURSTS.length;
      if (index !== this.skyIndex) {
        this.skyIndex = index;
        this.sky.go(BURSTS[index]);
      }
    } else this.sky.go(b);

    for (const key of input.keys) {
      if (key === "ArrowUp") this.select(-1);
      else if (key === "ArrowDown") this.select(1);
      else if (key === "ArrowLeft") this.change(ROWS[this.selected], -1);
      else if (key === "ArrowRight") this.change(ROWS[this.selected], 1);
      else if (key === "Enter" || key === " ") this.start();
    }
    for (const { x, y } of input.clicks) {
      const row = Math.round((y - ROW_Y) / ROW_STEP);
      if (x >= PANEL.x && x <= PANEL.x + PANEL.w && row >= 0 && row < ROWS.length && Math.abs(y - (ROW_Y + row * ROW_STEP)) < ROW_STEP / 2) {
        this.selected = row;
        this.change(ROWS[row], x < VALUE_X ? -1 : 1);
      } else if (Math.abs(y - PLAY_Y) < 12) {
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
    if (row === "level") s.level = cycle(LEVELS, s.level, step);
    if (row === "length") s.length = cycle(ROUND_LENGTHS, s.length, step);
    if (row === "bursts") s.bursts = cycle(BURST_CHOICES, s.bursts, step);
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
    if (row === "level") return LEVEL_NAMES[s.level];
    if (row === "length") return `${s.length} sentences`;
    if (row === "bursts") return s.bursts === "random" ? "Surprise me" : BURST_NAMES[s.bursts];
    return s.sound ? "On" : "Off";
  }

  /** What the Focus setting means, shown under the panel. */
  private focusHint(): string {
    const lesson = lessonById(this.app.settings.lesson);
    if (lesson.id === "all") return "Sentences use every letter";
    const letters = lesson.letters ?? weakLetters(this.app.stats)?.join("");
    if (!letters) return "Play a few rounds first to find your tricky letters";
    return `More sentences with ${letters.toUpperCase().split("").join(" ")}`;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const p = this.sky.current;
    this.landscape.draw(ctx, p);

    text(ctx, "Word Garden", W / 2, 44, `italic 600 38px ${SERIF}`, p.ink, "center", p.textGlow);
    text(ctx, "Type the sentence and watch every letter bloom", W / 2, 70, `500 10px ${SANS}`, p.inkSoft, "center", p.textGlow);

    drawPanel(ctx, p, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    ROWS.forEach((row, i) => {
      const y = ROW_Y + i * ROW_STEP;
      const active = i === this.selected;
      if (active) {
        ctx.beginPath();
        ctx.roundRect(PANEL.x + 8, y - 8.5, PANEL.w - 16, 17, 8.5);
        ctx.fillStyle = p.panelEdge;
        ctx.fill();
      }
      text(ctx, ROW_LABELS[row], PANEL.x + 20, y, `500 9.5px ${SANS}`, active ? p.ink : p.inkSoft, "left");
      text(ctx, "‹", VALUE_X - 56, y - 0.5, `600 12px ${SANS}`, active ? p.ink : p.inkSoft);
      text(ctx, "›", VALUE_X + 56, y - 0.5, `600 12px ${SANS}`, active ? p.ink : p.inkSoft);
      text(ctx, this.valueLabel(row), VALUE_X, y, `600 9.5px ${SANS}`, p.ink);
    });

    const nudging = this.nudge > 0 && Math.floor(this.nudge * 4) % 2 === 0;
    text(ctx, this.focusHint(), W / 2, PANEL.y + PANEL.h + 10, `500 8.5px ${SANS}`, nudging ? p.accent : p.inkSoft, "center", p.textGlow);
    // A gentle pulse rather than a blink.
    ctx.save();
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(this.t * 3);
    text(ctx, "Press Enter to play", W / 2, PLAY_Y, `italic 600 14px ${SERIF}`, p.ink, "center", p.textGlow);
    ctx.restore();
    text(ctx, "↑ ↓ choose    ← → change", W / 2, H - 13, `500 8px ${SANS}`, p.inkSoft, "center", p.textGlow);
    this.landscape.drawAtmosphere(ctx, p);
  }
}

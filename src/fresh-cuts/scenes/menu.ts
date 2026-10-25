import { GUIDE_MODES, GUIDE_MODE_NAMES } from "../../shared/guide";
import type { Frame } from "../../shared/input";
import { LESSON_IDS, lessonById, type LessonId } from "../../shared/lessons";
import { STAGES, newestKeys } from "../../shared/path";
import { listProfiles, setCurrent, updateProfile } from "../../shared/profiles";
import { FRUIT_KINDS, H, LITTLE_HANDS, LIVES, TIMED, W, type Difficulty, type RoundLength, type SpeedMode } from "../config";
import { FRUIT, drawShadow, drawWhole } from "../look/fruit";
import { drawStore, drawVignette } from "../look/store";
import { GOLD, INK, SERIF, blink, drawPanel, roundRect, text } from "../look/ui";
import type { App, Scene } from "./scene";

const ROWS = ["player", "lesson", "difficulty", "speedMode", "length", "rotten", "guide", "littleHands", "sound"] as const;
type Row = (typeof ROWS)[number];

const ROW_LABELS: Record<Row, string> = {
  player: "Player",
  lesson: "Lesson",
  difficulty: "Level",
  speedMode: "Speed",
  length: "Round",
  rotten: "Rotten fruit",
  guide: "Finger guide",
  littleHands: "Little hands",
  sound: "Sound",
};
/** Rows that Little hands decides for you: shown dimmed, with the value it uses. */
const SET_BY_LITTLE_HANDS: Partial<Record<Row, string>> = { speedMode: "Gentle", length: `${LITTLE_HANDS.fruit} fruit`, rotten: "Off", guide: "Always" };
const DIFFICULTY_OPTIONS: Difficulty[] = ["easy", "medium", "hard"];
const SPEED_OPTIONS: SpeedMode[] = ["ramp", "steady"];
const LENGTH_OPTIONS: RoundLength[] = ["baskets", "timed"];

const PANEL = { x: 110, y: 58, w: 260, h: 194 };
const ROW_Y = 74;
const ROW_STEP = 14.5;
/** The player row sits a little apart from the game's settings, under a hairline. */
const PLAYER_GAP = 5;
const VALUE_X = 300;
const HINT_Y = 211;
const PLAY_Y = 233;

function rowY(i: number): number {
  return ROW_Y + i * ROW_STEP + (i > 0 ? PLAYER_GAP : 0);
}

function cycle<T>(options: readonly T[], current: T, step: number): T {
  const i = options.indexOf(current);
  return options[(i + step + options.length) % options.length];
}

/** "HOME ROW" -> "Home row" */
function sentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Pieces of text in different styles, drawn one after another on a line centred on `cx`. */
function drawRun(ctx: CanvasRenderingContext2D, parts: { s: string; font: string; fill: string }[], cx: number, y: number): void {
  const widths = parts.map((p) => {
    ctx.font = p.font;
    return ctx.measureText(p.s).width;
  });
  let x = cx - widths.reduce((a, b) => a + b, 0) / 2;
  parts.forEach((p, i) => {
    text(ctx, p.s, x, y, p.font, p.fill, "left");
    x += widths[i];
  });
}

export class MenuScene implements Scene {
  private selected = 1;
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
      const row = ROWS.findIndex((_, i) => Math.abs(y - rowY(i)) < ROW_STEP / 2);
      if (row >= 0) {
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
    const { player } = this.app;
    if (player.littleHands && SET_BY_LITTLE_HANDS[row]) return;
    if (row === "player") {
      const profiles = listProfiles();
      if (profiles.length < 2) return;
      const i = profiles.findIndex((p) => p.id === player.profile.id);
      setCurrent(profiles[(i + step + profiles.length) % profiles.length].id);
      this.app.reloadPlayer();
    } else if (row === "littleHands") {
      updateProfile(player.profile.id, { littleHands: !player.littleHands });
      this.app.reloadPlayer();
    } else {
      const s = this.app.settings;
      if (row === "lesson") s.lesson = cycle<LessonId>(LESSON_IDS, s.lesson, step);
      if (row === "difficulty") s.difficulty = cycle(DIFFICULTY_OPTIONS, s.difficulty, step);
      if (row === "speedMode") s.speedMode = cycle(SPEED_OPTIONS, s.speedMode, step);
      if (row === "length") s.length = cycle(LENGTH_OPTIONS, s.length, step);
      if (row === "rotten") s.rotten = !s.rotten;
      if (row === "guide") s.guide = cycle(GUIDE_MODES, s.guide, step);
      if (row === "sound") s.sound = !s.sound;
      this.app.saveSettings();
    }
    this.app.sfx.click();
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
    const { player } = this.app;
    if (player.littleHands && SET_BY_LITTLE_HANDS[row]) return SET_BY_LITTLE_HANDS[row]!;
    if (row === "player") return player.profile.name;
    if (row === "lesson") return sentenceCase(lessonById(s.lesson).name);
    if (row === "difficulty") return sentenceCase(s.difficulty);
    if (row === "speedMode") return s.speedMode === "ramp" ? "Speeds up" : "Steady";
    if (row === "length") return s.length === "timed" ? `${TIMED.seconds / 60} minutes` : `${LIVES} baskets`;
    if (row === "rotten") return s.rotten ? "On" : "Off";
    if (row === "guide") return GUIDE_MODE_NAMES[s.guide];
    if (row === "littleHands") return player.littleHands ? "On" : "Off";
    return s.sound ? "On" : "Off";
  }

  /** Under the options: the letters the chosen lesson will use. For My keys, the newest ones stand out. */
  private drawLessonHint(ctx: CanvasRenderingContext2D, y: number): void {
    const { player, settings } = this.app;
    const nudging = this.nudge > 0;
    const plain = { font: `9px ${SERIF}`, fill: nudging ? (blink(this.t, 4) ? "#ff9a5a" : GOLD.pale) : INK.dim };
    const lesson = lessonById(settings.lesson);
    if (lesson.id === "mine") {
      const newest = new Set(newestKeys(player.path));
      const parts = player.myKeys.map((k) => (newest.has(k) ? { s: `${k.toUpperCase()} `, font: `700 9px ${SERIF}`, fill: GOLD.pale } : { s: `${k.toUpperCase()} `, ...plain }));
      parts.push({ s: `  ·  Stage ${player.path.stage + 1} of ${STAGES.length}`, font: `italic 8px ${SERIF}`, fill: GOLD.brass });
      return drawRun(ctx, parts, W / 2, y);
    }
    if (lesson.id === "all") return text(ctx, "A to Z", W / 2, y, plain.font, plain.fill);
    if (lesson.id === "weak") {
      const practice = player.practice("weak");
      if (!practice) return text(ctx, "Play a few rounds first", W / 2, y, plain.font, plain.fill);
      const neediest = [...practice.weights].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k.toUpperCase());
      return text(ctx, `Most of all: ${neediest.join(" ")}`, W / 2, y, plain.font, plain.fill);
    }
    text(ctx, (lesson.letters ?? "").toUpperCase().split("").join(" "), W / 2, y, plain.font, plain.fill);
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
    const { player } = this.app;
    const manyPlayers = listProfiles().length > 1;
    ROWS.forEach((row, i) => {
      const y = rowY(i);
      const active = i === this.selected;
      const fixed = player.littleHands && !!SET_BY_LITTLE_HANDS[row];
      const arrows = !fixed && (row !== "player" || manyPlayers);
      if (active) {
        roundRect(ctx, PANEL.x + 8, y - 7, PANEL.w - 16, 14, 3);
        ctx.fillStyle = "rgba(201,164,92,0.16)";
        ctx.fill();
      }
      ctx.globalAlpha = fixed ? 0.45 : 1;
      text(ctx, ROW_LABELS[row], PANEL.x + 20, y, `italic 10px ${SERIF}`, active ? GOLD.pale : GOLD.brass, "left");
      if (arrows) {
        text(ctx, "‹", VALUE_X - 52, y - 1, `13px ${SERIF}`, active ? GOLD.pale : INK.dim);
        text(ctx, "›", VALUE_X + 52, y - 1, `13px ${SERIF}`, active ? GOLD.pale : INK.dim);
      }
      const value = this.valueLabel(row);
      text(ctx, value, VALUE_X, y, `${row === "player" ? "italic 700" : "600"} 10px ${SERIF}`, row === "player" ? GOLD.pale : INK.cream);
      ctx.globalAlpha = 1;
    });
    // A hairline between who's playing and how.
    ctx.fillStyle = "rgba(201,164,92,0.35)";
    ctx.fillRect(PANEL.x + 20, (rowY(0) + rowY(1)) / 2, PANEL.w - 40, 0.5);

    this.drawLessonHint(ctx, HINT_Y);
    if (blink(this.t, 1) || this.nudge > 0) text(ctx, "Press Enter to play", W / 2, PLAY_Y, `italic 600 12px ${SERIF}`, GOLD.pale);
    const footer = ROWS[this.selected] === "player" ? "New players are added on the home page" : "↑ ↓ choose   ← → change";
    text(ctx, footer, W / 2, H - 12, `8px ${SERIF}`, INK.dim);
  }
}

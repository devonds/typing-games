import { GUIDE_MODES, GUIDE_MODE_NAMES } from "../../shared/guide";
import type { Frame } from "../../shared/input";
import { LESSON_IDS, lessonById } from "../../shared/lessons";
import { STAGES, finished, newestKeys } from "../../shared/path";
import { listProfiles } from "../../shared/profiles";
import { TODAY, practiceState } from "../../shared/session";
import { BURSTS, BURST_NAMES, H, LEVEL_NAMES, ROUND_CHOICES, W, type BurstChoice, type FocusChoice, type Level } from "../config";
import { ownLines } from "../game/own";
import { loadMarks, loadOwn } from "../storage";
import { Landscape } from "../look/landscape";
import { Sky, type Palette } from "../look/palette";
import { SANS, SERIF, drawPanel, text } from "../look/ui";
import type { App, Scene } from "./scene";

const ROWS = ["player", "lesson", "level", "length", "bursts", "guide", "little", "sound"] as const;
type Row = (typeof ROWS)[number];

const ROW_LABELS: Record<Row, string> = {
  player: "Player",
  lesson: "Focus",
  level: "Sentences",
  length: "Round",
  bursts: "Letters turn into",
  guide: "Finger guide",
  little: "Little hands",
  sound: "Sound",
};
const LEVELS: Level[] = ["short", "long"];
const FOCUS_CHOICES: FocusChoice[] = [...LESSON_IDS, "own"];
const BURST_CHOICES: BurstChoice[] = ["random", ...BURSTS];

const PANEL = { x: 120, y: 68, w: 240, h: 138 };
const ROW_Y = 84;
const ROW_STEP = 15.3;
const VALUE_X = 296;
const HINT_Y = PANEL.y + PANEL.h + 10;
const PLAY_Y = 236;
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

/** A line of text in pieces of different colours, centred on x. */
function drawPieces(ctx: CanvasRenderingContext2D, pieces: [string, string][], x: number, y: number, font: string, glow: string): void {
  ctx.save();
  ctx.font = font;
  const width = pieces.reduce((w, [s]) => w + ctx.measureText(s).width, 0);
  let left = x - width / 2;
  ctx.restore();
  for (const [s, colour] of pieces) {
    text(ctx, s, left, y, font, colour, "left", glow);
    ctx.save();
    ctx.font = font;
    left += ctx.measureText(s).width;
    ctx.restore();
  }
}

export class MenuScene implements Scene {
  private selected = 1;
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
      else if (key === "e" && this.app.settings.lesson === "own") this.app.editOwnWords();
    }
    for (const { x, y } of input.clicks) {
      const row = Math.round((y - ROW_Y) / ROW_STEP);
      if (x >= PANEL.x && x <= PANEL.x + PANEL.w && row >= 0 && row < ROWS.length && Math.abs(y - (ROW_Y + row * ROW_STEP)) < ROW_STEP / 2) {
        this.selected = row;
        this.change(ROWS[row], x < VALUE_X ? -1 : 1);
      } else if (Math.abs(y - PLAY_Y) < 12) {
        this.start();
      } else if (Math.abs(y - HINT_Y) < 7 && this.app.settings.lesson === "own") {
        this.app.editOwnWords();
      }
    }
  }

  private select(step: number): void {
    this.selected = (this.selected + step + ROWS.length) % ROWS.length;
    this.app.sfx.click();
  }

  /** Little hands always get short sentences and the full finger guide, so those rows are set for them. */
  private locked(row: Row): boolean {
    return this.app.player.littleHands && (row === "level" || row === "guide");
  }

  private change(row: Row, step: number): void {
    if (this.locked(row)) return;
    if (row === "player") {
      if (listProfiles().length < 2) return;
      this.app.switchPlayer(step);
      this.app.sfx.click();
      return;
    }
    if (row === "little") {
      this.app.setLittleHands(!this.app.player.littleHands);
      this.app.sfx.click();
      return;
    }
    const s = this.app.settings;
    if (row === "lesson") s.lesson = cycle(FOCUS_CHOICES, s.lesson, step);
    if (row === "level") s.level = cycle(LEVELS, s.level, step);
    // Little hands don't take the one-minute check.
    if (row === "length") s.length = cycle(this.app.player.littleHands ? ROUND_CHOICES.filter((c) => c !== "check") : ROUND_CHOICES, s.length, step);
    if (row === "bursts") s.bursts = cycle(BURST_CHOICES, s.bursts, step);
    if (row === "guide") s.guide = cycle(GUIDE_MODES, s.guide, step);
    if (row === "sound") s.sound = !s.sound;
    this.app.saveSettings();
    this.app.sfx.click();
  }

  /** Our words, as lines to type (none until a parent adds some). */
  private ownLines(): string[] {
    return ownLines(loadOwn(this.app.player).text);
  }

  private start(): void {
    const { lesson } = this.app.settings;
    // Choosing Our words with nothing in it opens the box to add some.
    if (lesson === "own" && this.ownLines().length === 0 && !this.sessionStep()) return this.app.editOwnWords();
    if (lesson !== "own" && !this.sessionStep() && this.app.player.practice(lesson) === null) {
      this.nudge = 2;
      this.app.sfx.wrong();
      return;
    }
    this.app.startGame();
  }

  private valueLabel(row: Row): string {
    const s = this.app.settings;
    const little = this.app.player.littleHands;
    if (row === "player") return this.app.player.profile.name;
    if (row === "lesson") return s.lesson === "own" ? "Our words" : sentenceCase(lessonById(s.lesson).name);
    if (row === "level") return little ? "Short" : LEVEL_NAMES[s.level];
    if (row === "length") return s.length === "check" ? (little ? "5 sentences" : "1-minute check") : `${s.length} sentences`;
    if (row === "bursts") return s.bursts === "random" ? "Surprise me" : BURST_NAMES[s.bursts];
    if (row === "guide") return little ? "Always" : GUIDE_MODE_NAMES[s.guide];
    if (row === "little") return little ? "On" : "Off";
    return s.sound ? "On" : "Off";
  }

  /** Today's practice has been started from the home page: the next round is it. */
  private sessionStep(): boolean {
    const { player } = this.app;
    return practiceState(player.profile.id, player.today) === "started";
  }

  /** The quiet line under the panel: about the chosen row where it needs explaining, otherwise about Focus. */
  private drawHint(ctx: CanvasRenderingContext2D, p: Palette): void {
    const row = ROWS[this.selected];
    const font = `500 8.5px ${SANS}`;
    const say = (s: string, colour = p.inkSoft) => text(ctx, s, W / 2, HINT_Y, font, colour, "center", p.textGlow);
    // While nudging about Tricky letters, the Focus line takes over.
    if (this.nudge <= 0 && row === "player") return say(listProfiles().length < 2 ? "Add more players on the home page" : "Add or change players on the home page");
    if (this.nudge <= 0 && row === "little") return say("For younger children: bigger letters, no speed, the finger guide always on");
    if (this.nudge <= 0 && row === "length" && this.app.settings.length === "check" && !this.app.player.littleHands) {
      return say("A minute of fresh sentences, for a words-per-minute you can compare");
    }
    if (this.nudge <= 0 && this.sessionStep()) {
      const count = this.app.player.littleHands ? TODAY.littleHands : TODAY.sentences;
      return say(`Today's practice: ${count} sentences of ${sentenceCase(lessonById(TODAY.lesson).name)}, then you're done`, p.accent);
    }
    if (this.nudge <= 0 && this.locked(row)) return say("Set for Little hands");

    const player = this.app.player;
    if (this.app.settings.lesson === "own") {
      const lines = this.ownLines().length;
      return say(lines === 0 ? "Add your own words: press Enter" : `${lines} ${lines === 1 ? "line" : "lines"} of your own  ·  press E to edit`);
    }
    const lesson = lessonById(this.app.settings.lesson);
    if (lesson.id === "mine") {
      // The keys unlocked so far, the newest ones picked out, and where they are on the path.
      const newest = new Set(newestKeys(player.path));
      const pieces: [string, string][] = player.myKeys.map((k) => [`${k.toUpperCase()} `, newest.has(k) ? p.accent : p.inkSoft]);
      // Past the last letter stage: capitals, then punctuation (never for little hands).
      const marks = loadMarks(player);
      const late = player.littleHands || !finished(player.path) ? null : marks.punctuation ? "now with capitals and punctuation" : marks.capitals ? "now with capitals" : null;
      if (late) return say(`All 26 letters, ${late}`);
      pieces.push([`  ·  Stage ${Math.min(player.path.stage, STAGES.length - 1) + 1} of ${STAGES.length}`, p.inkSoft]);
      drawPieces(ctx, pieces, W / 2, HINT_Y, font, p.textGlow);
      return;
    }
    if (lesson.id === "all") return say("Sentences use every letter, the trickiest more often");
    const practice = player.practice(lesson.id);
    if (!practice) {
      const nudging = this.nudge > 0 && Math.floor(this.nudge * 4) % 2 === 0;
      return say("Play a few rounds first to find your tricky letters", nudging ? p.accent : p.inkSoft);
    }
    const letters = lesson.letters ?? [...practice.weights].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k).join("");
    say(`More sentences with ${letters.toUpperCase().split("").join(" ")}`);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const p = this.sky.current;
    this.landscape.draw(ctx, p);

    text(ctx, "Word Garden", W / 2, 34, `italic 600 34px ${SERIF}`, p.ink, "center", p.textGlow);
    text(ctx, "Type the sentence and watch every letter bloom", W / 2, 57, `500 9.5px ${SANS}`, p.inkSoft, "center", p.textGlow);

    drawPanel(ctx, p, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    const single = listProfiles().length < 2;
    ROWS.forEach((row, i) => {
      const y = ROW_Y + i * ROW_STEP;
      const active = i === this.selected;
      if (active) {
        ctx.beginPath();
        ctx.roundRect(PANEL.x + 8, y - 7, PANEL.w - 16, 14, 7);
        ctx.fillStyle = p.panelEdge;
        ctx.fill();
      }
      const fixed = this.locked(row) || (row === "player" && single);
      text(ctx, ROW_LABELS[row], PANEL.x + 20, y, `500 9px ${SANS}`, active ? p.ink : p.inkSoft, "left");
      if (!fixed) {
        text(ctx, "‹", VALUE_X - 56, y - 0.5, `600 11px ${SANS}`, active ? p.ink : p.inkSoft);
        text(ctx, "›", VALUE_X + 56, y - 0.5, `600 11px ${SANS}`, active ? p.ink : p.inkSoft);
      }
      text(ctx, this.valueLabel(row), VALUE_X, y, `600 9px ${SANS}`, fixed ? p.inkSoft : p.ink);
    });

    this.drawHint(ctx, p);
    // A gentle pulse rather than a blink.
    ctx.save();
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(this.t * 3);
    text(ctx, "Press Enter to play", W / 2, PLAY_Y, `italic 600 14px ${SERIF}`, p.ink, "center", p.textGlow);
    ctx.restore();
    text(ctx, "↑ ↓ choose    ← → change", W / 2, H - 13, `500 8px ${SANS}`, p.inkSoft, "center", p.textGlow);
    this.landscape.drawAtmosphere(ctx, p);
  }
}

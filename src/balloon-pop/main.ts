// Boots the game: canvas, input, sound, saved data, the scene switcher and the main loop.
import { Sfx } from "./audio";
import { H, W } from "./config";
import { Input, NO_INPUT } from "../shared/input";
import { lettersFor } from "../shared/lessons";
import { mergeRound, type Stats } from "../shared/letters";
import { loadLetterHistory, saveLetterHistory } from "../shared/storage";
import { Pixels } from "./look/pixels";
import type { Scenery } from "./look/scenery";
import { MenuScene } from "./scenes/menu";
import { PlayScene } from "./scenes/play";
import { ResultsScene } from "./scenes/results";
import type { App, RoundResult, Scene } from "./scenes/scene";
import * as storage from "./storage";

const canvas = document.getElementById("game") as HTMLCanvasElement;
canvas.width = W;
canvas.height = H;
const pixels = new Pixels(canvas.getContext("2d", { alpha: false })!);

/** Scale the tiny canvas up by the largest whole number that fits, so pixels stay square and sharp. */
function fit(): void {
  const fits = Math.min(innerWidth / W, innerHeight / H);
  const scale = fits >= 1 ? Math.floor(fits) : fits;
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
}
addEventListener("resize", fit);
fit();

const sfx = new Sfx();
const input = new Input(canvas, { width: W, height: H }, () => sfx.unlock());
let scene: Scene;

class Game implements App {
  readonly settings = storage.loadSettings();
  readonly sfx = sfx;
  private history: Stats = loadLetterHistory();
  private best = storage.loadBest();

  constructor() {
    sfx.enabled = this.settings.sound;
  }

  get stats(): Stats {
    return this.history;
  }

  saveSettings(): void {
    storage.saveSettings(this.settings);
    sfx.enabled = this.settings.sound;
  }

  finishRound(round: Stats): void {
    if (Object.keys(round).length === 0) return;
    this.history = mergeRound(this.history, round);
    saveLetterHistory(this.history);
  }

  submitScore(score: number): number {
    const { lesson, difficulty, speedMode } = this.settings;
    const key = `${lesson}/${difficulty}/${speedMode}`;
    const before = this.best[key] ?? 0;
    if (score > before) {
      this.best[key] = score;
      storage.saveBest(this.best);
    }
    return before;
  }

  showMenu(): void {
    scene = new MenuScene(this);
  }

  startGame(): void {
    const letters = lettersFor(this.settings.lesson, this.history);
    if (!letters) return this.showMenu(); // "weak letters" without enough history; the menu explains
    scene = new PlayScene(this, letters);
  }

  showResults(result: RoundResult, scenery: Scenery): void {
    scene = new ResultsScene(this, result, scenery);
  }
}

new Game().showMenu();

// Pause when the player switches tabs or windows.
document.addEventListener("visibilitychange", () => document.hidden && scene.pause?.());
addEventListener("blur", () => scene.pause?.());

// Fixed 60 updates a second, however fast the screen refreshes. Drawing happens once per frame.
const STEP = 1 / 60;
let last = performance.now();
let backlog = 0;

function frame(now: number): void {
  backlog += Math.min((now - last) / 1000, 0.25); // after a long stall, don't fast-forward for ages
  last = now;
  if (backlog >= STEP) {
    let frameInput = input.drain();
    while (backlog >= STEP) {
      scene.update(STEP, frameInput);
      frameInput = NO_INPUT;
      backlog -= STEP;
    }
  }
  scene.draw(pixels);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

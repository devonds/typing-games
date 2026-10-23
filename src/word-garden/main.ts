// Boots the game: canvas, input, sound, saved data, the scene switcher and the main loop.
import { Input, NO_INPUT } from "../shared/input";
import { mergeRound, type Stats } from "../shared/letters";
import { loadLetterHistory, saveLetterHistory } from "../shared/storage";
import { Sfx } from "./audio";
import { H, W } from "./config";
import { MenuScene } from "./scenes/menu";
import { PlayScene } from "./scenes/play";
import { ResultsScene } from "./scenes/results";
import type { App, RoundResult, Scene } from "./scenes/scene";
import * as storage from "./storage";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d", { alpha: false })!;

/** Fill the window (keeping 16:9), drawing at the screen's full resolution so everything stays crisp. */
function fit(): void {
  const scale = Math.min(innerWidth / W, innerHeight / H);
  const dpr = devicePixelRatio || 1;
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
  canvas.width = Math.floor(W * scale * dpr);
  canvas.height = Math.floor(H * scale * dpr);
}
addEventListener("resize", fit);
fit();

const sfx = new Sfx();
const input = new Input(canvas, { width: W, height: H }, () => sfx.unlock());
let scene: Scene;

class Game implements App {
  readonly settings = storage.loadSettings();
  readonly sfx = sfx;
  recent: string[] = [];
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

  submitWpm(wpm: number): number {
    const key = this.settings.level;
    const before = this.best[key] ?? 0;
    if (wpm > before) {
      this.best[key] = wpm;
      storage.saveBest(this.best);
    }
    return before;
  }

  showMenu(): void {
    scene = new MenuScene(this);
  }

  startGame(): void {
    scene = new PlayScene(this);
  }

  showResults(result: RoundResult): void {
    scene = new ResultsScene(this, result);
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
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  scene.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

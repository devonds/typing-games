// Boots the game: canvas, input, sound, saved data, the scene switcher and the main loop.
import { Sfx } from "./audio";
import { H, ROUND_SECONDS, W } from "./config";
import { Input, spent } from "../shared/input";
import type { RoundLog } from "../shared/history";
import { Player } from "../shared/player";
import { setCurrent, updateProfile } from "../shared/profiles";
import { Pixels } from "./look/pixels";
import type { Scenery } from "./look/scenery";
import { MenuScene } from "./scenes/menu";
import { PlayScene } from "./scenes/play";
import { ResultsScene } from "./scenes/results";
import type { App, Round, RoundResult, Scene } from "./scenes/scene";
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
  player = new Player();
  settings = storage.loadSettings(this.player);
  readonly sfx = sfx;
  private best = storage.loadBest(this.player);

  constructor() {
    sfx.enabled = this.settings.sound;
  }

  saveSettings(): void {
    storage.saveSettings(this.player, this.settings);
    sfx.enabled = this.settings.sound;
  }

  switchPlayer(id: string): void {
    setCurrent(id);
    this.player = new Player();
    this.settings = storage.loadSettings(this.player);
    this.best = storage.loadBest(this.player);
    sfx.enabled = this.settings.sound;
  }

  setLittleHands(on: boolean): void {
    updateProfile(this.player.profile.id, { littleHands: on });
    this.switchPlayer(this.player.profile.id);
  }

  finishRound(log: RoundLog, seconds: number): { unlocked: string[] } {
    return this.player.finishRound(log, seconds);
  }

  submitScore(score: number, round: Round): number {
    const { difficulty, speedMode } = this.settings;
    const key = `${round.lesson}/${difficulty}/${speedMode}` + (round.seconds ? `/${round.seconds}s` : "");
    const before = this.best[key] ?? 0;
    if (score > before) {
      this.best[key] = score;
      storage.saveBest(this.player, this.best);
    }
    return before;
  }

  showMenu(): void {
    scene = new MenuScene(this);
  }

  /** Start a round with the menu's settings. */
  startGame(): void {
    const { player, settings } = this;
    const lesson = settings.lesson;
    const practice = player.practice(lesson);
    if (!practice) return this.showMenu(); // Tricky letters without enough history; the menu explains
    // Little hands keep their 20-balloon rounds.
    const seconds = player.littleHands ? null : settings.length === "timed" ? ROUND_SECONDS : null;
    const round: Round = { lesson, seconds };
    scene = new PlayScene(this, practice, round);
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
      frameInput = spent(frameInput);
      backlog -= STEP;
    }
  }
  scene.draw(pixels);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

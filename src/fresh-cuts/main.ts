// Boots the game: canvas, input, sound, saved data, the scene switcher and the main loop.
import { Input, spent } from "../shared/input";
import { Player } from "../shared/player";
import { currentSession, stepFor } from "../shared/session";
import { Sfx } from "./audio";
import { H, TIMED, W } from "./config";
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

  reloadPlayer(): void {
    this.player = new Player();
    this.settings = storage.loadSettings(this.player);
    this.best = storage.loadBest(this.player);
    sfx.enabled = this.settings.sound;
  }

  submitScore(score: number, key: string): number {
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

  /**
   * Start a round: today's practice step if it's Fresh Cuts' turn (its lesson and length, the player's other
   * settings, nothing saved over them), otherwise the menu's choices.
   */
  startGame(): void {
    const { player, settings } = this;
    const step = stepFor(player.profile.id, player.today, "fresh-cuts");
    const session = step ? currentSession(player.profile.id, player.today) : null;
    let lesson = step?.lesson ?? settings.lesson;
    // A session's Tricky letters step before there's enough history plays My keys instead.
    if (step && !player.practice(lesson)) lesson = "mine";
    const practice = player.practice(lesson);
    if (!practice) return this.showMenu(); // Tricky letters without enough history; the menu explains
    // Little hands always play their fixed number of fruit.
    const seconds = player.littleHands ? null : step ? step.length : settings.length === "timed" ? TIMED.seconds : null;
    scene = new PlayScene(this, { practice, lesson, seconds, session: session ? { step: session.at + 1, of: session.steps.length } : null });
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
      frameInput = spent(frameInput);
      backlog -= STEP;
    }
  }
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  scene.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

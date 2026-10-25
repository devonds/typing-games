// Boots the game: canvas, input, sound, saved data, the scene switcher and the main loop.
import type { RoundLog } from "../shared/history";
import { Input, spent } from "../shared/input";
import { Player } from "../shared/player";
import { listProfiles, setCurrent, updateProfile } from "../shared/profiles";
import { Sfx } from "./audio";
import { H, OWN, W } from "./config";
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

// "Our words": a dialog over the canvas. Keys typed in it belong to the text box, not the game, which listens on
// window, so they stop at the dialog. Esc still closes it (the browser's own dialog behaviour).
const ownDialog = document.getElementById("own-words") as HTMLDialogElement;
const ownText = ownDialog.querySelector("textarea")!;
for (const type of ["keydown", "keyup", "keypress"]) ownDialog.addEventListener(type, (e) => e.stopPropagation());

const sfx = new Sfx();
const input = new Input(canvas, { width: W, height: H }, () => sfx.unlock());
let scene: Scene;

class Game implements App {
  player = new Player();
  settings = storage.loadSettings(this.player);
  readonly sfx = sfx;
  recent: string[] = [];
  private best = storage.loadBest(this.player);

  constructor() {
    sfx.enabled = this.settings.sound;
  }

  /** Load whoever is playing now, with their own settings and best scores. */
  private reload(): void {
    this.player = new Player();
    this.settings = storage.loadSettings(this.player);
    this.best = storage.loadBest(this.player);
    this.recent = [];
    sfx.enabled = this.settings.sound;
  }

  saveSettings(): void {
    storage.saveSettings(this.player, this.settings);
    sfx.enabled = this.settings.sound;
  }

  switchPlayer(step: number): void {
    const profiles = listProfiles();
    if (profiles.length < 2) return;
    const i = profiles.findIndex((p) => p.id === this.player.profile.id);
    setCurrent(profiles[(i + step + profiles.length) % profiles.length].id);
    this.reload();
  }

  setLittleHands(on: boolean): void {
    updateProfile(this.player.profile.id, { littleHands: on });
    this.reload();
  }

  editOwnWords(): void {
    if (ownDialog.open) return;
    const player = this.player;
    ownText.value = storage.loadOwn(player).text;
    ownDialog.returnValue = "";
    ownDialog.addEventListener(
      "close",
      () => {
        if (ownDialog.returnValue === "save") storage.saveOwn(player, { text: ownText.value.slice(0, OWN.maxText), next: 0 });
        canvas.focus();
      },
      { once: true },
    );
    ownDialog.showModal();
    ownText.focus();
  }

  finishRound(log: RoundLog, seconds: number): { unlocked: string[] } {
    return this.player.finishRound(log, seconds);
  }

  submitWpm(wpm: number): number {
    const key = this.settings.level;
    const before = this.best[key] ?? 0;
    if (wpm > before) {
      this.best[key] = wpm;
      storage.saveBest(this.player, this.best);
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
      frameInput = spent(frameInput);
      backlog -= STEP;
    }
  }
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  scene.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

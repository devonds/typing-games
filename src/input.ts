import { H, W } from "./config";

/** Input gathered since the last game tick. Letter keys are lowercase; others use KeyboardEvent.key names. */
export interface Frame {
  keys: string[];
  /** Clicks/taps in game pixels (0..W, 0..H). */
  clicks: { x: number; y: number }[];
}

export const NO_INPUT: Frame = { keys: [], clicks: [] };

const SPECIAL = new Set([" ", "Enter", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export class Input {
  private keys: string[] = [];
  private clicks: Frame["clicks"] = [];

  /** onGesture runs on every key/click: browsers only allow sound after one. */
  constructor(canvas: HTMLCanvasElement, onGesture: () => void) {
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts alone
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const letter = /^[a-z]$/.test(key);
      if (!letter && !SPECIAL.has(key)) return;
      e.preventDefault();
      if (e.repeat && (letter || key === " " || key === "Enter")) return; // holding a key down isn't typing it again
      onGesture();
      this.keys.push(key);
    });
    canvas.addEventListener("pointerdown", (e) => {
      onGesture();
      const r = canvas.getBoundingClientRect();
      this.clicks.push({ x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H });
    });
  }

  /** Take everything that happened since the last call. */
  drain(): Frame {
    const frame = { keys: this.keys, clicks: this.clicks };
    this.keys = [];
    this.clicks = [];
    return frame;
  }
}

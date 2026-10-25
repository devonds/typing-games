/** Input gathered since the last game tick. Letter keys are lowercase; others use KeyboardEvent.key names. */
export interface Frame {
  keys: string[];
  /** For each of `keys`: true if it was typed as a capital (Shift or Caps Lock). Letter keys stay lowercase. */
  caps: boolean[];
  /** Clicks/taps in game coordinates (0..width, 0..height). */
  clicks: { x: number; y: number }[];
  /** Letter keys (lowercase) and " " being held down right now, e.g. for "hold F and J to start". */
  held: ReadonlySet<string>;
}

export const NO_INPUT: Frame = { keys: [], caps: [], clicks: [], held: new Set() };

/** The same frame with its key presses and clicks used up, for extra ticks in one display frame: keys stay held. */
export function spent(frame: Frame): Frame {
  return { keys: [], caps: [], clicks: [], held: frame.held };
}

const SPECIAL = new Set([" ", "Enter", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
/** Punctuation Word Garden can ask for once a child is ready. The other games ignore these keys. */
const PUNCTUATION = new Set([".", ",", "?", "'", "!"]);

export class Input {
  private keys: string[] = [];
  private caps: boolean[] = [];
  private clicks: Frame["clicks"] = [];
  private readonly held = new Set<string>();

  /**
   * `size` is the game's own coordinate space, so clicks come out in game units however big the canvas is shown.
   * onGesture runs on every key/click: browsers only allow sound after one.
   */
  constructor(canvas: HTMLCanvasElement, size: { width: number; height: number }, onGesture: () => void) {
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts alone
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const letter = /^[a-z]$/.test(key);
      if (!letter && !SPECIAL.has(key) && !PUNCTUATION.has(key)) return;
      e.preventDefault();
      if (letter || key === " ") this.held.add(key);
      if (e.repeat && (letter || key === " " || key === "Enter")) return; // holding a key down isn't typing it again
      onGesture();
      this.keys.push(key);
      this.caps.push(letter && e.key !== key);
    });
    window.addEventListener("keyup", (e) => {
      this.held.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    // Switching away loses key-ups, so forget everything held.
    window.addEventListener("blur", () => this.held.clear());
    canvas.addEventListener("pointerdown", (e) => {
      onGesture();
      const r = canvas.getBoundingClientRect();
      this.clicks.push({ x: ((e.clientX - r.left) / r.width) * size.width, y: ((e.clientY - r.top) / r.height) * size.height });
    });
  }

  /** Take everything that happened since the last call. */
  drain(): Frame {
    const frame = { keys: this.keys, caps: this.caps, clicks: this.clicks, held: new Set(this.held) };
    this.keys = [];
    this.caps = [];
    this.clicks = [];
    return frame;
  }
}

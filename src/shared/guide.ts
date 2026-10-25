// The finger guide: how much help the on-screen keyboard gives, and what it should be showing right now.
// No drawing here: each game draws the keyboard in its own style from a GuideView.
import type { History } from "./history";
import { keyFor, type Finger } from "./keyboard";
import { masteryProgress } from "./path";

/** The player's setting. "automatic" fades help key by key as keys are learned. */
export type GuideMode = "automatic" | "always" | "off";
export const GUIDE_MODES: readonly GuideMode[] = ["automatic", "always", "off"];
export const GUIDE_MODE_NAMES: Record<GuideMode, string> = { automatic: "Automatic", always: "Always", off: "Off" };

/** How much help one key gets: light up whenever it's the target, only after a slip, or never. */
export type KeyHelp = "show" | "slip" | "off";

/** Below this much mastery a key is still new: always light it up. */
export const STILL_NEW = 0.5;

/**
 * Help for one key, given the player's history. "automatic": new keys are always lit; known keys only after a slip;
 * mastered keys never. Little hands always get full help. Without a history, every key is lit.
 */
export function helpFor(ch: string, mode: GuideMode, history?: History, littleHands = false): KeyHelp {
  if (mode === "off") return "off";
  if (mode === "always" || littleHands || !history) return "show";
  const key = ch.toLowerCase();
  if (key === " ") return "slip"; // everyone finds the space bar; light it only after a slip
  const progress = masteryProgress(history.letters[key], !littleHands);
  return progress >= 1 ? "off" : progress < STILL_NEW ? "show" : "slip";
}

/** What the keyboard should show this frame. */
export interface GuideView {
  /** Whether to draw the keyboard at all. */
  visible: boolean;
  /** The key to light up as the next one to press (" " for the space bar), or null. */
  target: string | null;
  targetFinger: Finger | null;
  /** After a wrong key: the right key flashes. `flash` runs 1 -> 0 over FLASH_SECONDS. */
  flashKey: string | null;
  flash: number;
}

export const FLASH_SECONDS = 0.9;

/** Tracks the target and the "that was the wrong key, here's the right one" flash for a game's keyboard. */
export class Guide {
  private target: string | null = null;
  private flashKey: string | null = null;
  private flashLeft = 0;

  /**
   * With a history, "automatic" fades help key by key, and hides the keyboard entirely once every key in `inPlay`
   * is mastered (a slip still flashes it back).
   */
  constructor(
    public mode: GuideMode,
    private readonly history?: History,
    private readonly littleHands = false,
    inPlay: readonly string[] = [],
  ) {
    this.allMastered = !!history && !littleHands && mode === "automatic" && inPlay.length > 0 && inPlay.every((k) => helpFor(k, mode, history) === "off");
  }

  private readonly allMastered: boolean;

  /** The key the player should press next, or null when there's nothing to type. */
  setTarget(ch: string | null): void {
    this.target = ch ? ch.toLowerCase() : null;
  }

  /** A wrong key was pressed while `expected` was wanted: flash the right key, even if it's normally hidden. */
  slip(expected: string | null): void {
    if (!expected || this.mode === "off") return;
    this.flashKey = expected.toLowerCase();
    this.flashLeft = FLASH_SECONDS;
  }

  update(dt: number): void {
    this.flashLeft = Math.max(0, this.flashLeft - dt);
  }

  view(): GuideView {
    const help = this.target ? helpFor(this.target, this.mode, this.history, this.littleHands) : "off";
    const target = help === "show" ? this.target : null;
    const flashing = this.flashLeft > 0 ? this.flashKey : null;
    return {
      visible: this.mode !== "off" && (!this.allMastered || flashing !== null),
      target,
      targetFinger: target ? (keyFor(target)?.finger ?? null) : null,
      flashKey: flashing,
      flash: this.flashLeft / FLASH_SECONDS,
    };
  }
}

// "Fingers on the bumps": before every round, the child puts both pointer fingers on F and J (the keys with bumps)
// and holds them down together. The round starts once both are held, so the hands start in the same place every
// time. Little hands only need to press F and then J. No drawing here: each game draws it in its own style.
import type { Frame } from "./input";

export interface RitualView {
  /** Whether each pointer finger is in place (held, or pressed in little-hands mode). */
  f: boolean;
  j: boolean;
  /** True once the round can start. */
  done: boolean;
  /** 0 -> 1 over the short moment after both are in place, for a little "ready!" flourish before starting. */
  ready: number;
}

/** How long both keys show as in place before the round starts. */
export const RITUAL_HOLD = 0.35;

export class Ritual {
  private fDone = false;
  private jDone = false;
  private heldFor = 0;

  constructor(private readonly littleHands = false) {}

  update(dt: number, input: Frame): RitualView {
    if (this.littleHands) {
      // Press F, then J (in that order, or J after F at any time).
      for (const key of input.keys) {
        if (key === "f") this.fDone = true;
        if (key === "j" && this.fDone) this.jDone = true;
      }
    } else {
      this.fDone = input.held.has("f");
      this.jDone = input.held.has("j");
    }
    if (this.fDone && this.jDone) this.heldFor += dt;
    else this.heldFor = 0;
    return this.view();
  }

  view(): RitualView {
    const ready = Math.min(1, this.heldFor / RITUAL_HOLD);
    return { f: this.fDone, j: this.jDone, ready, done: ready >= 1 };
  }
}

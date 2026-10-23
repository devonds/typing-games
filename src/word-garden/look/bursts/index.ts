// All the bursts on screen. The play scene asks for one per typed letter, in the sentence's chosen kind.
import type { BurstKind } from "../../config";
import type { Palette } from "../palette";
import type { Glyph } from "../words";
import { Bubble } from "./bubbles";
import type { Burst, Ctx } from "./burst";
import { Butterfly } from "./butterflies";
import { Confetti } from "./confetti";
import { Firework, RISE } from "./fireworks";
import { Flower } from "./flowers";

export class Bursts {
  private list: Burst[] = [];

  /**
   * Turn a typed letter into a burst. `order` counts letters in the sentence (flowers alternate stem heights with
   * it). Returns how long until the burst's second moment (a bubble popping, a firework bursting), or 0.
   */
  spawn(kind: BurstKind, g: Glyph, font: string, order: number): number {
    switch (kind) {
      case "flowers":
        this.list.push(new Flower(g, order));
        return 0;
      case "butterflies":
        this.list.push(new Butterfly(g, font, order));
        return 0;
      case "bubbles": {
        const bubble = new Bubble(g, font);
        this.list.push(bubble);
        return bubble.popAt;
      }
      case "confetti":
        this.list.push(new Confetti(g, font));
        return 0;
      case "fireworks":
        this.list.push(new Firework(g, font));
        return RISE;
    }
  }

  /** The sentence is moving on: flowers let their petals go. */
  release(): void {
    for (const b of this.list) b.release?.();
  }

  update(dt: number, t: number): void {
    this.list = this.list.filter((b) => b.update(dt, t));
  }

  draw(ctx: Ctx, p: Palette): void {
    for (const b of this.list) b.draw(ctx, p);
  }

  get count(): number {
    return this.list.length;
  }
}

import { LIVES, W } from "../config";
import { C } from "./palette";
import type { Pixels } from "./pixels";

export interface HudInfo {
  score: number;
  lives: number;
  speedLevel: number;
}

/** Score top left, life balloons top right, speed under the score when it ramps. */
export function drawHud(p: Pixels, info: HudInfo, showSpeed: boolean, escapeFlash: number): void {
  const score = `SCORE ${info.score}`;
  p.rect(2, 2, score.length * 6 + 7, 11, C.black);
  p.text(score, 6, 4, C.white);
  if (showSpeed) p.label(`SPEED ${info.speedLevel + 1}`, 6, 16, C.yellow, C.black);

  for (let i = 0; i < LIVES; i++) {
    const x = W - 9 - i * 10;
    const justLost = i === info.lives && escapeFlash > 0;
    if (i < info.lives || (justLost && Math.floor(escapeFlash * 10) % 2 === 0)) {
      p.circ(x, 7, 4, C.black);
      p.circ(x, 7, 3, C.red);
      p.pset(x - 1, 5, C.white);
      p.pset(x, 12, C.silver);
    } else {
      p.circb(x, 7, 3, C.slate);
    }
  }
}

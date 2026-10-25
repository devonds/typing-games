import { LIVES, W } from "../config";
import { C } from "./palette";
import type { Pixels } from "./pixels";

export interface HudInfo {
  /** Top left: the score, or for little hands how many balloons are popped. */
  label: string;
  /** Life balloons top right, or null to hide them (little hands can't lose any). */
  lives: number | null;
  /** A timed round's seconds left, shown top right as "1:23"; null to hide. */
  clock: number | null;
  /** Shown under the label when balloons speed up; null to hide. */
  speedLevel: number | null;
}

/** Score top left, life balloons top right, speed under the score when it ramps. */
export function drawHud(p: Pixels, info: HudInfo, escapeFlash: number): void {
  p.rect(2, 2, info.label.length * 6 + 7, 11, C.black);
  p.text(info.label, 6, 4, C.white);
  if (info.speedLevel !== null) p.label(`SPEED ${info.speedLevel + 1}`, 6, 16, C.yellow, C.black);
  if (info.clock !== null) {
    const text = `${Math.floor(info.clock / 60)}:${String(info.clock % 60).padStart(2, "0")}`;
    const w = text.length * 6 + 7;
    p.rect(W - 2 - w, 2, w, 11, C.black);
    p.text(text, W - 2 - w + 4, 4, info.clock <= 10 ? C.orange : C.white); // orange for the last ten seconds
  }
  if (info.lives === null) return;

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

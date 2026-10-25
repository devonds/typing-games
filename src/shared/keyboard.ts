// The keyboard the games teach: where each key sits, and which finger presses it. Every game's on-screen keyboard and
// the per-finger statistics read from here, so all three games teach the same fingers in the same colours.

export type Hand = "left" | "right";
export type Finger = "leftPinky" | "leftRing" | "leftMiddle" | "leftIndex" | "rightIndex" | "rightMiddle" | "rightRing" | "rightPinky" | "thumb";

export interface Key {
  /** The character it types: a lowercase letter, punctuation, or " " for the space bar. */
  key: string;
  /** 0 = top letter row (Q), 1 = home row (A), 2 = bottom row (Z), 3 = space bar. */
  row: 0 | 1 | 2 | 3;
  /** Left edge, in key widths, with the rows' real stagger. Q is at 0. */
  x: number;
  /** Width in key widths (1 for everything but the space bar). */
  w: number;
  finger: Finger;
  /** A home-row key: where a finger rests. */
  home: boolean;
  /** F and J have little bumps you can feel without looking. */
  bump: boolean;
}

const ROWS: { keys: string; x: number; row: 0 | 1 | 2 }[] = [
  { keys: "qwertyuiop", x: 0, row: 0 },
  { keys: "asdfghjkl;", x: 0.25, row: 1 },
  { keys: "zxcvbnm,./", x: 0.75, row: 2 },
];

/** Which finger presses each column (0 = Q/A/Z column). Index fingers cover two columns each. */
const COLUMN_FINGERS: Finger[] = [
  "leftPinky",
  "leftRing",
  "leftMiddle",
  "leftIndex",
  "leftIndex",
  "rightIndex",
  "rightIndex",
  "rightMiddle",
  "rightRing",
  "rightPinky",
];

export const KEYS: readonly Key[] = [
  ...ROWS.flatMap(({ keys, x, row }) =>
    [...keys].map((key, col) => ({
      key,
      row,
      x: x + col,
      w: 1,
      finger: COLUMN_FINGERS[col],
      home: row === 1 && col !== 4 && col !== 5,
      bump: key === "f" || key === "j",
    })),
  ),
  { key: " ", row: 3, x: 2.6, w: 5.2, finger: "thumb", home: true, bump: false },
];

/**
 * Keys the games don't draw by default but can teach later (Word Garden's capitals and punctuation): the apostrophe
 * after the home row, and the two Shift keys, each pressed by the little finger of the other hand from the letter.
 */
export const EXTRA_KEYS: readonly Key[] = [
  { key: "'", row: 1, x: 10.25, w: 1, finger: "rightPinky", home: false, bump: false },
  { key: "shiftLeft", row: 2, x: -1.5, w: 2.15, finger: "leftPinky", home: false, bump: false },
  { key: "shiftRight", row: 2, x: 10.85, w: 2.15, finger: "rightPinky", home: false, bump: false },
];

/** Width of the whole keyboard in key widths (the bottom row's right edge). */
export const KEYBOARD_WIDTH = 10.75;

const BY_KEY = new Map([...KEYS, ...EXTRA_KEYS].map((k) => [k.key, k]));
/** Characters typed with Shift on another key. */
const SHIFTED: Record<string, string> = { "?": "/", "!": "1" };

/** The key for a character (any case), or undefined for keys the games don't use. "?" is the "/" key. */
export function keyFor(ch: string): Key | undefined {
  return BY_KEY.get(SHIFTED[ch] ?? (ch.length === 1 ? ch.toLowerCase() : ch));
}

/** The Shift key to use with a capital or shifted character: the one on the other hand from its key. */
export function shiftFor(ch: string): Key | undefined {
  const k = keyFor(ch);
  if (!k || k.finger === "thumb") return undefined;
  return BY_KEY.get(handOf(k.finger) === "left" ? "shiftRight" : "shiftLeft");
}

export function handOf(finger: Finger): Hand | null {
  return finger === "thumb" ? null : finger.startsWith("left") ? "left" : "right";
}

/** Fingers in order across both hands, left pinky to right pinky, then thumb. */
export const FINGERS: readonly Finger[] = [...new Set(COLUMN_FINGERS), "thumb"];

export const FINGER_NAMES: Record<Finger, string> = {
  leftPinky: "left little finger",
  leftRing: "left ring finger",
  leftMiddle: "left middle finger",
  leftIndex: "left pointer finger",
  rightIndex: "right pointer finger",
  rightMiddle: "right middle finger",
  rightRing: "right ring finger",
  rightPinky: "right little finger",
  thumb: "thumb",
};

/**
 * One colour per finger, mirrored across the hands (both pointer fingers share a colour, and so on), so a child
 * learns "the blue finger" on either side. Games may lighten or darken these to suit their look, but keep the hues.
 */
export const FINGER_COLOURS: Record<Finger, string> = {
  leftPinky: "#e88aa6",
  leftRing: "#f2b25c",
  leftMiddle: "#7cc59a",
  leftIndex: "#6fa8dc",
  rightIndex: "#6fa8dc",
  rightMiddle: "#7cc59a",
  rightRing: "#f2b25c",
  rightPinky: "#e88aa6",
  thumb: "#b8a6d9",
};

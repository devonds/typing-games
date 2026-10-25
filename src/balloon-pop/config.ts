// Every number that shapes how the game plays lives here.

/** The game draws on a tiny 256x144 canvas that the browser scales up with crisp pixels. */
export const W = 256;
export const H = 144;
export const GROUND_Y = 122;

export const LIVES = 5;
export const POINTS_PER_POP = 10;
export const BALLOON_RADIUS = 10;
/** A balloon whose centre rises above this line has escaped. */
export const ESCAPE_Y = -BALLOON_RADIUS - 6;
/** How many balloon colours the look defines (see look/palette.ts). */
export const BALLOON_COLOUR_COUNT = 6;

export type Difficulty = "easy" | "medium" | "hard";
/** "ramp" speeds up during a round, "steady" never changes. */
export type SpeedMode = "ramp" | "steady";

export interface DifficultySettings {
  /** How many cannons are on the grass. */
  launchers: number;
  /** How fast balloons float up once launched, in pixels per second. */
  riseSpeed: number;
  /** Each cannon waits a random time in this range (seconds) between shots. */
  fireEvery: [number, number];
}

// Same shape as the original game: harder means more cannons and faster balloons.
export const DIFFICULTIES: Record<Difficulty, DifficultySettings> = {
  easy: { launchers: 3, riseSpeed: 7, fireEvery: [5, 6] },
  medium: { launchers: 5, riseSpeed: 10, fireEvery: [5, 6] },
  hard: { launchers: 8, riseSpeed: 13, fireEvery: [5, 6] },
};

/** In "ramp" mode, every `secondsPerLevel` balloons rise faster and cannons fire sooner. */
export const RAMP = {
  secondsPerLevel: 20,
  speedPerLevel: 0.1, // +10% rise speed per level...
  maxSpeed: 2, // ...up to double
  intervalPerLevel: 0.08, // cannons fire ~8% sooner per level...
  minInterval: 0.5, // ...down to half the wait
};

/** A pair or word scores POINTS_PER_POP a letter, plus this. */
export const WORD_BONUS = 5;

/** A timed round's length (seconds). In a timed round an escaped balloon costs points instead of a life. */
export const ROUND_SECONDS = 120;
export const ESCAPE_COST = 10;

/** Balloons keep a little sky between them, softly: no bouncing. */
export const SPACING = {
  /** Pixels of sky wanted between two balloons. */
  gap: 3,
  /** Overlapping balloons ease apart sideways at this speed (pixels per second). */
  push: 16,
  /** A balloon with another just above it rises at this share of its speed until there's room. */
  slowBelow: 0.5,
};

/** At most this many pairs and words in the air at once; beyond that, cannons fire single letters. */
export const MAX_WIDE = 2;

/** A cannon with nothing new to fire (every first letter is already in the air) tries again this much later. */
export const RETRY_SECONDS = 0.5;

/**
 * Pairs and words ride on wide balloons, sized to their letters (12 pixels each at double size). Only the balloon
 * colours with white letters are used for them, so typed letters can light up yellow.
 */
export const WIDE_COLOURS = [0, 3, 4];
export function balloonHalfWidth(text: string): number {
  return text.length === 1 ? BALLOON_RADIUS : text.length * 6 + 4;
}

/** After a wrong key, that key does nothing for this long (seconds), so mashing doesn't pop balloons. */
export const FIZZLE_SECONDS = 0.5;

/** Little hands: no time pressure, and a round is a fixed number of balloons. */
export const LITTLE_HANDS = {
  /** Balloons in one round. */
  balloons: 20,
  /** Balloons stop rising here (centre y) and bob until they're popped. */
  hoverY: 34,
  /** Cannons wait while this many balloons are already up. */
  maxInAir: 4,
};

/** Results stars for Little hands: the share right first time needed for 2 and 3 stars. */
export const STARS = { two: 0.7, three: 0.9 };

/** Balloons leave the cannon fast, then drag slows them into a gentle rise. */
export const LAUNCH_SPEED = 70;
export const LAUNCH_DRAG = 2.5;

/** Cannon spots along the grass, in the order they're used, with a staggered first shot (seconds). */
export const LAUNCHER_SLOTS = [
  { x: 70, firstShot: 0.5 },
  { x: 143, firstShot: 5.5 },
  { x: 193, firstShot: 3 },
  { x: 34, firstShot: 1 },
  { x: 121, firstShot: 1.5 },
  { x: 99, firstShot: 4 },
  { x: 162, firstShot: 2.5 },
  { x: 220, firstShot: 2 },
];

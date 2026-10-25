// Every gameplay number in one place. Positions are in scene units: the scene is 480x270 and scales to the window.

export const W = 480;
export const H = 270;

export type Difficulty = "easy" | "medium" | "hard";
export type SpeedMode = "ramp" | "steady";

export const LIVES = 5;
export const POINTS_PER_SLICE = 10;
/** A pair or word scores POINTS_PER_SLICE per letter, times this. */
export const SEQUENCE_BONUS = 1.5;

/** How long a round runs: until the baskets run out, or a timed round where a dropped fruit costs points instead. */
export type RoundLength = "baskets" | "timed";
export const TIMED = {
  seconds: 120,
  /** Points lost for a fruit that falls, or a rotten one sliced, in a timed round. */
  penalty: 10,
};

/** A wrong key "fizzles": that key does nothing for this long, so hammering keys doesn't slice fruit. */
export const FIZZLE_SECONDS = 0.5;

/** Little hands: no time pressure. Fruit hangs at the top of its throw until it's sliced, and a round is this long. */
export const LITTLE_HANDS = {
  fruit: 20,
  /** How fast hanging fruit turns, as a share of its spin when thrown. */
  hangSpin: 0.25,
  /** Stars on the results screen: right first time at least this often for two, then three. */
  stars: [0.7, 0.9] as [two: number, three: number],
};

export const DIFFICULTIES: Record<Difficulty, { perWave: [min: number, max: number]; airTime: number }> = {
  // airTime: seconds from leaving the crate to falling back past it.
  easy: { perWave: [1, 2], airTime: 3.6 },
  medium: { perWave: [2, 3], airTime: 3.0 },
  hard: { perWave: [3, 4], airTime: 2.6 },
};

/** "Speeds up" mode: every 20 s fruit flies a bit faster, and every third step a wave throws one more. */
export const RAMP = {
  secondsPerLevel: 20,
  speedPerLevel: 0.08,
  maxSpeed: 1.6,
  levelsPerExtraFruit: 3,
  maxExtraFruit: 2,
};

export const WAVE = {
  /** Pause after a wave is finished before the next one is thrown. */
  gap: 0.9,
  /** Seconds between throws inside a wave. */
  spacing: [0.3, 0.6] as [number, number],
  /** First wave goes up this long after the round starts (time to read the banner). */
  firstAt: 1.6,
};

/** Slicing 3+ fruit with less than `window` seconds between each earns `bonusPerFruit` per fruit in the chain. */
export const COMBO = { window: 0.8, min: 3, bonusPerFruit: 5 };

export const ROTTEN = {
  /** Chance that a wave includes one rotten apple (when rotten fruit is switched on). */
  chance: 0.35,
  /** No rotten fruit in the first few waves. */
  fromWave: 3,
};

/** The freezer aisle: now and then a fruit comes frozen in a block of ice. Slice it and everything slows down. */
export const FREEZE = {
  /** Chance that a wave includes one frozen fruit. Never while things are already slowed down. */
  chance: 0.15,
  fromWave: 2,
  /** How long the slow motion lasts, and how fast things move during it (1 = normal). */
  seconds: 6,
  speed: 0.35,
  /** The last second speeds back up gently instead of snapping. */
  thaw: 1,
  /**
   * Slicing the frozen fruit throws a burst of extra fruit to slice in slow motion: `burst[0]` at the gentlest
   * pace (easy, not sped up), one more for each `burstPerSpeed` of extra speed, up to `burst[1]`.
   */
  burst: [3, 6] as [min: number, max: number],
  burstPerSpeed: 0.33,
  /** Seconds between throws in the burst, on the slowed-down clock (so about three times that in real time). */
  burstSpacing: [0.08, 0.16] as [number, number],
};

export const LAUNCH = {
  y: H + 24,
  xMin: 70,
  xMax: 410,
  /** Highest point of the throw. */
  apexMin: 45,
  apexMax: 120,
  /** Falling past this line means it got away. */
  dropY: H + 30,
};

export const FRUIT_KINDS = ["apple", "orange", "lemon", "kiwi", "watermelon", "strawberry", "peach", "pear", "dragonfruit"] as const;
export type FruitKindName = (typeof FRUIT_KINDS)[number];

/** The finger keyboard across the bottom of the play screen, over the crates. `key` is one key's pitch. */
export const KEYBOARD = {
  centreX: W / 2,
  /** Top of the top letter row. */
  top: 226,
  key: 12.5,
  /** Height of a letter row, and of the shorter space bar row. */
  row: 10.5,
  spaceRow: 7,
};

/** "Fingers on the bumps" before every round. */
export const RITUAL = {
  /** The overlay fades away over this long once both fingers are in place; the round is already running. */
  fadeOut: 0.45,
};

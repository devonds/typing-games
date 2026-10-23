// Every gameplay number in one place. Positions are in scene units: the scene is 480x270 and scales to the window.

export const W = 480;
export const H = 270;

/** What each typed letter turns into. Each kind has its own time of day in the garden. */
export const BURSTS = ["flowers", "butterflies", "bubbles", "confetti", "fireworks"] as const;
export type BurstKind = (typeof BURSTS)[number];
/** "random" picks a different kind for each sentence. */
export type BurstChoice = BurstKind | "random";

export const BURST_NAMES: Record<BurstKind, string> = {
  flowers: "Flowers",
  butterflies: "Butterflies",
  bubbles: "Bubbles",
  confetti: "Confetti",
  fireworks: "Fireworks",
};

export type Level = "short" | "long";
export const LEVEL_NAMES: Record<Level, string> = { short: "Short", long: "Longer" };

/** Sentences in a round. */
export const ROUND_LENGTHS = [5, 10] as const;
export type RoundLength = (typeof ROUND_LENGTHS)[number];

export const SENTENCE = {
  /** The sentence is drawn on one line: as big as this, shrinking to fit long ones. */
  maxSize: 30,
  minSize: 21,
  maxWidth: 430,
  /** Middle of the line, up in the sky so bursts have room to rise. */
  y: 134,
  /** Pause after the last letter to enjoy the bursts before the next sentence. */
  celebrate: 1.9,
  /** Flowers get a little longer: they stay until the sentence moves on. */
  celebrateFlowers: 2.4,
};

/** How strongly the Focus setting favours sentences full of the focus letters. */
export const FOCUS = {
  /** Every sentence has at least this much weight, so a round never runs dry. */
  floor: 0.08,
  /** Higher = more strongly prefer sentences made of focus letters. */
  power: 3,
  /** Sentences from the last round are this much less likely to come up again. */
  recentPenalty: 0.1,
};

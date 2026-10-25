import type { LessonId } from "../shared/lessons";

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
/** The Round setting: a number of sentences, or the one-minute check (not for little hands). */
export type RoundChoice = RoundLength | "check";
export const ROUND_CHOICES: readonly RoundChoice[] = [...ROUND_LENGTHS, "check"];

/** The Focus setting: a shared lesson, or "own" (our words, pasted in by a parent). */
export type FocusChoice = LessonId | "own";

export const SENTENCE = {
  /** The sentence is drawn on one line: as big as this, shrinking to fit long ones. */
  maxSize: 30,
  minSize: 21,
  /** Little hands get bigger letters. */
  littleMaxSize: 38,
  littleMinSize: 26,
  maxWidth: 430,
  /** Middle of the line, up in the sky so bursts have room to rise. */
  y: 134,
  /** Pause after the last letter to enjoy the bursts before the next sentence. */
  celebrate: 1.9,
  /** Flowers get a little longer: they stay until the sentence moves on. */
  celebrateFlowers: 2.4,
};

/** How sentences are chosen: by need (see shared/practice.ts), leaning towards the lesson's letters. */
export const FOCUS = {
  /** Every sentence has at least this much lean, so a round never runs dry (there's no all-bottom-row sentence). */
  floor: 0.08,
  /** Higher = more strongly prefer sentences made of the lesson's neediest letters. */
  power: 3,
  /** Sentences from the last round are this much less likely to come up again. */
  recentPenalty: 0.1,
};

/** "My keys" text built from the word bank when not enough sentences fit the unlocked keys. */
export const PHRASES = {
  /** Words in a phrase, and the longest a phrase can be (it must fit on one line). */
  minWords: 2,
  maxWords: 4,
  maxLength: { short: 22, long: 30 },
  /** Fewer typeable words than this, and it's letter groups instead ("fff jjj fj jf"). */
  minBank: 6,
  /** Letter groups on a line, and letters in a group. */
  minGroups: 3,
  maxGroups: 5,
  groupLength: [2, 4] as const,
};

/** Little hands get stars instead of words per minute: accuracy needed for two and for three stars. */
export const STARS = [0.8, 0.95] as const;

/** The finger keyboard on the meadow below the sentence. Key positions come from shared/keyboard.ts. */
export const KEYBOARD = {
  /** Top of the letter rows; the keyboard is centred across the scene. */
  top: 190,
  /** Distance from one key to the next, and the gap between them. */
  pitch: 17.5,
  gap: 2.5,
  radius: 3.6,
  /** The space bar's row is slimmer than the letter rows. */
  spaceH: 10,
  /** Seconds to fade in when the first sentence arrives. */
  fadeIn: 0.8,
};

/** "Fingers on the bumps" before every round. */
export const RITUAL = {
  /** The home row, drawn large: middle of the keys, and the distance from one key to the next. */
  y: 150,
  pitch: 33,
  /** After both keys are held: the row fades away before the first sentence fades in. */
  outro: 0.7,
};

/** Capitals and punctuation: late Learn path stages, after every letter is learned (never for little hands). */
export const MARKS = {
  /** Punctuation unlocks after this many recent capitals... */
  capitals: 30,
  /** ...at least this share of them right first time. */
  accuracy: 0.9,
};

/** The one-minute check: a fixed minute of typing fresh sentences, for a words-per-minute that means something. */
export const CHECK = {
  seconds: 60,
  /** A shorter pause between sentences than usual: the clock stops for it, but the check should flow. */
  celebrate: 0.7,
};

/** "Our words": text a parent pastes in, split into lines that fit on one line. */
export const OWN = {
  maxLength: 34,
  /** Longest paste kept. */
  maxText: 4000,
};

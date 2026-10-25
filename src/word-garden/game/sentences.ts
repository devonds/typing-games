// The sentences to type, and how a round's sentences are picked: by need, leaning towards the lesson's letters. For
// "My keys", only sentences made of unlocked keys; when too few fit, short phrases from the word bank, and at the
// very start (just F J D K) letter groups, the way typing courses begin. No browser APIs: all of it is tested.
// Plain words a young reader knows. Only letters, spaces and . , ! ? ' (punctuation is filled in for you).
// A few are made almost entirely of home-row or top-row letters, so the Focus setting has something to find.
import type { History } from "../../shared/history";
import { pickWeighted, textNeed, type NeedOptions } from "../../shared/practice";
import { wordsWithin } from "../../shared/words";
import { FOCUS, PHRASES, type Level } from "../config";

const SHORT = [
  // Home row heavy
  "Dad has a salad.",
  "A glad lad.",
  "Ask Dad.",
  "Dad had a flask.",
  "Sal has a hall.",
  "All fall.",
  "A sad lass.",
  "Dad asks Sal.",
  // Top row heavy
  "Pop it up.",
  "We try to type.",
  "Put your toy up.",
  "We tie your rope.",
  "Your pretty pie.",
  "Quiet, you two.",
  "Write it out.",
  // Bottom row heavy (there are no vowels down there, so these just lean that way)
  "Mix a cab.",
  "Max can buzz.",
  "A zebra in a van.",
  "Bob can come.",
  // Everyday
  "The sun is up.",
  "I can hop.",
  "We like to play.",
  "My cat is soft.",
  "Look at the moon.",
  "A fish can swim.",
  "I love my dog.",
  "The bus is big.",
  "Let us bake.",
  "Birds can sing.",
  "I see a bee.",
  "Go to bed.",
  "The frog can jump.",
  "It is my turn.",
  "We can run fast.",
  "I have a red hat.",
  "The duck says quack.",
  "Snow is cold.",
  "Kites fly high.",
  "I like green.",
  "My mom is kind.",
  "Hug your friend.",
  "The tree is tall.",
  "Rain on the roof.",
  "The pig is pink.",
  "I can draw a star.",
  "Owls hoot at night.",
  "We sing a song.",
  "The cake is yummy.",
  "A fox in a box.",
  "Ducks love ponds.",
  "Bees make honey.",
  "Shh, the baby sleeps.",
  "The sea is blue.",
  "I can read now.",
  "Puppies like to nap.",
  "Clap your hands.",
  "The moon is round.",
  "A seed can grow.",
  "My shoes are new.",
  "We went to the park.",
];

const LONG = [
  // Home row heavy
  "Dad had a salad in a glass dish.",
  "A glad lad asks Dad for a flask.",
  "Sal has a hall and Dad has a shed.",
  // Top row heavy
  "We try to type out a pretty poem.",
  "Put your toy pet up on the tower.",
  "You wrote your quiet tree story.",
  // Bottom row heavy
  "Max can mix a big batch of buns.",
  "The zebra came in a blue van.",
  "Mom can carry a box of plums.",
  // Everyday
  "The little cat naps in the sun.",
  "A frog hops onto a green log.",
  "The bee flies to a red flower.",
  "We like to play in the park.",
  "My dog has a big red ball.",
  "Look at the moon in the sky.",
  "The fish swims in the pond.",
  "I love to read with my mom.",
  "The yellow bus goes to school.",
  "Let us bake a cake for Gran.",
  "Birds sing in the tall tree.",
  "We plant seeds in the garden.",
  "The puppy wags its fluffy tail.",
  "I can ride my bike up the hill.",
  "The stars come out at night.",
  "My friend and I share a snack.",
  "The rain makes big puddles.",
  "We splash in the warm water.",
  "A snail moves very slowly.",
  "The owl hoots in the dark wood.",
  "I put on my coat and boots.",
  "The ducks swim in a row.",
  "We read a book before bed.",
  "The baby giggles at the dog.",
  "Grandpa grows big tomatoes.",
  "The kite flies over the hill.",
  "I brush my teeth every night.",
  "A rabbit hops across the grass.",
  "We built a fort out of boxes.",
  "The sun sets over the sea.",
  "Mom sings while she cooks.",
  "The cow eats the green grass.",
  "Leaves fall when it is autumn.",
  "We made a snowman in the yard.",
  "The train goes round the bend.",
  "My sister found a shiny shell.",
  "The bear sleeps all winter.",
  "I drew a dragon with wings.",
  "The flowers open in the sun.",
  "We hold hands to cross the road.",
  "The moon is bright and round.",
  "A butterfly lands on my hand.",
  "The bubbles float up and pop.",
  "We clap and cheer for the team.",
  "Dad reads me a funny story.",
  "My cat likes to chase string.",
  "The horse runs in the field.",
  "I can count up to one hundred.",
  "We pick apples from the tree.",
  "Fireworks light up the sky.",
  "The squirrel hides a nut.",
];

export const SENTENCES: Record<Level, readonly string[]> = { short: SHORT, long: LONG };

/** The letters in a sentence, lowercase, in order. */
export function lettersOf(sentence: string): string[] {
  return [...sentence.toLowerCase()].filter((c) => c >= "a" && c <= "z");
}

/** True if every letter in the text is one of `keys`. */
export function fitsKeys(text: string, keys: Iterable<string>): boolean {
  const set = new Set(keys);
  return lettersOf(text).every((c) => set.has(c));
}

/**
 * How much a sentence leans on the lesson's letters: each letter counts its share of the lesson's weights (1 for a
 * letter at an even share, more for a needier one, 0 for a letter outside the lesson), averaged over the sentence.
 */
export function lessonLean(sentence: string, weights: ReadonlyMap<string, number>): number {
  const letters = lettersOf(sentence);
  if (letters.length === 0) return 0;
  return letters.reduce((sum, l) => sum + (weights.get(l) ?? 0) * weights.size, 0) / letters.length;
}

/** A sentence's weight: its need (letters and pairs, from the history), times how much it leans on the lesson. */
export function sentenceWeight(weights: ReadonlyMap<string, number>, history: History, o: NeedOptions): (s: string) => number {
  return (s) => textNeed(s, history, o) * (FOCUS.floor + lessonLean(s, weights)) ** FOCUS.power;
}

/**
 * Pick `count` different sentences, each chosen with chance in proportion to `weight`. Sentences in `recent` (last
 * round's) are less likely to come straight back.
 */
export function pickSentences(
  bank: readonly string[],
  count: number,
  weight: (s: string) => number,
  recent: readonly string[] = [],
  random: () => number = Math.random,
): string[] {
  const recentSet = new Set(recent);
  const pool = [...bank];
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    const s = pickWeighted(pool, (x) => weight(x) * (recentSet.has(x) ? FOCUS.recentPenalty : 1), random)!;
    picked.push(s);
    pool.splice(pool.indexOf(s), 1);
  }
  return picked;
}

const between = (min: number, max: number, random: () => number): number => min + Math.floor(random() * (max - min + 1));

/** "Dad has a flask." from a few words chosen by need, short enough for one line. */
export function buildPhrase(words: readonly string[], maxLength: number, history: History, o: NeedOptions, random: () => number): string {
  const want = between(PHRASES.minWords, PHRASES.maxWords, random);
  const chosen: string[] = [];
  let length = 0;
  while (chosen.length < want) {
    const fits = (w: string) => !chosen.includes(w) && length + w.length + (chosen.length ? 1 : 0) + 1 <= maxLength;
    const word = pickWeighted(words, (w) => textNeed(w, history, o), random, (w) => !fits(w));
    if (!word || !fits(word)) break;
    chosen.push(word);
    length += word.length + (chosen.length > 1 ? 1 : 0);
  }
  const text = chosen.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}

/** A line of letter groups like "fff jjj fj jf" or "dkd kdk fjdk", the letters chosen by `weights`. */
export function letterGroups(weights: ReadonlyMap<string, number>, random: () => number): string {
  const keys = [...weights.keys()];
  const letter = (avoid?: string) => pickWeighted(keys, (k) => weights.get(k) ?? 0, random, (k) => k === avoid)!;
  const [shortest, longest] = PHRASES.groupLength;
  const groups: string[] = [];
  const count = between(PHRASES.minGroups, PHRASES.maxGroups, random);
  while (groups.length < count) {
    const a = letter();
    const b = letter(a);
    const kind = Math.floor(random() * 4);
    const group =
      kind === 0
        ? a.repeat(3) // fff
        : kind === 1
          ? a + b // fj
          : kind === 2
            ? a + b + a // fjf
            : Array.from({ length: between(shortest, longest, random) }, (_, i) => (i === 0 ? a : letter())).join(""); // fjdk
    // Two of the same group in a row reads like a mistake.
    if (group !== groups[groups.length - 1]) groups.push(group);
  }
  return groups.join(" ");
}

export interface RoundPlan {
  level: Level;
  count: number;
  /** The lesson's keys and how often each should come up (from Player.practice). */
  keys: readonly string[];
  weights: ReadonlyMap<string, number>;
  /** "My keys": only text made of `keys`. */
  onlyKeys: boolean;
  history: History;
  need: NeedOptions;
  recent?: readonly string[];
  random?: () => number;
}

/**
 * A round's sentences. For "My keys", sentences made only of unlocked keys, topped up with phrases from the word
 * bank (or letter groups, when even words don't fit yet), in a shuffled order.
 */
export function planRound(plan: RoundPlan): string[] {
  const random = plan.random ?? Math.random;
  const bank = plan.onlyKeys ? SENTENCES[plan.level].filter((s) => fitsKeys(s, plan.keys)) : SENTENCES[plan.level];
  const weight = sentenceWeight(plan.weights, plan.history, plan.need);
  // With only a handful of sentences to choose from, use half of them at most, so rounds don't all look alike.
  const wanted = plan.onlyKeys ? Math.min(plan.count, Math.ceil(bank.length / 2)) : plan.count;
  const picked = pickSentences(bank, wanted, weight, plan.recent, random);
  if (picked.length >= plan.count) return picked;

  const words = wordsWithin(plan.keys, 1, 7);
  const make = words.length >= PHRASES.minBank
    ? () => buildPhrase(words, PHRASES.maxLength[plan.level], plan.history, plan.need, random)
    : () => letterGroups(plan.weights, random);
  const made: string[] = [];
  // A few tries for each, so the round doesn't repeat itself; a small word bank may have to.
  for (let tries = 0; picked.length + made.length < plan.count; tries++) {
    const text = make();
    if (tries > 30 || !(picked.includes(text) || made.includes(text))) made.push(text);
  }
  const all = [...picked, ...made];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

/**
 * The one-minute check: the whole bank in a fresh random order, not weighted by need (so checks compare fairly over
 * time), with last round's sentences left out.
 */
export function checkSentences(level: Level, recent: readonly string[] = [], random: () => number = Math.random): string[] {
  const fresh = SENTENCES[level].filter((s) => !recent.includes(s));
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
  }
  return fresh;
}

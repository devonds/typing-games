// The sentences to type, and how a round's sentences are picked.
// Plain words a young reader knows. Only letters, spaces and . , ! ? ' (punctuation is filled in for you).
// A few are made almost entirely of home-row or top-row letters, so the Focus setting has something to find.
import { FOCUS, type Level } from "../config";

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

/** How much of a sentence is made of the focus letters, 0..1. */
export function focusShare(sentence: string, focus: readonly string[]): number {
  const letters = lettersOf(sentence);
  if (letters.length === 0) return 0;
  const set = new Set(focus);
  return letters.filter((l) => set.has(l)).length / letters.length;
}

/**
 * Pick `count` different sentences. With focus letters, sentences full of them are much more likely; without,
 * every sentence is equally likely. Sentences in `recent` (last round's) are less likely to come straight back.
 */
export function pickSentences(
  bank: readonly string[],
  count: number,
  focus: readonly string[] | null,
  recent: readonly string[] = [],
  random: () => number = Math.random,
): string[] {
  const recentSet = new Set(recent);
  const pool = bank.map((s) => ({
    s,
    weight:
      (focus ? FOCUS.floor + focusShare(s, focus) ** FOCUS.power : 1) * (recentSet.has(s) ? FOCUS.recentPenalty : 1),
  }));
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let r = random() * total;
    let i = 0;
    while (i < pool.length - 1 && r >= pool[i].weight) r -= pool[i++].weight;
    picked.push(pool.splice(i, 1)[0].s);
  }
  return picked;
}

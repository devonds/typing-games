// Short, everyday words a young reader knows, for balloons and fruit that carry a word, and letter pairs taken from
// them. Filtered to the keys a child has unlocked and weighted by need, so what comes up is both typeable and useful.
import type { History } from "./history";
import { handOf, keyFor } from "./keyboard";
import { pairNeed, pickWeighted, textNeed, type NeedOptions } from "./practice";

// Grouped loosely by sound and theme; order doesn't matter. Includes enough home-row words for the early stages
// (as, ask, dad, sad, had, all, fall, glad, flask, salad...).
const WORDS = `
a as ask add all fall hall ball tall call dad sad had lad glad flag flask salad gas has lass alas
sash dash lash gash half dahl shall
jag sag lag hag
fish dish wish this that than then them they the there here where were
red rug run fun sun bun bus but cut nut hut gut hug jug mug dug tug
egg leg beg get let met net pet set wet yes yet ten hen pen men den
sit hit kit fit pit bit big dig fig pig wig rig him his kid lid did hid
hop top pop mop cop dog log fog hog jog not hot got lot dot pot rot
cat hat mat bat rat sat fat pat can fan man pan ran tan van cap map tap nap
tree free see bee three feet seed need keep deep sheep week sleep green
fly sky dry try cry my by why shy
red bed sled shed fed led wed
jam ham ram yam
star car far jar park dark farm barn yard art
rain train play day way say stay may pay ray tray
boat goat coat road toad load soap
moon soon noon spoon room food cool pool tool
book look cook good hood wood foot took
snow slow grow show blow low row bow
kite bike like hike time line fine mine pine nine
cake bake lake make rake take wake game name same
home hope rope note nose rose bone cone stone
cute mule tune june huge
frog drop stop shop chop spot
duck luck truck stuck
milk silk
lamp camp damp stamp
hand land sand band
best nest rest test vest west
gift lift soft
jump bump lump pump
king ring sing wing thing
fox box six mix fix wax
zoo zip zebra buzz fizz quiz quick queen quilt
love live give have
yellow pink blue purple orange white black brown
apple banana grape lemon peach plum pear
happy funny sunny silly jolly
mom sister brother baby friend
water juice bread cheese honey
house garden flower window door
puppy kitten bunny pony horse mouse
over under after again about
school pencil paper crayon
`
  .split(/\s+/)
  .filter(Boolean);

export const WORD_BANK: readonly string[] = [...new Set(WORDS)];

/** Words made only of `allowed` letters, between `min` and `max` letters long. */
export function wordsWithin(allowed: Iterable<string>, min = 2, max = 6): string[] {
  const set = new Set(allowed);
  return WORD_BANK.filter((w) => w.length >= min && w.length <= max && [...w].every((c) => set.has(c)));
}

/** Two letters typed by different hands are easier and faster: a good first step from letters to words. */
export function alternatesHands(pair: string): boolean {
  const a = keyFor(pair[0]);
  const b = keyFor(pair[1]);
  return !!a && !!b && handOf(a.finger) !== handOf(b.finger) && handOf(a.finger) !== null && handOf(b.finger) !== null;
}

/** Every letter pair inside the bank's words that only uses `allowed` letters. */
export function pairsWithin(allowed: Iterable<string>): string[] {
  const set = new Set(allowed);
  const pairs = new Set<string>();
  for (const w of WORD_BANK) for (let i = 1; i < w.length; i++) if (set.has(w[i - 1]) && set.has(w[i]) && w[i - 1] !== w[i]) pairs.add(w[i - 1] + w[i]);
  return [...pairs];
}

export interface PickOptions extends NeedOptions {
  random?: () => number;
  /** Leave out these (e.g. words on screen, or words starting with a letter already in use). */
  skip?: (item: string) => boolean;
}

/** A word to type, made of `allowed` letters, chosen by need. Null if no word fits. */
export function pickWord(allowed: Iterable<string>, history: History, o: PickOptions & { min?: number; max?: number }): string | null {
  const words = wordsWithin(allowed, o.min ?? 2, o.max ?? 6);
  return pickWeighted(words, (w) => textNeed(w, history, o), o.random, o.skip);
}

/** A letter pair to type, chosen by need. With `easyFirst`, pairs that switch hands get a boost. */
export function pickPair(allowed: Iterable<string>, history: History, o: PickOptions & { easyFirst?: boolean }): string | null {
  const pairs = pairsWithin(allowed);
  return pickWeighted(pairs, (p) => pairNeed(p, history, o) * (o.easyFirst && alternatesHands(p) ? 2 : 1), o.random, o.skip);
}

import { describe, expect, it } from "vitest";
import { emptyHistory, type History, type LetterRecord } from "../../src/shared/history";
import { seededRandom } from "../../src/shared/rng";
import { PHRASES } from "../../src/word-garden/config";
import {
  SENTENCES,
  buildPhrase,
  fitsKeys,
  lessonLean,
  letterGroups,
  lettersOf,
  pickSentences,
  planRound,
  sentenceWeight,
} from "../../src/word-garden/game/sentences";

const ALL = [...SENTENCES.short, ...SENTENCES.long];
const TODAY = 1000;
const NEED = { today: TODAY };

/** Even shares over some keys, as Player.practice gives for a fresh player. */
const even = (keys: string) => new Map([...keys].map((k) => [k, 1 / keys.length]));

/** A history where `good` letters are known well and `bad` ones are often wrong. */
function historyWith(good: string, bad: string): History {
  const h = emptyHistory();
  const record = (ok: 0 | 1): LetterRecord => ({ seen: 20, hits: 20, misses: 0, fumbles: 0, recent: Array(20).fill([ok, 1]), last: TODAY });
  for (const c of good) h.letters[c] = record(1);
  for (const c of bad) h.letters[c] = record(0);
  return h;
}

describe("sentences", () => {
  it("only use letters, spaces and simple punctuation", () => {
    for (const s of ALL) expect(s).toMatch(/^[A-Za-z][A-Za-z ,.!?']*$/);
  });

  it("are short enough to fit on one line", () => {
    for (const s of SENTENCES.short) expect(s.length, s).toBeLessThanOrEqual(26);
    for (const s of SENTENCES.long) expect(s.length, s).toBeLessThanOrEqual(36);
  });

  it("have no repeats", () => {
    expect(new Set(ALL).size).toBe(ALL.length);
  });

  it("finds the letters in a sentence, and whether they fit some keys", () => {
    expect(lettersOf("Hi, Sam!")).toEqual([..."hisam"]);
    expect(fitsKeys("Dad had a flask.", "asdfghjkl")).toBe(true);
    expect(fitsKeys("Dad had a fish.", "asdfghjkl")).toBe(false);
  });
});

describe("picking sentences", () => {
  it("picks different sentences, as many as asked", () => {
    const picked = pickSentences(SENTENCES.short, 10, () => 1, [], seededRandom(1));
    expect(picked).toHaveLength(10);
    expect(new Set(picked).size).toBe(10);
  });

  it("follows the weights it's given", () => {
    const random = seededRandom(2);
    let hits = 0;
    for (let i = 0; i < 50; i++) hits += pickSentences(["a", "b", "c", "d"], 1, (s) => (s === "c" ? 20 : 1), [], random)[0] === "c" ? 1 : 0;
    expect(hits).toBeGreaterThan(35);
  });

  it("is less likely to repeat last round's sentences", () => {
    const random = seededRandom(3);
    const recent = SENTENCES.short.slice(0, 5);
    let repeats = 0;
    for (let i = 0; i < 100; i++) repeats += pickSentences(SENTENCES.short, 5, () => 1, recent, random).filter((s) => recent.includes(s)).length;
    // Without the penalty we'd expect about 5 * 5/60 * 100 = 42 repeats.
    expect(repeats).toBeLessThan(15);
  });

  it("leans on the lesson's letters", () => {
    expect(lessonLean("Dad had a flask.", even("asdfghjkl"))).toBeCloseTo(1);
    expect(lessonLean("Pop it up.", even("asdfghjkl"))).toBe(0);
    const home = [..."asdfghjkl"];
    const share = (picked: string[]) => picked.reduce((n, s) => n + lettersOf(s).filter((c) => home.includes(c)).length / lettersOf(s).length, 0) / picked.length;
    const random = seededRandom(7);
    const h = emptyHistory();
    let focused = 0;
    let free = 0;
    for (let i = 0; i < 40; i++) {
      focused += share(pickSentences(SENTENCES.short, 5, sentenceWeight(even("asdfghjkl"), h, NEED), [], random));
      free += share(pickSentences(SENTENCES.short, 5, sentenceWeight(even("abcdefghijklmnopqrstuvwxyz"), h, NEED), [], random));
    }
    expect(focused / 40).toBeGreaterThan(free / 40 + 0.2);
  });

  it("brings up sentences full of the letters that need practice", () => {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    // Q, U, I, E and T are often wrong; everything else is known.
    const h = historyWith(letters.replace(/[quiet]/g, ""), "quiet");
    const weight = sentenceWeight(even(letters), h, NEED);
    expect(weight("Quiet, you two.")).toBeGreaterThan(weight("Dad has a salad.") * 2);
  });
});

describe("rounds for My keys", () => {
  const plan = (keys: string, seed: number, level: "short" | "long" = "short") =>
    planRound({ level, count: 10, keys: [...keys], weights: even(keys), onlyKeys: true, history: emptyHistory(), need: NEED, random: seededRandom(seed) });

  it("only uses unlocked keys", () => {
    for (const keys of ["fj", "fjdk", "fjdksl", "fjdksla", "fjdkslagh", "fjdkslaghruei"]) {
      for (let seed = 1; seed < 6; seed++) {
        const texts = plan(keys, seed);
        expect(texts).toHaveLength(10);
        for (const t of texts) expect(fitsKeys(t, keys), `${keys}: ${t}`).toBe(true);
      }
    }
  });

  it("starts with letter groups when no words fit", () => {
    for (const t of plan("fjdk", 4)) {
      const groups = t.split(" ");
      expect(groups.length).toBeGreaterThanOrEqual(PHRASES.minGroups);
      expect(groups.length).toBeLessThanOrEqual(PHRASES.maxGroups);
      expect(t).toMatch(/^[fjdk ]+$/);
    }
    expect(letterGroups(even("fj"), seededRandom(1))).toMatch(/^[fj]+( [fj]+)+$/);
  });

  it("builds phrases from the word bank once words fit", () => {
    const texts = plan("fjdksla", 5);
    for (const t of texts.filter((x) => !SENTENCES.short.includes(x))) {
      expect(t, t).toMatch(/^[A-Z][a-z]*( [a-z]+)* ?[a-z]*\.$/);
      const words = t.slice(0, -1).split(" ");
      expect(words.length).toBeGreaterThanOrEqual(1);
      expect(words.length).toBeLessThanOrEqual(PHRASES.maxWords);
      expect(t.length).toBeLessThanOrEqual(PHRASES.maxLength.short);
    }
    expect(new Set(texts).size).toBeGreaterThan(5);
  });

  it("uses real sentences when they fit, topping up with phrases", () => {
    const texts = plan("fjdkslaghruei", 6);
    expect(texts.some((t) => SENTENCES.short.includes(t))).toBe(true);
  });

  it("makes a phrase of two to four different words, chosen by need", () => {
    const words = ["sad", "dad", "lad", "ask", "flask", "glad", "all"];
    const random = seededRandom(9);
    for (let i = 0; i < 30; i++) {
      const phrase = buildPhrase(words, 22, emptyHistory(), NEED, random);
      const parts = phrase.slice(0, -1).toLowerCase().split(" ");
      expect(parts.length).toBeGreaterThanOrEqual(2);
      expect(parts.length).toBeLessThanOrEqual(4);
      expect(new Set(parts).size).toBe(parts.length);
      expect(phrase[0]).toBe(phrase[0].toUpperCase());
    }
    // A word with a tricky letter comes up more.
    const h = historyWith("sadlkgf", "");
    h.letters.k = { seen: 20, hits: 20, misses: 0, fumbles: 0, recent: Array(20).fill([0, 1]), last: TODAY };
    let ask = 0;
    let sad = 0;
    for (let i = 0; i < 200; i++) {
      const p = buildPhrase(words, 22, h, NEED, random).toLowerCase();
      if (/\bask\b/.test(p)) ask++;
      if (/\bsad\b/.test(p)) sad++;
    }
    expect(ask).toBeGreaterThan(sad);
  });

  it("leaves free-practice lessons the whole bank", () => {
    const texts = planRound({ level: "long", count: 10, keys: [..."zxcvbnm"], weights: even("zxcvbnm"), onlyKeys: false, history: emptyHistory(), need: NEED, random: seededRandom(1) });
    for (const t of texts) expect(SENTENCES.long).toContain(t);
  });
});

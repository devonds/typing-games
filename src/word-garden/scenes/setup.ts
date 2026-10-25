// What a round will be, worked out as it starts: today's practice if it's been started, the one-minute check, our
// words, or the chosen lesson; and what it asks for (capitals, punctuation). Settings are never saved over here.
import { TODAY, practiceState } from "../../shared/session";
import { lessonById } from "../../shared/lessons";
import type { Rules } from "../game/round";
import { ownLines, ownRound } from "../game/own";
import { checkSentences, planRound } from "../game/sentences";
import { rulesFor, type MarksRecord } from "../game/stages";
import { loadMarks, loadOwn, saveOwn } from "../storage";
import type { App } from "./scene";

export interface RoundSetup {
  sentences: string[];
  rules: Rules;
  marks: MarksRecord;
  /** The keys this round practises: for the finger guide and the results. */
  keys: string[];
  /** The one-minute check: runs on a clock instead of a count of sentences. */
  check: boolean;
  /** This round is today's practice. */
  practice: boolean;
}

export function setUpRound(app: App): RoundSetup {
  const { player, settings } = app;
  const little = player.littleHands;
  const marks = loadMarks(player);
  const rules = rulesFor(marks, little);
  const level = little ? "short" : settings.level;
  const need = { today: player.today, speedMatters: player.speedMatters };
  const all = player.practice("all")!;
  const base = { rules, marks, check: false, practice: false };

  // Today's practice: its own lesson and length, whatever the settings say.
  if (practiceState(player.profile.id, player.today) === "started") {
    const practice = player.practice(TODAY.lesson) ?? all;
    const count = little ? TODAY.littleHands : TODAY.sentences;
    const sentences = planRound({ level, count, keys: practice.keys, weights: practice.weights, onlyKeys: TODAY.lesson === "mine", history: player.history, need, recent: app.recent });
    return { ...base, sentences, keys: practice.keys, practice: true };
  }

  if (settings.length === "check" && !little) return { ...base, sentences: checkSentences(level, app.recent), keys: all.keys, check: true };
  const count = settings.length === "check" ? 5 : settings.length;

  if (settings.lesson === "own") {
    const own = loadOwn(player);
    const lines = ownLines(own.text);
    if (lines.length > 0) {
      const start = own.next % lines.length;
      saveOwn(player, { ...own, next: (start + count) % lines.length });
      return { ...base, sentences: ownRound(lines, start, count), keys: all.keys };
    }
  }

  const lesson = settings.lesson === "own" ? "all" : settings.lesson;
  const practice = player.practice(lessonById(lesson).id) ?? all;
  const sentences = planRound({ level, count, keys: practice.keys, weights: practice.weights, onlyKeys: lesson === "mine", history: player.history, need, recent: app.recent });
  return { ...base, sentences, keys: practice.keys };
}

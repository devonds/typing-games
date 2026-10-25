// What a round will be, worked out as it starts: today's practice step if one is due, the one-minute check, our
// words, or the chosen lesson; and what it asks for (capitals, punctuation). Settings are never saved over here.
import { currentSession, stepFor, type Step } from "../../shared/session";
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
  /** Today's practice: this step, and where it is in the day ([3, 3] for "3 of 3"). */
  step: Step | null;
  stepNumber: [number, number] | null;
}

export function setUpRound(app: App): RoundSetup {
  const { player, settings } = app;
  const little = player.littleHands;
  const marks = loadMarks(player);
  const rules = rulesFor(marks, little);
  const level = little ? "short" : settings.level;
  const need = { today: player.today, speedMatters: player.speedMatters };
  const all = player.practice("all")!;
  const base = { rules, marks, check: false, step: null, stepNumber: null };

  // Today's practice: its own lesson and length, whatever the settings say.
  const step = stepFor(player.profile.id, player.today, "word-garden");
  if (step) {
    const session = currentSession(player.profile.id, player.today)!;
    const practice = player.practice(step.lesson) ?? all;
    const sentences = planRound({ level, count: step.length, keys: practice.keys, weights: practice.weights, onlyKeys: step.lesson === "mine", history: player.history, need, recent: app.recent });
    return { ...base, sentences, keys: practice.keys, step, stepNumber: [session.at + 1, session.steps.length] };
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

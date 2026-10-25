// The child playing now, as every game sees them: their profile, history and place on the Learn path. Games ask it
// which keys to practise and how often each should come up, and hand it each round's log at the end.
import { dayNumber, type History, type RoundLog } from "./history";
import { lessonById, type LessonId } from "./lessons";
import { START, advance, masteryProgress, unlockedKeys, type PathState } from "./path";
import { needWeights } from "./practice";
import { currentProfile, loadHistory, readFor, saveHistory, writeFor, type Profile } from "./profiles";

/** What a round practises: its keys, and how often each should come up (shares summing to 1). */
export interface Practice {
  keys: string[];
  weights: Map<string, number>;
}

/** One day's play, for the streak and progress view. */
export interface DayLog {
  seconds: number;
  rounds: number;
  /** Words per minute from Word Garden's one-minute checks that day, if any. */
  checks: number[];
}

const PATH = "path/v1";
const DAYS = "days/v1";
/** "Tricky letters" leans this much harder on the neediest letters. */
const TRICKY_EMPHASIS = 2;
/** It needs at least this many letters with some history to mean anything. */
const TRICKY_MIN = 4;
const TRICKY_SEEN = 3;
/** A brand-new key's things move at this share of full speed. */
const SLOW_PACE = 0.6;

export class Player {
  readonly profile: Profile;
  history: History;
  path: PathState;

  constructor(profile: Profile = currentProfile()) {
    this.profile = profile;
    this.history = loadHistory(profile.id);
    this.path = readFor<PathState>(profile.id, PATH, { ...START });
  }

  get littleHands(): boolean {
    return this.profile.littleHands;
  }

  /** Little hands are judged on accuracy alone. */
  get speedMatters(): boolean {
    return !this.profile.littleHands;
  }

  get today(): number {
    return dayNumber();
  }

  /**
   * How fast something carrying this letter should move, 0..1 of full speed: keys still being learned come slowly,
   * so a child finds them with the right finger instead of pecking to beat the clock.
   */
  pace(ch: string): number {
    const p = masteryProgress(this.history.letters[ch.toLowerCase()], this.speedMatters);
    return SLOW_PACE + (1 - SLOW_PACE) * Math.min(1, p / 0.8);
  }

  /** The keys unlocked so far on the Learn path. */
  get myKeys(): string[] {
    return unlockedKeys(this.path);
  }

  /**
   * The keys a lesson practises and how often each comes up, weighted by need. "mine" is the Learn path's keys so
   * far; "weak" (Tricky letters) is every letter with some history, leaning hard on the neediest. Returns null for
   * Tricky letters before there's enough history to choose from.
   */
  practice(lesson: LessonId): Practice | null {
    const o = { today: this.today, speedMatters: this.speedMatters };
    if (lesson === "weak") {
      const keys = Object.entries(this.history.letters)
        .filter(([k, r]) => /^[a-z]$/.test(k) && r.seen >= TRICKY_SEEN)
        .map(([k]) => k);
      if (keys.length < TRICKY_MIN) return null;
      return { keys, weights: needWeights(keys, this.history, o, TRICKY_EMPHASIS) };
    }
    const keys = lesson === "mine" ? this.myKeys : [...(lessonById(lesson).letters ?? "")];
    return { keys, weights: needWeights(keys, this.history, o) };
  }

  /** Settings and the like that each game keeps for this player, e.g. read("fresh-cuts/settings/v1", defaults). */
  read<T extends object>(name: string, fallback: T): T {
    return readFor(this.profile.id, name, fallback);
  }

  write(name: string, value: unknown): void {
    writeFor(this.profile.id, name, value);
  }

  /**
   * Fold a finished (or abandoned) round into the history, log the day's play, and move along the Learn path.
   * Returns any keys just unlocked; they come into play from the next round.
   */
  finishRound(log: RoundLog, seconds: number): { unlocked: string[] } {
    if (log.empty) return { unlocked: [] };
    const today = this.today;
    this.history = log.mergeInto(this.history, today);
    saveHistory(this.profile.id, this.history);
    this.logDay(today, { seconds, rounds: 1 });
    const { state, unlocked } = advance(this.path, this.history, this.speedMatters);
    if (unlocked.length > 0) {
      this.path = state;
      this.write(PATH, this.path);
    }
    return { unlocked };
  }

  /** Record a one-minute check's words per minute (Word Garden). */
  recordCheck(wpm: number): void {
    this.logDay(this.today, { checks: [wpm] });
  }

  days(): Record<number, DayLog> {
    return this.read<Record<number, DayLog>>(DAYS, {});
  }

  private logDay(day: number, add: Partial<DayLog>): void {
    const days = this.days();
    const d = days[day] ?? { seconds: 0, rounds: 0, checks: [] };
    days[day] = {
      seconds: d.seconds + Math.round(add.seconds ?? 0),
      rounds: d.rounds + (add.rounds ?? 0),
      checks: [...d.checks, ...(add.checks ?? [])],
    };
    this.write(DAYS, days);
  }
}

import { weakLetters, type Stats } from "./game/stats";

export type LessonId = "all" | "home" | "top" | "bottom" | "weak";

export interface Lesson {
  id: LessonId;
  name: string;
  /** null for "weak", whose letters come from the player's history. */
  letters: string | null;
}

// Letters only: no ; , . / keys.
export const LESSONS: readonly Lesson[] = [
  { id: "all", name: "ALL LETTERS", letters: "abcdefghijklmnopqrstuvwxyz" },
  { id: "home", name: "HOME ROW", letters: "asdfghjkl" },
  { id: "top", name: "TOP ROW", letters: "qwertyuiop" },
  { id: "bottom", name: "BOTTOM ROW", letters: "zxcvbnm" },
  { id: "weak", name: "WEAK LETTERS", letters: null },
];

export const LESSON_IDS = LESSONS.map((l) => l.id);

export function lessonById(id: LessonId): Lesson {
  return LESSONS.find((l) => l.id === id) ?? LESSONS[0];
}

/** The letters a lesson will use, or null if "weak letters" doesn't have enough history yet. */
export function lettersFor(id: LessonId, stats: Stats): string[] | null {
  const lesson = lessonById(id);
  return lesson.letters ? [...lesson.letters] : weakLetters(stats);
}

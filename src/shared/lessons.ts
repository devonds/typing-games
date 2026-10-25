// What a round practises. "My keys" follows the Learn path; the rows and "All letters" are free practice; "Tricky
// letters" leans hard on whatever needs the most work. Which keys and how often each comes up: see player.ts.

export type LessonId = "mine" | "all" | "home" | "top" | "bottom" | "weak";

export interface Lesson {
  id: LessonId;
  name: string;
  /** null for lessons whose letters come from the player ("mine": the Learn path, "weak": their history). */
  letters: string | null;
}

// Letters only: no ; , . / keys.
export const LESSONS: readonly Lesson[] = [
  { id: "mine", name: "MY KEYS", letters: null },
  { id: "all", name: "ALL LETTERS", letters: "abcdefghijklmnopqrstuvwxyz" },
  { id: "home", name: "HOME ROW", letters: "asdfghjkl" },
  { id: "top", name: "TOP ROW", letters: "qwertyuiop" },
  { id: "bottom", name: "BOTTOM ROW", letters: "zxcvbnm" },
  { id: "weak", name: "TRICKY LETTERS", letters: null },
];

export const LESSON_IDS = LESSONS.map((l) => l.id);

export function lessonById(id: LessonId): Lesson {
  return LESSONS.find((l) => l.id === id) ?? LESSONS[0];
}

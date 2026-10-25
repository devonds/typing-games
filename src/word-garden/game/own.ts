// "Our words": a parent pastes in the week's spelling words or a short passage, and it becomes lines to type.
// Only letters, spaces and . , ? ' ! are kept. Sentences end lines; lines without an ending (a list of spelling
// words, or a passage with hard line breaks) run together; anything too long wraps at a word boundary.
import { OWN } from "../config";

/** Typeable lines from pasted text, each at most `maxLength` characters. */
export function ownLines(text: string, maxLength = OWN.maxLength): string[] {
  const clean = text
    .slice(0, OWN.maxText)
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, "")
    .replace(/\r/g, "")
    // A line that ends a sentence stays its own line; other line breaks are just spaces.
    .replace(/([.?!])[ \t]*\n/g, "$1\n")
    .replace(/([^.?!\n])[ \t]*\n+/g, "$1 ")
    .replace(/[^A-Za-z .,?'!\n]/g, " ");
  const sentences = clean
    .split(/\n|(?<=[.?!])\s+/)
    .map((s) => s.replace(/\s+/g, " ").replace(/\s+([.,?!])/g, "$1").trim())
    .filter((s) => /[a-z]/i.test(s));
  return sentences.flatMap((s) => wrap(s, maxLength));
}

/** Split at spaces so no line is longer than `max`; a single over-long word is cut. */
function wrap(s: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of s.split(" ")) {
    for (let w = word; w.length > 0; w = w.slice(max)) {
      const piece = w.slice(0, max);
      if (line && line.length + 1 + piece.length > max) {
        lines.push(line);
        line = "";
      }
      line = line ? `${line} ${piece}` : piece;
    }
  }
  if (line) lines.push(line);
  return lines.filter((l) => /[a-z]/i.test(l));
}

/** `count` lines starting at `from`, cycling round. */
export function ownRound(lines: readonly string[], from: number, count: number): string[] {
  if (lines.length === 0) return [];
  return Array.from({ length: count }, (_, i) => lines[(from + i) % lines.length]);
}

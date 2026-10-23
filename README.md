# Typing Games

Ad-free typing games for the browser, for learning where the letters are.

- **Balloon Pop**: balloons with letters float up from little cannons over a pixel-art city. Type a letter to pop its
  balloon before it floats away. Inspired by typing.com's Type-a-Balloon (`NOTES.md`).
- **Fresh Cuts**: fruit is tossed up from the crates of a grocer's shop at night. Type the letter on a fruit's tag to
  slice it before it falls. Leave the rotten apples alone; slice a frozen one for a few seconds of slow motion.
  Inspired by typing.com's Keyboard Ninja (`NOTES-keyboard-ninja.md`).
- **Word Garden**: type a short sentence, letter by letter, in a garden landscape. Each letter turns into something
  as you type it: a flower growing out of it, a butterfly, a soap bubble, confetti or a firework. Each kind has its own
  time of day (dawn, midday, misty morning, sunset, night), and the sky eases from one to the next.

## Play

Online at **https://devonds.github.io/typing-games/**: a page to pick a game (click a card, or press 1, 2 or 3).
Every push to `main` rebuilds it (`.github/workflows/pages.yml`).

To run it locally:

```sh
npm install
npm run dev        # http://localhost:5173, a page that links to all the games
```

To build a static copy you can put on any web server: `npm run build`, then serve the `dist/` folder
(`npm run preview` does that locally). Opening `dist/index.html` straight from disk won't work; browsers block
module scripts on `file://`.

**Keys, in every game:** letters pop, slice or type (plus the space bar between words in Word Garden). In the menu,
↑ ↓ choose a row, ← → change it, Enter plays. Esc pauses; Esc again goes back to the menu. The games also pause when
you switch tabs. Clicking works too.

## Settings (in each game's menu)

Balloon Pop and Fresh Cuts:

| Setting      | Options |
|--------------|---------|
| Lesson       | All letters, Home row, Top row, Bottom row, Weak letters |
| Level        | Easy, Medium, Hard |
| Speed        | Speeds up during a round, or Steady |
| Rotten fruit | On / Off (Fresh Cuts only) |
| Sound        | On / Off |

Word Garden:

| Setting           | Options |
|-------------------|---------|
| Focus             | All letters, Home row, Top row, Bottom row, Weak letters: favours sentences full of those letters |
| Sentences         | Short, Longer |
| Round             | 5 or 10 sentences |
| Letters turn into | Surprise me (a different kind each sentence), Flowers, Butterflies, Bubbles, Confetti, Fireworks |
| Sound             | On / Off |

Wrong keys never cost points. "Weak letters" becomes available after a few rounds: it picks the letters that most
often get away, get fumbled, or are slow to hit. All the games share that letter history, so a round of any of them
counts. Everything is saved in this browser only.

## Develop

```sh
npm test           # rules + letter history tests
npm run typecheck
```

Each game's numbers are in its `config.ts`; the lessons are in `src/shared/lessons.ts`. `STRUCTURE.md` explains the
code.

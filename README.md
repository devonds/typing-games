# Balloon Pop

An ad-free typing game for the browser. Balloons with letters float up from little cannons over a pixel-art city;
type a letter to pop its balloon before it floats away.

Inspired by typing.com's Type-a-Balloon (see `NOTES.md` for how that one works).

## Play

```sh
npm install
npm run dev        # http://localhost:5173
```

To build a static copy you can put on any web server: `npm run build`, then serve the `dist/` folder
(`npm run preview` does that locally). Opening `dist/index.html` straight from disk won't work; browsers block
module scripts on `file://`.

**Keys:** letters pop balloons. In the menu, ↑ ↓ choose a row, ← → change it, Enter plays. Esc pauses; Esc again
goes back to the menu. The game also pauses when you switch tabs. Clicking works too.

## Settings (in the menu)

| Setting | Options |
|---------|---------|
| Lesson  | All letters, Home row, Top row, Bottom row, Weak letters |
| Level   | Easy (3 cannons, slow), Medium (5), Hard (8, fast) |
| Speed   | Speeds up during a round, or Steady |
| Sound   | On / Off |

Wrong keys never cost points. "Weak letters" becomes available after a few rounds: it picks the letters that
most often float away, get fumbled, or are slow to pop. Everything is saved in this browser only.

## Develop

```sh
npm test           # rules + stats tests
npm run typecheck
```

Tune the game in `src/config.ts`, add or change lessons in `src/lessons.ts`. `STRUCTURE.md` explains the code.

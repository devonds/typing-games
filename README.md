# Typing Games

Ad-free typing games for the browser that teach children to type: which finger goes on which key, a few keys at a
time, then words and sentences. Built on what research says makes typists (`RESEARCH-typing-pedagogy.md`; the plan
is `PLAN-teaching.md`).

- **Balloon Pop**: balloons with letters float up from little cannons over a pixel-art city. Type a letter to pop its
  balloon before it floats away. Inspired by typing.com's Type-a-Balloon (`NOTES.md`).
- **Fresh Cuts**: fruit is tossed up from the crates of a grocer's shop at night. Type the letter on a fruit's tag to
  slice it before it falls. Leave the rotten apples alone; slice a frozen one for a few seconds of slow motion.
  Inspired by typing.com's Keyboard Ninja (`NOTES-keyboard-ninja.md`).
- **Word Garden**: type a short sentence, letter by letter, in a garden landscape. Each letter turns into something
  as you type it: a flower growing out of it, a butterfly, a soap bubble, confetti or a firework. Each kind has its own
  time of day (dawn, midday, misty morning, sunset, night), and the sky eases from one to the next.

## How they teach

- **Players.** Each child picks themselves on the home page ("Who's playing?"): a nickname and a picture, nothing
  else. Progress is kept per player, in this browser only. Nothing is ever sent anywhere.
- **Fingers on the bumps.** Every round starts with both pointer fingers held on F and J.
- **Finger guide.** Each game shows a keyboard coloured by finger, lights the next key, and flashes the right one after
  a slip. Help fades key by key as each is mastered.
- **Learn path.** Keys arrive a few at a time, from F and J outward. The next keys unlock once the current ones are
  mastered (15 recent tries, 90% right first time, at the child's usual speed). Progress shows between rounds, never
  during play. "My keys" is the default lesson.
- **Practice by need.** Letters, letter pairs, words and sentences come up more often the more they need practice:
  more for errors, slow keys and new keys, and old keys come back for review. Known keys stay in the mix.
- **Letters, then words.** Once ready, balloons and fruit carry letter pairs and short words; Word Garden is real
  sentences, later with capitals (Shift) and punctuation.
- **Pressure when it helps.** Things carrying keys still being learned move slowly. Mashing keys doesn't work (a wrong
  key rests for half a second).
- **Short and often.** "Today's practice" on the home page is about ten minutes across the three games. The home page
  shows keys learned, a streak of days and Word Garden's one-minute speed check.
- **Little hands.** A per-player setting for children under about 7: no time pressure, finger guide always on,
  accuracy only, short words, stars instead of scores.

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

Every game's menu has **Player** (switch between players; add them on the home page), **Little hands**, **Finger
guide** (Automatic, which fades with mastery / Always / Off) and **Sound**. Then:

| Setting           | Balloon Pop | Fresh Cuts | Word Garden |
|-------------------|-------------|------------|-------------|
| Lesson / Focus    | My keys, All letters, Home row, Top row, Bottom row, Tricky letters | same | same, plus Our words (a parent's own text) |
| Level             | Easy, Medium, Hard | Easy, Medium, Hard | Sentences: Short, Longer |
| Speed             | Steady or Speeds up | Speeds up or Steady | – |
| Round             | 5 lives or 2 minutes | 5 baskets or 2 minutes | 5 or 10 sentences, or a 1-minute check |
| Other             | – | Rotten fruit on/off | Letters turn into: Surprise me, Flowers, Butterflies, Bubbles, Confetti, Fireworks |

Wrong keys never cost points.

## Develop

```sh
npm test           # rules, history, need, Learn path, profiles...
npm run typecheck
```

Each game's numbers are in its `config.ts`; the lessons are in `src/shared/lessons.ts`. `STRUCTURE.md` explains the
code.

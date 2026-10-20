# How the code is organised

Two games, one repo. TypeScript + Canvas 2D, built with Vite as three pages: a home page and one page per game. No
game engine and no image or sound files: everything is drawn in code and every sound is synthesised with Web Audio.

## The main idea: rules and drawing live apart

Each game's `game/` folder holds its rules as plain TypeScript with no browser APIs. A `World` is stepped forward and
sent key presses, and it returns a list of events (a fruit was sliced, a balloon escaped, the game is over...). Scenes
react to those events with effects and sounds; `look/` only draws. The rules are short, read top to bottom, and are
tested in `test/` without a browser.

```
index.html               home page: a card per game with a live preview; loads src/home/main.ts
balloon-pop/index.html   Balloon Pop's page; loads src/balloon-pop/main.ts
fresh-cuts/index.html    Fresh Cuts' page; loads src/fresh-cuts/main.ts
src/
├── home/main.ts         the home page's previews, drawn with each game's own look/ code
├── shared/              used by both games
│   ├── input.ts         key presses and clicks, queued per game tick
│   ├── lessons.ts       letter sets: all letters, home/top/bottom row, weak letters
│   ├── letters.ts       per-letter history -> "weak letters"; letters to practise after a round
│   ├── storage.ts       localStorage helpers; the letter history both games share
│   ├── synth.ts         tones and filtered noise for sound effects
│   └── rng.ts           seeded random numbers (scenery layout, tests)
│
├── balloon-pop/         256x144 pixel art, scaled up by whole numbers
│   ├── main.ts          canvas, saved data, scene switching, the 60 Hz loop
│   ├── config.ts        every gameplay number: difficulties, speed-up ramp, cannon spots, lives, points
│   ├── audio.ts, storage.ts
│   ├── game/            RULES: world.ts (cannons, balloons, popping), stats.ts (events -> letter history), types.ts
│   ├── look/            DRAWING: palette, 5x7 pixel font, pixels, dusk city scenery, balloons, effects, HUD
│   └── scenes/          SCREENS: menu, play, results
│
└── fresh-cuts/          480x270 scene drawn at the screen's full resolution
    ├── main.ts          canvas, saved data, scene switching, the 60 Hz loop
    ├── config.ts        every gameplay number: waves, air time, speed-up ramp, combos, rotten and frozen fruit, lives
    ├── audio.ts         knife swish, squish, thud, yuck
    ├── storage.ts       settings and best scores
    ├── game/            RULES: world.ts (waves, throws, slicing, baskets), stats.ts, types.ts
    ├── look/
    │   ├── fruit.ts     nine fruits + the rotten apple: outline, shaded skin, cut face; halves; the fly; ice blocks
    │   ├── store.ts     the grocer at night: shelves, slate price tags, spotlights, crates (painted once)
    │   ├── effects.ts   halves flying apart, juice, ice chips, slash streaks, stink puffs, words
    │   └── ui.ts        serif text, letter tags, baskets, score, panels, slow-motion frost
    └── scenes/          SCREENS: menu, play, results
test/
├── shared/              letter history maths
├── balloon-pop/         rules
└── fresh-cuts/          rules
prototype/               throwaway look prototypes: Pyxel (picked Balloon Pop's "Dusk city"),
                         fresh-cuts/ (picked "Night grocer"; `npm run prototype:fresh-cuts`)
```

## How a frame works (both games)

```
main loop (every display frame)
  while a 1/60 s tick is due:
    scene.update(1/60, keys and clicks since last tick)
      play: world.press(key) for each letter  -> events
            world.step(1/60)                  -> events
            each event -> recordEvent(letter history), effects, sound
  scene.draw(...)
```

## Fresh Cuts rules in short

- Fruit comes in waves of 1–2 / 2–3 / 3–4 (easy / medium / hard). The next wave is thrown once every piece of the last
  one has been sliced or has fallen. Each throw spends 3.6 / 3.0 / 2.6 s in the air.
- Every letter on screen is different. Typing a letter slices that fruit: +10. A key matching nothing costs nothing.
- 3+ slices less than 0.8 s apart is a combo ("Juicy!", "Delicious!"...): +5 per fruit when the chain ends.
- A fresh fruit that falls costs one of 5 baskets.
- **Rotten fruit** (on/off in the menu): from wave 3, about a third of waves include one rotten apple with a fly
  buzzing round it. Slicing it costs a basket; letting it fall is free. Its letter doesn't count towards weak letters.
- **Freezer aisle**: from wave 2, about one wave in seven includes a fruit frozen in a block of ice (icy blue tag).
  Slicing it slows everything to 35% speed for 6 s, easing back over the last second; a snowflake timer shows under
  the score. Letting it fall is free. Frozen fruit, like rotten, doesn't count towards weak letters.
- **Speeds up** mode: every 20 s throws get 8% faster (up to 1.6×), and every third step adds a fruit to each wave
  (up to +2). **Steady** mode never changes.

## Balloon Pop rules in short

- Cannons (3 / 5 / 8 for easy / medium / hard) each fire every 5–6 s. Each balloon gets a random letter from the
  lesson, avoiding letters already in the air.
- Typing a letter pops the **oldest** balloon with it: +10. A key matching nothing costs nothing; it shows the
  letter and plays a soft sound.
- A balloon that floats off the top costs one of 5 lives.
- **Speeds up** mode: every 20 s balloons rise 10% faster (up to 2×) and cannons fire ~8% sooner (down to half the
  wait). **Steady** mode never changes.
- The sky turns from dusk (0:00) to twilight (1:15) to night (2:30); windows light up as it gets dark.

## Weak letters (both games)

Every throw or launch, hit, miss, and fumble (wrong key while that letter was the next one to type) is counted per
letter. Older rounds fade (×0.8 per round). The 6 letters with the worst miss rate plus slowest hits form the lesson,
once at least 4 letters have been seen 3+ times.

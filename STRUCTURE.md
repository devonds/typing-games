# How the code is organised

Three games, one repo. TypeScript + Canvas 2D, built with Vite as four pages: a home page and one page per game. No
game engine and no image or sound files: everything is drawn in code and every sound is synthesised with Web Audio.

## The main idea: rules and drawing live apart

Each game's `game/` folder holds its rules as plain TypeScript with no browser APIs. A `World` is stepped forward and
sent key presses (Word Garden's is a `Round`), and it returns a list of events (a fruit was sliced, a balloon escaped,
the game is over...). Scenes react to those events with effects and sounds; `look/` only draws. The rules are short,
read top to bottom, and are tested in `test/` without a browser.

## The second idea: one shared picture of the child

Everything about the child playing lives in `src/shared/`, with no drawing in it: their profile, which keys they've
unlocked on the Learn path, how well they know each key and letter pair, and which finger belongs to each key. Each
game asks a `Player` what to practise and how often (weighted by need), plays a round, and hands back a `RoundLog`.
The games differ in how they practise: Balloon Pop introduces keys gently, Fresh Cuts builds speed on known keys,
Word Garden is real text. Why: `RESEARCH-typing-pedagogy.md`; the plan: `PLAN-teaching.md`.

```
index.html               home page: "Who's playing?", a card per game with a live preview; loads src/home/main.ts
balloon-pop/index.html   Balloon Pop's page; loads src/balloon-pop/main.ts
fresh-cuts/index.html    Fresh Cuts' page; loads src/fresh-cuts/main.ts
word-garden/index.html   Word Garden's page (and its "Our words" box); loads src/word-garden/main.ts
src/
├── home/
│   ├── main.ts          the home page's previews, drawn with each game's own look/ code
│   └── players.ts       "Who's playing?": add, edit, delete players; their keys, streak, speed; Today's practice
├── shared/              used by every game; no drawing
│   ├── input.ts         key presses (with capitals and held keys) and clicks, queued per game tick
│   ├── profiles.ts      players: nickname, picture, Little hands; per-player storage; moves pre-profile data across
│   ├── player.ts        the child playing now: what to practise (keys + weights), pace, finishing a round, days
│   ├── history.ts       per-letter and per-pair history (recent results, totals, last day); RoundLog
│   ├── practice.ts      the need score and weighted picking: letters, pairs, words, sentences
│   ├── path.ts          the Learn path: stages from F J outward, mastery, unlocking
│   ├── lessons.ts       My keys, all letters, home/top/bottom row, Tricky letters
│   ├── keyboard.ts      key positions, which finger presses each key, finger colours, Shift and apostrophe
│   ├── guide.ts         the finger guide: what to light, fading key by key with mastery
│   ├── ritual.ts        "fingers on the bumps": hold F and J (or press F then J) to start every round
│   ├── hands.ts         per-finger results, the finger that most needs practice
│   ├── words.ts         a kid-friendly word bank and letter pairs, filtered to unlocked keys
│   ├── units.ts         letter, pair or word for a balloon or fruit; lock-on typing of words
│   ├── session.ts       Today's practice: a step in each game, handed on from results to the next game
│   ├── synth.ts         tones and filtered noise for sound effects
│   └── rng.ts           seeded random numbers (scenery layout, tests)
│
├── balloon-pop/         256x144 pixel art, scaled up by whole numbers
│   ├── main.ts          canvas, the player, scene switching, the 60 Hz loop
│   ├── config.ts        every gameplay number: difficulties, speed-up ramp, cannons, lives, spacing, fizzle, stars
│   ├── audio.ts, storage.ts
│   ├── game/            RULES: world.ts (cannons, balloons, lock-on popping), stats.ts (events -> RoundLog), types.ts
│   ├── look/            DRAWING: palette, 5x7 pixel font, pixels, dusk city scenery, balloons, effects, HUD,
│   │                    keyboard (pixel strip under the grass), ritual
│   └── scenes/          SCREENS: menu, play, results (round, then keys)
│
├── fresh-cuts/          480x270 scene drawn at the screen's full resolution
│   ├── main.ts          canvas, the player, scene switching, the 60 Hz loop
│   ├── config.ts        every gameplay number: waves, air time, ramp, combos, rotten and frozen fruit, fizzle, stars
│   ├── audio.ts         knife swish, squish, thud, yuck
│   ├── storage.ts       settings and best scores
│   ├── game/            RULES: world.ts (waves, throws, lock-on slicing, baskets), stats.ts, types.ts
│   ├── look/
│   │   ├── fruit.ts     nine fruits + the rotten apple: outline, shaded skin, cut face; halves; the fly; ice blocks
│   │   ├── store.ts     the grocer at night: shelves, slate price tags, spotlights, crates (painted once)
│   │   ├── effects.ts   halves flying apart, juice, ice chips, slash streaks, stink puffs, words
│   │   ├── keyboard.ts  the slate-and-brass finger keyboard, the start ritual, the results keyboard
│   │   └── ui.ts        serif text, letter tags, baskets, score, panels, slow-motion frost
│   └── scenes/          SCREENS: menu, play, results
│
└── word-garden/         480x270 scene drawn at the screen's full resolution
    ├── main.ts          canvas, the player, scene switching, the 60 Hz loop
    ├── config.ts        burst kinds, sentence levels, round lengths, layout and timing, stages, stars
    ├── audio.ts         a wandering pentatonic tune, one note per letter, in each burst's own voice
    ├── storage.ts       settings and best words per minute
    ├── game/            RULES: round.ts (typing a sentence; capitals and punctuation when ready; speed, accuracy),
    │                    sentences.ts (the bank; picking by need; phrases and letter groups for early stages),
    │                    stages.ts (capitals, then punctuation), own.ts ("Our words"), stats.ts, types.ts
    ├── look/
    │   ├── palette.ts   five times of day (dawn, midday, misty morning, sunset, night) and blending between them
    │   ├── landscape.ts sky, sun or moon, clouds, hills in haze, swaying grass, motes or fireflies, paper grain
    │   ├── words.ts     the sentence on one line and the marker under the next letter
    │   ├── keyboard.ts  the frosted finger keyboard on the meadow
    │   ├── ritual.ts    "fingers on the bumps"
    │   ├── progress.ts  the results' key garden: keys filling as they're learned, new keys blooming
    │   ├── bursts/      what a typed letter turns into: flowers, butterflies, bubbles, confetti, fireworks
    │   └── ui.ts        type, panels, progress dots, cheers, the one-minute clock
    └── scenes/          SCREENS: menu, play, results
test/
├── shared/              history, need, Learn path, profiles, guide, ritual, words, units, session
├── balloon-pop/         rules
├── fresh-cuts/          rules
└── word-garden/         rules, sentence bank and picking
prototype/               throwaway look prototypes: Pyxel (picked Balloon Pop's "Dusk city"),
                         fresh-cuts/ (picked "Night grocer"; `npm run prototype:fresh-cuts`),
                         sentences/ (Word Garden's first try: bursts vs. "comes alive"; `npm run prototype:sentences`)
```

## How a frame works (every game)

```
main loop (every display frame)
  while a 1/60 s tick is due:
    scene.update(1/60, keys, held keys and clicks since last tick)
      play: ritual first (hold F and J), then
            world.press(key) for each letter  -> events
            world.step(1/60)                  -> events
            each event -> logEvent(RoundLog), guide, effects, sound
      end:  player.finishRound(log) -> history saved, maybe new keys -> results
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
- **What's thrown**: letters chosen by need from the lesson, never two with the same first letter in the air. From
  Learn path stage 7 (or once most of a lesson is known), some fruit carry a letter pair or short word: the first
  letter locks on, the rest must follow, each letter nicks the fruit and the last slices it. Keys still being learned
  fly longer.
- **Fizzle**: a wrong key does nothing for half a second. **Round**: 5 baskets, or 2 minutes (drops cost 10 points).
- **Little hands**: no rotten fruit, fruit waits at the top until sliced, 20 fruit a round, stars for right first time.

## Balloon Pop rules in short

- Cannons (3 / 5 / 8 for easy / medium / hard) each fire every 5–6 s. Each balloon gets a letter chosen by need from the
  lesson, never with the same first letter as one in the air.
- Typing a letter pops the **oldest** balloon with it: +10. A key matching nothing costs nothing; it shows the
  letter and plays a soft sound.
- A balloon that floats off the top costs one of 5 lives.
- **Speeds up** mode: every 20 s balloons rise 10% faster (up to 2×) and cannons fire ~8% sooner (down to half the
  wait). **Steady** mode never changes.
- The sky turns from dusk (0:00) to twilight (1:15) to night (2:30); windows light up as it gets dark.
- **Pairs and words** (from Learn path stage 7): longer balloons, typed by locking on with the first letter; at most two
  in the air. Balloons ease apart so none overlap. Keys still being learned rise slowly; reaction time counts from
  when a balloon becomes the oldest.
- **Fizzle**: a wrong key does nothing for half a second. **Round**: 5 lives, or 2 minutes (escapes cost 10 points).
- **Little hands**: balloons wait near the top until popped, 20 balloons a round, stars for right first time.

## Need, mastery and the Learn path (every game)

Each appearance of a letter is logged as right first time or not, with its time compared with the child's typical
time in that round (so a slow key means the same thing in every game). A letter keeps its last 20 results.

- **Need** (`practice.ts`): a floor (so known keys keep coming back), plus errors, slowness, a boost for new keys,
  and a review bonus for keys not practised for a while. No key gets more than a quarter of the picks. Pairs, words
  and sentences are scored from the letters and pairs in them. Tricky letters leans harder on need.
- **Mastery** (`path.ts`): 15 recent tries, 90% right first time, no slower than typical (accuracy only for Little
  hands). Shown only between rounds.
- **Learn path**: f j, d k, s l, a, g h, r u, e i, t y, w o, q p, v m, c, b n, x, z. A stage unlocks when every key so far
  is mastered; new keys join from the next round. In Word Garden, capitals and then punctuation follow.
- **Finger guide**: new keys are lit; known keys only after a slip; mastered keys never. The keyboard hides once
  everything in play is mastered. Little hands always get the full guide.

## Word Garden rules in short

- A round is 5 or 10 sentences: Short ones (up to about four words) or Longer ones (up to about eight), always on one
  line. Focus picks sentences rich in the chosen letters (weighted, not strict: there are no sentences made only of
  the bottom row). Last round's sentences are less likely to come straight back.
- Type each letter, and the space bar between words. Capitals don't need shift; punctuation is filled in. A wrong key
  just wiggles the next letter and counts as a fumble for it.
- Each typed letter turns into the sentence's kind of burst. "Surprise me" shuffles all five so none repeats back to
  back. After the last letter there's a pause to enjoy it ("Perfect!" if there were no wrong keys), then the next
  sentence, and the sky moves on to that kind's time of day.
- Words per minute count typing time only (from the first key of each sentence to its last), five characters to a
  word. Best is kept per sentence length.
- **Our words**: a parent pastes text into a box on the menu (it stays in this browser); rounds type it line by line.
- **One-minute check**: fresh sentences for a minute of typing; words per minute and accuracy go on the home page.
- **Later stages**: once every letter is mastered, capitals need Shift; after 30 good capitals, `. , ? '` are typed too.
- **Little hands**: short sentences, bigger letters, no speed, stars instead of words per minute.

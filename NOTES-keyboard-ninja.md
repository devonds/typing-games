# Keyboard Ninja: how the original works

Reverse engineered on 2026-10-19 from `https://www.typing.com/dist/student/extras/game_files/keyboard-ninja/app.min.745.js`.
REA (`capture-browser-scenario`) found the game's files; REA's bundled Playwright drove a real round for screenshots
(REA's own scenario clicks can't target a spot inside a canvas). The bundle is Parcel 2 and kept its module paths,
so the original source layout is known. Its source map exists but is not public (403).

## Tech

- PIXI.js v7 with `@pixi/particle-emitter`, Howler for sound, an 800×600 logical stage shown in a 916×400 frame.
- Painted art, one PNG per fruit: whole fruit (3 frames for a spin), halves, quarters and the cut face. Plus a wooden
  plank background, a monkey ninja built from parts (face, mouths, arm with a banana sword), juice splats and slash
  trails. Four custom fonts.
- ~60 KB of game code in ~70 modules; the rest of the 975 KB is PIXI. The page around it loads ad and tracking scripts
  and shows a sign-up wall at game over.

## Module map (game code only)

```
views/menu, hall, title, select-mode, select-difficulty   dojo menu: Start -> mode -> difficulty
views/game                  background, monkey, lives, combo, freeze border; runs the controller
views/game/controller       ALL the rules: waves, launching, key presses, scoring, misses, power-ups
views/game/create-path      a fruit's flight: y eases up to an apex and back down, x moves linearly
views/game-over             score, fruit sliced, time; Play again / Main menu (separate screen for bombs)
actors/sliceable-object     base for anything with a letter: path, spin, shadow, slice -> halves + splatter
actors/fruit, fruit-half, fruit-quarter-half, letter, slash, splatter, splat
actors/bomb-hazard          a bomb with a letter; slicing it ends the game
actors/freeze-power-up, double-points-power-up, clear-screen-power-up
actors/monkey               expressions: default, happy, smile, combo, miss, powerup, bomb, shock, game-over
actors/combo, lives, settings, slash-effect-selector    slash styles unlocked by lifetime points
consts                      every number below
```

## Rules

**Flow:** title (Start) → Select a Mode (All letters, Home row, Top row, Bottom row, Numbers) → Select a
Difficulty (Easy, Medium, Hard) → play until game over.

**Waves** (`controller.nextWave` / `createWave`): the game throws a wave of objects, waits until every one is
sliced or has fallen, then throws the next wave from the other side.
- Objects per wave: 1 / 3 / 4 (easy / medium / hard) + 1 more every 10 waves. This is the only ramp-up.
- Launches inside a wave are 5–300 ms apart.
- Each object gets a random letter from the mode **with repeats allowed**, and the next fruit type in a shuffled cycle
  (apple, orange, lime, coconut, banana, strawberry).
- Flight: rises for ~1.25 s (±10%) with an ease-out, then falls for the same time; total air time is ~2.5 s at
  every difficulty. Start x is random within the left or right third; it drifts across while rising and falling.

**Typing** (`controller.sendKey`):
- The active list is sorted power-ups first, then fruit, then bombs, and the first object whose letter matches is
  sliced. So when a fruit and a bomb share a letter, the fruit wins.
- Slice: halves fly apart, juice splats on the wooden board, the letter splits. **+13 points.**
- Wrong key (nothing on screen has that letter): **−7 points**, the combo resets, the monkey winces.

**Combos:** 3+ fruit sliced with less than 800 / 600 / 400 ms between them. When the chain ends you get a bonus of
13 × the chain length, and a word: good, great, awesome, amazing, incredible.

**Misses:** a fruit that falls off the bottom costs one of **3** X marks. Losing all 3 ends the game. Missed bombs and
power-ups cost nothing.

**Bombs:** each object slot has a 25% / 11% / 12% chance to be a bomb (none in the first 3 waves on easy). Typing
a bomb's letter ends the game immediately, with an explosion. Easy throws one object per wave, so a quarter of easy's
throws after wave 3 are bombs.

**Power-ups** (at most one per wave, ~6% chance):
- Double points for 4 s.
- Clear screen: slices everything on screen except bombs, one after another.
- Freeze for 5 s: everything slows to 10% speed and the screen tints blue.

**Extras:** slash trail styles (red, flame, stars, rainbow…) unlock as lifetime points reach 150, 500, 1000 … 21000.
The game over screen shows total score, fruit sliced and time played.

## Things worth noting

- Repeated letters plus 2.5 s of air time make the game feel frantic on Medium: three fruit can carry the same letter.
- Instant game over from a bomb is harsh for a young typist who is reading letters, not objects.
- The score can go negative (the first screenshot round ended at −3).
- A `flags.launch` debug switch forces waves of power-ups or bombs, and `auto_slash` plays the game by itself.

## Our version

Built as **Fresh Cuts** in TypeScript: see `README.md` and `STRUCTURE.md`. Chosen look: "Night grocer" from
`prototype/fresh-cuts/`. Differences from the original: a grocer's shop at night instead of a dojo, fruit drawn in
code that shows its inside when sliced, letters on price tags and never repeated on screen, no penalty for wrong keys,
rotten apples that cost a basket (and can be switched off) instead of bombs that end the game, 5 baskets instead of
3 misses, an optional speed-up, letters only (no punctuation or numbers), and a "weak letters" lesson shared with
Balloon Pop. Of the power-ups, only the freeze is in, as "the freezer aisle": a fruit frozen in ice that slows
everything to 35% (not 10%) for 6 s.

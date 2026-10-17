# Balloon Pop: how the code is organised

TypeScript + Canvas 2D, built with Vite. No game engine, no image or sound files: everything is drawn with
pixel shapes on a 256×144 canvas and every sound is synthesised with Web Audio. The built game is ~26 KB of JS.

## The main idea: rules and drawing live apart

`src/game/` holds the rules as plain TypeScript with no browser APIs. A `World` is stepped forward and sent key
presses, and it returns a list of events (`launched`, `popped`, `wrongKey`, `escaped`, `speedUp`, `gameOver`).
Scenes react to those events with effects and sounds; `src/look/` only draws. The rules are short, read top to
bottom, and are tested in `test/` without a browser.

```
index.html               the canvas + favicon; loads src/main.ts
src/
├── main.ts              canvas scaling, input, sound, saved data, scene switching, the 60 Hz loop
├── config.ts            every gameplay number: difficulties, speed-up ramp, cannon spots, lives, points
├── lessons.ts           letter sets: all letters, home/top/bottom row, weak letters
├── storage.ts           settings, letter history and best scores in localStorage
├── input.ts             key presses and clicks, queued per game tick
├── audio.ts             chiptune sound effects (Web Audio)
├── rng.ts               seeded random numbers (scenery layout, tests)
│
├── game/                RULES (no drawing, no browser)
│   ├── types.ts         Balloon, Launcher, GameEvent
│   ├── world.ts         cannons fire, balloons rise, keys pop, lives run out, speed ramps up
│   └── stats.ts         per-letter history -> "weak letters"; letters to practise after a round
│
├── look/                DRAWING
│   ├── palette.ts       the 16 colours (Sweetie 16) and balloon colours
│   ├── font.ts          5x7 pixel font
│   ├── pixels.ts        crisp rect/circle/line/dither/text drawing
│   ├── scenery.ts       dusk city: sky bands, sun/moon, stars, clouds, skyline; dusk -> night over a round
│   ├── sprites.ts       balloon and cannon
│   ├── effects.ts       pop bursts, darts, "+10", wrong-key letter, banners
│   ├── hud.ts           score, speed, life balloons
│   └── ui.ts            panels, blinking
│
└── scenes/              SCREENS
    ├── scene.ts         Scene and App interfaces, RoundResult
    ├── menu.ts          lesson, level, speed mode, sound; Enter to play
    ├── play.ts          runs a World, turns its events into effects/sounds, pause, game-over pops
    └── results.ts       time, balloons, accuracy, score, best, letters to practise
test/
├── world.test.ts        rules
└── stats.test.ts        weak-letter maths
prototype/               the throwaway Pyxel look prototype that picked "Dusk city"
```

## How a frame works

```
main loop (every display frame)
  while a 1/60 s tick is due:
    scene.update(1/60, keys and clicks since last tick)
      play: world.press(key) for each letter  -> events
            world.step(1/60)                  -> events
            each event -> recordEvent(stats), effects, sound
  scene.draw(pixels)
      play: scenery -> balloons -> cannons -> effects -> HUD (-> pause panel)
```

## Rules in short

- Cannons (3 / 5 / 8 for easy / medium / hard) each fire every 5–6 s. Each balloon gets a random letter from the
  lesson, avoiding letters already in the air.
- Typing a letter pops the **oldest** balloon with it: +10. A key matching nothing costs nothing; it shows the
  letter and plays a soft sound.
- A balloon that floats off the top costs one of 5 lives.
- **Speeds up** mode: every 20 s balloons rise 10% faster (up to 2×) and cannons fire ~8% sooner (down to half the
  wait). **Steady** mode never changes. Set in the menu.
- **Weak letters**: every launch, pop, escape, and fumble (wrong key while that letter was the oldest balloon) is
  counted per letter. Older rounds fade (×0.8 per round). The 6 letters with the worst miss rate plus slowest pops
  form the lesson, once at least 4 letters have been seen 3+ times.
- The sky turns from dusk (0:00) to twilight (1:15) to night (2:30); windows light up as it gets dark.

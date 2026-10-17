# Type-a-Balloon: how the original works

Reverse engineered on 2026-10-15 from `https://www.typing.com/dist/student/extras/game_files/type-a-balloon/app.min.745.js`
using REA (`capture-browser-scenario` to find the game's files, `analyze-javascript-application` on the bundle).
The bundle is webpack 1 + Babel and kept its module paths, so the original source layout is known.

## Tech

- Phaser 2 (CE) on a fixed **800×400** canvas, ~60 fps.
- One sprite atlas (`typeABalloonTA.png` + JSON, made with TexturePacker), one for the preloader/background
  (`preloaderTA`), seven MP3s: `gameMusic`, `cannonBlast`, `balloonPop`, `balloonExplode`, `arrowFly`, `balloonInflate`
  (plus site-level `pop`/`error`).
- The game itself is ~55 KB of code in 17 modules. The rest of the 1 MB is Phaser, PIXI, core-js and underscore.
  The page around it loads 50+ ad/tracking scripts.

## Module map

```
init.js            registers the game on window.bootstrapGlobals
game.js            Game subclass: difficulty table, sound toggles, state registration
states/
  boot.js          load preloader atlas, read saved settings from localStorage
  preloader.js     load assets, define letter sets, go to menu (or straight to game)
  mainMenu.js      floating wooden sign: difficulty + lesson pickers, Play button
  mainGame.js      create GameManager, start timer, wait for game over
  gameOver.js      show time / balloons popped / score; Play again / Main menu
gameManager.js     score, lives, end-of-game rules (listens to SpawnManager signals)
spawnManager.js    owns cannons + live balloons, handles every keypress
cannon.js          aims (random 0–90°), fires a balloon, waits 5–6 s, repeats
balloon.js         letter on a coloured balloon; launch tween then floats up
dart.js            cosmetic dart flying from (400,400) to the target in 100 ms
inGameHUD.js       score board, 5 life balloons, music/SFX buttons
dayNightCycle.js   sky gradient, sun/moon/stars, drifting clouds, houses, grass
button.js, optionButton.js, optionGroup.js   UI widgets
```

## Game loop

**States:** `Boot → Preloader → MainMenu → MainGame → GameOver → (MainGame | MainMenu)`.
The background (`DayNightCycle`) is created once and kept across states.

**Difficulty** (`game.js`):

| level  | cannons | fire interval | launch tween | float speed |
|--------|---------|---------------|--------------|-------------|
| easy   | 3       | 5–6 s         | 1100 ms      | 0.3 px/frame (~18 px/s) |
| medium | 5       | 5–6 s         | 800 ms       | 0.5 px/frame (~30 px/s) |
| hard   | 8       | 5–6 s         | 600 ms       | 0.7 px/frame (~42 px/s) |

Default is `hard`. More cannons means more balloons at once; balloons rise faster too.

**Lessons** (letter pools, `preloader.js`):
- `all_letters`: a–z ; , .
- `home_row`: a s d f g h j k l ; '
- `top_row`: q w e r t y u i o p
- `bottom_row`: z x c v b n m , . /
- `numbers`: 1–0

**Cannons** (`cannon.js`): 8 fixed spawn points along the ground, each with x/y, a scale (fakes depth) and a
staggered first-fire delay (0.5–5.5 s). Only the first N are used for the difficulty. Each cannon loops:
rotate barrel to a random 0–90° over 1 s → fire → wait random 5–6 s → repeat.
Firing picks a **random letter from the lesson pool** (repeats allowed), puffs smoke, plays `cannonBlast`.

**Balloons** (`balloon.js`): random colour (green, magenta, orange, purple, red), letter in black 32 px text.
Spawn at the barrel tip at 25% scale, tilted to the barrel angle. Over `launchTime` they grow to `0.5 + 0.5×cannonScale`,
straighten, and move ~100 px up. After that they rise `floatSpeed` px every frame.

**Typing** (`spawnManager.keyPress`):
- Case-insensitive. The game scans live balloons **oldest first** and pops the first one whose letter matches.
- Hit: dart flies to it, balloon pops (particle burst), **+14 points**.
- Miss (no balloon has that letter): dart flies to a random spot off the top, **−7 points**. Score can go negative.

**Lives** (`gameManager.js`): 5. When a balloon's y < −100 (off the top), `balloonExplode` plays and you lose a life.
At 0 lives: stop input, pop all remaining balloons 100 ms apart, slide the HUD out, then after 1.5 s go to GameOver
with `(seconds survived, balloons popped, score)`.

**No levels or ramp-up.** Difficulty is fixed for the whole round, and the round lasts until you run out of lives.

**Day/night** (`dayNightCycle.js`): every 60 s the sun sets/moon rises over 2 s and stars fade in. It's cosmetic.
Five clouds drift left at speeds set by their random size and wrap around.

## Things worth noting

- The "Play again" and "Main menu" buttons save settings to `localStorage` and **reload the whole page** unless you
  have a premium account, so the ads load again. That's the only reason `boot.js` reads `reloadData`.
- "Inline" mode (used inside lessons) feeds a fixed letter sequence instead of random letters and ends when it runs out.
- In `mainMenu.js` the last three lesson buttons all get y=60. Probably a bug that the option group's layout hides.
- Easter eggs: pressing S/E/J/I on the menu shows "i <3 sofia/emmalyn/josiah/isabelle".

## Our version

Built as **Balloon Pop** in TypeScript: see `README.md` and `STRUCTURE.md`. Chosen look: "Dusk city" from
`prototype/prototype_look.py`. Differences from the original: no penalty for wrong keys, optional speed-up during
a round, letters only (no punctuation), and a "weak letters" lesson built from play history.

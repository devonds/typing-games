# Plan: making the games teach typing

October 2026. Builds on `RESEARCH-typing-pedagogy.md`.

## Goal

Today the games train "see a letter, find its key". That's the first rung. This plan adds what the research says
actually makes a typist:

- one consistent finger for each key, starting from the home row, with eyes on the screen
- keys introduced a few at a time, with time pressure arriving only once a key is known
- practice of letter sequences: pairs, words and sentences, not only single letters
- short, frequent sessions

The three games become one course, sharing a single picture of what the child knows.

## The main idea: one shared "skill model", three ways to practise

Everything about *the child* lives in shared code: which keys they've unlocked, how well they know each key and each
letter pair, which finger each key belongs to, and what needs practice next. Each game asks that model what to show
and reports back what happened. The games stay different in *how* they practise:

| Game | Unit of practice | What it's best at |
|---|---|---|
| Balloon Pop | letters, then pairs and short words on balloons | first contact with new keys; gentle, slow, forgiving |
| Fresh Cuts | letters, pairs and words on fruit, under time pressure | speed and automaticity on keys already known |
| Word Garden | real sentences | fluency on real text; the speed check |

## Change from the brief: weight by need, not by English

The brief suggests picking letters in proportion to how often they appear in English. **We're not doing that.** Every
letter matters equally to a child learning the keyboard, and drilling `e` more than `z` doesn't teach anything
useful.

Instead, one weighting mechanism decides how often anything comes up, based on **how much it needs practice**. The same
mechanism weights single letters, letter pairs, words and sentences.

### The "need" score (shared, `src/shared/practice/need.ts`)

Each letter gets a need score from its history. Each part is easy to tune on its own:

| Part | What it measures | Effect |
|---|---|---|
| Floor | every unlocked letter | a mastered letter still turns up now and then; this interleaving is what keeps weak letters mixed with known ones |
| Errors | fumbles and misses over recent appearances, smoothed | more practice for letters the child gets wrong |
| Slowness | this letter's time compared with the child's own typical time *in the same game* | more practice for letters they hesitate on |
| New | the first ~20 appearances after a key is unlocked | a new key gets a boost while it's being learned |
| Review | days since the letter was last practised | old keys come back on a spaced schedule instead of being forgotten |

A cap stops any single letter taking more than about a quarter of the picks, so even a struggling child mostly sees a
mix of weak and comfortable letters. (The current "weak letters" lesson, six hard letters and nothing else, is the
blocked practice the research warns against. It becomes "Tricky letters": the same need weights, turned up.)

**Pairs** (`th`, `ed`, `ki`...) get the same treatment, keyed by the two letters. A pair's need is its own history plus
the need of its two letters. **Words and sentences** are scored from the letters and pairs they contain, so a sentence
full of the child's tricky pairs is more likely to come up. That's how Word Garden's Focus already works, generalised.

**Slowness has to be measured fairly**, which it isn't today: each game times different things. Each game will record
times relative to that round's own typical time, so a slow `q` in Balloon Pop and a slow `q` in Word Garden mean the
same thing. Balloon Pop will also start its clock when a balloon becomes the oldest target, not when it launches.

### A shared picker (`src/shared/practice/pick.ts`)

`pick(candidates, need, { avoid, random })`: a weighted random choice that skips anything already on screen. All three
games and the word and sentence lists use it. It replaces the uniform `pickLetter` in both worlds and
`pickSentences` in Word Garden.

## Shared pieces

All new code goes under `src/shared/`. Each piece has no drawing in it and gets unit tests, like the rules do today.

1. **Keyboard model** (`keyboard.ts`): QWERTY key positions, which finger and hand presses each key, the home keys,
   the bumps on F and J. Every game's keyboard drawing and the finger statistics read from this.
2. **History, extended** (`letters.ts` and storage). Alongside the per-letter totals the games keep today:
   - pair statistics, recorded whenever two letters are typed one after the other (words, sentences, pair objects)
   - a short window of each letter's last ~20 outcomes, for judging mastery (decaying totals can't say "the last 15
     were right")
   - the date each letter was last practised, for review

   Stored under new keys with a migration from `typing/letters/v1`, so nothing a child has done so far is lost.
3. **Need and picker** (`practice/`): as above.
4. **Learn path** (`path.ts`): the stages, the mastery rule, and which keys are unlocked.
   - Stages follow the usual curriculum outward from the home anchors: `f j` → `d k` → `s l` → `a` → `g h` →
     `r u` → `e i` → `t y` → `w o` → `q p` → `v m` → `c` → `b n` → `x` → `z`. Each stage adds to the ones before it.
     (The usual curriculum pairs `a` with `;` and `c` with `,`; letters only here, until punctuation arrives in Word
     Garden.)
   - A key counts as **mastered** when the last 15 appearances were at least 90% right first time and its speed is
     no slower than the child's typical speed (thresholds in one config so we can tune them).
   - A new stage unlocks when every key so far is mastered.
   - **Mastery is only shown between games, never during play**, so a child plays without a meter to watch. During
     a round the game quietly records; on the results screen (and in the menu and the landing page's progress panel)
     they see each key's progress and any unlock: "New keys: G and H!" New keys come into play from the next round.
   - A new lesson, **"My keys"**, becomes the default: everything unlocked so far, weighted by need. The existing
     lessons (rows, all letters, tricky letters) stay for free practice.
5. **Finger guide logic** (`guide.ts`): how much help each key gets right now. A key is in one of three states:
   - **show**: new keys; the key and its finger light up for every target
   - **on slip**: known keys; the guide appears only after a wrong key
   - **off**: mastered keys; no guide

   It also handles the player's setting: *Finger guide: Automatic / Always / Off*.
6. **Word bank** (`words.ts`): a few hundred short, common, kid-friendly words. Filtered by which keys are unlocked,
   weighted by need. Even with only the home row there's enough to work with (`sad dad had flask glad ask all`).
7. **Input** (`input.ts`): report Shift with a key, and track which keys are held down. Both are needed: capitals in
   Word Garden, and the "both pointer fingers on the bumps" start.
8. **Profiles** (`profiles.ts`): each child gets their own Learn path, history and settings, so siblings on one
   computer don't muddle each other's progress.
   - A profile is a nickname and a picture chosen from a small set (an animal or a flower). Nothing else is asked
     for: no age, no email, no account.
   - **Everything stays in this browser.** Profiles live in localStorage like everything else; nothing is ever sent
     anywhere and there is no server. The landing page footer keeps saying so.
   - Picked on the landing page ("Who's playing?") and remembered. Each game's menu shows who's playing, with a way
     to switch.
   - All existing keys get a profile prefix (`typing/<profile>/letters/v2`...). On first visit after the update, the
     data already in the browser becomes the first profile, so nothing is lost.
   - A profile can be renamed or deleted (with a confirmation), and deleting really removes its data.
9. **Days and streaks** (`progress.ts`): a small daily log (minutes played, keys practised, any speed check) for the
   progress view.
10. **Hand diagram data**: per-finger accuracy and speed rolled up from the per-letter history through the keyboard
   model. Each game draws it on its results screen; the numbers are shared.

## Per-game pieces

### All three games (same behaviour, drawn in each game's style)

- **"Fingers on the bumps" start**: before each round, show the home row with the F and J bumps highlighted and the
  pointer fingers drawn on them. The round starts when F and J are held together. This happens **before every round**,
  so the hands start in the same place every time. (With Little hands, pressing F and then J is enough.)
- **Finger keyboard**: a small keyboard with each key tinted by finger and the home keys marked. The current target's
  key and finger light up, depending on the guide state. After a wrong key, the right key flashes. It fades as keys
  are mastered, and the keyboard hides itself once everything in play is mastered (the setting brings it back).
- **Results screen**: this is where progress shows. The hand diagram ("your left ring finger needs practice"), each key
  in play filling towards mastered, and the "new keys unlocked" moment when it happens. None of this appears during
  play.

### Balloon Pop: the gentle introducer

- **Keyboard**: a 3-row pixel-art strip in the 22 pixels under the grass. Keys are coloured blocks (too small for
  letters at this size). The target key blinks.
- **Pressure follows mastery**: a balloon carrying a key that's still being learned rises at about 60% speed. Known
  keys rise at full speed. Learn path rounds default to Steady.
- **Pairs and words**: from the stage where vowels arrive (`e i`), some balloons carry a pair or a short word on a
  wider tag. Letters light up as they're typed. The first letter "locks on" to the oldest balloon starting with it;
  later keys must continue that word. If it escapes, the lock is released.
- **Discourage mashing**: a wrong key "fizzles": that key does nothing for half a second. It stops random hammering
  from popping balloons without punishing an honest slip.
- **Reaction time** starts when a balloon becomes the oldest target.

### Fresh Cuts: speed on known keys

- **Keyboard**: a slim vector keyboard across the bottom, over the crates, in the shop's brass-and-slate style.
- **Only known keys under full pressure**: in "My keys", fruit for keys still being learned get a longer air time.
  "Speeds up" stays the default here, because this is where speed should be built.
- **Pairs and words**: a fruit's tag can carry a pair or word. Each correct letter makes a cut, and the last one
  slices it through. Same lock-on rule as Balloon Pop. Combos count whole words.
- **Fizzle** on wrong keys, as in Balloon Pop. The existing combo break already helps.
- **Short rounds**: a "2 minutes" round length that ends on time rather than on baskets (dropped fruit just costs
  points).

### Word Garden: real text, and the measure of progress

- **Keyboard**: a soft keyboard on the meadow below the sentence, in the garden's colours. It also teaches the space
  bar (both thumbs), which the other games never use.
- **Sentences by need**: `pickSentences` moves to the shared need weights, including pairs. In "My keys", choose
  sentences that only use unlocked keys. When there aren't enough, build short phrases from the word bank instead
  ("a sad lad", "dad has a flask").
- **Capitals and punctuation, in order**: today capitals don't need Shift and punctuation is filled in. Add them as
  late Learn path stages: Shift (with the opposite little finger) once all letters are mastered, then `. , ? '`. Until
  a child reaches them, they're still filled in.
- **One-minute check**: a fixed one-minute copy of fresh sentences, giving words per minute and accuracy. This is the
  number that means something outside the games, and it's what the progress view charts.
- **Your own words**: a box in the menu where a parent can paste the week's spelling words or a short passage. Typing
  familiar text helps spelling and typing together.

### Little hands (a per-profile setting, for children under about 7)

Younger children are still learning where the letters are, and their hands may not span the home row. The research
says to build familiarity first and leave finger rules and speed for later. Little hands changes:

| | Little hands | Standard |
|---|---|---|
| Finger keyboard | always shown, never fades | fades with mastery |
| Start ritual | press F, then J | hold F and J together |
| Time pressure | none: balloons wait near the top, fruit hangs at the top of its arc, nothing is lost | as now, following mastery |
| Wrong keys | no fizzle | fizzle |
| Mastery | accuracy only, no speed requirement | accuracy and speed |
| Pairs and words | later, and short words only | from the `e i` stage |
| Word Garden | short sentences, bigger letters, no capitals or punctuation stages | full ladder |
| Results | stars and keys unlocked, no words-per-minute | everything |

It's chosen when a profile is made ("Is this for a younger child?") and can be changed in any game's menu.

### The landing page

- **Progress panel**: keys unlocked (a keyboard picture filling in), a streak of days played, and the one-minute check
  over time. It reads the shared storage directly.
- **"Today's practice"** button: about 10 minutes across the games. A few sentences in Word Garden, then a short
  Balloon Pop round on new keys, then Fresh Cuts. The research favours short, frequent sessions over long ones.

## Build order

Each phase ships on its own and is useful without the next.

1. **Fingers.** Keyboard model, finger guide (always on at first), the keyboard in all three games, the right key
   flashing after a wrong one, and the "fingers on the bumps" start. This closes the biggest gap: today nothing says
   which finger to use.
2. **Need-based weighting.** Extended history (with migration), the need score and picker in all three games,
   "Tricky letters" replacing the blocked weak-letters set, fair timing, fizzle, and slower objects for unknown keys.
3. **Profiles and the Learn path.** Profiles (with migration of existing data), Little hands, then stages, mastery,
   "My keys" as the default, progress and unlocks on the results screen, and the guide fading by mastery.
4. **Sequences.** Pair statistics, the word bank, pair and word objects in Balloon Pop and Fresh Cuts, and Word Garden
   choosing sentences by need and building phrases for "My keys".
5. **Sessions and progress.** Fixed-length rounds, the daily log, the progress panel, "Today's practice", and review
   folded into the need score.
6. **Word Garden capstone.** Shift and punctuation stages, the one-minute check, and "your own words".

Rough size: phases 1, 2 and 4 are the largest. Phase 1 has the most new art (three keyboards in three styles); phase 4
changes how targeting works in two games.

## Decided

1. **Profiles**: yes, added before the Learn path (phase 3). Local only: we never collect any data about anyone.
2. **Little hands**: yes, a per-profile setting (above).
3. **Mastery bar**: 90% right first time over the last 15, at the child's typical speed; tuneable. Shown only between
   rounds, never during play.
4. **Start ritual**: before every round.

## How we'll know it's working

- The one-minute check, taken weekly. Speed and accuracy on fresh sentences is the outcome that matters.
- Per-finger accuracy on the results screen. Consistent fingers are the best early sign of future speed (Feit et
  al.). Note: the games can't see fingers, only which keys follow which, so this is inferred.
- Keys mastered over time, and whether keys stay mastered when review brings them back.

# How kids learn to type, and what that means for Balloon Pop and Fresh Cuts

October 2026

## Summary

Typing pedagogy is a real field, though a thin one for children. The strongest evidence comes from adult cognitive science (how skilled typists' brains organise keystrokes) and motor learning (how any physical skill gets practised and retained). Classroom keyboarding research for kids exists, but most of it is small, uncontrolled, or published by curriculum vendors.

Five findings matter most for these games:

1. **Skilled typing runs on sequences of keys.** Expert typists plan words and type them as chunks. Their knowledge of where individual keys sit is implicit and poor when asked directly. A game that only ever asks for one random letter at a time trains a reaction-time skill that is a prerequisite of typing, and stops short of typing itself.
2. **Speed comes from a consistent finger for each key, a still hand, and eyes on the screen.** Ten-finger orthodoxy matters less than consistency. Self-taught typists can be fast, but they look at the keyboard about twice as much.
3. **Learners drift back to hunt-and-peck because it wins in the short term.** Time pressure early in learning rewards looking and pecking. Training that ends before touch typing beats pecking on real text tends not to stick.
4. **Short, frequent sessions beat long ones**, even though learners prefer the long ones.
5. **Guidance should fade.** Colour-coded keyboards and finger hints help early, then become a crutch if they never go away.

The games already get several things right: eyes stay on the screen, wrong keys cost nothing, and the shared "weak letters" history is an adaptive engine most kids' typing games lack. The biggest gaps are that nothing teaches which finger goes where, letters arrive one at a time and at random (with no words, bigrams, or English letter frequencies), and there is no path that introduces keys a few at a time and moves a child forward when they have mastered them. The sentence prototype is the right direction for the capstone.

## What the games do today

From the code and notes in this repo:

| Aspect | Balloon Pop | Fresh Cuts |
|---|---|---|
| Unit of practice | One random letter per balloon | One random letter per fruit |
| Letter choice | Uniform random from the lesson, no duplicates on screen | Uniform random, no duplicates on screen |
| Lessons | All letters, home row, top row, bottom row, weak letters | Same, shared |
| Pressure | Rising balloons, 5 lives, optional speed-up | Falling fruit, 5 baskets, optional speed-up, rotten fruit |
| Wrong key | No penalty; counted as a fumble | No penalty; counted as a fumble |
| Feedback | Score, accuracy, "Practice: x y z" at game over | Same, plus combos |
| Finger or posture cues | None | None |
| Keys covered | a to z only (no space, shift, punctuation) | Same |
| Adaptivity | Weak letters: 6 worst letters by miss rate and reaction time, history decays ×0.8 per round | Shared |

The `prototype/sentences/` work (type a whole sentence; letters bloom into bursts or a picture comes alive) moves toward real text.

## What the research says

### 1. Skilled typing is hierarchical, and the inner loop is implicit

Logan and Crump's two-loop model is the dominant account of skilled typing. An *outer loop* handles language: it reads or composes words and passes them down. An *inner loop* turns each word into a sequence of keystrokes, and the outer loop has little access to how it does this. Evidence:

- Skilled typists hit keys 5 to 6 times a second, yet when asked to point to where a key is, their errors are large. Liu, Crump and Logan (2010) estimated explicit knowledge of key positions is about 12 times less precise than the implicit knowledge that drives typing.
- Typing is faster for meaningful text than for random letters, and typists look further ahead in meaningful text (Salthouse, 1986). Common letter pairs are typed faster than rare ones, and pairs split across the two hands are 30 to 60 ms faster than pairs on one hand.
- Practice is partly item-specific. Crump and Logan (2010) trained skilled typists on particular words. Afterwards, trained words were fastest, new words made of trained letters came next, and new words made of untrained letters were slowest. Learning lives at the letter, bigram, and word levels at once.
- Keystroke timing follows the statistics of English. Crump, Lai and Brosowsky (2019) showed that slowdowns at the start of words and in the middle of long words track how predictable the letter in that position is. Typing skill is, in part, accumulated experience with real text.

**Implication:** recognising a letter and pressing its key is the first rung. Getting fluent requires practising the sequences that real writing is made of: common bigrams, common words, then sentences.

### 2. What makes typists fast: consistency, stillness, preparation

Two large Aalto University studies looked at how people actually type.

- Feit, Weir and Oulasvirta (2016) motion-captured 30 typists. Touch typists and self-taught typists averaged the same speed (57.8 and 58.9 words per minute). Self-taught typists used about 6 fingers to touch typists' 8.5, and they spent 41% of the time looking at the keyboard to touch typists' 20%. What predicted speed in both groups was (a) always using the same finger for a given key, (b) keeping the hands still, and (c) moving a finger toward the next key while the current one is pressed.
- Dhakal and colleagues (2018) analysed 136 million keystrokes from 168,000 people. Fast typists make fewer errors and use "rollover" (pressing the next key before releasing the last), which only works when fingers are pre-positioned.

**Implication:** the thing worth teaching is a fixed home position with one finger per key. That is what makes rollover and eyes-on-screen possible. Strict ten-finger form matters less than consistency, which is reassuring for small hands.

### 3. Why touch typing training fails to stick

Yechiam, Erev, Yehene and Gopher (2003) found that after a touch-typing course, 21 of 22 students were still about 10 words per minute faster when they looked at the keys. Left alone, people choose the strategy that pays off now ("melioration") and slide back to looking. A mild cost attached to keyboard-gazing (a small on-screen signal they had to respond to, which they could only catch with eyes on the screen) raised touch-typing gains by about 25%, still around 30% two weeks later. Their recommendation: keep training until touch typing beats visual typing on everyday text, and practise on material that resembles real use.

**Implication for these games:** they already put a cost on looking down (the balloon escapes while you search the keyboard). That is good. But time pressure on keys a child does not know yet also rewards one-finger pecking, which is fast enough to save the balloon. The pressure should arrive once a key is known.

### 4. Spacing: short and frequent

Baddeley and Longman (1978) trained postal workers to use a keyboard on four schedules. One hour a day learned the keyboard in the fewest hours and typed fastest after 60 hours. Two sessions of two hours a day did worst, made more errors, and was the schedule trainees liked best. (The paper's table is garbled in the scanned copy; the commonly cited figures are about 35 hours versus 50 to learn the keyboard.) Speed fell about 30% over nine months without use, mostly in the first three.

Classroom guidance for children converges on 10 to 15 minute sessions, several times a week, with regular follow-up use, since skills fade quickly without it.

### 5. Evidence on teaching children

- **Age.** Most curricula start formal touch typing around grade 3 (age 8), when hands span the home row comfortably. Before that, programs teach keyboard familiarity. In a quasi-experiment with about 1,700 K to 5 students, Keyboarding Without Tears produced larger speed and accuracy gains than free web activities across grades, with large technique gains in K to 2 (Donica et al., 2019); a two-year follow-up with about 1,300 students found the same (2021). Neither paper is randomised, and the program's authors are involved.
- **Typing training improves typed writing.** Christensen (2004) found that students trained in typing wrote better typed compositions than a comparison group, and that typing training improved writing more than handwriting training did. Weerdenburg et al. (2019) report a similar link between touch-typing training and spelling and narrative writing on the computer in Dutch primary school children.
- **Poor handwriters are not poor typists.** In a sample of grade 1 to 3 children, poor handwriters matched typical children on alphabet keyboarding fluency, while poor spellers lagged (VU Amsterdam study). Spelling knowledge feeds typing once words are involved.
- **Children with learning difficulties gain and keep gains.** Weigelt-Marom and Weintraub (2015) gave 14 touch-typing lessons; speed improved by three months later with accuracy above 95%. No control group.
- **School expectations.** The US Common Core asks for enough keyboarding to type one page in a sitting by grade 4, two by grade 5, three by grade 6.
- **Games specifically.** I found no rigorous study comparing typing games to drill for children. Vendor claims about engagement are plentiful. The honest reading: games are a strong vehicle for practice volume and motivation, and their teaching value depends on what they make the child practise.

### 6. Motor learning principles that apply

- **Fading guidance.** Constant feedback and visual guides help during practice and can hurt retention once removed (the "guidance hypothesis"). The evidence is mixed for complex tasks, so the safe design is guidance that is available early and on error, and withdrawn as performance improves.
- **Interleaving.** Mixing items (weak and strong letters) tends to slow practice and improve retention, compared with drilling one set in a block.
- **Mastery gating.** Introducing a few keys at a time and adding more once the current set is accurate is the structure nearly every typing curriculum uses (home anchors F and J first, then neighbours outward).

## Recommendations

Ordered by how much I think each would improve actual learning, with notes on where it touches the code.

### 1. Teach the fingers: an on-screen keyboard with finger colours that fades

The games currently teach "which key is the letter" and say nothing about which finger presses it. This is the largest gap given the Feit findings.

- Draw a small keyboard at the bottom of the play screen with each key coloured by finger and the home keys marked. Light up the key for the oldest target.
- On a fumble (wrong key while a letter was the next to type), flash the correct key and finger. That is guidance at the moment it is useful.
- Fade it per letter. Once a letter's history shows it is reliably hit (use `letters.ts` stats), stop highlighting it. Eventually hide the keyboard by default with a toggle to bring it back.
- Before each round, a brief "fingers on the bumps" screen: show F and J with home-row fingers and wait for the child to press F and J together to start. That doubles as a posture reset and gives every round the same starting position.

### 2. Add a "Learn" path that introduces keys a few at a time

The row lessons dump 7 to 10 new keys at once, and "All letters" is 26.

- A sequence of stages: `f j` → `d k` → `s l` → `a` → `g h` → `r u` → `e i` → `t y` → ... with each stage including all earlier keys.
- Gate progress on a mastery criterion per key (for example 90% hit rate and a median reaction time under a threshold over the last N appearances). Show a "new key unlocked" moment; kids respond to that.
- Default lesson becomes "My keys": everything unlocked so far, with new keys weighted up.
- This fits naturally in `src/shared/lessons.ts` as a lesson whose letters come from player state, like "weak letters" does already.

### 3. Move from letters to bigrams to words

Single random letters cap what the games can teach. The research says fluency is built on sequences and real-text statistics.

- **Frequency weighting.** Pick letters in proportion to English frequency (within the unlocked set) so `e t a o n` get more practice than `q z x`. Today every letter has equal chance.
- **Bigram objects.** A balloon or fruit tagged `th`, `er`, `in`, `an`: type both letters in order to pop it. Favour hand-alternating pairs early, since they are easier and faster.
- **Word objects.** A balloon carries a short word (`cat`, `the`, `and`). Typed letters light up on the tag as they are hit, so a child can work on several targets by typing their first letters, which is exactly the planning skill the outer loop needs. Draw words from a frequency list filtered to the unlocked keys (with only home row, that is still `sad`, `dad`, `had`, `flash`, `glad`, `ask`, `all`).
- Let the difficulty ladder be letters → bigrams → words, separate from the speed ladder.

### 4. Make time pressure follow mastery

The melioration finding suggests a child learning a new key under time pressure will peck it with whatever finger is nearest.

- When a key is new, slow its object down or give it a longer air time. When it is mastered, let it move at full speed.
- Make "Steady" the default for the Learn path. Keep "Speeds up" for practice on known keys, where pressure builds automaticity.
- Keep the no-penalty wrong keys (good for young kids), but stop rewarding mashing. Today a child can press keys at random and pop balloons for free. A short fizzle (half a second where that key does nothing) or a combo break discourages mashing without punishing honest mistakes. An accuracy-based star rating on the results screen would also help.

### 5. Make weak-letter practice interleaved, and track fingers and pairs

The "weak letters" lesson is the most research-aligned feature here. Two refinements:

- Mix weak letters with known ones (for example 60% weak, 40% mastered). A round of only the six hardest letters is blocked practice and discouraging.
- Track weakness per finger and per bigram as well as per letter. A child who misses `r t v b` has a left-index problem; show that on the results screen as a hand diagram and choose practice accordingly.
- The reaction-time measure today includes the time a balloon spends launching and the time spent finding it among others. Measuring from when a letter becomes the oldest target, or from when the object settles, would make "slow" mean slow-to-type more than slow-to-spot.

### 6. Design for short, frequent sessions

- Rounds that end on lives can run long. Offer a fixed-length mode (two to three minutes) and a daily set of about 10 minutes.
- Show progress across days: keys unlocked, a simple typing-speed number from the sentence game, a streak calendar. This makes "come back tomorrow" the natural rhythm, which Baddeley's data supports.
- Bring old keys back for review on a spaced schedule, using the existing decaying history.

### 7. Finish with real text: the sentence game

Yechiam's results say training must continue until touch typing beats pecking on the text a child actually writes. The sentence prototype is the right capstone.

- Build it on the same letter history so it feeds and draws from "weak letters".
- Add the space bar early (it is the most frequent key in English text), then Shift for capitals, then `. , ? '`. The games currently skip all of these.
- Let a parent paste in the week's spelling words or a short story. Practice on familiar, meaningful text is faster and transfers better, and spelling feeds typing.
- Use it to measure: a 1-minute copy of fresh sentences gives a real words-per-minute and accuracy figure, which is the number that matters outside the games.

### 8. Age bands

- **Under about 7 or 8:** emphasise key familiarity. Sentence "comes alive" mode, big letters, hunting allowed, no time pressure. The finger keyboard can be shown without enforcement.
- **About 8 and up:** the Learn path, finger guidance, fading, and gentle time pressure on mastered keys.

## A suggested build order

1. "Fingers on F and J" start screen, plus the finger-coloured keyboard with a hint on fumble. Small, visible, high value.
2. English-frequency letter weighting and the interleaved weak-letter mix. Changes a few functions in `letters.ts`, `lessons.ts`, and each `world.ts`.
3. The Learn path with mastery gating.
4. Word balloons and word fruit.
5. The sentence game with space, shift, and a 1-minute check, plus a progress view across days.

A note on evaluation: you can test this at home. Take a 1-minute sentence-copy baseline, then compare before and after a few weeks of each change. Logging keystrokes with finger guesses (from which key followed which) would also show whether the finger-to-key mapping is settling, which per Feit is the best leading indicator of future speed.

## Caveats

- Most adult findings come from skilled typists; how well they describe children in their first months is an extrapolation.
- The children's classroom studies are mostly quasi-experimental and some involve the curriculum's own authors.
- I could not access the full text of several papers (Weerdenburg 2019, Christensen 2004, Weigelt-Marom and Weintraub 2015), so those findings come from abstracts and secondary summaries.
- No rigorous study compares typing games with drills for children. The recommendations above apply research on what to practise to the game format.

## Sources

- Logan & Crump (2011), [Hierarchical control of cognitive processes: the case for skilled typewriting](https://www.crumplab.com/publications/Crump/files/3898/Logan%20and%20Crump%20-%202011%20-%20Hierarchical%20control%20of%20cognitive%20processes%20The%20c.pdf)
- Liu, Crump & Logan (2010), [Do you know where your fingers have been? Explicit knowledge of the spatial layout of the keyboard](https://www.crumplab.com/publications/Crump/files/3900/Liu%20et%20al.%20-%202010%20-%20Do%20you%20know%20where%20your%20fingers%20have%20been%20Explicit.pdf)
- Crump & Logan (2010), [Episodic contributions to sequential control: learning from a typist's touch](https://www.crumplab.com/publications/Crump/files/3903/Crump%20and%20Logan%20-%202010%20-%20Episodic%20contributions%20to%20sequential%20control%20Lear.pdf)
- Crump, Lai & Brosowsky (2019), [Instance theory predicts information theory: episodic uncertainty as a determinant of keystroke dynamics](https://www.crumplab.com/EntropyTyping/)
- Salthouse (1986), summary of [Perceptual, cognitive, and motoric aspects of transcription typing](https://www.jimdavies.org/summaries/salthouse1984.html)
- Feit, Weir & Oulasvirta (2016), [How we type: movement strategies and performance in everyday typing](https://userinterfaces.aalto.fi/how-we-type/resources/HowWeType_CHI16.pdf); [Aalto news summary](https://www.aalto.fi/en/news/ten-fingers-not-needed-for-fast-typing)
- Dhakal et al. (2018), [Observations on typing from 136 million keystrokes](https://userinterfaces.aalto.fi/136Mkeystrokes/)
- Yechiam, Erev, Yehene & Gopher (2003), [Melioration and the transition from touch-typing training to everyday use](https://www.readkong.com/page/melioration-and-the-transition-from-touch-typing-training-3050393)
- Baddeley & Longman (1978), [The influence of length and frequency of training session on the rate of learning to type](https://www.gwern.net/doc/psychology/spaced-repetition/1978-baddeley.pdf)
- Donica et al. (2019), [Keyboarding instruction for K to 5 students](https://scholarworks.wmich.edu/ojot/vol7/iss4/3/), Open Journal of Occupational Therapy
- Donica et al. (2021), [Two-year keyboarding outcomes](https://scholarworks.wmich.edu/ojot/vol9/iss3/13/), Open Journal of Occupational Therapy
- Christensen (2004), summarised at [Academic study concludes that teaching kids to touch-type can make them better writers](https://jerz.setonhill.edu/?p=24354)
- van Weerdenburg, Tesselhof & van der Meijden (2019), [Touch-typing for better spelling and narrative-writing skills on the computer](https://onlinelibrary.wiley.com/doi/10.1111/jcal.12323)
- [Fluency and accuracy in alphabet writing by keyboarding: a cross-sectional study](https://research.vu.nl/en/publications/fluency-and-accuracy-in-alphabet-writing-by-keyboarding-a-cross-s), VU Amsterdam
- Weigelt-Marom & Weintraub (2015), [The effect of a touch-typing program on keyboarding skills of higher education students with and without learning disabilities](https://behavioristbookclub.com/aba-research/school-classroom/the-effect-of-a-touch-typing-program-on-keyboarding-skills-of-higher-e/)
- Frontiers in Neuroscience (2016), [feedback frequency and the guidance hypothesis](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2016.00251/full)

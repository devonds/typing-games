# /// script
# requires-python = ">=3.9"
# dependencies = ["pyxel>=2.9"]
# ///
"""PROTOTYPE - throwaway. Answers one question: what should our balloon game look like?

Three structurally different looks over one tiny fake game, switchable with the arrow keys:
  A  Dusk city      side view like the original: cannons on the grass, skyline, sunset
  B  Pocket lanes   4-colour handheld look: one lane per key, on-screen keyboard is the star
  C  Phosphor       amber vector terminal: outline balloons, one turret, a typing prompt

Run:      uv run prototype_look.py            (or --variant B)
Controls: type the letters on the balloons, <- / -> switch look, Esc quits.
Shots:    uv run prototype_look.py --shots DIR   renders a PNG of each look and exits.

The game logic here is deliberately fake (home row only, endless lives). Don't build on it.
"""
import argparse
import math
import random

import pyxel

W, H = 256, 144          # the game's own screen
BAR = 11                 # prototype switcher strip under the game
FPS = 60
LETTERS = list("asdfghjkl;")
BAR_BG, BAR_FG = 14, 15  # palette indexes the switcher bar uses in every look


# ---------------------------------------------------------------- shared fake game

class Balloon:
    def __init__(self, letter, x, y, vx, vy, colour):
        self.letter, self.x, self.y, self.vx, self.vy = letter, x, y, vx, vy
        self.colour = colour
        self.age = 0


class Effect:
    """Short-lived thing to draw: a pop, a miss, a dart."""
    def __init__(self, kind, x, y, **kw):
        self.kind, self.x, self.y, self.age = kind, x, y, 0
        self.__dict__.update(kw)


class Sim:
    def __init__(self, look):
        self.look = look
        self.balloons, self.effects = [], []
        self.score, self.lives, self.popped = 0, 5, 0
        self.typed = []  # (char, hit) history, for looks that show it
        self.next_spawn = 30

    def spawn(self):
        letter = random.choice(LETTERS)
        x, y, vx, vy = self.look.spawn_point(letter)
        self.balloons.append(Balloon(letter, x, y, vx, vy, random.randrange(5)))

    def press(self, ch):
        target = next((b for b in self.balloons if b.letter == ch), None)  # oldest first, like the original
        self.typed = (self.typed + [(ch, target is not None)])[-24:]
        if target:
            self.balloons.remove(target)
            self.score += 14
            self.popped += 1
            self.effects.append(Effect("pop", target.x, target.y, colour=target.colour))
            self.effects.append(Effect("dart", target.x, target.y))
            self.effects.append(Effect("text", target.x, target.y - 8, label="+14"))
        else:
            self.score -= 7
            self.effects.append(Effect("miss", W // 2, H - 20, label="-7", ch=ch))

    def update(self):
        self.next_spawn -= 1
        if self.next_spawn <= 0:
            self.spawn()
            self.next_spawn = random.randint(70, 110)
        for b in self.balloons[:]:
            b.age += 1
            b.x += b.vx
            b.vx *= 0.96
            b.vy *= 0.95                # launch burst fades...
            b.y += min(b.vy, -0.22)     # ...into a steady rise
            if b.y < -14:
                self.balloons.remove(b)
                self.lives -= 1
                self.effects.append(Effect("escape", b.x, 2))
                if self.lives == 0:  # prototype: never game over
                    self.lives, self.score = 5, 0
        for e in self.effects[:]:
            e.age += 1
            if e.age > 40:
                self.effects.remove(e)


# ---------------------------------------------------------------- drawing helpers

# A chunky 5x7 font for the balloon letters. Pyxel's built-in font is only 3x5, and letters
# like f and s are hard to read at that size. Uppercase, to match the labels on real keys.
GLYPHS = {
    "A": ".###.|#...#|#...#|#####|#...#|#...#|#...#",
    "S": ".####|#....|#....|.###.|....#|....#|####.",
    "D": "####.|#...#|#...#|#...#|#...#|#...#|####.",
    "F": "#####|#....|#....|####.|#....|#....|#....",
    "G": ".###.|#...#|#....|#.###|#...#|#...#|.###.",
    "H": "#...#|#...#|#...#|#####|#...#|#...#|#...#",
    "J": "..###|...#.|...#.|...#.|...#.|#..#.|.##..",
    "K": "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
    "L": "#....|#....|#....|#....|#....|#....|#####",
    ";": ".....|.##..|.##..|.....|.##..|.##..|.#...",
}


def big_text(cx, cy, s, col, scale=2):
    """Draw s with GLYPHS, centred on (cx, cy). Each font pixel becomes a scale x scale square."""
    x0 = cx - (len(s) * 6 - 1) * scale // 2
    y0 = cy - 7 * scale // 2
    for n, ch in enumerate(s.upper()):
        for row, line in enumerate(GLYPHS[ch].split("|")):
            for col_i, bit in enumerate(line):
                if bit == "#":
                    pyxel.rect(x0 + (n * 6 + col_i) * scale, y0 + row * scale, scale, scale, col)


def shadow_text(x, y, s, col, shade):
    pyxel.text(x + 1, y + 1, s, shade)
    pyxel.text(x, y, s, col)


def wiggle_string(x, y, length, col, t, step=2):
    px, py = x, y
    for i in range(step, length, step):
        nx = x + math.sin((t + i * 3) * 0.08) * (i / length) * 2.5
        pyxel.line(px, py, nx, y + i, col)
        px, py = nx, y + i


# ---------------------------------------------------------------- look A: dusk city

class DuskCity:
    name = "Dusk city"
    # Sweetie-16-ish. 13 is unused, 14/15 = switcher bar.
    palette = [0x1A1C2C, 0x5D275D, 0xB13E53, 0xEF7D57, 0xFFCD75, 0xA7F070, 0x38B764, 0x257179,
               0x29366F, 0x3B5DC9, 0x41A6F6, 0x73EFF7, 0xF4F4F4, 0xFF00FF, 0x1A1C2C, 0xF4F4F4]
    balloon_cols = [2, 3, 4, 6, 9]
    cannons = [22, 70, 128, 186, 234]
    ground = 122

    def __init__(self):
        rnd = random.Random(3)
        self.buildings = []
        x = 0
        while x < W:
            w = rnd.randint(10, 22)
            self.buildings.append((x, rnd.randint(14, 44), w))
            x += w + rnd.randint(-2, 1)
        self.windows = [(rnd.randrange(W), rnd.randrange(self.ground - 40, self.ground - 4)) for _ in range(70)]
        self.clouds = [[rnd.uniform(0, W), rnd.uniform(14, 50), rnd.uniform(0.05, 0.15)] for _ in range(4)]

    def spawn_point(self, letter):
        cx = random.choice(self.cannons)
        return cx, self.ground - 8, random.uniform(-0.9, 0.9), -2.6

    def draw(self, sim):
        t = pyxel.frame_count
        # sky: hard bands with dithered seams, the cheapest good-looking gradient
        bands = [(0, 8), (30, 9), (62, 10), (90, 3)]
        for i, (y, c) in enumerate(bands):
            nxt = bands[i + 1][0] if i + 1 < len(bands) else self.ground
            pyxel.rect(0, y, W, nxt - y, c)
            if i:
                pyxel.dither(0.5)
                pyxel.rect(0, y - 4, W, 4, c)
                pyxel.dither(1.0)
        pyxel.circ(200, 96, 18, 4)
        pyxel.circ(200, 96, 13, 12)
        for c in self.clouds:
            c[0] = (c[0] - c[2]) % (W + 40)
            x, y = c[0] - 20, c[1]
            pyxel.elli(x, y, 26, 7, 12)
            pyxel.elli(x + 8, y - 4, 14, 7, 12)
        for (x, h, w) in self.buildings:
            pyxel.rect(x, self.ground - h, w, h, 0)
        for (x, y) in self.windows:
            if pyxel.pget(x, y) == 0 and pyxel.pget(x + 1, y + 1) == 0:
                pyxel.rect(x, y, 2, 2, 4 if (x * 7 + y) % 5 else 3)
        pyxel.rect(0, self.ground, W, H - self.ground, 6)
        pyxel.rect(0, self.ground, W, 2, 5)
        # cannons aim at the newest balloon
        aim = sim.balloons[-1] if sim.balloons else None
        for cx in self.cannons:
            ang = math.atan2((aim.y if aim else 0) - self.ground, (aim.x if aim else cx) - cx) if aim else -math.pi / 2
            pyxel.line(cx, self.ground - 3, cx + math.cos(ang) * 7, self.ground - 3 + math.sin(ang) * 7, 0)
            pyxel.line(cx + 1, self.ground - 3, cx + 1 + math.cos(ang) * 7, self.ground - 3 + math.sin(ang) * 7, 0)
            pyxel.elli(cx - 5, self.ground - 4, 11, 6, 8)
        for b in sim.balloons:
            col = self.balloon_cols[b.colour]
            wiggle_string(b.x, b.y + 9, 14, 12, t + b.age)
            pyxel.circ(b.x, b.y, 9, col)
            pyxel.tri(b.x - 2, b.y + 10, b.x + 2, b.y + 10, b.x, b.y + 8, col)
            pyxel.circ(b.x - 4, b.y - 4, 1, 12)
            big_text(b.x, b.y, b.letter, 0 if col in (4, 6) else 12)
        for e in sim.effects:
            if e.kind == "pop":
                for k in range(10):
                    a = k * math.tau / 10
                    r = 4 + e.age * 0.9
                    if e.age < 18:
                        pyxel.pset(e.x + math.cos(a) * r, e.y + math.sin(a) * r, self.balloon_cols[e.colour])
            elif e.kind == "dart" and e.age < 6:
                cx = min(self.cannons, key=lambda c: abs(c - e.x))
                gy = self.ground - 4
                f = (e.age + 1) / 6
                pyxel.line(cx, gy, cx + (e.x - cx) * f, gy + (e.y - gy) * f, 12)
            elif e.kind in ("text", "miss") and e.age < 30:
                shadow_text(e.x - 6, e.y - e.age // 3, e.label, 4 if e.kind == "text" else 2, 0)
        # HUD
        pyxel.rect(4, 4, 52, 11, 0)
        shadow_text(8, 7, f"SCORE {sim.score:4d}", 12, 0)
        for i in range(5):
            x = W - 10 - i * 9
            if i < sim.lives:
                pyxel.circ(x, 9, 3, 2)
                pyxel.pset(x - 1, 8, 12)
            else:
                pyxel.circb(x, 9, 3, 8)


# ---------------------------------------------------------------- look B: pocket lanes

class PocketLanes:
    name = "Pocket lanes"
    palette = [0x0F380F, 0x306230, 0x8BAC0F, 0x9BBC0F] + [0x9BBC0F] * 9 + [0xFF00FF, 0x0F380F, 0x9BBC0F]
    field_top, field_bot = 14, 92
    rows = ["qwertyuiop", "asdfghjkl;", "zxcvbnm,./"]

    def lane_x(self, letter):
        i = LETTERS.index(letter)
        return 18 + i * 24

    def spawn_point(self, letter):
        return self.lane_x(letter), self.field_bot - 6, 0, -1.2

    def draw(self, sim):
        t = pyxel.frame_count
        pyxel.cls(3)
        # title bar
        pyxel.rect(0, 0, W, 11, 0)
        pyxel.text(5, 3, f"{sim.score:05d}", 3)
        pyxel.text(W // 2 - 16, 3, "HOME ROW", 2)
        for i in range(5):
            x = W - 10 - i * 8
            (pyxel.circ if i < sim.lives else pyxel.circb)(x, 5, 2, 3)
        # lanes
        for ch in LETTERS:
            x = self.lane_x(ch)
            for y in range(self.field_top, self.field_bot, 4):
                pyxel.pset(x, y, 2)
        pyxel.rect(0, self.field_bot, W, 1, 0)
        pyxel.clip(0, 11, W, self.field_bot - 11)
        for b in sim.balloons:
            pyxel.line(b.x, b.y + 9, b.x, b.y + 15, 1)
            pyxel.circ(b.x, b.y, 9, 1)
            pyxel.circb(b.x, b.y, 9, 0)
            pyxel.rect(b.x - 5, b.y - 6, 2, 2, 2)
            big_text(b.x, b.y, b.letter, 3)
        for e in sim.effects:
            if e.kind == "pop" and e.age < 14:
                pyxel.circb(e.x, e.y, 9 + e.age, 0 if e.age % 4 < 2 else 1)
            elif e.kind == "text" and e.age < 30:
                pyxel.text(e.x - 6, e.y - e.age // 3, e.label, 0)
        pyxel.clip()
        # keyboard: the main thing on screen. Keys with a balloon up pulse; home row is outlined.
        wanted = {b.letter for b in sim.balloons}
        oldest = sim.balloons[0].letter if sim.balloons else None
        missed = {e.ch for e in sim.effects if e.kind == "miss" and e.age < 15}
        for r, row in enumerate(self.rows):
            for i, ch in enumerate(row):
                x, y = 8 + r * 6 + i * 23, 98 + r * 15
                home = r == 1
                if ch == oldest and (t // 15) % 2:
                    pyxel.rect(x, y, 20, 13, 0); col = 3
                elif ch in wanted:
                    pyxel.rect(x, y, 20, 13, 1); col = 3
                elif ch in missed:
                    pyxel.rect(x, y, 20, 13, 2); col = 0
                else:
                    pyxel.rect(x, y, 20, 13, 2 if home else 3); col = 0 if home else 1
                pyxel.rectb(x, y, 20, 13, 0 if home else 1)
                pyxel.text(x + 8, y + 4, ch, col)
        pyxel.rect(8 + 6 + 3 * 23 + 8, 98 + 15 + 10, 4, 1, 0)  # bumps on f and j
        pyxel.rect(8 + 6 + 6 * 23 + 8, 98 + 15 + 10, 4, 1, 0)


# ---------------------------------------------------------------- look C: phosphor

class Phosphor:
    name = "Phosphor"
    palette = [0x000000, 0x140B00, 0x4D2E00, 0xA86B00, 0xFFB000, 0xFFE0A0] + [0xFFB000] * 7 + \
              [0xFF00FF, 0x140B00, 0xFFB000]
    turret = (128, 124)

    def spawn_point(self, letter):
        tx, ty = self.turret
        return tx, ty - 6, random.uniform(-3.2, 3.2), -2.0

    def draw(self, sim):
        t = pyxel.frame_count
        pyxel.cls(0)
        for y in range(0, H, 3):  # faint scanlines behind everything
            pyxel.line(0, y, W, y, 1)
        for b in sim.balloons:  # glow pass, then the line pass
            pyxel.circb(b.x + 1, b.y + 1, 10, 2)
        for b in sim.balloons:
            pyxel.circb(b.x, b.y, 9, 4)
            for i in range(10, 18, 3):
                pyxel.pset(b.x + math.sin((t + i + b.age) * 0.1), b.y + i, 3)
            big_text(b.x, b.y, b.letter, 5)
        aim = sim.balloons[0] if sim.balloons else None
        tx, ty = self.turret
        ang = math.atan2(aim.y - ty, aim.x - tx) if aim else -math.pi / 2
        pyxel.trib(tx - 7, ty + 4, tx + 7, ty + 4, tx, ty - 4, 4)
        pyxel.line(tx, ty, tx + math.cos(ang) * 11, ty + math.sin(ang) * 11, 5)
        if aim:  # dotted targeting line to the balloon you should type next
            d = math.hypot(aim.x - tx, aim.y - ty)
            for s in range(14, int(d) - 10, 5):
                pyxel.pset(tx + math.cos(ang) * s, ty + math.sin(ang) * s, 2)
        for e in sim.effects:
            if e.kind == "pop" and e.age < 20:
                r = 9 + e.age * 1.3
                pyxel.circb(e.x, e.y, r, 4 if e.age < 8 else 3)
                for k in range(8):
                    a = k * math.tau / 8
                    pyxel.line(e.x + math.cos(a) * r, e.y + math.sin(a) * r,
                               e.x + math.cos(a) * (r + 3), e.y + math.sin(a) * (r + 3), 5)
            elif e.kind == "dart" and e.age < 5:
                f = (e.age + 1) / 5
                pyxel.line(tx, ty, tx + (e.x - tx) * f, ty + (e.y - ty) * f, 5)
            elif e.kind == "escape" and e.age < 20:
                pyxel.rect(0, 0, W, 2, 4 if e.age % 4 < 2 else 0)
        # status line + prompt
        pyxel.text(4, 4, f"SCORE {sim.score:05d}", 4)
        pyxel.text(W - 56, 4, "LIVES " + "#" * sim.lives + "-" * (5 - sim.lives), 4)
        pyxel.line(0, H - 12, W, H - 12, 2)
        pyxel.text(4, H - 8, ">", 4)
        x = 12
        for ch, hit in sim.typed:
            pyxel.text(x, H - 8, ch, 5 if hit else 2)
            if not hit:
                pyxel.line(x - 1, H - 6, x + 3, H - 6, 3)
            x += 5
        if (t // 20) % 2:
            pyxel.rect(x, H - 8, 3, 5, 4)


# ---------------------------------------------------------------- app + switcher bar

class App:
    def __init__(self, variant, shots_dir=None):
        self.looks = [DuskCity(), PocketLanes(), Phosphor()]
        self.index = "ABC".index(variant)
        self.shots_dir = shots_dir
        pyxel.init(W, H + BAR, title="Balloon look prototype", fps=FPS,
                   display_scale=4, headless=bool(shots_dir))
        self.switch(0)
        pyxel.run(self.update, self.draw)

    @property
    def look(self):
        return self.looks[self.index]

    def switch(self, step):
        self.index = (self.index + step) % len(self.looks)
        pyxel.colors[:] = self.look.palette
        random.seed(7)
        self.sim = Sim(self.look)
        print(f"look {'ABC'[self.index]} - {self.look.name}")

    def update(self):
        if self.shots_dir:
            return self.update_shots()
        if pyxel.btnp(pyxel.KEY_LEFT):
            self.switch(-1)
        if pyxel.btnp(pyxel.KEY_RIGHT):
            self.switch(1)
        for ch in pyxel.input_text.lower():
            if ch in LETTERS:
                self.sim.press(ch)
        self.sim.update()

    def update_shots(self):
        """Fast-forward each look with a scripted typist, save a PNG, move on."""
        f = self.sim_frames = getattr(self, "sim_frames", 0) + 1
        self.sim.update()
        if f in (330, 420, 470) and self.sim.balloons:
            self.sim.press(self.sim.balloons[0].letter)
        if f == 460:
            self.sim.press("z" if "z" in LETTERS else "q")
        if f == 474:
            self.draw()
            pyxel.screenshot(f"{self.shots_dir}/look_{'ABC'[self.index]}", scale=3)
            self.sim_frames = 0
            if self.index == len(self.looks) - 1:
                pyxel.quit()
            self.switch(1)

    def draw(self):
        pyxel.clip(0, 0, W, H)
        pyxel.cls(0)
        self.look.draw(self.sim)
        pyxel.clip()
        # the prototype switcher: not part of any design
        pyxel.rect(0, H, W, BAR, BAR_BG)
        label = f"<  {'ABC'[self.index]}  {self.look.name}  >"
        pyxel.text(W // 2 - len(label) * 2, H + 3, label, BAR_FG)
        pyxel.text(4, H + 3, "PROTOTYPE", BAR_FG)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--variant", choices=list("ABC"), default="A")
    p.add_argument("--shots", metavar="DIR", help="save a PNG of each look and exit")
    a = p.parse_args()
    App(a.variant, a.shots)

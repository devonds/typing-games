// "Who's playing?" on the home page: pick, add, edit or delete a player, and see the current player's progress.
// Everything here reads and writes this browser's localStorage only. Nothing is ever sent anywhere.
import { KEYS } from "../shared/keyboard";
import { STAGES, mastered, masteryProgress, newestKeys } from "../shared/path";
import { Player } from "../shared/player";
import { TODAY, practiceState, startPractice } from "../shared/session";
import { PICTURES, createProfile, currentProfile, deleteProfile, listProfiles, setCurrent, updateProfile, type Picture, type Profile } from "../shared/profiles";

export const PICTURE_EMOJI: Record<Picture, string> = {
  fox: "🦊",
  owl: "🦉",
  rabbit: "🐰",
  bear: "🐻",
  cat: "🐱",
  frog: "🐸",
  bee: "🐝",
  sunflower: "🌻",
};

type Mode = { kind: "list" } | { kind: "add" } | { kind: "edit"; id: string } | { kind: "delete"; id: string };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

/** Days in a row with some play, counting back from today (or from yesterday, if today hasn't started yet). */
function streak(player: Player): number {
  const days = player.days();
  let day = player.today;
  if (!days[day]?.seconds) day -= 1;
  let n = 0;
  while (days[day]?.seconds) {
    n += 1;
    day -= 1;
  }
  return n;
}

export class Players {
  private mode: Mode = { kind: "list" };

  constructor(private readonly root: HTMLElement) {
    currentProfile(); // makes the first player (with any old saved data) on a first visit
    this.render();
  }

  private set(mode: Mode): void {
    this.mode = mode;
    this.render();
  }

  private render(): void {
    const current = currentProfile();
    const profiles = listProfiles();
    const body: Node[] = [el("h2", { textContent: "Who's playing?" })];

    const chips = el("div", { className: "chips" });
    for (const p of profiles) {
      const chip = el("button", { className: "chip" + (p.id === current.id ? " current" : ""), type: "button" }, el("span", { className: "pic", textContent: PICTURE_EMOJI[p.picture] }), p.name);
      chip.setAttribute("aria-pressed", String(p.id === current.id));
      chip.addEventListener("click", () => {
        setCurrent(p.id);
        this.set({ kind: "list" });
      });
      chips.append(chip);
    }
    const add = el("button", { className: "chip add", type: "button", textContent: "+ Add a player" });
    add.addEventListener("click", () => this.set({ kind: "add" }));
    chips.append(add);
    body.push(chips);

    if (this.mode.kind === "add") body.push(this.form(null));
    else if (this.mode.kind === "edit") {
      const id = this.mode.id;
      const p = profiles.find((x) => x.id === id);
      if (p) body.push(this.form(p));
    } else if (this.mode.kind === "delete") {
      const id = this.mode.id;
      const p = profiles.find((x) => x.id === id);
      if (p) body.push(this.confirmDelete(p));
    } else body.push(this.progress(current));

    this.root.replaceChildren(...body);
  }

  /** Add a player (profile null) or change one. */
  private form(profile: Profile | null): HTMLElement {
    let picture: Picture = profile?.picture ?? PICTURES[listProfiles().length % PICTURES.length];
    const name = el("input", { type: "text", maxLength: 16, value: profile?.name ?? "", placeholder: "Name or nickname", autocomplete: "off" });
    name.setAttribute("aria-label", "Name or nickname");
    const pics = el("div", { className: "pics" });
    const drawPics = () =>
      pics.replaceChildren(
        ...PICTURES.map((p) => {
          const b = el("button", { type: "button", className: "pick" + (p === picture ? " on" : ""), textContent: PICTURE_EMOJI[p] });
          b.setAttribute("aria-label", p);
          b.setAttribute("aria-pressed", String(p === picture));
          b.addEventListener("click", () => {
            picture = p;
            drawPics();
          });
          return b;
        }),
      );
    drawPics();
    const little = el("input", { type: "checkbox", checked: profile?.littleHands ?? false });
    const save = el("button", { type: "submit", className: "primary", textContent: profile ? "Save" : "Add player" });
    const cancel = el("button", { type: "button", textContent: "Cancel" });
    cancel.addEventListener("click", () => this.set({ kind: "list" }));
    const form = el(
      "form",
      { className: "player-form" },
      name,
      pics,
      el("label", { className: "little" }, little, el("span", {}, el("strong", { textContent: "Little hands" }), " for a younger child (under about 7): gentler, no time pressure, the finger guide always on")),
      el("div", { className: "buttons" }, save, cancel),
    );
    if (profile) {
      const del = el("button", { type: "button", className: "danger", textContent: "Delete player" });
      del.addEventListener("click", () => this.set({ kind: "delete", id: profile.id }));
      form.querySelector(".buttons")!.append(del);
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (profile) updateProfile(profile.id, { name: name.value, picture, littleHands: little.checked });
      else createProfile(name.value, picture, little.checked);
      this.set({ kind: "list" });
    });
    queueMicrotask(() => name.focus());
    return form;
  }

  private confirmDelete(p: Profile): HTMLElement {
    const yes = el("button", { type: "button", className: "danger", textContent: `Delete ${p.name}` });
    const no = el("button", { type: "button", textContent: "Keep" });
    yes.addEventListener("click", () => {
      deleteProfile(p.id);
      this.set({ kind: "list" });
    });
    no.addEventListener("click", () => this.set({ kind: "edit", id: p.id }));
    return el("div", { className: "confirm" }, el("p", { textContent: `This deletes ${p.name}'s progress from this browser for good.` }), el("div", { className: "buttons" }, yes, no));
  }

  /** The current player's keys, streak and speed. */
  private progress(profile: Profile): HTMLElement {
    const player = new Player(profile);
    const unlocked = new Set(player.myKeys);
    const learning = new Set(newestKeys(player.path));
    const board = el("div", { className: "board" });
    board.setAttribute("aria-label", "Keys learned so far");
    for (const row of [0, 1, 2] as const) {
      const line = el("div", { className: "krow" });
      line.style.marginLeft = `${row * 0.5}em`;
      for (const k of KEYS.filter((k) => k.row === row && /[a-z]/.test(k.key))) {
        const rec = player.history.letters[k.key];
        const done = mastered(rec, player.speedMatters);
        const p = masteryProgress(rec, player.speedMatters);
        const cls = done ? "done" : unlocked.has(k.key) ? (learning.has(k.key) ? "learning" : "open") : "locked";
        const key = el("span", { className: `k ${cls}`, textContent: k.key.toUpperCase() });
        if (cls !== "locked" && !done) key.style.setProperty("--p", String(p));
        key.title = done ? "Mastered" : cls === "locked" ? "Not yet" : `${Math.round(p * 100)}% of the way`;
        line.append(key);
      }
      board.append(line);
    }
    const masteredCount = KEYS.filter((k) => /[a-z]/.test(k.key) && mastered(player.history.letters[k.key], player.speedMatters)).length;
    const s = streak(player);
    const checks = Object.values(player.days()).flatMap((d) => d.checks);
    const facts = [
      `${masteredCount} of 26 keys mastered`,
      `Stage ${player.path.stage + 1} of ${STAGES.length}`,
      s > 0 ? `${s}-day streak` : "Play today to start a streak",
    ];
    if (checks.length > 0 && !profile.littleHands) facts.push(`Latest speed check: ${checks[checks.length - 1]} words a minute`);
    const edit = el("button", { type: "button", className: "link", textContent: `Change ${profile.name}` });
    edit.addEventListener("click", () => this.set({ kind: "edit", id: profile.id }));
    return el("div", { className: "progress" }, board, el("div", {}, el("ul", {}, ...facts.map((f) => el("li", { textContent: f }))), this.today(player)), edit);
  }

  /** "Today's practice": a round of Word Garden. Once it's done, a quiet note instead of a button. */
  private today(player: Player): HTMLElement {
    if (practiceState(player.profile.id, player.today) === "done") {
      return el("p", { className: "today done", textContent: "✓ Today's practice done! Play some Balloon Pop or Fresh Cuts if you feel like practicing more. See you tomorrow!" });
    }
    const count = player.littleHands ? TODAY.littleHands : TODAY.sentences;
    const go = el("button", { type: "button", className: "primary", textContent: `Today's practice (${count} sentences)` });
    go.addEventListener("click", () => {
      startPractice(player.profile.id, player.today);
      location.href = "word-garden/";
    });
    return el("div", { className: "buttons today" }, go);
  }
}

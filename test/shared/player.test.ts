import { beforeEach, describe, expect, it } from "vitest";
import { RoundLog } from "../../src/shared/history";
import { Player } from "../../src/shared/player";
import { createProfile, currentProfile, deleteProfile, listProfiles, profileKey, setCurrent } from "../../src/shared/profiles";

// A tiny in-memory localStorage for the tests.
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, String(v));
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  get length() {
    return this.data.size;
  }
}

beforeEach(() => {
  const storage = new MemoryStorage();
  // Object.keys(localStorage) must list the stored keys, as it does in browsers.
  (globalThis as { localStorage?: unknown }).localStorage = new Proxy(storage, {
    ownKeys: () => [...(storage as unknown as { data: Map<string, string> }).data.keys()],
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
});

describe("profiles", () => {
  it("makes a first profile and moves the old saved data into it", () => {
    localStorage.setItem("typing/letters/v1", JSON.stringify({ a: { seen: 5, hit: 4, missed: 1, fumbles: 0, reactionTotal: 8 } }));
    localStorage.setItem("fresh-cuts/settings/v1", JSON.stringify({ sound: false }));
    const first = currentProfile();
    expect(listProfiles()).toHaveLength(1);
    expect(new Player(first).history.letters.a).toMatchObject({ seen: 5, hits: 4 });
    expect(new Player(first).read("fresh-cuts/settings/v1", { sound: true })).toEqual({ sound: false });
  });

  it("also carries across Balloon Pop's original history", () => {
    localStorage.setItem("balloon-pop/stats/v1", JSON.stringify({ q: { seen: 4, popped: 3, escaped: 1, fumbles: 2, reactionTotal: 6 } }));
    expect(new Player(currentProfile()).history.letters.q).toMatchObject({ seen: 4, hits: 3, misses: 1, fumbles: 2 });
  });

  it("keeps each child's progress separate, and deleting really deletes", () => {
    const mia = createProfile("Mia", "owl", false);
    const sam = createProfile("  Sam  ", "frog", true);
    expect(sam.name).toBe("Sam");
    const p = new Player(mia);
    const log = new RoundLog();
    log.hit("f", 1);
    p.finishRound(log, 60);
    expect(new Player(sam).history.letters.f).toBeUndefined();
    expect(new Player(mia).history.letters.f?.seen).toBe(1);
    setCurrent(mia.id);
    deleteProfile(mia.id);
    expect(localStorage.getItem(profileKey(mia.id, "history/v2"))).toBeNull();
    expect(currentProfile().id).toBe(sam.id);
  });
});

describe("Player", () => {
  it("starts on F and J, and unlocks D and K once they're mastered", () => {
    const p = new Player(createProfile("Kim", "fox", false));
    expect(p.practice("mine")?.keys).toEqual(["f", "j"]);
    const log = new RoundLog();
    for (let i = 0; i < 15; i++) {
      log.hit("f", 1);
      log.hit("j", 1);
    }
    expect(p.finishRound(log, 90).unlocked).toEqual(["d", "k"]);
    expect(new Player(p.profile).practice("mine")?.keys).toEqual([..."fjdk"]);
    expect(Object.values(p.days())[0]).toMatchObject({ seconds: 90, rounds: 1 });
  });

  it("only offers tricky letters once there's history to choose from", () => {
    const p = new Player(createProfile("Ari", "bee", false));
    expect(p.practice("weak")).toBeNull();
    const log = new RoundLog();
    for (const c of "asdfg") for (let i = 0; i < 3; i++) log.hit(c, 1);
    p.finishRound(log, 30);
    expect(p.practice("weak")?.keys.sort()).toEqual([..."adfgs"]);
  });
});

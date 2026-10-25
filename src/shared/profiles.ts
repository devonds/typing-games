// Players. Each child gets their own Learn path, history and settings, so siblings on one computer don't muddle each
// other's progress. A profile is just a nickname, a picture and the Little hands setting. Nothing else is asked for,
// and it all stays in this browser's localStorage: there is no server, and nothing is ever sent anywhere.
import { dayNumber, emptyHistory, fromV1, type History, type V1Stats } from "./history";

export const PICTURES = ["fox", "owl", "rabbit", "bear", "cat", "frog", "bee", "sunflower"] as const;
export type Picture = (typeof PICTURES)[number];

export interface Profile {
  id: string;
  name: string;
  picture: Picture;
  /** Gentler play for children under about 7: see PLAN-teaching.md. */
  littleHands: boolean;
}

interface Roster {
  profiles: Profile[];
  current: string | null;
}

const ROSTER_KEY = "typing/profiles/v1";
const MAX_NAME = 16;

// localStorage can be missing or throw (private windows, blocked storage); everything still works, it just forgets.
function getRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not saved.
  }
}

function removeRaw(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to do.
  }
}

function loadRoster(): Roster {
  try {
    const roster = JSON.parse(getRaw(ROSTER_KEY) ?? "null") as Roster | null;
    if (roster && Array.isArray(roster.profiles)) return roster;
  } catch {
    // Fall through to a fresh roster.
  }
  return { profiles: [], current: null };
}

function saveRoster(roster: Roster): void {
  setRaw(ROSTER_KEY, JSON.stringify(roster));
}

/** The storage key for one thing belonging to a profile, e.g. profileKey(id, "history/v2"). */
export function profileKey(id: string, name: string): string {
  return `typing/p/${id}/${name}`;
}

export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME) || "Player";
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function listProfiles(): Profile[] {
  return loadRoster().profiles;
}

/**
 * The profile playing now. On the very first visit (or after the last profile was deleted) a first profile is made,
 * and whatever the games had saved before profiles existed is moved into it, so nothing is lost.
 */
export function currentProfile(): Profile {
  const roster = loadRoster();
  const found = roster.profiles.find((p) => p.id === roster.current) ?? roster.profiles[0];
  if (found) {
    if (roster.current !== found.id) saveRoster({ ...roster, current: found.id });
    return found;
  }
  const first = createProfile("Player 1", "fox", false);
  adoptOldData(first.id);
  return first;
}

export function setCurrent(id: string): void {
  const roster = loadRoster();
  if (roster.profiles.some((p) => p.id === id)) saveRoster({ ...roster, current: id });
}

export function createProfile(name: string, picture: Picture, littleHands: boolean): Profile {
  const roster = loadRoster();
  const profile: Profile = { id: newId(), name: cleanName(name), picture, littleHands };
  saveRoster({ profiles: [...roster.profiles, profile], current: profile.id });
  return profile;
}

export function updateProfile(id: string, change: Partial<Omit<Profile, "id">>): void {
  const roster = loadRoster();
  saveRoster({
    ...roster,
    profiles: roster.profiles.map((p) => (p.id === id ? { ...p, ...change, name: change.name !== undefined ? cleanName(change.name) : p.name } : p)),
  });
}

/** Removes the profile and really deletes everything saved for it. */
export function deleteProfile(id: string): void {
  const roster = loadRoster();
  const profiles = roster.profiles.filter((p) => p.id !== id);
  saveRoster({ profiles, current: roster.current === id ? (profiles[0]?.id ?? null) : roster.current });
  const prefix = `typing/p/${id}/`;
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(prefix)) removeRaw(key);
  } catch {
    // Storage unavailable: nothing was saved anyway.
  }
}

/** Read something saved for a profile, merged over `fallback` (so new settings get their defaults). */
export function readFor<T extends object>(id: string, name: string, fallback: T): T {
  try {
    const raw = getRaw(profileKey(id, name));
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeFor(id: string, name: string, value: unknown): void {
  setRaw(profileKey(id, name), JSON.stringify(value));
}

const HISTORY = "history/v2";

export function loadHistory(id: string): History {
  const h = readFor<History>(id, HISTORY, emptyHistory());
  return { version: 2, letters: h.letters ?? {}, pairs: h.pairs ?? {} };
}

export function saveHistory(id: string, history: History): void {
  writeFor(id, HISTORY, history);
}

/**
 * Keys the games used before profiles. Their data moves into the first profile, keeping the same names under the
 * profile prefix, so each game's storage can read it from there.
 */
const OLD_KEYS = [
  "balloon-pop/settings/v1",
  "balloon-pop/best/v1",
  "fresh-cuts/settings/v1",
  "fresh-cuts/best/v1",
  "word-garden/settings/v1",
  "word-garden/best/v1",
];

function adoptOldData(id: string): void {
  for (const key of OLD_KEYS) {
    const raw = getRaw(key);
    if (raw !== null) setRaw(profileKey(id, key), raw);
  }
  // The shared letter history (and Balloon Pop's even older one) becomes the profile's version 2 history.
  try {
    const old: unknown = JSON.parse(getRaw("typing/letters/v1") ?? "null") ?? JSON.parse(getRaw("balloon-pop/stats/v1") ?? "null");
    if (old && typeof old === "object") {
      // Balloon Pop's oldest format named the fields differently.
      const stats: V1Stats = {};
      for (const [letter, s] of Object.entries(old as Record<string, Record<string, number>>)) {
        stats[letter] = { seen: s.seen ?? 0, hit: s.hit ?? s.popped ?? 0, missed: s.missed ?? s.escaped ?? 0, fumbles: s.fumbles ?? 0, reactionTotal: s.reactionTotal ?? 0 };
      }
      saveHistory(id, fromV1(stats, dayNumber()));
    }
  } catch {
    // Unreadable old data: start fresh.
  }
}

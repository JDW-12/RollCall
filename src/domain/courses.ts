import type { Hole } from "./stableford";

/**
 * Golf course cards: where the pars and stroke indexes for a Stableford round come from.
 * Pure rules only; providers and storage live in src/lib.
 */

export type CourseCard = {
  name: string;
  club: string;
  address: string;
  tee: string;
  holes: Hole[];
};

export type CourseHit = CourseCard & {
  /** "library" for our own database, otherwise the provider key. */
  source: "library" | "api";
  /** Library row id, or a provider reference for an API hit. */
  ref: string;
  /** How often the library card has been used; 0 for API hits. */
  uses: number;
};

export class CourseError extends Error {}

/** Accepts 9 or 18 holes with pars 3–6 and stroke indexes that form a permutation of 1..n. */
export function validateHoles(input: unknown): Hole[] {
  if (!Array.isArray(input)) throw new CourseError("A card needs a list of holes.");
  const n = input.length;
  if (n !== 9 && n !== 18) throw new CourseError("A card has 9 or 18 holes.");
  const holes: Hole[] = input.map((raw, i) => {
    const h = (raw ?? {}) as Partial<Hole>;
    const par = Number(h.par);
    const si = Number(h.strokeIndex);
    if (!Number.isInteger(par) || par < 3 || par > 6) throw new CourseError(`Hole ${i + 1}: par must be 3 to 6.`);
    if (!Number.isInteger(si) || si < 1 || si > n) throw new CourseError(`Hole ${i + 1}: stroke index must be 1 to ${n}.`);
    const yards = Number(h.yards);
    return Number.isInteger(yards) && yards > 0 && yards < 1000 ? { number: i + 1, par, strokeIndex: si, yards } : { number: i + 1, par, strokeIndex: si };
  });
  const seen = new Set(holes.map((h) => h.strokeIndex));
  if (seen.size !== n) throw new CourseError("Each stroke index from 1 to " + n + " must appear exactly once.");
  return holes;
}

/**
 * Builds holes from two lines of numbers as printed on a paper card: pars, then stroke indexes.
 * Accepts spaces, commas or tabs. A missing SI line assigns a sensible order by par (long holes hardest).
 */
export function holesFromLines(parsLine: string, siLine = ""): Hole[] {
  const pars = numbers(parsLine);
  if (pars.length !== 9 && pars.length !== 18) throw new CourseError(`Found ${pars.length} pars; a card has 9 or 18.`);
  const si = siLine.trim() ? numbers(siLine) : defaultStrokeIndexes(pars);
  if (si.length !== pars.length) throw new CourseError(`Found ${si.length} stroke indexes for ${pars.length} holes.`);
  return validateHoles(pars.map((par, i) => ({ number: i + 1, par, strokeIndex: si[i] })));
}

function numbers(line: string): number[] {
  return line
    .split(/[\s,;|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
}

/** When a card has no stroke indexes, rank holes hardest-first by par, alternating nines as clubs usually do. */
export function defaultStrokeIndexes(pars: number[]): number[] {
  const n = pars.length;
  const order = pars.map((par, i) => ({ i, par })).sort((a, b) => b.par - a.par || a.i - b.i);
  const si = new Array<number>(n).fill(0);
  if (n === 18) {
    // Odd indexes on the front nine, even on the back, as most UK cards are laid out.
    const front = order.filter((o) => o.i < 9);
    const back = order.filter((o) => o.i >= 9);
    front.forEach((o, k) => (si[o.i] = 2 * k + 1));
    back.forEach((o, k) => (si[o.i] = 2 * k + 2));
  } else order.forEach((o, k) => (si[o.i] = k + 1));
  return si;
}

export function coursePar(holes: Hole[]): number {
  return holes.reduce((a, h) => a + h.par, 0);
}

/** Display label: "Richmond Park · Prince's · White tees". */
export function courseLabel(c: { name: string; club?: string; tee?: string }): string {
  const parts = [c.club && c.club !== c.name ? c.club : "", c.name, c.tee ? `${c.tee} tees` : ""].filter(Boolean);
  return parts.join(" · ");
}

/** Case- and punctuation-insensitive key so "Richmond Park GC" and "richmond park g.c." match. */
export function courseKey(name: string, tee = ""): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\b(golf|club|course|g\.?c\.?|the)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${norm(name)}|${norm(tee)}`;
}

/**
 * Merges library and provider hits: library first (most used first), then provider hits that
 * aren't already in the library under the same course and tee.
 */
export function mergeHits(library: CourseHit[], api: CourseHit[], limit = 8): CourseHit[] {
  const seen = new Set(library.map((c) => courseKey(c.name, c.tee)));
  const lib = [...library].sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
  const extra = api.filter((c) => !seen.has(courseKey(c.name, c.tee)));
  return [...lib, ...extra].slice(0, limit);
}

/** Shape returned by golfcourseapi.com; only the fields we read. Kept loose because it's third-party data. */
export type GolfApiCourse = {
  id: number | string;
  club_name?: string;
  course_name?: string;
  location?: { address?: string; city?: string; state?: string; country?: string };
  tees?: Record<string, { tee_name?: string; par_total?: number; number_of_holes?: number; holes?: { par?: number; handicap?: number; yardage?: number }[] }[] | undefined>;
};

/** Maps one provider course into hits, one per tee set that has a usable card. */
export function hitsFromGolfApi(course: GolfApiCourse): CourseHit[] {
  const name = (course.course_name || course.club_name || "").trim();
  if (!name) return [];
  const club = (course.club_name || "").trim();
  const loc = course.location ?? {};
  const address = [loc.address, loc.city].filter(Boolean).join(", ");
  const out: CourseHit[] = [];
  const seenTee = new Set<string>();
  for (const group of Object.values(course.tees ?? {})) {
    for (const tee of group ?? []) {
      const teeName = (tee.tee_name ?? "").trim();
      const key = teeName.toLowerCase();
      if (seenTee.has(key)) continue;
      const raw = tee.holes ?? [];
      if (raw.length !== 9 && raw.length !== 18) continue;
      try {
        const holes = validateHoles(raw.map((h, i) => ({ number: i + 1, par: h.par, strokeIndex: h.handicap, yards: h.yardage })));
        seenTee.add(key);
        out.push({ name, club, address, tee: teeName, holes, source: "api", ref: `golfcourseapi:${course.id}:${teeName}`, uses: 0 });
      } catch {
        // A tee set without stroke indexes or with a broken card is skipped rather than guessed.
      }
    }
  }
  return out;
}

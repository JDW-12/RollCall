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
  /**
   * What the provider's search told us about a card it didn't send. Its search endpoint returns course
   * and tee summaries without hole-by-hole data; the full card is fetched from the course endpoint
   * when the organiser picks it, so `holes` is empty until then.
   */
  summary?: { holes: number | null; par: number | null };
};

/** The one-line description a picker shows under a course, whether or not its card has loaded. */
export function hitDetail(hit: Pick<CourseHit, "holes" | "summary">): string {
  if (hit.holes.length) return `${hit.holes.length} holes · par ${coursePar(hit.holes)}`;
  const n = hit.summary?.holes;
  const par = hit.summary?.par;
  if (n && par) return `${n} holes · par ${par}`;
  if (n) return `${n} holes · card loads when picked`;
  return "Card loads when picked";
}

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
export function mergeHits(library: CourseHit[], api: CourseHit[], limit = 12): CourseHit[] {
  const seen = new Set(library.map((c) => courseKey(c.name, c.tee)));
  const lib = [...library].sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name));
  const extra = api.filter((c) => !seen.has(courseKey(c.name, c.tee)));
  return [...lib, ...extra].slice(0, limit);
}

/** Shape returned by golfcourseapi.com; only the fields we read. Kept loose because it's third-party data. */
export type GolfApiHole = { par?: number; handicap?: number; yardage?: number };
export type GolfApiTee = { tee_name?: string; par_total?: number; number_of_holes?: number; holes?: GolfApiHole[] };

export type GolfApiCourse = {
  id: number | string;
  club_name?: string;
  course_name?: string;
  location?: { address?: string; city?: string; state?: string; country?: string };
  /**
   * Left deliberately loose. The provider nests tee sets differently between endpoints and between
   * courses — sometimes an object keyed by gender holding arrays, sometimes an array, sometimes a
   * single object — and assuming one shape threw, which discarded every other course in the batch.
   */
  tees?: unknown;
};

/**
 * Gathers tee sets out of whatever `tees` happens to be: an array, an object of arrays, an object of
 * objects, or one tee on its own. Anything carrying a list of holes counts as a tee set.
 */
export function teeSetsFrom(tees: unknown): GolfApiTee[] {
  const out: GolfApiTee[] = [];
  const seen = new Set<unknown>();
  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 4 || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const child of node) visit(child, depth + 1);
      return;
    }
    const rec = node as Record<string, unknown>;
    if (Array.isArray(rec.holes)) {
      out.push(rec as GolfApiTee);
      return;
    }
    for (const child of Object.values(rec)) visit(child, depth + 1);
  };
  visit(tees, 0);
  return out;
}

/**
 * Maps one provider course into hits, one per tee set that has a usable card.
 *
 * Never throws. It runs inside a flatMap over the whole search response, so one course with an
 * unexpected shape used to take every other result down with it and the search looked empty.
 */
export function hitsFromGolfApi(course: GolfApiCourse, opts: { needCard?: boolean } = {}): CourseHit[] {
  try {
    const name = (course.course_name || course.club_name || "").trim();
    if (!name || course.id === undefined || course.id === null) return [];
    const club = (course.club_name || "").trim();
    const loc = course.location ?? {};
    const address = [loc.address, loc.city].filter(Boolean).join(", ");
    const ref = (tee: string) => `golfcourseapi:${course.id}:${tee}`;

    // Full cards first: tee sets that came with hole-by-hole data.
    const out: CourseHit[] = [];
    const seenTee = new Set<string>();
    for (const tee of teeSetsFrom(course.tees)) {
      const teeName = (tee.tee_name ?? "").trim();
      const key = teeName.toLowerCase();
      if (seenTee.has(key)) continue;
      const raw = Array.isArray(tee.holes) ? tee.holes : [];
      if (raw.length !== 9 && raw.length !== 18) continue;
      const holes = cardFrom(raw);
      if (!holes) continue;
      seenTee.add(key);
      out.push({ name, club, address, tee: teeName, holes, source: "api", ref: ref(teeName), uses: 0 });
    }
    // A card that arrived and failed is broken at the source: the course endpoint would serve the same
    // one, so offering it as "loads when picked" would only fail later. Summaries are for tees that
    // came without a card at all.
    const cameWithCards = teeSetsFrom(course.tees).length > 0;
    if (out.length || opts.needCard || cameWithCards) return out;

    // Search results carry summaries rather than cards. List the course and its tees anyway; the card
    // is fetched from the course endpoint when someone picks it.
    for (const tee of teeSummariesFrom(course.tees)) {
      const teeName = (tee.tee_name ?? "").trim();
      const key = teeName.toLowerCase();
      if (seenTee.has(key)) continue;
      seenTee.add(key);
      const n = Number(tee.number_of_holes);
      const par = Number(tee.par_total);
      out.push({
        name,
        club,
        address,
        tee: teeName,
        holes: [],
        source: "api",
        ref: ref(teeName),
        uses: 0,
        summary: { holes: n === 9 || n === 18 ? n : null, par: Number.isInteger(par) && par >= 27 && par <= 80 ? par : null },
      });
    }
    // Not even tee names: still worth listing the course itself.
    if (!out.length) out.push({ name, club, address, tee: "", holes: [], source: "api", ref: ref(""), uses: 0, summary: { holes: null, par: null } });
    return out;
  } catch {
    return [];
  }
}

/**
 * Tee summaries from a search result: anything in the tees structure that names a tee, even without
 * holes. Men's tees are listed before women's because that is how most crews book, and a name that
 * appears under both is listed once.
 */
function teeSummariesFrom(tees: unknown): GolfApiTee[] {
  if (!tees || typeof tees !== "object") return [];
  const groups: unknown[] = Array.isArray(tees)
    ? [tees]
    : Object.entries(tees as Record<string, unknown>)
        .sort(([a], [b]) => (a === "male" ? -1 : b === "male" ? 1 : 0))
        .map(([, v]) => v);
  const out: GolfApiTee[] = [];
  for (const group of groups) {
    const list = Array.isArray(group) ? group : [group];
    for (const t of list) if (t && typeof t === "object" && typeof (t as GolfApiTee).tee_name === "string") out.push(t as GolfApiTee);
  }
  return out;
}

/**
 * A card from provider holes. Pars are the part that must be right; plenty of courses come back with
 * no stroke indexes at all, and a card with sensible default indexes is far more use to a golfer than
 * no course in the search results.
 */
function cardFrom(raw: GolfApiHole[]): Hole[] | null {
  const pars = raw.map((h) => Number(h?.par));
  if (!pars.every((p) => Number.isInteger(p) && p >= 3 && p <= 6)) return null;
  const withProviderSi = raw.map((h, i) => ({ number: i + 1, par: pars[i], strokeIndex: Number(h?.handicap), yards: Number(h?.yardage) }));
  try {
    return validateHoles(withProviderSi);
  } catch {
    const si = defaultStrokeIndexes(pars);
    try {
      return validateHoles(raw.map((h, i) => ({ number: i + 1, par: pars[i], strokeIndex: si[i], yards: Number(h?.yardage) })));
    } catch {
      return null;
    }
  }
}

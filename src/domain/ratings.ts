import { SPORTS, type RatingCategory, type SportKey } from "./sports";

/**
 * Vote categories are the crew's to choose. The sport supplies defaults; a crew can rename them or
 * add up to two more. Keys are positional so renaming a category keeps the votes already cast under
 * it, and the first two carry table points (2 and 1) as they always have; the rest are banter.
 */

export const MAX_RATINGS = 5;
export const MIN_RATINGS = 2;
/** Positional keys: the first three match the sport defaults so existing votes survive customising. */
const KEYS = ["motm", "grafter", "howler", "cat4", "cat5"] as const;
const POINTS = [2, 1, 0, 0, 0] as const;

export type RatingDraft = { label: string; prompt: string; stat: string };

export class RatingsError extends Error {}

/** The categories a crew votes on: its own list when set, otherwise the sport's. */
export function ratingsFor(sport: string, stored: string | null | undefined): RatingCategory[] {
  const defaults = SPORTS[(sport in SPORTS ? sport : "football") as SportKey].ratings;
  if (!stored) return defaults;
  try {
    const parsed = JSON.parse(stored) as unknown;
    return buildRatings(Array.isArray(parsed) ? (parsed as RatingDraft[]) : []);
  } catch {
    return defaults;
  }
}

/** Validates a crew's drafts and assigns keys and points by position. */
export function buildRatings(drafts: RatingDraft[]): RatingCategory[] {
  const rows = drafts.map((d) => ({ label: String(d?.label ?? "").trim(), prompt: String(d?.prompt ?? "").trim(), stat: String(d?.stat ?? "").trim() })).filter((d) => d.label);
  if (rows.length < MIN_RATINGS) throw new RatingsError(`Keep at least ${MIN_RATINGS} things to vote on: the first two carry points.`);
  if (rows.length > MAX_RATINGS) throw new RatingsError(`Five is plenty. Nobody wants a survey after five-a-side.`);
  return rows.map((d, i) => {
    if (d.label.length > 30) throw new RatingsError(`"${d.label.slice(0, 30)}…" is too long. Keep labels under 30 letters.`);
    const stat = (d.stat || d.label).replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "V" + (i + 1);
    return { key: KEYS[i], label: d.label, prompt: d.prompt.slice(0, 80) || `Who was ${d.label.toLowerCase()}?`, points: POINTS[i], stat };
  });
}

/** What gets stored: the drafts, not the derived keys, so defaults can change later without breaking stored lists. */
export function serialiseRatings(cats: RatingCategory[]): string {
  return JSON.stringify(cats.map((c) => ({ label: c.label, prompt: c.prompt, stat: c.stat })));
}

import { SPORTS, type RatingCategory, type SportKey } from "./sports";

/**
 * Vote categories are the crew's to choose. The sport supplies defaults; a crew can rename them or
 * add up to two more. Keys are positional so renaming a category keeps the votes already cast under
 * it. Points go by position on the sport's scale: most sports give 2 and 1 and treat the rest as
 * banter, while every golf vote scores (3, 2, 2) because golf has no points for turning up.
 */

export const MAX_RATINGS = 5;
export const MIN_RATINGS = 2;
/** Positional keys: the first three match the sport defaults so existing votes survive customising. */
const KEYS = ["motm", "grafter", "howler", "cat4", "cat5"] as const;
const POINTS = [2, 1, 0, 0, 0] as const;

export type RatingDraft = { label: string; prompt: string; stat: string };

export class RatingsError extends Error {}

/**
 * Golf's first set of defaults. A crew that saved exactly these never chose them, so it moves to the
 * current golf defaults rather than being stuck on votes the sport has since replaced.
 */
const RETIRED_DEFAULTS: Partial<Record<SportKey, string[]>> = { golf: ["golfer of the day", "best scrambler", "worst shank"] };

/** The categories a crew votes on: its own list when set, otherwise the sport's. */
export function ratingsFor(sport: string, stored: string | null | undefined): RatingCategory[] {
  const key = (sport in SPORTS ? sport : "football") as SportKey;
  const defaults = SPORTS[key].ratings;
  if (!stored) return defaults;
  try {
    const parsed = JSON.parse(stored) as unknown;
    const drafts = Array.isArray(parsed) ? (parsed as RatingDraft[]) : [];
    const retired = RETIRED_DEFAULTS[key];
    if (retired && drafts.length === retired.length && drafts.every((d, i) => String(d?.label ?? "").trim().toLowerCase() === retired[i])) return defaults;
    return buildRatings(drafts, key);
  } catch {
    return defaults;
  }
}

/** Validates a crew's drafts and assigns keys and points by position, on the sport's own points scale. */
export function buildRatings(drafts: RatingDraft[], sport?: string): RatingCategory[] {
  const scale = (sport && sport in SPORTS ? SPORTS[sport as SportKey].votePoints : undefined) ?? POINTS;
  const rows = drafts.map((d) => ({ label: String(d?.label ?? "").trim(), prompt: String(d?.prompt ?? "").trim(), stat: String(d?.stat ?? "").trim() })).filter((d) => d.label);
  if (rows.length < MIN_RATINGS) throw new RatingsError(`Keep at least ${MIN_RATINGS} things to vote on: the first two carry points.`);
  if (rows.length > MAX_RATINGS) throw new RatingsError(`Five is plenty. Nobody wants a survey after five-a-side.`);
  return rows.map((d, i) => {
    if (d.label.length > 30) throw new RatingsError(`"${d.label.slice(0, 30)}…" is too long. Keep labels under 30 letters.`);
    const stat = (d.stat || d.label).replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "V" + (i + 1);
    return { key: KEYS[i], label: d.label, prompt: d.prompt.slice(0, 80) || `Who was ${d.label.toLowerCase()}?`, points: scale[i] ?? 0, stat };
  });
}

/** What gets stored: the drafts, not the derived keys, so defaults can change later without breaking stored lists. */
export function serialiseRatings(cats: RatingCategory[]): string {
  return JSON.stringify(cats.map((c) => ({ label: c.label, prompt: c.prompt, stat: c.stat })));
}

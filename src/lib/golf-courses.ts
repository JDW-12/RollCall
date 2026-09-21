import "server-only";
import { desc, eq, like, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { newId } from "@/lib/ids";
import { courseKey, hitsFromGolfApi, mergeHits, validateHoles, type CourseCard, type CourseHit, type GolfApiCourse } from "@/domain/courses";
import type { Hole } from "@/domain/stableford";

/**
 * Where golf course cards come from, in order: our own library (cards other crews have used and
 * corrected), then golfcourseapi.com when GOLF_COURSE_API_KEY is set. Provider hits are only
 * copied into the library when an organiser actually uses one, so the library stays curated.
 */

export function courseApiConfigured(): boolean {
  return !!process.env.GOLF_COURSE_API_KEY;
}

export async function searchCourses(query: string): Promise<CourseHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const [library, api] = await Promise.all([searchLibrary(q), searchProvider(q)]);
  return mergeHits(library, api);
}

async function searchLibrary(q: string): Promise<CourseHit[]> {
  const db = await getDb();
  const pattern = `%${q.replace(/[%_]/g, "")}%`;
  const rows = await db
    .select()
    .from(schema.courses)
    .where(or(like(schema.courses.name, pattern), like(schema.courses.club, pattern), like(schema.courses.address, pattern)))
    .orderBy(desc(schema.courses.uses), schema.courses.name)
    .limit(12);
  return rows.map(hitFromRow);
}

export function hitFromRow(row: schema.Course): CourseHit {
  return { name: row.name, club: row.club, address: row.address, tee: row.tee, holes: JSON.parse(row.holes) as Hole[], source: "library", ref: row.id, uses: row.uses };
}

async function searchProvider(q: string): Promise<CourseHit[]> {
  const key = process.env.GOLF_COURSE_API_KEY;
  if (!key) return [];
  try {
    const url = new URL("https://api.golfcourseapi.com/v1/search");
    url.searchParams.set("search_query", q);
    const res = await fetch(url, { headers: { Authorization: `Key ${key}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      console.error("golfcourseapi", res.status, await res.text());
      return [];
    }
    const body = (await res.json()) as { courses?: GolfApiCourse[] };
    // UK only: the provider is worldwide and "Richmond" matches courses on three continents.
    const uk = (body.courses ?? []).filter((c) => /united kingdom|^uk$|england|scotland|wales|northern ireland|^gb$/i.test(c.location?.country ?? ""));
    return uk.flatMap(hitsFromGolfApi);
  } catch (e) {
    console.error("golfcourseapi lookup failed", e);
    return [];
  }
}

/** Fetches one provider hit again by reference (the search result is not trusted from the client). */
export async function resolveProviderCourse(ref: string): Promise<CourseHit | null> {
  const key = process.env.GOLF_COURSE_API_KEY;
  const m = /^golfcourseapi:([^:]+):(.*)$/.exec(ref);
  if (!key || !m) return null;
  try {
    const res = await fetch(`https://api.golfcourseapi.com/v1/courses/${encodeURIComponent(m[1])}`, { headers: { Authorization: `Key ${key}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { course?: GolfApiCourse } & GolfApiCourse;
    const hits = hitsFromGolfApi(body?.course ?? body ?? {});
    return hits.find((h) => h.tee.toLowerCase() === m[2].toLowerCase()) ?? hits[0] ?? null;
  } catch (e) {
    console.error("golfcourseapi course fetch failed", e);
    return null;
  }
}

/**
 * Turns a picked course into the holes and label a Stableford card needs. Library ids count a use;
 * provider references are re-fetched and imported. Used by the session form and the in-session picker.
 */
export async function resolveCourseRef(source: "library" | "api", ref: string, userId: string): Promise<{ holes: Hole[]; course: { id: string; name: string; tee: string } } | null> {
  if (source === "library") {
    const row = await getCourse(ref);
    if (!row) return null;
    await countUse(row.id);
    return { holes: validateHoles(JSON.parse(row.holes)), course: { id: row.id, name: row.name, tee: row.tee } };
  }
  const hit = await resolveProviderCourse(ref);
  if (!hit) return null;
  const row = await upsertCourse(hit, { source: "api", externalId: hit.ref, userId });
  return { holes: validateHoles(JSON.parse(row.holes)), course: { id: row.id, name: row.name, tee: row.tee } };
}

export async function getCourse(id: string): Promise<schema.Course | null> {
  const db = await getDb();
  return (await db.select().from(schema.courses).where(eq(schema.courses.id, id)).limit(1))[0] ?? null;
}

/**
 * Stores a card in the library (or refreshes the one already imported from the same provider
 * reference) and counts a use. Returns the library row.
 */
export async function upsertCourse(card: CourseCard, opts: { source: "manual" | "api" | "scan"; externalId?: string | null; userId: string }): Promise<schema.Course> {
  const db = await getDb();
  const holes = validateHoles(card.holes);
  const now = new Date();
  const values = { name: card.name.trim().slice(0, 80), club: card.club.trim().slice(0, 80), address: card.address.trim().slice(0, 120), tee: card.tee.trim().slice(0, 20), holes: JSON.stringify(holes) };
  if (!values.name) throw new Error("UI:Give the course a name.");
  if (opts.externalId) {
    // Already imported: the library copy may carry corrections from whoever played it, so keep it and count the use.
    const existing = (await db.select().from(schema.courses).where(eq(schema.courses.externalId, opts.externalId)).limit(1))[0];
    if (existing) {
      await countUse(existing.id);
      return (await getCourse(existing.id))!;
    }
  } else {
    // Typed or scanned: the same course and tee already in the library is a correction of it, not a second row.
    const key = courseKey(values.name, values.tee);
    const candidates = await db.select().from(schema.courses).where(like(schema.courses.name, `%${values.name.split(" ")[0].replace(/[%_]/g, "")}%`)).limit(50);
    const same = candidates.find((c) => courseKey(c.name, c.tee) === key);
    if (same) {
      await db
        .update(schema.courses)
        .set({ holes: values.holes, address: values.address || same.address, club: values.club || same.club, updatedAt: now, uses: sql`${schema.courses.uses} + 1` })
        .where(eq(schema.courses.id, same.id));
      return (await getCourse(same.id))!;
    }
  }
  const id = newId();
  await db.insert(schema.courses).values({ id, ...values, source: opts.source, externalId: opts.externalId ?? null, createdBy: opts.userId, createdAt: now, updatedAt: now, uses: 1 });
  return (await getCourse(id))!;
}

/** An organiser corrected a card they are using: update the library copy so the next crew gets it right. */
export async function correctCourse(id: string, holes: Hole[], tee?: string): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.courses)
    .set({ holes: JSON.stringify(validateHoles(holes)), ...(tee !== undefined ? { tee: tee.trim().slice(0, 20) } : {}), updatedAt: new Date() })
    .where(eq(schema.courses.id, id));
}

export async function countUse(id: string): Promise<void> {
  const db = await getDb();
  await db.update(schema.courses).set({ uses: sql`${schema.courses.uses} + 1` }).where(eq(schema.courses.id, id));
}

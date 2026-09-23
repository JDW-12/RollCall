import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { courseCenter, holesFromOverpass, overpassQuery, type CourseGeo, type OverpassJson } from "@/domain/course-geo";
import type { LatLon } from "@/domain/geo";
import type { Hole } from "@/domain/stableford";

/**
 * Hole geometry for a library course, fetched from OpenStreetMap the first time anyone plays it and
 * cached on the course row. Nobody marks greens by hand: the course is found from its postcode (or
 * its name), then its holes and greens are read out of OpenStreetMap. A course that isn't mapped is
 * remembered as such for a fortnight before trying again, so a round never waits on a known miss.
 */

const UA = { "User-Agent": "RollCall/1.0 (golf GPS; https://rollcall-henna.vercel.app)" };
const RETRY_MS = 14 * 86_400_000;
const POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;

export function readGeo(raw: string | null): CourseGeo | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CourseGeo;
  } catch {
    return null;
  }
}

export async function courseGeo(courseId: string, hint = ""): Promise<CourseGeo | null> {
  // Tests run offline: skip the lookups rather than wait on them.
  if (process.env.COURSE_GEO === "off") return null;
  const db = await getDb();
  const course = (await db.select().from(schema.courses).where(eq(schema.courses.id, courseId)).limit(1))[0];
  if (!course) return null;
  const cached = readGeo(course.geo);
  if (cached?.status === "ok" || (cached && Date.now() - cached.fetchedAt < RETRY_MS)) return cached;

  const holes = JSON.parse(course.holes) as Hole[];
  const at = await locate([course.address, hint].join(" "), course.club || course.name);
  let geo: CourseGeo = { status: "none", center: at, fetchedAt: Date.now() };
  if (at) {
    const json = await overpass(overpassQuery(at));
    const found = json ? holesFromOverpass(json, holes.map((h) => h.par), course.name) : null;
    if (found) geo = { status: "ok", holes: found, center: courseCenter(found), source: "osm", fetchedAt: Date.now() };
    // A failed request (as opposed to an answer with no holes) isn't cached, so the next visit retries.
    else if (!json) return geo;
  }
  await db.update(schema.courses).set({ geo: JSON.stringify(geo) }).where(eq(schema.courses.id, courseId));
  return geo;
}

/** Where the course is: its UK postcode first (exact, free), else a name search. */
async function locate(address: string, name: string): Promise<LatLon | null> {
  const pc = address.match(POSTCODE);
  if (pc) {
    try {
      const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc[1] + pc[2])}`, { signal: AbortSignal.timeout(4000) });
      const j = (await r.json()) as { result?: { latitude?: number; longitude?: number } };
      if (j.result?.latitude && j.result.longitude) return [j.result.latitude, j.result.longitude];
    } catch {
      /* fall through to the name */
    }
  }
  try {
    const q = /golf/i.test(name) ? name : `${name} golf`;
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=${encodeURIComponent(q)}`, { headers: UA, signal: AbortSignal.timeout(5000) });
    const j = (await r.json()) as { lat?: string; lon?: string }[];
    if (j[0]?.lat && j[0].lon) return [Number(j[0].lat), Number(j[0].lon)];
  } catch {
    /* unknown */
  }
  return null;
}

async function overpass(query: string): Promise<OverpassJson | null> {
  try {
    const r = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { ...UA, "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
      console.error("overpass", r.status);
      return null;
    }
    return (await r.json()) as OverpassJson;
  } catch (e) {
    console.error("overpass failed", e instanceof Error ? e.message : e);
    return null;
  }
}

import { and, count, eq, gt } from "drizzle-orm";
import { getDb, schema, type Db } from "@/db/client";
import { newId } from "./ids";

/**
 * Per-user rate limit for endpoints that cost money (place lookups, scorecard scans). Counts in the
 * events table so it holds across serverless instances; a few extra rows a day is nothing.
 * Returns true and records the hit when allowed, false when the window is full.
 */
export async function allow(kind: "places_lookup" | "course_scan" | "course_search", userId: string, limit: number, windowMs: number, db?: Db): Promise<boolean> {
  db ??= await getDb();
  const since = new Date(Date.now() - windowMs);
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.events)
    .where(and(eq(schema.events.kind, kind), eq(schema.events.userId, userId), gt(schema.events.createdAt, since)));
  if (n >= limit) return false;
  await db.insert(schema.events).values({ id: newId(), kind, userId, crewId: null, sessionId: null, payload: "{}", createdAt: new Date() });
  return true;
}

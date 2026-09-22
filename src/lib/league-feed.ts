import { and, eq, isNull, lt, ne, or } from "drizzle-orm";
import { getDb, schema, type Db } from "@/db/client";
import type { Competition } from "@/db/schema";
import { LeagueError } from "@/domain/league";
import { feedFromSnippet, readStandingsFeed } from "@/domain/league-feed";
import type { StandingRow } from "@/domain/league";

/**
 * Pulling league tables from the league's own feed.
 *
 * The address always arrives from a snippet a league or team admin generated for their own club, so
 * the host is pinned to the two platforms that issue them and checked again here, after redirects,
 * before anything is read. A feed that breaks never empties a table: the last good rows stay on the
 * hub with the error recorded against them, and the manager can always paste instead.
 */

/** Feeds are small. A cap keeps a misconfigured address from pulling a large file into memory. */
const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 8_000;
/** Pulled four times a day: leagues update results in the evening, and tables move once a week. */
export const REFRESH_MS = 6 * 60 * 60 * 1000;

const ALLOWED_HOST = /(^|\.)(fulltime\.thefa\.com|leaguerepublic\.com)$/i;

export class FeedError extends Error {}

function assertAllowed(url: string): URL {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new FeedError("That feed address isn't a valid link.");
  }
  if (u.protocol !== "https:") throw new FeedError("Feeds are only read over https.");
  if (!ALLOWED_HOST.test(u.hostname)) throw new FeedError("Only FA Full-Time and LeagueRepublic feeds can be read.");
  return u;
}

/** Fetches a feed, with a timeout, a size cap and a redirect that cannot leave the allowed hosts. */
export async function fetchFeed(url: string, fetchImpl: typeof fetch = fetch): Promise<{ body: string; contentType: string }> {
  assertAllowed(url);
  const res = await fetchImpl(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      // Say who we are: these feeds are issued to clubs, and a named agent is easier to allow than a silent one.
      "user-agent": "RollCall/1.0 (+https://rollcall-henna.vercel.app; league feed for the club that generated this snippet)",
      accept: "application/json;q=0.9, text/html;q=0.8, */*;q=0.5",
    },
  }).catch((e: unknown) => {
    if (e instanceof Error && e.name === "TimeoutError") throw new FeedError("The league's site took too long to answer.");
    throw new FeedError("Couldn't reach the league's site.");
  });

  // A redirect must not carry us off the allowed hosts.
  if (res.url) assertAllowed(res.url);
  if (res.status === 401 || res.status === 403) throw new FeedError("The league's site refused that feed. Generate a fresh snippet in the league admin.");
  if (res.status === 404) throw new FeedError("That feed no longer exists. Generate a fresh snippet in the league admin.");
  if (!res.ok) throw new FeedError(`The league's site answered ${res.status}.`);

  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) throw new FeedError("That feed is too big to read.");
  const body = await res.text();
  if (body.length > MAX_BYTES) throw new FeedError("That feed is too big to read.");
  return { body, contentType: res.headers.get("content-type") ?? "" };
}

/** Fetches and reads one feed. Throws FeedError or LeagueError with something a manager can act on. */
export async function readFeed(url: string, fetchImpl: typeof fetch = fetch): Promise<StandingRow[]> {
  const { body, contentType } = await fetchFeed(url, fetchImpl);
  // Cloudflare answers a challenge with 200 and an HTML page; say so plainly rather than "no table".
  if (/cf-browser-verification|Just a moment\.\.\.|cf_chl_/i.test(body)) {
    throw new FeedError("The league's site asked for a browser check, so the table couldn't be read automatically.");
  }
  const rows = readStandingsFeed(body, contentType);
  if (rows.length < 2) throw new LeagueError("That feed only held one row, so it doesn't look like a league table.");
  return rows;
}

export type SyncOutcome = { ok: true; rows: number } | { ok: false; error: string };

/**
 * Refreshes one competition. A failure is recorded against the row and the previous table is kept,
 * so the hub degrades to a stale table with a note rather than to nothing.
 */
export async function syncCompetition(comp: Competition, db?: Db, fetchImpl: typeof fetch = fetch): Promise<SyncOutcome> {
  db ??= await getDb();
  if (!comp.feedUrl || comp.feedKind === "none") return { ok: false, error: "No feed linked." };
  const now = new Date();
  try {
    const rows = await readFeed(comp.feedUrl, fetchImpl);
    await db
      .update(schema.competitions)
      .set({ standings: JSON.stringify(rows), standingsSource: "feed", standingsUpdatedAt: now, syncedAt: now, syncError: "", updatedAt: now })
      .where(eq(schema.competitions.id, comp.id));
    return { ok: true, rows: rows.length };
  } catch (e) {
    const error = e instanceof FeedError || e instanceof LeagueError ? e.message : "The league's feed couldn't be read.";
    // syncedAt is deliberately untouched: it marks the last good pull, which is what the hub shows.
    await db.update(schema.competitions).set({ syncError: error, updatedAt: now }).where(eq(schema.competitions.id, comp.id));
    return { ok: false, error };
  }
}

/**
 * Every competition whose feed is older than the refresh window. Ordered oldest first so a run that
 * hits the limit still makes progress on the most stale ones next time.
 */
export async function dueCompetitions(db?: Db, limit = 50, now = Date.now()): Promise<Competition[]> {
  db ??= await getDb();
  const cutoff = new Date(now - REFRESH_MS);
  return db
    .select()
    .from(schema.competitions)
    .where(and(ne(schema.competitions.feedKind, "none"), ne(schema.competitions.feedUrl, ""), or(isNull(schema.competitions.syncedAt), lt(schema.competitions.syncedAt, cutoff))))
    .orderBy(schema.competitions.syncedAt)
    .limit(limit);
}

export type SyncRun = { checked: number; updated: number; failed: number };

/** The cron body: refresh every stale feed, one at a time so we are never several requests deep on one league. */
export async function runStandingsSync(limit = 50): Promise<SyncRun> {
  const db = await getDb();
  const due = await dueCompetitions(db, limit);
  const run: SyncRun = { checked: due.length, updated: 0, failed: 0 };
  for (const comp of due) {
    const outcome = await syncCompetition(comp, db);
    if (outcome.ok) run.updated++;
    else run.failed++;
  }
  return run;
}

/** Re-exported so the action layer reads the snippet through the same module it syncs with. */
export { feedFromSnippet };

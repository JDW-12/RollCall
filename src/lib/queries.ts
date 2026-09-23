import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { ratingsFor } from "@/domain/ratings";
import { computeTable, type TableRow } from "@/domain/table";
import { balances, type Balance } from "@/domain/money";
import type { Appearance, MatchStatRow } from "@/domain/match-stats";
import { teamsOf, type DivisionCandidate } from "@/domain/divisions";
import type { VenueHistoryRow } from "@/domain/venues";
import { visibleSessions, type Viewer } from "@/domain/visibility";
import type { StandingRow } from "@/domain/league";

export type Member = schema.User & { role: schema.CrewMember["role"]; joinedAt: Date };

export async function listMembers(crewId: string): Promise<Member[]> {
  const db = await getDb();
  const rows = await db
    .select({ user: schema.users, role: schema.crewMembers.role, joinedAt: schema.crewMembers.joinedAt })
    .from(schema.crewMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.crewMembers.userId))
    .where(eq(schema.crewMembers.crewId, crewId))
    .orderBy(asc(schema.crewMembers.joinedAt));
  return rows.map((r) => ({ ...r.user, role: r.role, joinedAt: r.joinedAt }));
}

export async function listCrewsForUser(userId: string): Promise<(schema.Crew & { role: string })[]> {
  const db = await getDb();
  const rows = await db
    .select({ crew: schema.crews, role: schema.crewMembers.role })
    .from(schema.crewMembers)
    .innerJoin(schema.crews, eq(schema.crews.id, schema.crewMembers.crewId))
    .where(eq(schema.crewMembers.userId, userId))
    .orderBy(asc(schema.crews.name));
  return rows.map((r) => ({ ...r.crew, role: r.role }));
}

export async function listSessions(crewId: string): Promise<schema.Session[]> {
  const db = await getDb();
  return db.select().from(schema.sessions).where(eq(schema.sessions.crewId, crewId)).orderBy(desc(schema.sessions.startsAt));
}

export async function getSession(sessionId: string): Promise<schema.Session | null> {
  const db = await getDb();
  return (await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId)).limit(1))[0] ?? null;
}

export type SessionBundle = {
  session: schema.Session;
  matchStats: schema.MatchStat[];
  rsvps: schema.Rsvp[];
  attendance: schema.Attendance[];
  ratings: schema.Rating[];
  games: schema.Game[];
  entries: schema.GameEntry[];
  ledger: schema.LedgerEntry[];
};

export async function getSessionBundle(sessionId: string): Promise<SessionBundle | null> {
  const db = await getDb();
  const session = await getSession(sessionId);
  if (!session) return null;
  const [rsvps, att, rats, gms, led, ms] = await Promise.all([
    db.select().from(schema.rsvps).where(eq(schema.rsvps.sessionId, sessionId)).orderBy(asc(schema.rsvps.queuedAt)),
    db.select().from(schema.attendance).where(eq(schema.attendance.sessionId, sessionId)),
    db.select().from(schema.ratings).where(eq(schema.ratings.sessionId, sessionId)),
    db.select().from(schema.games).where(eq(schema.games.sessionId, sessionId)),
    db.select().from(schema.ledger).where(eq(schema.ledger.sessionId, sessionId)),
    db.select().from(schema.matchStats).where(eq(schema.matchStats.sessionId, sessionId)),
  ]);
  const entries = gms.length
    ? await db.select().from(schema.gameEntries).where(inArray(schema.gameEntries.gameId, gms.map((g) => g.id)))
    : [];
  return { session, rsvps, attendance: att, ratings: rats, games: gms, entries, ledger: led, matchStats: ms };
}

/** The next open session. With a viewer, the next one they can see (invite-only sessions skip the rest). */
export async function getNextSession(crewId: string, now = new Date(), viewer?: Viewer): Promise<schema.Session | null> {
  const db = await getDb();
  const all = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.crewId, crewId), eq(schema.sessions.status, "open")))
    .orderBy(asc(schema.sessions.startsAt));
  const rows = viewer ? visibleSessions(all, viewer) : all;
  return rows.find((s) => s.startsAt.getTime() + s.durationMin * 60_000 >= now.getTime()) ?? rows[0] ?? null;
}

export async function rsvpsFor(sessionIds: string[]): Promise<schema.Rsvp[]> {
  if (sessionIds.length === 0) return [];
  const db = await getDb();
  return db.select().from(schema.rsvps).where(inArray(schema.rsvps.sessionId, sessionIds));
}

/** Everything the crew table needs, computed from played sessions. */
export async function getCrewTable(crew: schema.Crew): Promise<{ rows: TableRow[]; members: Member[] }> {
  const db = await getDb();
  const members = await listMembers(crew.id);
  const sessions = await db
    .select({ id: schema.sessions.id, startsAt: schema.sessions.startsAt, status: schema.sessions.status })
    .from(schema.sessions)
    .where(eq(schema.sessions.crewId, crew.id));
  const ids = sessions.map((s) => s.id);
  const [rs, att, rats] = ids.length
    ? await Promise.all([
        db.select().from(schema.rsvps).where(inArray(schema.rsvps.sessionId, ids)),
        db.select().from(schema.attendance).where(inArray(schema.attendance.sessionId, ids)),
        db.select().from(schema.ratings).where(inArray(schema.ratings.sessionId, ids)),
      ])
    : [[], [], []];
  const rows = computeTable({
    memberIds: members.map((m) => m.id),
    sessions: sessions.map((s) => ({ id: s.id, startsAt: s.startsAt.getTime(), status: s.status })),
    rsvps: rs.map((r) => ({ sessionId: r.sessionId, userId: r.userId, status: r.status, lateDrop: r.lateDrop })),
    attendance: att.map((a) => ({ sessionId: a.sessionId, userId: a.userId, attended: a.attended })),
    ratings: rats.map((r) => ({ sessionId: r.sessionId, category: r.category, rateeId: r.rateeId })),
    categories: ratingsFor(crew.sport, crew.ratings),
  });
  return { rows, members };
}

export async function getCrewLedger(crewId: string): Promise<{ entries: schema.LedgerEntry[]; balances: Map<string, Balance> }> {
  const db = await getDb();
  const entries = await db.select().from(schema.ledger).where(eq(schema.ledger.crewId, crewId)).orderBy(desc(schema.ledger.createdAt));
  return {
    entries,
    balances: balances(entries.map((e) => ({ userId: e.userId, kind: e.kind, amountPence: e.amountPence, sessionId: e.sessionId }))),
  };
}

/** The crew's feed, newest first. `kinds` narrows it before the limit, so a filtered feed still fills up. */
export async function getFeed(crewId: string, limit = 30, kinds?: string[]): Promise<schema.FeedItem[]> {
  const db = await getDb();
  const where = kinds ? and(eq(schema.feed.crewId, crewId), inArray(schema.feed.kind, kinds)) : eq(schema.feed.crewId, crewId);
  return db.select().from(schema.feed).where(where).orderBy(desc(schema.feed.createdAt)).limit(limit);
}

/**
 * Where the crew has played, newest first. For golf it also carries the course card each round used,
 * so tapping a recent venue brings its scorecard with it and nobody searches for the club twice.
 */
export async function venueHistory(crewId: string): Promise<VenueHistoryRow[]> {
  const db = await getDb();
  const rows = await db
    .select({ venueName: schema.sessions.venueName, venueAddress: schema.sessions.venueAddress, game: schema.games.data })
    .from(schema.sessions)
    .leftJoin(schema.games, and(eq(schema.games.sessionId, schema.sessions.id), eq(schema.games.kind, "stableford")))
    .where(eq(schema.sessions.crewId, crewId))
    .orderBy(desc(schema.sessions.startsAt))
    .limit(60);
  return rows.map((r) => {
    let course: VenueHistoryRow["course"] = null;
    if (r.game) {
      try {
        const c = (JSON.parse(r.game) as { course?: { id: string | null; name: string; tee: string } | null }).course;
        if (c?.id) course = { id: c.id, name: c.name, tee: c.tee };
      } catch {
        /* an unreadable card just means no course on the chip */
      }
    }
    return { venueName: r.venueName, venueAddress: r.venueAddress, course };
  });
}

export async function findCrewByInvite(token: string): Promise<schema.Crew | null> {
  const db = await getDb();
  return (await db.select().from(schema.crews).where(eq(schema.crews.inviteToken, token)).limit(1))[0] ?? null;
}

export async function getUser(userId: string): Promise<schema.User | null> {
  const db = await getDb();
  return (await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1))[0] ?? null;
}

/** Every Stableford card the crew has saved, for season golf stats. */
export async function golfRounds(crewId: string): Promise<import("@/domain/golf-stats").Round[]> {
  const db = await getDb();
  const rows = await db
    .select({ sessionId: schema.sessions.id, title: schema.sessions.title, startsAt: schema.sessions.startsAt, data: schema.games.data })
    .from(schema.games)
    .innerJoin(schema.sessions, eq(schema.games.sessionId, schema.sessions.id))
    .where(and(eq(schema.sessions.crewId, crewId), eq(schema.games.kind, "stableford"), ne(schema.sessions.status, "cancelled")));
  return rows.map((r) => ({ sessionId: r.sessionId, title: r.title, startsAt: r.startsAt.getTime(), card: JSON.parse(r.data) }));
}

export async function organisesAnyCrew(userId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.crewMembers.id })
    .from(schema.crewMembers)
    .where(and(eq(schema.crewMembers.userId, userId), eq(schema.crewMembers.role, "organiser")))
    .limit(1);
  return rows.length > 0;
}

export async function listCompetitions(crewId: string): Promise<schema.Competition[]> {
  const db = await getDb();
  return db.select().from(schema.competitions).where(eq(schema.competitions.crewId, crewId)).orderBy(asc(schema.competitions.name));
}

export async function getCompetition(id: string): Promise<schema.Competition | null> {
  const db = await getDb();
  return (await db.select().from(schema.competitions).where(eq(schema.competitions.id, id)).limit(1))[0] ?? null;
}

/** Sessions that are fixtures: they belong to a competition or name an opponent. Newest first. */
export async function listFixtures(crewId: string): Promise<schema.Session[]> {
  const all = await listSessions(crewId);
  return all.filter((s) => s.status !== "cancelled" && (s.competitionId || s.opponent));
}

/**
 * Everything the season's player stats need: the numbers entered per fixture, and an appearance for
 * everyone marked as having turned up to one.
 */
export async function crewMatchStats(crewId: string): Promise<{ stats: MatchStatRow[]; appearances: Appearance[] }> {
  const db = await getDb();
  const fixtures = await listFixtures(crewId);
  const ids = fixtures.map((f) => f.id);
  if (!ids.length) return { stats: [], appearances: [] };
  const [stats, att] = await Promise.all([
    db.select().from(schema.matchStats).where(inArray(schema.matchStats.sessionId, ids)),
    db.select().from(schema.attendance).where(inArray(schema.attendance.sessionId, ids)),
  ]);
  return {
    stats: stats.map((s) => ({ sessionId: s.sessionId, userId: s.userId, goals: s.goals, assists: s.assists, rating: s.rating })),
    appearances: att.filter((a) => a.attended).map((a) => ({ sessionId: a.sessionId, userId: a.userId })),
  };
}

/**
 * Tables other crews have already sourced, as division fingerprints. Used to spot which division a
 * crew is playing in from the teams it has played, so a second crew in a league never has to find a
 * table at all. The crew's own competitions are left out: matching yourself proves nothing.
 */
export async function divisionCandidates(excludeCrewId: string): Promise<DivisionCandidate[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.competitions.id, divisionKey: schema.competitions.divisionKey, crewId: schema.crews.id, crewName: schema.crews.name, name: schema.competitions.name, standings: schema.competitions.standings, updatedAt: schema.competitions.standingsUpdatedAt })
    .from(schema.competitions)
    .innerJoin(schema.crews, eq(schema.crews.id, schema.competitions.crewId))
    .where(and(isNotNull(schema.competitions.standings), ne(schema.competitions.crewId, excludeCrewId)))
    .limit(400);
  return rows.map((r) => ({
    competitionId: r.id,
    divisionKey: r.divisionKey,
    crewId: r.crewId,
    crewName: r.crewName,
    name: r.name,
    teams: teamsOf(JSON.parse(r.standings ?? "[]") as StandingRow[]),
    updatedAt: r.updatedAt?.getTime() ?? 0,
  }));
}

/**
 * The freshest table held by any crew sharing this division, so every crew after the first reads a
 * table nobody in their crew had to find.
 */
export async function sharedStandings(divisionKey: string, excludeCompetitionId: string): Promise<{ rows: StandingRow[]; updatedAt: Date | null; source: string; crewName: string } | null> {
  if (!divisionKey) return null;
  const db = await getDb();
  const hit = (
    await db
      .select({ standings: schema.competitions.standings, updatedAt: schema.competitions.standingsUpdatedAt, source: schema.competitions.standingsSource, crewName: schema.crews.name })
      .from(schema.competitions)
      .innerJoin(schema.crews, eq(schema.crews.id, schema.competitions.crewId))
      .where(and(eq(schema.competitions.divisionKey, divisionKey), ne(schema.competitions.id, excludeCompetitionId), isNotNull(schema.competitions.standings)))
      .orderBy(desc(schema.competitions.standingsUpdatedAt))
      .limit(1)
  )[0];
  if (!hit) return null;
  return { rows: JSON.parse(hit.standings ?? "[]") as StandingRow[], updatedAt: hit.updatedAt, source: hit.source, crewName: hit.crewName };
}

/**
 * Everything the golf leaderboard needs: the crew's rounds and the votes cast on them. Golf is scored
 * on the card and the votes, never on attendance, so RSVPs and turn-ups aren't read at all.
 */
export async function golfLeaderboardData(crew: schema.Crew): Promise<{ members: Member[]; rounds: import("@/domain/golf-stats").Round[]; votes: { sessionId: string; category: string; rateeId: string }[] }> {
  const db = await getDb();
  const [members, rounds] = await Promise.all([listMembers(crew.id), golfRounds(crew.id)]);
  const ids = rounds.map((r) => r.sessionId);
  const votes = ids.length
    ? (await db.select({ sessionId: schema.ratings.sessionId, category: schema.ratings.category, rateeId: schema.ratings.rateeId }).from(schema.ratings).where(inArray(schema.ratings.sessionId, ids)))
    : [];
  return { members, rounds, votes };
}

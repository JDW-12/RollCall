import "server-only";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { computeTable, type TableRow } from "@/domain/table";
import { sportOf } from "@/domain/sports";
import { balances, type Balance } from "@/domain/money";

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
  const [rsvps, att, rats, gms, led] = await Promise.all([
    db.select().from(schema.rsvps).where(eq(schema.rsvps.sessionId, sessionId)).orderBy(asc(schema.rsvps.queuedAt)),
    db.select().from(schema.attendance).where(eq(schema.attendance.sessionId, sessionId)),
    db.select().from(schema.ratings).where(eq(schema.ratings.sessionId, sessionId)),
    db.select().from(schema.games).where(eq(schema.games.sessionId, sessionId)),
    db.select().from(schema.ledger).where(eq(schema.ledger.sessionId, sessionId)),
  ]);
  const entries = gms.length
    ? await db.select().from(schema.gameEntries).where(inArray(schema.gameEntries.gameId, gms.map((g) => g.id)))
    : [];
  return { session, rsvps, attendance: att, ratings: rats, games: gms, entries, ledger: led };
}

export async function getNextSession(crewId: string, now = new Date()): Promise<schema.Session | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.crewId, crewId), eq(schema.sessions.status, "open")))
    .orderBy(asc(schema.sessions.startsAt));
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
    categories: sportOf(crew.sport).ratings,
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

export async function getFeed(crewId: string, limit = 30): Promise<schema.FeedItem[]> {
  const db = await getDb();
  return db.select().from(schema.feed).where(eq(schema.feed.crewId, crewId)).orderBy(desc(schema.feed.createdAt)).limit(limit);
}

export async function venueHistory(crewId: string): Promise<{ venueName: string; venueAddress: string }[]> {
  const db = await getDb();
  return db
    .select({ venueName: schema.sessions.venueName, venueAddress: schema.sessions.venueAddress })
    .from(schema.sessions)
    .where(eq(schema.sessions.crewId, crewId))
    .orderBy(desc(schema.sessions.startsAt))
    .limit(60);
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

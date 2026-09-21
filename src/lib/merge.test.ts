import { describe, expect, it, beforeAll } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import path from "node:path";
import * as schema from "@/db/schema";
import { mergeUsers } from "./merge";

type Db = ReturnType<typeof drizzle<typeof schema>>;
let db: Db;
const now = new Date();

beforeAll(async () => {
  const client = createClient({ url: ":memory:" });
  db = drizzle(client, { schema });
  await client.execute("PRAGMA foreign_keys = ON");
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
});

describe("mergeUsers", () => {
  it("folds a guest into an existing account, existing wins conflicts", async () => {
    await db.insert(schema.users).values([
      { id: "guest", name: "Sam (guest)", email: null, hue: 1, createdAt: now },
      { id: "real", name: "Sam", email: "sam@example.com", hue: 2, createdAt: now },
      { id: "other", name: "Priya", email: null, hue: 3, createdAt: now },
    ]);
    await db.insert(schema.crews).values([
      { id: "c1", slug: "c1", name: "C1", sport: "football", inviteToken: "t1", seasonStartsAt: now, createdBy: "guest", createdAt: now },
      { id: "c2", slug: "c2", name: "C2", sport: "padel", inviteToken: "t2", seasonStartsAt: now, createdBy: "other", createdAt: now },
    ]);
    await db.insert(schema.crewMembers).values([
      { id: "m1", crewId: "c1", userId: "guest", role: "organiser", joinedAt: now },
      { id: "m2", crewId: "c2", userId: "guest", role: "member", joinedAt: now },
      { id: "m3", crewId: "c2", userId: "real", role: "member", joinedAt: now },
      { id: "m4", crewId: "c2", userId: "other", role: "organiser", joinedAt: now },
    ]);
    await db.insert(schema.sessions).values([
      { id: "s1", crewId: "c1", sport: "football", title: "S1", startsAt: now, capacity: 10, createdBy: "guest", createdAt: now },
      { id: "s2", crewId: "c2", sport: "padel", title: "S2", startsAt: now, capacity: 4, createdBy: "other", createdAt: now },
    ]);
    await db.insert(schema.rsvps).values([
      { id: "r1", sessionId: "s1", userId: "guest", status: "in", queuedAt: now, respondedAt: now },
      { id: "r2", sessionId: "s2", userId: "guest", status: "reserve", queuedAt: now, respondedAt: now },
      { id: "r3", sessionId: "s2", userId: "real", status: "in", queuedAt: now, respondedAt: now },
    ]);
    await db.insert(schema.ratings).values([
      { id: "g1", sessionId: "s1", raterId: "other", category: "motm", rateeId: "guest", createdAt: now },
      { id: "g2", sessionId: "s2", raterId: "guest", category: "motm", rateeId: "other", createdAt: now },
      { id: "g3", sessionId: "s2", raterId: "real", category: "motm", rateeId: "other", createdAt: now },
      { id: "g4", sessionId: "s2", raterId: "other", category: "grafter", rateeId: "guest", createdAt: now },
    ]);
    await db.insert(schema.ledger).values([
      { id: "l1", crewId: "c1", sessionId: "s1", userId: "guest", kind: "charge", amountPence: 650, reason: "share", createdBy: "guest", createdAt: now },
    ]);
    await db.insert(schema.games).values({ id: "gm1", sessionId: "s1", kind: "teams", data: JSON.stringify({ a: ["guest"], b: ["other"] }), createdAt: now, updatedAt: now });
    await db.insert(schema.authSessions).values({ id: "tok", userId: "guest", expiresAt: new Date(now.getTime() + 1000), createdAt: now });

    const { moved } = await mergeUsers(db, "guest", "real");

    expect(moved.memberships).toBe(1);
    const members = await db.select().from(schema.crewMembers).where(eq(schema.crewMembers.userId, "real"));
    expect(members.map((m) => `${m.crewId}:${m.role}`).sort()).toEqual(["c1:organiser", "c2:member"]);
    expect((await db.select().from(schema.crewMembers).where(eq(schema.crewMembers.userId, "guest"))).length).toBe(0);

    const rs = await db.select().from(schema.rsvps).where(eq(schema.rsvps.userId, "real"));
    expect(rs.map((r) => `${r.sessionId}:${r.status}`).sort()).toEqual(["s1:in", "s2:in"]);

    const given = await db.select().from(schema.ratings).where(eq(schema.ratings.raterId, "real"));
    expect(given).toHaveLength(1);
    const received = await db.select().from(schema.ratings).where(eq(schema.ratings.rateeId, "real"));
    expect(received.map((r) => r.category).sort()).toEqual(["grafter", "motm"]);

    expect((await db.select().from(schema.ledger).where(eq(schema.ledger.userId, "real"))).length).toBe(1);
    const game = (await db.select().from(schema.games).where(eq(schema.games.id, "gm1")))[0];
    expect(JSON.parse(game.data).a).toEqual(["real"]);
    expect((await db.select().from(schema.crews).where(eq(schema.crews.id, "c1")))[0].createdBy).toBe("real");
    expect((await db.select().from(schema.users).where(eq(schema.users.id, "guest"))).length).toBe(0);
    expect((await db.select().from(schema.authSessions).where(eq(schema.authSessions.id, "tok"))).length).toBe(0);
  });
});

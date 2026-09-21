import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";

/**
 * Fold a guest account into an existing one. Used when someone who joined from an invite link
 * later signs in with an email that already has an account.
 *
 * Rules: the existing account wins every conflict (membership, RSVP, attendance, rating slot);
 * everything else moves across. History is preserved, nothing is invented, the guest row is deleted.
 */
export async function mergeUsers(db: Db, fromId: string, intoId: string): Promise<{ moved: Record<string, number> }> {
  if (fromId === intoId) return { moved: {} };
  const moved: Record<string, number> = {};
  await db.transaction(async (tx) => {
    // Memberships: keep the target's where both exist, but promote to organiser if the guest was one.
    const fromM = await tx.select().from(schema.crewMembers).where(eq(schema.crewMembers.userId, fromId));
    const intoM = await tx.select().from(schema.crewMembers).where(eq(schema.crewMembers.userId, intoId));
    moved.memberships = 0;
    for (const m of fromM) {
      const dup = intoM.find((x) => x.crewId === m.crewId);
      if (dup) {
        if (m.role === "organiser" && dup.role !== "organiser") await tx.update(schema.crewMembers).set({ role: "organiser" }).where(eq(schema.crewMembers.id, dup.id));
        await tx.delete(schema.crewMembers).where(eq(schema.crewMembers.id, m.id));
      } else {
        await tx.update(schema.crewMembers).set({ userId: intoId }).where(eq(schema.crewMembers.id, m.id));
        moved.memberships++;
      }
    }

    // RSVPs: unique per session. Keep the target's row when both answered.
    const fromR = await tx.select().from(schema.rsvps).where(eq(schema.rsvps.userId, fromId));
    const intoR = await tx.select({ sessionId: schema.rsvps.sessionId }).from(schema.rsvps).where(eq(schema.rsvps.userId, intoId));
    const intoSessions = new Set(intoR.map((r) => r.sessionId));
    moved.rsvps = 0;
    for (const r of fromR) {
      if (intoSessions.has(r.sessionId)) await tx.delete(schema.rsvps).where(eq(schema.rsvps.id, r.id));
      else {
        await tx.update(schema.rsvps).set({ userId: intoId }).where(eq(schema.rsvps.id, r.id));
        moved.rsvps++;
      }
    }

    // Attendance: same shape.
    const fromA = await tx.select().from(schema.attendance).where(eq(schema.attendance.userId, fromId));
    const intoA = await tx.select({ sessionId: schema.attendance.sessionId }).from(schema.attendance).where(eq(schema.attendance.userId, intoId));
    const intoAtt = new Set(intoA.map((a) => a.sessionId));
    moved.attendance = 0;
    for (const a of fromA) {
      if (intoAtt.has(a.sessionId)) await tx.delete(schema.attendance).where(eq(schema.attendance.id, a.id));
      else {
        await tx.update(schema.attendance).set({ userId: intoId }).where(eq(schema.attendance.id, a.id));
        moved.attendance++;
      }
    }

    // Ratings given: unique per (session, rater, category). Ratings received just move.
    const fromGiven = await tx.select().from(schema.ratings).where(eq(schema.ratings.raterId, fromId));
    const intoGiven = await tx.select({ sessionId: schema.ratings.sessionId, category: schema.ratings.category }).from(schema.ratings).where(eq(schema.ratings.raterId, intoId));
    const intoSlots = new Set(intoGiven.map((r) => `${r.sessionId}:${r.category}`));
    moved.ratingsGiven = 0;
    for (const r of fromGiven) {
      if (intoSlots.has(`${r.sessionId}:${r.category}`)) await tx.delete(schema.ratings).where(eq(schema.ratings.id, r.id));
      else {
        await tx.update(schema.ratings).set({ raterId: intoId }).where(eq(schema.ratings.id, r.id));
        moved.ratingsGiven++;
      }
    }
    const received = await tx.update(schema.ratings).set({ rateeId: intoId }).where(eq(schema.ratings.rateeId, fromId)).returning({ id: schema.ratings.id });
    moved.ratingsReceived = received.length;
    // A vote for yourself can't happen through the UI; if a merge created one, drop it.
    await tx.delete(schema.ratings).where(and(eq(schema.ratings.raterId, intoId), eq(schema.ratings.rateeId, intoId)));

    // Money and games move wholesale; balances net out per user so nothing is lost.
    moved.ledger = (await tx.update(schema.ledger).set({ userId: intoId }).where(eq(schema.ledger.userId, fromId)).returning({ id: schema.ledger.id })).length;
    const fromE = await tx.select().from(schema.gameEntries).where(eq(schema.gameEntries.userId, fromId));
    const intoE = await tx.select({ gameId: schema.gameEntries.gameId }).from(schema.gameEntries).where(eq(schema.gameEntries.userId, intoId));
    const intoGames = new Set(intoE.map((e) => e.gameId));
    moved.gameEntries = 0;
    for (const e of fromE) {
      if (intoGames.has(e.gameId)) await tx.delete(schema.gameEntries).where(eq(schema.gameEntries.id, e.id));
      else {
        await tx.update(schema.gameEntries).set({ userId: intoId }).where(eq(schema.gameEntries.id, e.id));
        moved.gameEntries++;
      }
    }
    // Sessions and crews the guest created keep a valid author.
    await tx.update(schema.sessions).set({ createdBy: intoId }).where(eq(schema.sessions.createdBy, fromId));
    await tx.update(schema.crews).set({ createdBy: intoId }).where(eq(schema.crews.createdBy, fromId));
    await tx.update(schema.events).set({ userId: intoId }).where(eq(schema.events.userId, fromId));

    // Team sheets, americano schedules and cards refer to user ids inside JSON. Rewrite them.
    const gameIds = [...new Set([...fromR.map((r) => r.sessionId), ...fromA.map((a) => a.sessionId)])];
    if (gameIds.length) {
      const games = await tx.select().from(schema.games).where(inArray(schema.games.sessionId, gameIds));
      for (const g of games) {
        if (!g.data.includes(fromId)) continue;
        await tx.update(schema.games).set({ data: g.data.split(`"${fromId}"`).join(`"${intoId}"`) }).where(eq(schema.games.id, g.id));
      }
    }

    // Sign every device out of the guest account, then remove it.
    await tx.delete(schema.authSessions).where(eq(schema.authSessions.userId, fromId));
    await tx.delete(schema.users).where(eq(schema.users.id, fromId));
  }, { behavior: "immediate" });
  return { moved };
}

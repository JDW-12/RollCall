"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db/client";
import { requireCrewAction } from "@/lib/access";
import { newId } from "@/lib/ids";
import { fromLocalInput, parsePounds } from "@/lib/format";
import { isSportKey, sportOf } from "@/domain/sports";
import { applyCapacityChange, applyRsvp, playing, type RsvpRow } from "@/domain/rsvp";
import { settleSession } from "@/domain/money";
import { getSession, getSessionBundle } from "@/lib/queries";
import { act, addFeed, str, uiError, type ActionState } from "./shared";

const sessionSchema = z.object({
  sport: z.string().refine(isSportKey, "Pick a sport."),
  title: z.string().trim().min(2, "Give it a title.").max(60),
  venueName: z.string().trim().max(80),
  venueAddress: z.string().trim().max(120),
  startsAt: z.date(),
  durationMin: z.coerce.number().int().min(15).max(720),
  capacity: z.coerce.number().int().min(1, "At least one spot.").max(60),
  costMode: z.enum(["total", "per_head"]),
  costPence: z.number().int().min(0),
  rsvpDeadlineAt: z.date().nullable(),
  notes: z.string().trim().max(500),
});

function parseSessionForm(fd: FormData) {
  const startsAt = fromLocalInput(str(fd, "startsAt"));
  if (!startsAt) uiError("Pick a date and time.");
  const deadlineRaw = str(fd, "rsvpDeadlineAt");
  const rsvpDeadlineAt = deadlineRaw ? fromLocalInput(deadlineRaw) : null;
  if (deadlineRaw && !rsvpDeadlineAt) uiError("The deadline date doesn't look right.");
  const costPence = parsePounds(str(fd, "cost") || "0");
  if (costPence === null) uiError("Cost should be pounds and pence, like 65 or 6.50.");
  return sessionSchema.parse({
    sport: str(fd, "sport"),
    title: str(fd, "title"),
    venueName: str(fd, "venueName"),
    venueAddress: str(fd, "venueAddress"),
    startsAt,
    durationMin: str(fd, "durationMin") || 60,
    capacity: str(fd, "capacity"),
    costMode: str(fd, "costMode") === "per_head" ? "per_head" : "total",
    costPence,
    rsvpDeadlineAt,
    notes: str(fd, "notes"),
  });
}

export async function createSession(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let target = "";
  const r = await act(async () => {
    const crewId = str(fd, "crewId");
    const { crew, user } = await requireCrewAction(crewId, { organiser: true });
    const input = parseSessionForm(fd);
    const db = await getDb();
    const id = newId();
    const now = new Date();
    await db.insert(schema.sessions).values({ id, crewId: crew.id, ...input, status: "open", createdBy: user.id, createdAt: now });
    // The organiser is in by default. They pinned it, they're playing.
    if (str(fd, "organiserIn") !== "no") {
      await db.insert(schema.rsvps).values({ id: newId(), sessionId: id, userId: user.id, status: "in", queuedAt: now, respondedAt: now });
    }
    await addFeed(crew.id, id, "session_pinned", { by: user.id, title: input.title, startsAt: input.startsAt.getTime() });
    target = `/crew/${crew.slug}/s/${id}?pinned=1`;
  });
  if (r.error) return r;
  redirect(target);
}

export async function updateSession(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let target = "";
  const r = await act(async () => {
    const sessionId = str(fd, "sessionId");
    const session = await getSession(sessionId);
    if (!session) uiError("That session doesn't exist any more.");
    const { crew } = await requireCrewAction(session.crewId, { organiser: true });
    if (session.status !== "open") uiError("This one has already been played.");
    const input = parseSessionForm(fd);
    const db = await getDb();
    await db.update(schema.sessions).set(input).where(eq(schema.sessions.id, session.id));
    if (input.capacity !== session.capacity) {
      const rows = await db.select().from(schema.rsvps).where(eq(schema.rsvps.sessionId, session.id));
      const res = applyCapacityChange(rows.map(toRow), input.capacity, Date.now());
      await persistRsvps(session.id, rows, res.rows);
      for (const c of res.changes) await addFeed(crew.id, session.id, "promoted", { userId: c.userId });
    }
    revalidatePath(`/crew/${crew.slug}`, "layout");
    target = `/crew/${crew.slug}/s/${session.id}`;
  });
  if (r.error) return r;
  redirect(target);
}

export async function cancelSession(fd: FormData): Promise<void> {
  const sessionId = str(fd, "sessionId");
  const session = await getSession(sessionId);
  if (!session) return;
  const { crew, user } = await requireCrewAction(session.crewId, { organiser: true });
  const db = await getDb();
  await db.update(schema.sessions).set({ status: "cancelled" }).where(eq(schema.sessions.id, session.id));
  await addFeed(crew.id, session.id, "session_cancelled", { by: user.id, title: session.title });
  revalidatePath(`/crew/${crew.slug}`, "layout");
  redirect(`/crew/${crew.slug}`);
}

function toRow(r: schema.Rsvp): RsvpRow {
  return {
    userId: r.userId,
    status: r.status,
    queuedAt: r.queuedAt.getTime(),
    respondedAt: r.respondedAt.getTime(),
    droppedAt: r.droppedAt?.getTime() ?? null,
    lateDrop: r.lateDrop,
  };
}

async function persistRsvps(sessionId: string, before: schema.Rsvp[], after: RsvpRow[]) {
  const db = await getDb();
  const byUser = new Map(before.map((r) => [r.userId, r]));
  for (const row of after) {
    const prev = byUser.get(row.userId);
    const values = {
      status: row.status,
      queuedAt: new Date(row.queuedAt),
      respondedAt: new Date(row.respondedAt),
      droppedAt: row.droppedAt === null ? null : new Date(row.droppedAt),
      lateDrop: row.lateDrop,
    };
    if (!prev) {
      await db.insert(schema.rsvps).values({ id: newId(), sessionId, userId: row.userId, ...values });
    } else if (
      prev.status !== row.status ||
      prev.queuedAt.getTime() !== row.queuedAt ||
      prev.lateDrop !== row.lateDrop ||
      (prev.droppedAt?.getTime() ?? null) !== row.droppedAt
    ) {
      await db.update(schema.rsvps).set(values).where(eq(schema.rsvps.id, prev.id));
    }
  }
}

/** Tap in or out. Works for any member; organisers can also do it on someone else's behalf. */
export async function rsvp(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const sessionId = str(fd, "sessionId");
    const intent = str(fd, "intent") === "out" ? "out" : "in";
    const session = await getSession(sessionId);
    if (!session) uiError("That session doesn't exist any more.");
    const ctx = await requireCrewAction(session.crewId);
    const onBehalf = str(fd, "userId");
    const targetUser = onBehalf && ctx.isOrganiser ? onBehalf : ctx.user.id;
    const db = await getDb();
    const rows = await db.select().from(schema.rsvps).where(eq(schema.rsvps.sessionId, session.id));
    const res = applyRsvp(
      {
        capacity: session.capacity,
        startsAt: session.startsAt.getTime(),
        rsvpDeadlineAt: session.rsvpDeadlineAt?.getTime() ?? null,
        status: session.status,
        lateDropHours: ctx.crew.lateDropHours,
      },
      rows.map(toRow),
      targetUser,
      intent,
      Date.now(),
    );
    await persistRsvps(session.id, rows, res.rows);
    for (const c of res.changes) {
      await addFeed(ctx.crew.id, session.id, c.type, { userId: c.userId, late: "late" in c ? c.late : undefined, title: session.title });
    }
    revalidatePath(`/crew/${ctx.crew.slug}`, "layout");
    const mine = res.changes.find((c) => c.userId === targetUser);
    if (mine?.type === "reserved") return { ok: true, message: "It's full, so you're on the reserve list. You'll get promoted if someone drops." };
    if (mine?.type === "dropped" && mine.late) return { ok: true, message: "Noted. That's inside the late-drop window, so your share still stands." };
    return { ok: true };
  });
}

/**
 * Organiser confirms who actually turned up, marks the session played, and raises the charges.
 * Idempotent: running it again replaces attendance and rebuilds this session's charges.
 */
export async function confirmPlayed(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let target = "";
  const r = await act(async () => {
    const sessionId = str(fd, "sessionId");
    const bundle = await getSessionBundle(sessionId);
    if (!bundle) uiError("That session doesn't exist any more.");
    const { session, rsvps } = bundle;
    const { crew, user } = await requireCrewAction(session.crewId, { organiser: true });
    if (session.status === "cancelled") uiError("This session was cancelled.");
    const db = await getDb();
    const now = new Date();
    const inRows = playing(rsvps.map(toRow));
    const attendedIds = new Set(fd.getAll("attended").map(String));
    // Anyone the organiser ticks who wasn't "in" (a walk-on) gets an RSVP row so stats and money include them.
    const walkOns = [...attendedIds].filter((id) => !inRows.some((r) => r.userId === id));
    for (const id of walkOns) {
      const existing = rsvps.find((r) => r.userId === id);
      if (existing) await db.update(schema.rsvps).set({ status: "in", lateDrop: false, droppedAt: null }).where(eq(schema.rsvps.id, existing.id));
      else await db.insert(schema.rsvps).values({ id: newId(), sessionId: session.id, userId: id, status: "in", queuedAt: now, respondedAt: now });
    }
    const expected = [...inRows.map((r) => r.userId), ...walkOns];

    await db.delete(schema.attendance).where(eq(schema.attendance.sessionId, session.id));
    if (expected.length) {
      await db.insert(schema.attendance).values(
        expected.map((userId) => ({ id: newId(), sessionId: session.id, userId, attended: attendedIds.has(userId), confirmedBy: user.id, confirmedAt: now })),
      );
    }

    // Rebuild charges for this session (never touch payments).
    await db.delete(schema.ledger).where(and(eq(schema.ledger.sessionId, session.id), eq(schema.ledger.kind, "charge")));
    const charges = settleSession({
      costMode: session.costMode,
      costPence: session.costPence,
      playing: expected,
      attended: new Map(expected.map((id) => [id, attendedIds.has(id)])),
      lateDrops: rsvps.filter((r) => r.lateDrop).map((r) => r.userId),
    });
    if (charges.length) {
      await db.insert(schema.ledger).values(
        charges.map((c) => ({
          id: newId(),
          crewId: crew.id,
          sessionId: session.id,
          userId: c.userId,
          kind: "charge" as const,
          amountPence: c.amountPence,
          reason: c.reason,
          note: session.title,
          createdBy: user.id,
          createdAt: now,
        })),
      );
    }
    await db.update(schema.sessions).set({ status: "played", playedAt: now }).where(eq(schema.sessions.id, session.id));
    await addFeed(crew.id, session.id, "session_played", {
      by: user.id,
      title: session.title,
      turnedUp: [...attendedIds].length,
      noShows: expected.filter((id) => !attendedIds.has(id)).length,
    });
    revalidatePath(`/crew/${crew.slug}`, "layout");
    target = `/crew/${crew.slug}/s/${session.id}/rate`;
  });
  if (r.error) return r;
  redirect(target);
}

/** Three taps: one name per category. Re-submitting replaces your votes. */
export async function rate(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let target = "";
  const r = await act(async () => {
    const sessionId = str(fd, "sessionId");
    const bundle = await getSessionBundle(sessionId);
    if (!bundle) uiError("That session doesn't exist any more.");
    const { session, attendance } = bundle;
    const { crew, user } = await requireCrewAction(session.crewId);
    if (session.status !== "played") uiError("You can rate once the organiser has confirmed who played.");
    const attended = new Set(attendance.filter((a) => a.attended).map((a) => a.userId));
    if (!attended.has(user.id)) uiError("Only people who played can rate.");
    const cats = sportOf(session.sport).ratings;
    const db = await getDb();
    const now = new Date();
    await db.delete(schema.ratings).where(and(eq(schema.ratings.sessionId, session.id), eq(schema.ratings.raterId, user.id)));
    const values = [];
    for (const c of cats) {
      const ratee = str(fd, `cat_${c.key}`);
      if (!ratee) continue;
      if (!attended.has(ratee)) uiError("You can only vote for people who played.");
      if (ratee === user.id && c.points > 0) uiError("Nice try. You can't vote for yourself.");
      values.push({ id: newId(), sessionId: session.id, raterId: user.id, category: c.key, rateeId: ratee, createdAt: now });
    }
    if (values.length) await db.insert(schema.ratings).values(values);
    await addFeed(crew.id, session.id, "rated", { userId: user.id });
    revalidatePath(`/crew/${crew.slug}`, "layout");
    target = `/crew/${crew.slug}/s/${session.id}?rated=1`;
  });
  if (r.error) return r;
  redirect(target);
}

const paymentSchema = z.object({
  amountPence: z.number().int().min(1, "Enter an amount."),
  method: z.enum(["cash", "transfer", "card", "waived"]),
});

/** Organiser records that someone has paid (or waives what they owe). */
export async function recordPayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const crewId = str(fd, "crewId");
    const { crew, user } = await requireCrewAction(crewId, { organiser: true });
    const userId = str(fd, "userId");
    const sessionId = str(fd, "sessionId") || null;
    const amountPence = parsePounds(str(fd, "amount"));
    if (amountPence === null) uiError("Amount should be pounds and pence.");
    const input = paymentSchema.parse({ amountPence, method: str(fd, "method") || "transfer" });
    const db = await getDb();
    const member = await db
      .select({ id: schema.crewMembers.id })
      .from(schema.crewMembers)
      .where(and(eq(schema.crewMembers.crewId, crew.id), eq(schema.crewMembers.userId, userId)))
      .limit(1);
    if (member.length === 0) uiError("That person isn't in the crew.");
    await db.insert(schema.ledger).values({
      id: newId(),
      crewId: crew.id,
      sessionId,
      userId,
      kind: "payment",
      amountPence: input.amountPence,
      reason: input.method,
      note: str(fd, "note").slice(0, 120),
      createdBy: user.id,
      createdAt: new Date(),
    });
    revalidatePath(`/crew/${crew.slug}`, "layout");
    return { ok: true, message: input.method === "waived" ? "Waived." : "Marked as paid." };
  });
}

export async function deleteLedgerEntry(fd: FormData): Promise<void> {
  const crewId = str(fd, "crewId");
  const id = str(fd, "entryId");
  const { crew } = await requireCrewAction(crewId, { organiser: true });
  const db = await getDb();
  await db.delete(schema.ledger).where(and(eq(schema.ledger.id, id), eq(schema.ledger.crewId, crew.id), eq(schema.ledger.kind, "payment")));
  revalidatePath(`/crew/${crew.slug}`, "layout");
}

/** Reopen a played session so attendance can be corrected. Charges get rebuilt on the next confirm. */
export async function reopenSession(fd: FormData): Promise<void> {
  const sessionId = str(fd, "sessionId");
  const session = await getSession(sessionId);
  if (!session) return;
  const { crew } = await requireCrewAction(session.crewId, { organiser: true });
  const db = await getDb();
  await db.update(schema.sessions).set({ status: "open", playedAt: null }).where(eq(schema.sessions.id, session.id));
  revalidatePath(`/crew/${crew.slug}`, "layout");
  redirect(`/crew/${crew.slug}/s/${session.id}`);
}

export async function deleteRatingsForSessions(sessionIds: string[]): Promise<void> {
  if (!sessionIds.length) return;
  const db = await getDb();
  await db.delete(schema.ratings).where(inArray(schema.ratings.sessionId, sessionIds));
}

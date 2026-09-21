"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db/client";
import { requireCrewAction } from "@/lib/access";
import { newId } from "@/lib/ids";
import { fromLocalInput, parsePounds } from "@/lib/format";
import { isSportKey } from "@/domain/sports";
import { ratingsFor } from "@/domain/ratings";
import { applyCapacityChange, applyRsvp, playing, type RsvpRow } from "@/domain/rsvp";
import { settleSession } from "@/domain/money";
import { getSession, getSessionBundle, listMembers } from "@/lib/queries";
import { act, addFeed, quiet, str, uiError, type ActionState } from "./shared";
import { resolveCourseRef } from "@/lib/golf-courses";
import { defaultHoles, resizeStrokes, type StablefordCard } from "@/domain/stableford";
import type { Db } from "@/db/client";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

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
    if (str(fd, "organiserIn") === "yes") {
      await db.insert(schema.rsvps).values({ id: newId(), sessionId: id, userId: user.id, status: "in", queuedAt: now, respondedAt: now });
    }
    await addFeed(crew.id, id, "session_pinned", { by: user.id, title: input.title, startsAt: input.startsAt.getTime() });
    await applyCourseRef(id, input.sport, str(fd, "courseRef"), user.id);
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
    if (session.status === "cancelled") uiError("This session was cancelled.");
    if (session.status !== "open") uiError("This one has already been played.");
    const input = parseSessionForm(fd);
    const db = await getDb();
    const promoted = await db.transaction(async (tx) => {
      await tx.update(schema.sessions).set(input).where(eq(schema.sessions.id, session.id));
      if (input.capacity === session.capacity) return [] as string[];
      const rows = await tx.select().from(schema.rsvps).where(eq(schema.rsvps.sessionId, session.id));
      const res = applyCapacityChange(rows.map(toRow), input.capacity, Date.now());
      await persistRsvps(tx, session.id, rows, res.rows);
      return res.changes.map((c) => c.userId);
    }, { behavior: "immediate" });
    for (const userId of promoted) await addFeed(crew.id, session.id, "promoted", { userId });
    await applyCourseRef(session.id, input.sport, str(fd, "courseRef"), (await requireCrewAction(session.crewId)).user.id);
    revalidatePath(`/crew/${crew.slug}`, "layout");
    target = `/crew/${crew.slug}/s/${session.id}`;
  });
  if (r.error) return r;
  redirect(target);
}

export async function cancelSession(fd: FormData): Promise<void> {
  let target = "";
  await quiet(async () => {
    const sessionId = str(fd, "sessionId");
    const session = await getSession(sessionId);
    if (!session) return;
    const { crew, user } = await requireCrewAction(session.crewId, { organiser: true });
    // Only an open session can be cancelled. A played one has charges attached; reopen and fix attendance instead.
    if (session.status !== "open") uiError("Only an open session can be cancelled.");
    const db = await getDb();
    await db.update(schema.sessions).set({ status: "cancelled" }).where(eq(schema.sessions.id, session.id));
    await addFeed(crew.id, session.id, "session_cancelled", { by: user.id, title: session.title });
    revalidatePath(`/crew/${crew.slug}`, "layout");
    target = `/crew/${crew.slug}`;
  });
  if (target) redirect(target);
}

/**
 * The venue finder on a golf session can hand back a course reference ("library:<id>" or "api:<ref>").
 * When it does, the Stableford card is set up with that course's pars, stroke indexes and yards, so the
 * organiser never has to open the picker. Existing scores are kept and re-sized if the hole count changes.
 */
async function applyCourseRef(sessionId: string, sport: string, ref: string, userId: string): Promise<void> {
  if (sport !== "golf" || !ref) return;
  const m = /^(library|api):(.+)$/.exec(ref);
  if (!m) return;
  try {
    const picked = await resolveCourseRef(m[1] as "library" | "api", m[2], userId);
    if (!picked) return;
    const db = await getDb();
    const existing = (await db.select().from(schema.games).where(and(eq(schema.games.sessionId, sessionId), eq(schema.games.kind, "stableford"))).limit(1))[0];
    const card: StablefordCard = existing ? (JSON.parse(existing.data) as StablefordCard) : { holes: defaultHoles(), handicaps: {}, strokes: {} };
    card.holes = picked.holes;
    card.course = picked.course;
    card.strokes = resizeStrokes(card.strokes, card.holes.length);
    const now = new Date();
    if (existing) await db.update(schema.games).set({ data: JSON.stringify(card), updatedAt: now }).where(eq(schema.games.id, existing.id));
    else await db.insert(schema.games).values({ id: newId(), sessionId, kind: "stableford", data: JSON.stringify(card), createdAt: now, updatedAt: now });
  } catch (e) {
    // A course that fails to resolve must not lose the session; the organiser can pick it in the round.
    console.error("course ref failed", e);
  }
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

async function persistRsvps(db: Tx, sessionId: string, before: schema.Rsvp[], after: RsvpRow[]) {
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
    if (targetUser !== ctx.user.id) {
      const members = await listMembers(ctx.crew.id);
      if (!members.some((m) => m.id === targetUser)) uiError("That person isn't in the crew.");
    }
    const db = await getDb();
    const rules = {
      capacity: session.capacity,
      startsAt: session.startsAt.getTime(),
      rsvpDeadlineAt: session.rsvpDeadlineAt?.getTime() ?? null,
      status: session.status,
      lateDropHours: ctx.crew.lateDropHours,
    };
    // One writer at a time: two taps for the last spot can't both win it.
    const res = await db.transaction(async (tx) => {
      const rows = await tx.select().from(schema.rsvps).where(eq(schema.rsvps.sessionId, session.id));
      const r = applyRsvp(rules, rows.map(toRow), targetUser, intent, Date.now());
      await persistRsvps(tx, session.id, rows, r.rows);
      return r;
    }, { behavior: "immediate" });
    for (const c of res.changes) {
      const kind = c.type === "joined" ? "joined_session" : c.type;
      await addFeed(ctx.crew.id, session.id, kind, { userId: c.userId, late: "late" in c ? c.late : undefined, title: session.title });
    }
    revalidatePath(`/crew/${ctx.crew.slug}`, "layout");
    const mine = res.changes.find((c) => c.userId === targetUser);
    const self = targetUser === ctx.user.id;
    if (mine?.type === "reserved") return { ok: true, message: self ? "It's full, so you're on the reserve list. You'll get promoted if someone drops." : "Full, so they're on the reserve list." };
    if (mine?.type === "dropped" && mine.late) return { ok: true, message: self ? "Noted. That's inside the late-drop window, so your share still stands." : "Marked out. That's a late drop, so their share still stands." };
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
    const memberIds = new Set((await listMembers(crew.id)).map((m) => m.id));
    // Only crew members can be marked as having played.
    const attendedIds = new Set(fd.getAll("attended").map(String).filter((id) => memberIds.has(id)));
    const inRows = playing(rsvps.map(toRow)).filter((r) => memberIds.has(r.userId));
    // Walk-ons: ticked but never held a spot. They get an attendance row only, so un-ticking them on a
    // later "fix attendance" simply removes them rather than turning them into a no-show.
    const walkOns = [...attendedIds].filter((id) => !inRows.some((r) => r.userId === id));
    const expected = [...inRows.map((r) => r.userId), ...walkOns];
    const charges = settleSession({
      costMode: session.costMode,
      costPence: session.costPence,
      playing: expected,
      attended: new Map(expected.map((id) => [id, attendedIds.has(id)])),
      lateDrops: rsvps.filter((r) => r.lateDrop && memberIds.has(r.userId)).map((r) => r.userId),
    });

    await db.transaction(async (tx) => {
      await tx.delete(schema.attendance).where(eq(schema.attendance.sessionId, session.id));
      if (expected.length) {
        await tx.insert(schema.attendance).values(
          expected.map((userId) => ({ id: newId(), sessionId: session.id, userId, attended: attendedIds.has(userId), confirmedBy: user.id, confirmedAt: now })),
        );
      }
      // Rebuild this session's charges. Payments are never touched.
      await tx.delete(schema.ledger).where(and(eq(schema.ledger.sessionId, session.id), eq(schema.ledger.kind, "charge")));
      if (charges.length) {
        await tx.insert(schema.ledger).values(
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
      await tx.update(schema.sessions).set({ status: "played", playedAt: now }).where(eq(schema.sessions.id, session.id));
    }, { behavior: "immediate" });
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
    const cats = ratingsFor(crew.sport, crew.ratings);
    const db = await getDb();
    const now = new Date();
    const values: (typeof schema.ratings.$inferInsert)[] = [];
    for (const c of cats) {
      const ratee = str(fd, `cat_${c.key}`);
      if (!ratee) continue;
      if (!attended.has(ratee)) uiError("You can only vote for people who played.");
      if (ratee === user.id && c.points > 0) uiError("Nice try. You can't vote for yourself.");
      values.push({ id: newId(), sessionId: session.id, raterId: user.id, category: c.key, rateeId: ratee, createdAt: now });
    }
    await db.transaction(async (tx) => {
      await tx.delete(schema.ratings).where(and(eq(schema.ratings.sessionId, session.id), eq(schema.ratings.raterId, user.id)));
      if (values.length) await tx.insert(schema.ratings).values(values);
    }, { behavior: "immediate" });
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
    if (sessionId) {
      const s = await getSession(sessionId);
      if (!s || s.crewId !== crew.id) uiError("That session isn't in this crew.");
    }
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
  await quiet(async () => {
    const crewId = str(fd, "crewId");
    const id = str(fd, "entryId");
    const { crew } = await requireCrewAction(crewId, { organiser: true });
    const db = await getDb();
    await db.delete(schema.ledger).where(and(eq(schema.ledger.id, id), eq(schema.ledger.crewId, crew.id), eq(schema.ledger.kind, "payment")));
    revalidatePath(`/crew/${crew.slug}`, "layout");
  });
}

/** Reopen a played session so attendance can be corrected. Charges get rebuilt on the next confirm. */
export async function reopenSession(fd: FormData): Promise<void> {
  let target = "";
  await quiet(async () => {
    const sessionId = str(fd, "sessionId");
    const session = await getSession(sessionId);
    if (!session) return;
    const { crew } = await requireCrewAction(session.crewId, { organiser: true });
    if (session.status !== "played") return;
    const db = await getDb();
    await db.update(schema.sessions).set({ status: "open", playedAt: null }).where(eq(schema.sessions.id, session.id));
    revalidatePath(`/crew/${crew.slug}`, "layout");
    target = `/crew/${crew.slug}/s/${session.id}`;
  });
  if (target) redirect(target);
}

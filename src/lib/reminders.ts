import "server-only";
import { and, eq, gt, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { appUrl } from "./env";
import { sendEmail } from "./email";
import { track } from "./events";
import { fmtLong, pounds } from "./format";
import { previewShare } from "@/domain/money";
import { summarise } from "@/domain/rsvp";
import { sportOf } from "@/domain/sports";

import { commitBy } from "@/domain/deadline";
import { canSeeSession } from "@/domain/visibility";

const H = 3_600_000;

export type ReminderRun = { sessionsChecked: number; emailsSent: number; skippedNoEmail: number; alreadySent: number };

/**
 * For every open session whose commit-by moment is within the next 24 hours, email each member who
 * hasn't answered and has an email, and the organiser with a headcount. Idempotent per session.
 */
export async function runReminders(now = new Date()): Promise<ReminderRun> {
  const db = await getDb();
  const result: ReminderRun = { sessionsChecked: 0, emailsSent: 0, skippedNoEmail: 0, alreadySent: 0 };
  const open = await db.select().from(schema.sessions).where(and(eq(schema.sessions.status, "open"), gt(schema.sessions.startsAt, now)));
  if (open.length === 0) return result;
  const crewIds = [...new Set(open.map((s) => s.crewId))];
  const crews = await db.select().from(schema.crews).where(inArray(schema.crews.id, crewIds));
  const sent = await db.select().from(schema.events).where(and(eq(schema.events.kind, "reminder_sent"), inArray(schema.events.sessionId, open.map((s) => s.id))));
  const base = await appUrl();

  for (const session of open) {
    const crew = crews.find((c) => c.id === session.crewId);
    if (!crew) continue;
    const due = commitBy(session, crew.lateDropHours);
    if (due.getTime() - now.getTime() > 24 * H || due.getTime() < now.getTime() - 6 * H) continue;
    result.sessionsChecked++;
    if (sent.some((e) => e.sessionId === session.id)) {
      result.alreadySent++;
      continue;
    }
    const members = await db
      .select({ user: schema.users, role: schema.crewMembers.role })
      .from(schema.crewMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.crewMembers.userId))
      .where(eq(schema.crewMembers.crewId, crew.id));
    const rsvps = await db.select().from(schema.rsvps).where(eq(schema.rsvps.sessionId, session.id));
    const s = summarise(
      rsvps.map((r) => ({ userId: r.userId, status: r.status, queuedAt: r.queuedAt.getTime(), respondedAt: 0, droppedAt: null, lateDrop: r.lateDrop })),
      session.capacity,
    );
    const url = `${base}/crew/${crew.slug}/s/${session.id}`;
    const sport = sportOf(session.sport);
    // Invite-only sessions only chase the people on them.
    const unanswered = members.filter((m) => canSeeSession(session, { id: m.user.id, isOrganiser: m.role === "organiser" }) && !rsvps.some((r) => r.userId === m.user.id));
    for (const m of unanswered) {
      if (!m.user.email) {
        result.skippedNoEmail++;
        continue;
      }
      const ok = await sendEmail({
        to: m.user.email,
        subject: `${crew.name}: ${session.title}, are you in?`,
        text: [
          `${session.title} is ${fmtLong(session.startsAt)}${session.venueName ? ` at ${session.venueName}` : ""}.`,
          `${s.in} of ${session.capacity} in so far${session.costPence ? `, ${pounds(previewShare(session.costMode, session.costPence, Math.max(1, s.in)))} each` : ""}.`,
          `Answer by ${fmtLong(due)}; after that a drop-out still owes the share.`,
          "",
          `Tap in or out: ${url}`,
        ].join("\n"),
      });
      if (ok) result.emailsSent++;
    }
    const organisers = members.filter((m) => m.role === "organiser" && m.user.email);
    for (const o of organisers) {
      const names = unanswered.map((m) => m.user.name.split(" ")[0]).join(", ");
      const ok = await sendEmail({
        to: o.user.email!,
        subject: `${session.title}: ${s.in}/${session.capacity} in, ${unanswered.length} not answered`,
        text: [
          `${sport.label} · ${fmtLong(session.startsAt)}.`,
          `${s.in} in, ${s.reserve} reserve, ${unanswered.length} not answered${names ? `: ${names}` : ""}.`,
          `Commit-by is ${fmtLong(due)}.`,
          "",
          `Nudge the stragglers from the session page: ${url}`,
        ].join("\n"),
      });
      if (ok) result.emailsSent++;
    }
    await track("reminder_sent", { crewId: crew.id, sessionId: session.id, payload: { emails: result.emailsSent, unanswered: unanswered.length } });
  }
  return result;
}

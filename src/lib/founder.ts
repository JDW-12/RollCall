import "server-only";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { isSandbox } from "./env";

/** Who may open /founder: FOUNDER_EMAILS (comma list). In sandbox, the demo organiser. Locally with nothing set, anyone signed in. */
export function isFounder(email: string | null): boolean {
  const list = (process.env.FOUNDER_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (list.length) return !!email && list.includes(email.toLowerCase());
  if (isSandbox()) return email === "josh@example.com";
  return !process.env.VERCEL;
}

const WEEK = 7 * 86_400_000;

export type FounderMetrics = {
  crews: number;
  activated: number;
  members: number;
  bySport: { sport: string; crews: number }[];
  weekly: { weekStart: number; pinned: number; played: number }[];
  retention: { weeks: number; cohort: number; retained: number }[];
  turnUpRate: number | null;
  lateDropRate: number | null;
  settledIn7: number | null;
  ratingCompletion: number | null;
  shareClicks: number;
  previewViews: number;
  referralLandings: number;
  referredCrews: number;
  referrers: { crewId: string; name: string; referred: number }[];
  crewRows: { id: string; slug: string; name: string; sport: string; createdAt: Date; sessions: number; played: number; lastPinned: Date | null; turnUp: number | null; members: number }[];
};

export async function founderMetrics(now = new Date()): Promise<FounderMetrics> {
  const db = await getDb();
  const [crews, members, sessions, rsvps, attendance, ratings, ledger, events] = await Promise.all([
    db.select().from(schema.crews),
    db.select().from(schema.crewMembers),
    db.select().from(schema.sessions),
    db.select().from(schema.rsvps),
    db.select().from(schema.attendance),
    db.select().from(schema.ratings),
    db.select().from(schema.ledger),
    db.select().from(schema.events).orderBy(desc(schema.events.createdAt)),
  ]);

  const rsvpsBySession = new Map<string, typeof rsvps>();
  for (const r of rsvps) rsvpsBySession.set(r.sessionId, [...(rsvpsBySession.get(r.sessionId) ?? []), r]);
  const attBySession = new Map<string, typeof attendance>();
  for (const a of attendance) attBySession.set(a.sessionId, [...(attBySession.get(a.sessionId) ?? []), a]);
  const sessionsByCrew = new Map<string, typeof sessions>();
  for (const s of sessions) sessionsByCrew.set(s.crewId, [...(sessionsByCrew.get(s.crewId) ?? []), s]);

  // Activation: a crew with at least one session where four or more tapped in.
  const activatedIds = new Set<string>();
  for (const s of sessions) {
    const ins = (rsvpsBySession.get(s.id) ?? []).filter((r) => r.status === "in").length;
    if (ins >= 4) activatedIds.add(s.crewId);
  }

  // Weekly pinned and played, last 12 weeks, weeks starting Monday.
  const monday = (t: number) => {
    const d = new Date(t);
    const day = (d.getUTCDay() + 6) % 7;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
  };
  const thisWeek = monday(now.getTime());
  const weekly = Array.from({ length: 12 }, (_, i) => ({ weekStart: thisWeek - (11 - i) * WEEK, pinned: 0, played: 0 }));
  for (const s of sessions) {
    const p = weekly.find((w) => monday(s.createdAt.getTime()) === w.weekStart);
    if (p) p.pinned++;
    if (s.status === "played" && s.playedAt) {
      const q = weekly.find((w) => monday(s.playedAt!.getTime()) === w.weekStart);
      if (q) q.played++;
    }
  }

  // Retention: crews at least N weeks old that pinned a session in the last 14 days.
  const retention = [4, 8, 12].map((weeks) => {
    const cohort = crews.filter((c) => now.getTime() - c.createdAt.getTime() >= weeks * WEEK);
    const retained = cohort.filter((c) => (sessionsByCrew.get(c.id) ?? []).some((s) => now.getTime() - s.createdAt.getTime() <= 2 * WEEK));
    return { weeks, cohort: cohort.length, retained: retained.length };
  });

  // Reliability across all played sessions.
  let expected = 0;
  let turnedUp = 0;
  let held = 0;
  let late = 0;
  for (const s of sessions) {
    const rs = rsvpsBySession.get(s.id) ?? [];
    late += rs.filter((r) => r.lateDrop).length;
    held += rs.filter((r) => r.status === "in" || r.lateDrop).length;
    if (s.status !== "played") continue;
    const att = attBySession.get(s.id) ?? [];
    expected += att.length;
    turnedUp += att.filter((a) => a.attended).length;
  }

  // Money: share of charged (session, user) pairs covered by payments within 7 days of the session.
  const charges = ledger.filter((l) => l.kind === "charge" && l.sessionId);
  let settled = 0;
  for (const c of charges) {
    const paid = ledger
      .filter((p) => p.kind === "payment" && p.userId === c.userId && p.crewId === c.crewId && p.createdAt.getTime() <= c.createdAt.getTime() + WEEK)
      .reduce((t, p) => t + p.amountPence, 0);
    if (paid >= c.amountPence) settled++;
  }

  // Ratings: raters over attendees, played sessions only.
  let raters = 0;
  let attendees = 0;
  for (const s of sessions.filter((x) => x.status === "played")) {
    const att = (attBySession.get(s.id) ?? []).filter((a) => a.attended).length;
    const rated = new Set(ratings.filter((r) => r.sessionId === s.id).map((r) => r.raterId)).size;
    attendees += att;
    raters += Math.min(rated, att);
  }

  const bySportMap = new Map<string, number>();
  for (const c of crews) bySportMap.set(c.sport, (bySportMap.get(c.sport) ?? 0) + 1);
  const referrerCounts = new Map<string, number>();
  for (const c of crews) if (c.referredByCrewId) referrerCounts.set(c.referredByCrewId, (referrerCounts.get(c.referredByCrewId) ?? 0) + 1);

  const crewRows = crews
    .map((c) => {
      const ss = sessionsByCrew.get(c.id) ?? [];
      const playedS = ss.filter((s) => s.status === "played");
      let e = 0;
      let t = 0;
      for (const s of playedS) {
        const att = attBySession.get(s.id) ?? [];
        e += att.length;
        t += att.filter((a) => a.attended).length;
      }
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        sport: c.sport,
        createdAt: c.createdAt,
        sessions: ss.length,
        played: playedS.length,
        lastPinned: ss.length ? new Date(Math.max(...ss.map((s) => s.createdAt.getTime()))) : null,
        turnUp: e ? t / e : null,
        members: members.filter((m) => m.crewId === c.id).length,
      };
    })
    .sort((a, b) => (b.lastPinned?.getTime() ?? 0) - (a.lastPinned?.getTime() ?? 0));

  return {
    crews: crews.length,
    activated: activatedIds.size,
    members: new Set(members.map((m) => m.userId)).size,
    bySport: [...bySportMap.entries()].map(([sport, n]) => ({ sport, crews: n })).sort((a, b) => b.crews - a.crews),
    weekly,
    retention,
    turnUpRate: expected ? turnedUp / expected : null,
    lateDropRate: held ? late / held : null,
    settledIn7: charges.length ? settled / charges.length : null,
    ratingCompletion: attendees ? raters / attendees : null,
    shareClicks: events.filter((e) => e.kind === "share_click").length,
    previewViews: events.filter((e) => e.kind === "preview_view").length,
    referralLandings: events.filter((e) => e.kind === "referral_landed").length,
    referredCrews: crews.filter((c) => c.referredByCrewId).length,
    referrers: [...referrerCounts.entries()]
      .map(([crewId, n]) => ({ crewId, name: crews.find((c) => c.id === crewId)?.name ?? "?", referred: n }))
      .sort((a, b) => b.referred - a.referred)
      .slice(0, 5),
    crewRows,
  };
}

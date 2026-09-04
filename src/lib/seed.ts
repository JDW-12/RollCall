/**
 * Demo data so the product can be seen at rest: "Tuesday FC" with 14 weeks of history,
 * plus a padel crew with one upcoming match. Run with `npm run db:seed`.
 *
 * Used by `npm run db:seed` locally and by sandbox mode on Vercel.
 */
import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { schema } from "../db/client";
import { newId, newToken, hueFrom, slugify } from "./ids";
import { settleSession } from "../domain/money";

const H = 3_600_000;
const D = 24 * H;

/** The Tuesday `weeksBack` weeks before the most recent Tuesday, at 20:00 Europe/London. */
function lastTuesdayAt20(now: Date, weeksBack: number): Date {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "shortOffset" });
  let d = new Date(now.getTime());
  for (let i = 0; i < 7; i++) {
    if (fmt.formatToParts(d).find((p) => p.type === "weekday")?.value === "Tue") break;
    d = new Date(d.getTime() - D);
  }
  d = new Date(d.getTime() - weeksBack * 7 * D);
  const parts = fmt.formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const m = /GMT([+-]\d+)?/.exec(g("timeZoneName"));
  const offH = m && m[1] ? Number(m[1]) : 0;
  return new Date(Date.UTC(Number(g("year")), Number(g("month")) - 1, Number(g("day")), 20 - offH, 0, 0, 0));
}

/** Seeds the demo crews. Returns false if already present. */
export async function seedDemo(db: Db, log: (line: string) => void = () => {}): Promise<boolean> {
  const existing = await db.select({ id: schema.crews.id }).from(schema.crews).where(eq(schema.crews.slug, "tuesday-fc")).limit(1);
  if (existing.length) return false;
  const now = new Date();
  const mk = (name: string, email?: string): schema.User => ({ id: newId(), name, email: email ?? null, hue: hueFrom(name), createdAt: new Date(now.getTime() - 120 * D) });
  const people = [
    mk("Sam Okafor", "sam@example.com"),
    mk("Priya Shah"),
    mk("Deano Marsh"),
    mk("Ollie Grant"),
    mk("Tom Whitlock"),
    mk("Jonesy"),
    mk("Marcus Bell"),
    mk("Kieran Doyle"),
    mk("Ash Patel"),
    mk("Leon Barker"),
    mk("Josh Reid"),
    mk("Femi Adeyemi"),
  ];
  await db.insert(schema.users).values(people);
  const [sam, priya, deano, ollie, tom, jonesy, marcus, kieran, ash, leon, josh, femi] = people;

  // ---- Tuesday FC (football) ----
  const crewId = newId();
  // Anchor the season to real Tuesdays at 20:00 London time: 14 played weeks, then week 15 is the coming Tuesday.
  const seasonStart = lastTuesdayAt20(now, 13);
  await db.insert(schema.crews).values({
    id: crewId,
    slug: "tuesday-fc",
    name: "Tuesday FC",
    sport: "football",
    city: "London",
    hue: hueFrom("Tuesday FC"),
    lateDropHours: 24,
    inviteToken: "tuesdayfc-demo-invite",
    seasonName: "Autumn 2026",
    seasonStartsAt: seasonStart,
    createdBy: sam.id,
    createdAt: seasonStart,
  });
  await db.insert(schema.crewMembers).values(
    people.map((p, i) => ({ id: newId(), crewId, userId: p.id, role: i === 0 ? ("organiser" as const) : ("member" as const), joinedAt: new Date(seasonStart.getTime() + i * D) })),
  );
  await db.insert(schema.feed).values({ id: newId(), crewId, sessionId: null, kind: "crew_created", payload: JSON.stringify({ by: sam.id, name: "Tuesday FC" }), createdAt: seasonStart });

  // Attendance pattern per player over 14 played weeks. "in" = played, "late" = late drop, "no" = no-show, "out" = said no early, "res" = reserve, "" = didn't answer.
  const pattern: Record<string, string[]> = {
    [sam.id]: Array(14).fill("in"),
    [priya.id]: ["in", "in", "in", "in", "out", "in", "in", "in", "in", "in", "in", "in", "in", "in"],
    [deano.id]: ["in", "in", "late", "in", "in", "in", "out", "in", "in", "no", "in", "in", "in", "in"],
    [ollie.id]: ["in", "out", "in", "in", "in", "in", "in", "out", "in", "in", "in", "late", "in", "in"],
    [tom.id]: ["in", "in", "in", "in", "in", "in", "in", "in", "in", "in", "out", "in", "in", "in"],
    [jonesy.id]: ["in", "late", "no", "out", "", "late", "in", "late", "out", "in", "no", "late", "in", "in"],
    [marcus.id]: ["in", "in", "in", "out", "in", "in", "in", "in", "in", "in", "in", "in", "out", "in"],
    [kieran.id]: ["out", "in", "in", "in", "in", "out", "in", "in", "in", "in", "in", "in", "in", "out"],
    [ash.id]: ["in", "in", "in", "in", "in", "in", "in", "in", "in", "in", "in", "in", "in", "in"],
    [leon.id]: ["in", "in", "out", "in", "in", "in", "in", "in", "in", "out", "in", "in", "in", "in"],
    [josh.id]: ["res", "in", "in", "in", "out", "in", "res", "in", "in", "in", "in", "in", "in", "in"],
    [femi.id]: ["", "res", "in", "in", "in", "in", "in", "in", "res", "in", "in", "in", "in", "in"],
  };
  // Rotating MOTM winners for flavour.
  const motmOrder = [sam, ash, priya, tom, sam, marcus, ash, priya, sam, leon, tom, ash, sam, priya];
  const grafterOrder = [tom, tom, marcus, ash, kieran, tom, priya, tom, marcus, ash, tom, kieran, tom, tom];
  const howlerOrder = [deano, jonesy, deano, ollie, deano, jonesy, marcus, deano, ollie, deano, jonesy, deano, kieran, deano];

  for (let wk = 0; wk < 14; wk++) {
    const startsAt = new Date(seasonStart.getTime() + wk * 7 * D);
    const sessionId = newId();
    await db.insert(schema.sessions).values({
      id: sessionId,
      crewId,
      sport: "football",
      title: `Tuesday 5s · Wk ${wk + 1}`,
      venueName: "Powerleague Shoreditch",
      venueAddress: "Pitch 3, E2 7QX",
      startsAt,
      durationMin: 60,
      capacity: 10,
      costMode: "total",
      costPence: 6500,
      rsvpDeadlineAt: null,
      status: "played",
      notes: wk === 13 ? "Bibs are in Sam's car." : "",
      createdBy: sam.id,
      createdAt: new Date(startsAt.getTime() - 6 * D),
      playedAt: new Date(startsAt.getTime() + 2 * H),
    });
    const playedIds: string[] = [];
    const lateDrops: string[] = [];
    const noShows: string[] = [];
    let q = 0;
    for (const p of people) {
      const code = pattern[p.id][wk];
      if (!code) continue;
      q++;
      const queuedAt = new Date(startsAt.getTime() - 5 * D + q * H);
      if (code === "in") {
        await db.insert(schema.rsvps).values({ id: newId(), sessionId, userId: p.id, status: "in", queuedAt, respondedAt: queuedAt });
        playedIds.push(p.id);
      } else if (code === "no") {
        await db.insert(schema.rsvps).values({ id: newId(), sessionId, userId: p.id, status: "in", queuedAt, respondedAt: queuedAt });
        noShows.push(p.id);
      } else if (code === "late") {
        const droppedAt = new Date(startsAt.getTime() - 3 * H);
        await db.insert(schema.rsvps).values({ id: newId(), sessionId, userId: p.id, status: "out", queuedAt, respondedAt: droppedAt, droppedAt, lateDrop: true });
        lateDrops.push(p.id);
      } else if (code === "out") {
        await db.insert(schema.rsvps).values({ id: newId(), sessionId, userId: p.id, status: "out", queuedAt, respondedAt: queuedAt });
      } else if (code === "res") {
        await db.insert(schema.rsvps).values({ id: newId(), sessionId, userId: p.id, status: "reserve", queuedAt, respondedAt: queuedAt });
      }
    }
    const expected = [...playedIds, ...noShows];
    await db.insert(schema.attendance).values(
      expected.map((uid) => ({ id: newId(), sessionId, userId: uid, attended: playedIds.includes(uid), confirmedBy: sam.id, confirmedAt: new Date(startsAt.getTime() + 2 * H) })),
    );
    // Ratings: most players vote; winner gets the bulk.
    const votes = [];
    const pick = (pref: schema.User, fallback: string[]) => (playedIds.includes(pref.id) ? pref.id : fallback[0]);
    const motm = pick(motmOrder[wk], playedIds);
    const grafter = pick(grafterOrder[wk], playedIds.filter((x) => x !== motm));
    const howler = pick(howlerOrder[wk], playedIds.filter((x) => x !== motm));
    for (let i = 0; i < playedIds.length; i++) {
      const rater = playedIds[i];
      if (i % 5 === 4) continue; // one in five forgets to vote
      const m = rater === motm ? playedIds.find((x) => x !== motm)! : i % 3 === 0 && playedIds[(i + 1) % playedIds.length] !== rater ? playedIds[(i + 1) % playedIds.length] : motm;
      const g = rater === grafter ? playedIds.find((x) => x !== grafter && x !== rater)! : grafter;
      const h = i % 4 === 3 ? playedIds[(i + 2) % playedIds.length] : howler;
      votes.push(
        { id: newId(), sessionId, raterId: rater, category: "motm", rateeId: m, createdAt: new Date(startsAt.getTime() + 3 * H) },
        { id: newId(), sessionId, raterId: rater, category: "grafter", rateeId: g, createdAt: new Date(startsAt.getTime() + 3 * H) },
        { id: newId(), sessionId, raterId: rater, category: "howler", rateeId: h, createdAt: new Date(startsAt.getTime() + 3 * H) },
      );
    }
    await db.insert(schema.ratings).values(votes);
    // Money
    const charges = settleSession({ costMode: "total", costPence: 6500, playing: expected, attended: new Map(expected.map((id) => [id, playedIds.includes(id)])), lateDrops });
    await db.insert(schema.ledger).values(
      charges.map((c) => ({ id: newId(), crewId, sessionId, userId: c.userId, kind: "charge" as const, amountPence: c.amountPence, reason: c.reason, note: `Tuesday 5s · Wk ${wk + 1}`, createdBy: sam.id, createdAt: new Date(startsAt.getTime() + 2 * H) })),
    );
    // Most people pay within the week, Jonesy and Deano lag.
    const payments = charges
      .filter((c) => !(wk >= 12 && (c.userId === jonesy.id || c.userId === deano.id)) && !(c.userId === jonesy.id && wk % 3 === 0))
      .map((c) => ({ id: newId(), crewId, sessionId, userId: c.userId, kind: "payment" as const, amountPence: c.amountPence, reason: "transfer", note: "", createdBy: sam.id, createdAt: new Date(startsAt.getTime() + 3 * D) }));
    if (payments.length) await db.insert(schema.ledger).values(payments);
    await db.insert(schema.feed).values({
      id: newId(),
      crewId,
      sessionId,
      kind: "session_played",
      payload: JSON.stringify({ by: sam.id, title: `Tuesday 5s · Wk ${wk + 1}`, turnedUp: playedIds.length, noShows: noShows.length }),
      createdAt: new Date(startsAt.getTime() + 2 * H),
    });
  }

  // Next week's session, open, with most people already in.
  const nextStart = new Date(seasonStart.getTime() + 14 * 7 * D);
  const nextId = newId();
  await db.insert(schema.sessions).values({
    id: nextId,
    crewId,
    sport: "football",
    title: "Tuesday 5s · Wk 15",
    venueName: "Powerleague Shoreditch",
    venueAddress: "Pitch 3, E2 7QX",
    startsAt: nextStart,
    durationMin: 60,
    capacity: 10,
    costMode: "total",
    costPence: 6500,
    rsvpDeadlineAt: new Date(nextStart.getTime() - 30 * H),
    status: "open",
    notes: "New bibs. Someone bring a ball that isn't flat.",
    createdBy: sam.id,
    createdAt: new Date(now.getTime() - D),
    playedAt: null,
  });
  const nextIn = [sam, priya, tom, ash, marcus, leon, josh, femi, kieran];
  for (let i = 0; i < nextIn.length; i++) {
    const t = new Date(now.getTime() - D + i * 20 * 60_000);
    await db.insert(schema.rsvps).values({ id: newId(), sessionId: nextId, userId: nextIn[i].id, status: "in", queuedAt: t, respondedAt: t });
  }
  const t1 = new Date(now.getTime() - 5 * H);
  await db.insert(schema.rsvps).values({ id: newId(), sessionId: nextId, userId: ollie.id, status: "out", queuedAt: t1, respondedAt: t1 });
  await db.insert(schema.feed).values([
    { id: newId(), crewId, sessionId: nextId, kind: "session_pinned", payload: JSON.stringify({ by: sam.id, title: "Tuesday 5s · Wk 15", startsAt: nextStart.getTime() }), createdAt: new Date(now.getTime() - D) },
    { id: newId(), crewId, sessionId: nextId, kind: "joined", payload: JSON.stringify({ userId: priya.id }), createdAt: new Date(now.getTime() - 20 * H) },
    { id: newId(), crewId, sessionId: nextId, kind: "dropped", payload: JSON.stringify({ userId: ollie.id, late: false }), createdAt: t1 },
  ]);

  // ---- Battersea Padel (padel), upcoming only ----
  const padelId = newId();
  await db.insert(schema.crews).values({
    id: padelId,
    slug: slugify("Battersea Padel"),
    name: "Battersea Padel",
    sport: "padel",
    city: "London",
    hue: hueFrom("Battersea Padel"),
    lateDropHours: 24,
    inviteToken: newToken(),
    seasonName: "Season 1",
    seasonStartsAt: new Date(now.getTime() - 20 * D),
    createdBy: priya.id,
    createdAt: new Date(now.getTime() - 20 * D),
  });
  const padelPeople = [priya, sam, ash, femi, leon, kieran];
  await db.insert(schema.crewMembers).values(padelPeople.map((p, i) => ({ id: newId(), crewId: padelId, userId: p.id, role: i === 0 ? ("organiser" as const) : ("member" as const), joinedAt: new Date(now.getTime() - 20 * D + i * H) })));
  // Next Thursday at 19:00 London: two days after the anchor Tuesday, an hour earlier, rolled forward if already past.
  let padelStart = new Date(seasonStart.getTime() + 14 * 7 * D + 2 * D - H);
  if (padelStart.getTime() < now.getTime()) padelStart = new Date(padelStart.getTime() + 7 * D);
  const padelSession = newId();
  await db.insert(schema.sessions).values({
    id: padelSession,
    crewId: padelId,
    sport: "padel",
    title: "Thursday padel",
    venueName: "Rocket Padel Battersea",
    venueAddress: "SW11 8AT",
    startsAt: padelStart,
    durationMin: 90,
    capacity: 4,
    costMode: "total",
    costPence: 6000,
    rsvpDeadlineAt: null,
    status: "open",
    notes: "Court 2. Balls provided.",
    createdBy: priya.id,
    createdAt: new Date(now.getTime() - 2 * D),
    playedAt: null,
  });
  const padelIn = [priya, sam, ash, femi, leon];
  for (let i = 0; i < padelIn.length; i++) {
    const t = new Date(now.getTime() - 2 * D + i * H);
    await db.insert(schema.rsvps).values({ id: newId(), sessionId: padelSession, userId: padelIn[i].id, status: i < 4 ? "in" : "reserve", queuedAt: t, respondedAt: t });
  }
  await db.insert(schema.feed).values({ id: newId(), crewId: padelId, sessionId: padelSession, kind: "session_pinned", payload: JSON.stringify({ by: priya.id, title: "Thursday padel", startsAt: padelStart.getTime() }), createdAt: new Date(now.getTime() - 2 * D) });

  // A ready-made login for the organiser so the demo can be opened straight away.
  const token = "demo-organiser-session-" + newToken();
  await db.insert(schema.authSessions).values({ id: token, userId: sam.id, createdAt: now, expiresAt: new Date(now.getTime() + 180 * D) });
  const priyaToken = "demo-member-session-" + newToken();
  await db.insert(schema.authSessions).values({ id: priyaToken, userId: priya.id, createdAt: now, expiresAt: new Date(now.getTime() + 180 * D) });

  log("Seeded.");
  log("  Crew:        /crew/tuesday-fc  (organiser: Sam, sam@example.com)");
  log("  Invite link: /join/tuesdayfc-demo-invite");
  log("  Padel crew:  /crew/battersea-padel (organiser: Priya)");
  log("  Dev sign-in: email sam@example.com, code printed to console.");
  log(`  Or set cookie rc_session=${token} to be Sam, rc_session=${priyaToken} to be Priya.`);
  return true;
}

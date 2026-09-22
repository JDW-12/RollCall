"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db/client";
import { requireCrewAction } from "@/lib/access";
import { newId } from "@/lib/ids";
import { getSession, listMembers } from "@/lib/queries";
import { LeagueError, fullTimeEmbedUrl, parseStandings, providerFromUrl, safeExternalUrl } from "@/domain/league";
import { act, addFeed, str, uiError, type ActionState } from "./shared";

/** Adds or edits a league or cup. The link decides the provider badge; nothing is fetched. */
export async function saveCompetition(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const { crew } = await requireCrewAction(str(fd, "crewId"), { organiser: true });
    const name = str(fd, "name").slice(0, 60);
    if (name.length < 2) uiError("Give the competition a name, like “Division 3” or “Winter Cup”.");
    const kindRaw = str(fd, "kind");
    const kind = kindRaw === "cup" || kindRaw === "friendly" ? kindRaw : "league";
    const externalUrl = safeExternalUrl(str(fd, "externalUrl"));
    const rawUrl = str(fd, "externalUrl");
    if (rawUrl && !externalUrl) uiError("That link doesn't look right. Paste the web address of your league page.");
    const embedUrl = fullTimeEmbedUrl(str(fd, "embed") || externalUrl);
    const teamName = str(fd, "teamName").slice(0, 60);
    const db = await getDb();
    const now = new Date();
    const id = str(fd, "competitionId");
    if (id) {
      const existing = (await db.select().from(schema.competitions).where(and(eq(schema.competitions.id, id), eq(schema.competitions.crewId, crew.id))).limit(1))[0];
      if (!existing) uiError("That competition isn't in this crew any more.");
      await db
        .update(schema.competitions)
        .set({ name, kind, provider: providerFromUrl(externalUrl), externalUrl, embedUrl, teamName, updatedAt: now })
        .where(eq(schema.competitions.id, existing.id));
    } else {
      await db.insert(schema.competitions).values({
        id: newId(),
        crewId: crew.id,
        name,
        kind,
        provider: providerFromUrl(externalUrl),
        externalUrl,
        embedUrl,
        teamName: teamName || crew.name,
        standings: null,
        standingsUpdatedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    revalidatePath(`/crew/${crew.slug}`, "layout");
    return { ok: true, message: id ? "Saved." : `${name} added. Pin a fixture and it'll show up here.` };
  });
}

export async function deleteCompetition(fd: FormData): Promise<void> {
  const { crew } = await requireCrewAction(str(fd, "crewId"), { organiser: true });
  const db = await getDb();
  // Fixtures survive: they just stop belonging to a competition.
  await db.delete(schema.competitions).where(and(eq(schema.competitions.id, str(fd, "competitionId")), eq(schema.competitions.crewId, crew.id)));
  revalidatePath(`/crew/${crew.slug}`, "layout");
}

/**
 * The league table, pasted. There is no API for FA Full-Time or Powerleague, so the manager copies
 * the rows off the league page and Roll Call renders them in the crew's own design.
 */
export async function saveStandings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const { crew } = await requireCrewAction(str(fd, "crewId"), { organiser: true });
    const db = await getDb();
    const id = str(fd, "competitionId");
    const comp = (await db.select().from(schema.competitions).where(and(eq(schema.competitions.id, id), eq(schema.competitions.crewId, crew.id))).limit(1))[0];
    if (!comp) uiError("That competition isn't in this crew any more.");
    if (str(fd, "clear") === "1") {
      await db.update(schema.competitions).set({ standings: null, standingsUpdatedAt: null, updatedAt: new Date() }).where(eq(schema.competitions.id, comp.id));
      revalidatePath(`/crew/${crew.slug}`, "layout");
      return { ok: true, message: "Table cleared." };
    }
    let rows;
    try {
      rows = parseStandings(str(fd, "table"));
    } catch (e) {
      if (e instanceof LeagueError) uiError(e.message);
      throw e;
    }
    const now = new Date();
    await db.update(schema.competitions).set({ standings: JSON.stringify(rows), standingsUpdatedAt: now, updatedAt: now }).where(eq(schema.competitions.id, comp.id));
    revalidatePath(`/crew/${crew.slug}`, "layout");
    return { ok: true, message: `Table updated: ${rows.length} teams.` };
  });
}

/**
 * The result and who did what. Organisers only, and only for people the session already recorded as
 * having turned up, so the numbers always line up with the attendance.
 */
export async function saveMatchStats(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const sessionId = str(fd, "sessionId");
    const session = await getSession(sessionId);
    if (!session) uiError("That session doesn't exist any more.");
    const { crew } = await requireCrewAction(session.crewId, { organiser: true });
    const db = await getDb();

    const scoreFor = str(fd, "goalsFor");
    const scoreAgainst = str(fd, "goalsAgainst");
    const num = (v: string, max: number) => (v === "" ? null : Math.max(0, Math.min(max, Math.round(Number(v)) || 0)));
    const goalsFor = num(scoreFor, 99);
    const goalsAgainst = num(scoreAgainst, 99);
    if ((goalsFor === null) !== (goalsAgainst === null)) uiError("Enter both halves of the score, or neither.");

    const members = new Set((await listMembers(crew.id)).map((m) => m.id));
    const attended = (await db.select().from(schema.attendance).where(eq(schema.attendance.sessionId, session.id)))
      .filter((a) => a.attended && members.has(a.userId))
      .map((a) => a.userId);

    const now = new Date();
    const rows = attended
      .map((userId) => ({
        userId,
        goals: num(str(fd, `g_${userId}`), 30) ?? 0,
        assists: num(str(fd, `a_${userId}`), 30) ?? 0,
        rating: (() => {
          const r = num(str(fd, `r_${userId}`), 10);
          return r === null || r === 0 ? null : r;
        })(),
      }))
      .filter((r) => r.goals || r.assists || r.rating !== null);

    await db.transaction(async (tx) => {
      await tx.update(schema.sessions).set({ goalsFor, goalsAgainst }).where(eq(schema.sessions.id, session.id));
      await tx.delete(schema.matchStats).where(eq(schema.matchStats.sessionId, session.id));
      if (rows.length) await tx.insert(schema.matchStats).values(rows.map((r) => ({ id: newId(), sessionId: session.id, ...r, updatedAt: now })));
    }, { behavior: "immediate" });

    if (goalsFor !== null && goalsAgainst !== null) {
      await addFeed(crew.id, session.id, "result", { title: session.title, goalsFor, goalsAgainst, opponent: session.opponent });
    }
    revalidatePath(`/crew/${crew.slug}`, "layout");
    return { ok: true, message: goalsFor === null ? "Saved." : `${goalsFor}–${goalsAgainst} it is.` };
  });
}

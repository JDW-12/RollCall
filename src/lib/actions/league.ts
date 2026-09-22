"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db/client";
import { requireCrewAction, requireUserAction } from "@/lib/access";
import { newId } from "@/lib/ids";
import { getSession, listMembers } from "@/lib/queries";
import { LeagueError, fullTimeEmbedUrl, parseStandings, providerFromUrl, safeExternalUrl } from "@/domain/league";
import { feedFromSnippet } from "@/domain/league-feed";
import { syncCompetition } from "@/lib/league-feed";
import { allow } from "@/lib/ratelimit";

import { act, addFeed, str, uiError, type ActionState } from "./shared";

/**
 * Adds or edits a league or cup. The link decides the provider badge. If the manager also pasted the
 * official feed snippet from their league admin, it is read for a feed address and pulled straight
 * away, so a snippet that doesn't work says so while they are still looking at the form.
 */
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
    const snippet = str(fd, "feed") || str(fd, "embed");
    const feed = feedFromSnippet(snippet);
    if (snippet.trim() && !feed) uiError("That doesn't look like a Full-Time or LeagueRepublic snippet. Copy the whole thing from Media → Code Snippets in your league admin.");
    const embedUrl = feed?.kind === "fulltime_snippet" ? feed.url : fullTimeEmbedUrl(snippet || externalUrl);
    const teamName = str(fd, "teamName").slice(0, 60);
    const db = await getDb();
    const now = new Date();
    const id = str(fd, "competitionId");
    if (id) {
      const existing = (await db.select().from(schema.competitions).where(and(eq(schema.competitions.id, id), eq(schema.competitions.crewId, crew.id))).limit(1))[0];
      if (!existing) uiError("That competition isn't in this crew any more.");
      await db
        .update(schema.competitions)
        .set({
          name,
          kind,
          provider: providerFromUrl(externalUrl),
          externalUrl,
          embedUrl,
          teamName,
          feedUrl: feed?.url ?? "",
          feedKind: feed?.kind ?? "none",
          // Clearing the feed leaves the last table in place, but it stops calling itself live.
          standingsSource: feed ? existing.standingsSource : "manual",
          syncError: "",
          updatedAt: now,
        })
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
        standingsSource: "manual",
        feedUrl: feed?.url ?? "",
        feedKind: feed?.kind ?? "none",
        syncedAt: null,
        syncError: "",
        createdAt: now,
        updatedAt: now,
      });
    }
    revalidatePath(`/crew/${crew.slug}`, "layout");

    if (feed) {
      // Pull it now: a snippet that doesn't work should say so while the manager is still on the form.
      const saved = (await db.select().from(schema.competitions).where(and(eq(schema.competitions.crewId, crew.id), eq(schema.competitions.feedUrl, feed.url))).limit(1))[0];
      if (saved) {
        const outcome = await syncCompetition(saved, db);
        revalidatePath(`/crew/${crew.slug}`, "layout");
        // The competition is saved either way; a feed that didn't answer is shown as an error so the
        // manager sees it now rather than wondering later why the table never appeared.
        if (!outcome.ok) uiError(`${name} is saved, but the feed didn't answer. ${outcome.error} Paste the table below instead, or generate a fresh snippet.`);
        return { ok: true, message: `${name} is live: ${outcome.rows} teams straight from the league.` };
      }
    }
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
      await db.update(schema.competitions).set({ standings: null, standingsSource: "manual", standingsUpdatedAt: null, updatedAt: new Date() }).where(eq(schema.competitions.id, comp.id));
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
    await db.update(schema.competitions).set({ standings: JSON.stringify(rows), standingsSource: "manual", standingsUpdatedAt: now, updatedAt: now }).where(eq(schema.competitions.id, comp.id));
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

/**
 * "Refresh now", for a manager who has just seen the league update its table and doesn't want to
 * wait for the nightly pull. Rate limited per person, because it reaches out to someone else's site.
 */
export async function refreshStandings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const { crew } = await requireCrewAction(str(fd, "crewId"), { organiser: true });
    const user = await requireUserAction();
    const db = await getDb();
    const comp = (await db.select().from(schema.competitions).where(and(eq(schema.competitions.id, str(fd, "competitionId")), eq(schema.competitions.crewId, crew.id))).limit(1))[0];
    if (!comp) uiError("That competition isn't in this crew any more.");
    if (!comp.feedUrl || comp.feedKind === "none") uiError("There's no live feed linked yet. Paste the snippet from your league admin first.");
    if (!(await allow("standings_sync", user.id, 10, 60 * 60_000, db))) uiError("That's a lot of refreshing. Try again in a little while.");
    const outcome = await syncCompetition(comp, db);
    revalidatePath(`/crew/${crew.slug}`, "layout");
    if (!outcome.ok) uiError(outcome.error);
    return { ok: true, message: `Table updated: ${outcome.rows} teams.` };
  });
}

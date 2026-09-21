"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db/client";
import { getCurrentUser, createGuestUser, startSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { track } from "@/lib/events";
import { requireCrewAction } from "@/lib/access";
import { hueFrom, newId, newToken, slugify } from "@/lib/ids";
import { isSportKey } from "@/domain/sports";
import { findCrewByInvite } from "@/lib/queries";
import { act, addFeed, quiet, str, uiError, type ActionState } from "./shared";

const crewSchema = z.object({
  name: z.string().trim().min(2, "Give the crew a name.").max(40, "Keep the name under 40 letters."),
  sport: z.string().refine(isSportKey, "Pick a sport."),
  city: z.string().trim().min(2, "Where are you based?").max(40),
  organiserName: z.string().trim().max(40).optional(),
  lateDropHours: z.coerce.number().int().min(0).max(168).default(24),
});

async function uniqueSlug(base: string): Promise<string> {
  const db = await getDb();
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const hit = await db.select({ id: schema.crews.id }).from(schema.crews).where(eq(schema.crews.slug, slug)).limit(1);
    if (hit.length === 0) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${newId().slice(0, 4)}`;
}

export async function createCrew(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let slug = "";
  const r = await act(async () => {
    const input = crewSchema.parse({
      name: str(fd, "name"),
      sport: str(fd, "sport"),
      city: str(fd, "city") || "London",
      organiserName: str(fd, "organiserName") || undefined,
      lateDropHours: str(fd, "lateDropHours") || 24,
    });
    let user = await getCurrentUser();
    if (!user) {
      if (!input.organiserName || input.organiserName.length < 2) uiError("Tell us your name so the crew knows who's organising.");
      user = await createGuestUser(input.organiserName);
      await startSession(user.id);
    }
    const db = await getDb();
    slug = await uniqueSlug(slugify(input.name));
    const now = new Date();
    const crewId = newId();
    // Referral: the crew whose shared card brought this organiser here (set by /go).
    const jar = await cookies();
    const ref = jar.get("rc_ref")?.value ?? "";
    let referredByCrewId: string | null = null;
    if (ref) {
      const r = (await db.select({ id: schema.crews.id }).from(schema.crews).where(eq(schema.crews.id, ref)).limit(1))[0];
      if (r) referredByCrewId = r.id;
    }
    await db.insert(schema.crews).values({
      id: crewId,
      slug,
      name: input.name,
      sport: input.sport,
      city: input.city,
      hue: hueFrom(input.name),
      lateDropHours: input.lateDropHours,
      inviteToken: newToken(),
      calendarToken: newToken(),
      seasonName: "Season 1",
      seasonStartsAt: now,
      createdBy: user.id,
      referredByCrewId,
      createdAt: now,
    });
    await db.insert(schema.crewMembers).values({ id: newId(), crewId, userId: user.id, role: "organiser", joinedAt: now });
    await addFeed(crewId, null, "crew_created", { by: user.id, name: input.name });
    if (referredByCrewId) {
      await track("crew_referred", { crewId, userId: user.id, payload: { referredBy: referredByCrewId } });
      jar.delete("rc_ref");
    }
  });
  if (r.error) return r;
  redirect(`/crew/${slug}?welcome=1`);
}

export async function joinCrew(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const token = str(fd, "token");
  let slug = "";
  const r = await act(async () => {
    const crew = await findCrewByInvite(token);
    if (!crew) uiError("That invite link has expired. Ask the organiser for a new one.");
    slug = crew.slug;
    let user = await getCurrentUser();
    if (!user) {
      const name = str(fd, "name");
      if (name.length < 2) uiError("What should the crew call you?");
      if (name.length > 40) uiError("Keep your name under 40 letters.");
      user = await createGuestUser(name);
      await startSession(user.id);
    }
    const db = await getDb();
    const existing = await db
      .select({ id: schema.crewMembers.id })
      .from(schema.crewMembers)
      .where(and(eq(schema.crewMembers.crewId, crew.id), eq(schema.crewMembers.userId, user.id)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(schema.crewMembers).values({ id: newId(), crewId: crew.id, userId: user.id, role: "member", joinedAt: new Date() });
      await addFeed(crew.id, null, "joined", { userId: user.id, name: user.name });
    }
  });
  if (r.error) return r;
  redirect(`/crew/${slug}`);
}

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(40),
  city: z.string().trim().min(2).max(40),
  sport: z.string().refine(isSportKey),
  lateDropHours: z.coerce.number().int().min(0).max(168),
  seasonName: z.string().trim().min(1).max(30),
});

export async function updateCrew(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const crewId = str(fd, "crewId");
    const { crew } = await requireCrewAction(crewId, { organiser: true });
    const input = settingsSchema.parse({
      name: str(fd, "name"),
      city: str(fd, "city"),
      sport: str(fd, "sport"),
      lateDropHours: str(fd, "lateDropHours"),
      seasonName: str(fd, "seasonName"),
    });
    const db = await getDb();
    await db.update(schema.crews).set(input).where(eq(schema.crews.id, crew.id));
    revalidatePath(`/crew/${crew.slug}`, "layout");
    return { ok: true, message: "Saved." };
  });
}

/** Crews created before calendar feeds existed get a token the first time settings is opened. */
export async function ensureCalendarToken(crewId: string): Promise<string> {
  const db = await getDb();
  const token = newToken();
  await db.update(schema.crews).set({ calendarToken: token }).where(and(eq(schema.crews.id, crewId), isNull(schema.crews.calendarToken)));
  return (await db.select({ t: schema.crews.calendarToken }).from(schema.crews).where(eq(schema.crews.id, crewId)).limit(1))[0]?.t ?? token;
}

export async function rotateInvite(fd: FormData): Promise<void> {
  await quiet(async () => {
    const crewId = str(fd, "crewId");
    const { crew } = await requireCrewAction(crewId, { organiser: true });
    const db = await getDb();
    await db.update(schema.crews).set({ inviteToken: newToken(), calendarToken: newToken() }).where(eq(schema.crews.id, crew.id));
    revalidatePath(`/crew/${crew.slug}`, "layout");
  });
}

async function organiserCount(crewId: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.crewMembers.id })
    .from(schema.crewMembers)
    .where(and(eq(schema.crewMembers.crewId, crewId), eq(schema.crewMembers.role, "organiser")));
  return rows.length;
}

export async function setMemberRole(fd: FormData): Promise<void> {
  const crewId = str(fd, "crewId");
  const userId = str(fd, "userId");
  const role = str(fd, "role") === "organiser" ? "organiser" : "member";
  await quiet(async () => {
    const { crew } = await requireCrewAction(crewId, { organiser: true });
    const db = await getDb();
    const target = (await db.select().from(schema.crewMembers).where(and(eq(schema.crewMembers.crewId, crew.id), eq(schema.crewMembers.userId, userId))).limit(1))[0];
    if (!target) return;
    // Never demote the last organiser, whoever is asking.
    if (target.role === "organiser" && role === "member" && (await organiserCount(crew.id)) <= 1) return;
    await db.update(schema.crewMembers).set({ role }).where(eq(schema.crewMembers.id, target.id));
    revalidatePath(`/crew/${crew.slug}`, "layout");
  });
}

export async function removeMember(fd: FormData): Promise<void> {
  const crewId = str(fd, "crewId");
  const userId = str(fd, "userId");
  let leftSelf = false;
  await quiet(async () => {
    const { crew, user, isOrganiser } = await requireCrewAction(crewId);
    if (userId !== user.id && !isOrganiser) return;
    const db = await getDb();
    const target = (await db.select().from(schema.crewMembers).where(and(eq(schema.crewMembers.crewId, crew.id), eq(schema.crewMembers.userId, userId))).limit(1))[0];
    if (!target) return;
    // A crew must always keep an organiser.
    if (target.role === "organiser" && (await organiserCount(crew.id)) <= 1) return;
    await db.transaction(async (tx) => {
      // Free any spots they hold on open sessions so headcounts and money stay honest. Not a late drop.
      const open = await tx.select({ id: schema.sessions.id }).from(schema.sessions).where(and(eq(schema.sessions.crewId, crew.id), eq(schema.sessions.status, "open")));
      for (const s of open) {
        await tx.delete(schema.rsvps).where(and(eq(schema.rsvps.sessionId, s.id), eq(schema.rsvps.userId, userId), eq(schema.rsvps.status, "reserve")));
        await tx
          .update(schema.rsvps)
          .set({ status: "out", lateDrop: false, droppedAt: null, respondedAt: new Date() })
          .where(and(eq(schema.rsvps.sessionId, s.id), eq(schema.rsvps.userId, userId)));
      }
      await tx.delete(schema.crewMembers).where(eq(schema.crewMembers.id, target.id));
    }, { behavior: "immediate" });
    await addFeed(crew.id, null, "left", { userId });
    revalidatePath(`/crew/${crew.slug}`, "layout");
    leftSelf = userId === user.id;
  });
  if (leftSelf) redirect("/home");
}


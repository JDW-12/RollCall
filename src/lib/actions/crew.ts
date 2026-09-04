"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db/client";
import { getCurrentUser, createGuestUser, startSession } from "@/lib/auth";
import { requireCrewAction } from "@/lib/access";
import { hueFrom, newId, newToken, slugify } from "@/lib/ids";
import { isSportKey } from "@/domain/sports";
import { findCrewByInvite } from "@/lib/queries";
import { act, addFeed, str, uiError, type ActionState } from "./shared";

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
    await db.insert(schema.crews).values({
      id: crewId,
      slug,
      name: input.name,
      sport: input.sport,
      city: input.city,
      hue: hueFrom(input.name),
      lateDropHours: input.lateDropHours,
      inviteToken: newToken(),
      seasonName: "Season 1",
      seasonStartsAt: now,
      createdBy: user.id,
      createdAt: now,
    });
    await db.insert(schema.crewMembers).values({ id: newId(), crewId, userId: user.id, role: "organiser", joinedAt: now });
    await addFeed(crewId, null, "crew_created", { by: user.id, name: input.name });
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

export async function rotateInvite(fd: FormData): Promise<void> {
  const crewId = str(fd, "crewId");
  const { crew } = await requireCrewAction(crewId, { organiser: true });
  const db = await getDb();
  await db.update(schema.crews).set({ inviteToken: newToken() }).where(eq(schema.crews.id, crew.id));
  revalidatePath(`/crew/${crew.slug}`, "layout");
}

export async function setMemberRole(fd: FormData): Promise<void> {
  const crewId = str(fd, "crewId");
  const userId = str(fd, "userId");
  const role = str(fd, "role") === "organiser" ? "organiser" : "member";
  const { crew, user } = await requireCrewAction(crewId, { organiser: true });
  if (userId === user.id && role === "member") {
    // Don't let the last organiser demote themselves.
    const db = await getDb();
    const organisers = await db
      .select({ id: schema.crewMembers.id })
      .from(schema.crewMembers)
      .where(and(eq(schema.crewMembers.crewId, crew.id), eq(schema.crewMembers.role, "organiser")));
    if (organisers.length <= 1) return;
  }
  const db = await getDb();
  await db
    .update(schema.crewMembers)
    .set({ role })
    .where(and(eq(schema.crewMembers.crewId, crew.id), eq(schema.crewMembers.userId, userId)));
  revalidatePath(`/crew/${crew.slug}`, "layout");
}

export async function removeMember(fd: FormData): Promise<void> {
  const crewId = str(fd, "crewId");
  const userId = str(fd, "userId");
  const { crew, user, isOrganiser } = await requireCrewAction(crewId);
  if (userId !== user.id && !isOrganiser) return;
  const db = await getDb();
  await db.delete(schema.crewMembers).where(and(eq(schema.crewMembers.crewId, crew.id), eq(schema.crewMembers.userId, userId)));
  revalidatePath(`/crew/${crew.slug}`, "layout");
  if (userId === user.id) redirect("/home");
}


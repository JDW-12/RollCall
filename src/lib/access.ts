import "server-only";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb, schema } from "@/db/client";
import { getCurrentUser, type CurrentUser } from "./auth";

export class AccessError extends Error {}

export type CrewContext = {
  user: CurrentUser;
  crew: schema.Crew;
  membership: schema.CrewMember;
  isOrganiser: boolean;
};

export async function findCrewBySlug(slug: string): Promise<schema.Crew | null> {
  const db = await getDb();
  const rows = await db.select().from(schema.crews).where(eq(schema.crews.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function findMembership(crewId: string, userId: string): Promise<schema.CrewMember | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.crewMembers)
    .where(and(eq(schema.crewMembers.crewId, crewId), eq(schema.crewMembers.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** For pages: redirects to sign-in or the crew's join page when the viewer isn't a member. */
export async function requireCrewPage(slug: string): Promise<CrewContext> {
  const crew = await findCrewBySlug(slug);
  if (!crew) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=/crew/${slug}`);
  const membership = await findMembership(crew.id, user.id);
  if (!membership) redirect(`/join/${crew.inviteToken}`);
  return { user, crew, membership, isOrganiser: membership.role === "organiser" };
}

/** For actions: throws instead of redirecting. */
export async function requireCrewAction(crewId: string, opts: { organiser?: boolean } = {}): Promise<CrewContext> {
  const user = await getCurrentUser();
  if (!user) throw new AccessError("You need to sign in first.");
  const db = await getDb();
  const crew = (await db.select().from(schema.crews).where(eq(schema.crews.id, crewId)).limit(1))[0];
  if (!crew) throw new AccessError("That crew doesn't exist.");
  const membership = await findMembership(crew.id, user.id);
  if (!membership) throw new AccessError("You're not in this crew.");
  const isOrganiser = membership.role === "organiser";
  if (opts.organiser && !isOrganiser) throw new AccessError("Only an organiser can do that.");
  return { user, crew, membership, isOrganiser };
}

export async function requireUserAction(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AccessError("You need to sign in first.");
  return user;
}

import "server-only";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { cache } from "react";
import { getDb, schema } from "@/db/client";
import { newId, newToken, hueFrom } from "./ids";

export const SESSION_COOKIE = "rc_session";
const SESSION_DAYS = 180;

export type CurrentUser = schema.User;

/** Read the signed-in user for this request. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db
    .select({ user: schema.users })
    .from(schema.authSessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.authSessions.userId))
    .where(and(eq(schema.authSessions.id, token), gt(schema.authSessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
});

/** Create a login session and set the cookie. Only call from a server action or route handler. */
export async function startSession(userId: string): Promise<void> {
  const db = await getDb();
  const id = newToken() + newToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  await db.insert(schema.authSessions).values({ id, userId, createdAt: now, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.authSessions).where(eq(schema.authSessions.id, token));
  }
  jar.delete(SESSION_COOKIE);
}

/** Create a lightweight account from just a name. Used by invite links so nobody needs to install anything. */
export async function createGuestUser(name: string): Promise<schema.User> {
  const db = await getDb();
  const user: schema.User = {
    id: newId(),
    name: name.trim(),
    email: null,
    hue: hueFrom(name + Date.now()),
    createdAt: new Date(),
  };
  await db.insert(schema.users).values(user);
  return user;
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

"use server";

import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db/client";
import { endSession, getCurrentUser, isValidEmail, normaliseEmail, startSession } from "@/lib/auth";
import { sendLoginCode } from "@/lib/email";
import { newId, hueFrom } from "@/lib/ids";
import { safeNext } from "@/lib/access";
import { act, str, uiError, type ActionState } from "./shared";

export async function requestCode(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = normaliseEmail(str(fd, "email"));
  const next = safeNext(str(fd, "next") || "/home");
  const r = await act(async () => {
    if (!isValidEmail(email)) uiError("That email doesn't look right.");
    const db = await getDb();
    const now = new Date();
    // Throttle: at most three live codes per address. Stops inbox flooding and keeps the guess space at one code.
    const live = await db
      .select({ id: schema.loginCodes.id, createdAt: schema.loginCodes.createdAt })
      .from(schema.loginCodes)
      .where(and(eq(schema.loginCodes.email, email), isNull(schema.loginCodes.usedAt), gt(schema.loginCodes.expiresAt, now)));
    if (live.length >= 3) uiError("We've sent a few codes already. Check your inbox, or try again in ten minutes.");
    // Any earlier code stops working the moment a new one is issued.
    for (const l of live) await db.update(schema.loginCodes).set({ usedAt: now }).where(eq(schema.loginCodes.id, l.id));
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await db.insert(schema.loginCodes).values({
      id: newId(),
      email,
      code,
      attempts: 0,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 10 * 60_000),
    });
    const sent = await sendLoginCode(email, code);
    if (!sent.delivered && !sent.dev) uiError("We couldn't send the email just now. Try again in a minute.");
  });
  if (r.error) return r;
  redirect(`/signin/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}

export async function verifyCode(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = normaliseEmail(str(fd, "email"));
  const code = str(fd, "code").replace(/\s+/g, "");
  const next = safeNext(str(fd, "next") || "/home");
  const r = await act(async () => {
    const db = await getDb();
    const now = new Date();
    const candidates = await db
      .select()
      .from(schema.loginCodes)
      .where(and(eq(schema.loginCodes.email, email), isNull(schema.loginCodes.usedAt), gt(schema.loginCodes.expiresAt, now)));
    const row = candidates.find((c) => c.code === code);
    if (!row) {
      // Count the miss against every live code; five misses burns them.
      for (const c of candidates) {
        const attempts = c.attempts + 1;
        await db
          .update(schema.loginCodes)
          .set({ attempts, usedAt: attempts >= 5 ? now : null })
          .where(eq(schema.loginCodes.id, c.id));
      }
      uiError(candidates.some((c) => c.attempts + 1 >= 5) ? "Too many tries. Request a new code." : "That code isn't right or has expired.");
    }
    await db.update(schema.loginCodes).set({ usedAt: now }).where(eq(schema.loginCodes.id, row.id));
    void sql;

    const existing = (await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1))[0];
    const current = await getCurrentUser();
    let userId: string;
    if (existing) {
      userId = existing.id;
    } else if (current && !current.email) {
      // A guest who joined from an invite link is claiming their account with an email.
      await db.update(schema.users).set({ email }).where(eq(schema.users.id, current.id));
      userId = current.id;
    } else {
      const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const id = newId();
      await db.insert(schema.users).values({ id, name, email, hue: hueFrom(email), createdAt: new Date() });
      userId = id;
    }
    await endSession();
    await startSession(userId);
  });
  if (r.error) return r;
  redirect(next);
}

export async function setTheme(fd: FormData): Promise<void> {
  const theme = str(fd, "theme") === "light" ? "light" : "dark";
  const jar = await cookies();
  jar.set("rc_theme", theme, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/");
}

const profileSchema = z.object({ name: z.string().trim().min(2, "Give us at least two letters.").max(40, "Keep it under 40 letters.") });

export async function updateProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const user = await getCurrentUser();
    if (!user) uiError("You need to sign in first.");
    const { name } = profileSchema.parse({ name: str(fd, "name") });
    const db = await getDb();
    await db.update(schema.users).set({ name }).where(eq(schema.users.id, user.id));
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved." };
  });
}

"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db/client";
import { endSession, getCurrentUser, isValidEmail, normaliseEmail, startSession } from "@/lib/auth";
import { sendLoginCode } from "@/lib/email";
import { newId, hueFrom } from "@/lib/ids";
import { act, str, uiError, type ActionState } from "./shared";

function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/home";
}

export async function requestCode(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = normaliseEmail(str(fd, "email"));
  const next = safeNext(str(fd, "next") || "/home");
  const r = await act(async () => {
    if (!isValidEmail(email)) uiError("That email doesn't look right.");
    const db = await getDb();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = new Date();
    await db.insert(schema.loginCodes).values({
      id: newId(),
      email,
      code,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 10 * 60_000),
    });
    await sendLoginCode(email, code);
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
    const row = (
      await db
        .select()
        .from(schema.loginCodes)
        .where(and(eq(schema.loginCodes.email, email), eq(schema.loginCodes.code, code), isNull(schema.loginCodes.usedAt), gt(schema.loginCodes.expiresAt, new Date())))
        .limit(1)
    )[0];
    if (!row) uiError("That code isn't right or has expired.");
    await db.update(schema.loginCodes).set({ usedAt: new Date() }).where(eq(schema.loginCodes.id, row.id));

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

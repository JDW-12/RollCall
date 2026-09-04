import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { getDb, schema } from "@/db/client";
import { newId } from "@/lib/ids";
import { AccessError } from "@/lib/access";
import { RsvpError } from "@/domain/rsvp";

export type ActionState = { error?: string; ok?: boolean; message?: string };

export const idle: ActionState = {};

/** Run an action body, translating known errors into a form state instead of a crash. */
export async function act(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    const r = await fn();
    return r ?? { ok: true };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof AccessError || e instanceof RsvpError) return { error: e.message };
    if (e instanceof ZodError) return { error: e.issues[0]?.message ?? "Check the form and try again." };
    if (e instanceof Error && e.message.startsWith("UI:")) return { error: e.message.slice(3) };
    console.error(e);
    return { error: "Something went wrong. Try again." };
  }
}

export function uiError(message: string): never {
  throw new Error("UI:" + message);
}

export async function addFeed(crewId: string, sessionId: string | null, kind: string, payload: Record<string, unknown>) {
  const db = await getDb();
  await db.insert(schema.feed).values({ id: newId(), crewId, sessionId, kind, payload: JSON.stringify(payload), createdAt: new Date() });
}

export const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

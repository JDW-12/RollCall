import "server-only";
import { getDb, schema } from "@/db/client";
import { newId } from "./ids";

export type EventKind = "share_click" | "preview_view" | "referral_landed" | "crew_referred" | "demo_signin" | "reminder_sent" | "places_lookup" | "course_search" | "course_scan";

/** Fire-and-forget product event. Never throws into a page. */
export async function track(kind: EventKind, data: { crewId?: string | null; userId?: string | null; sessionId?: string | null; payload?: Record<string, unknown> } = {}): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(schema.events).values({
      id: newId(),
      kind,
      crewId: data.crewId ?? null,
      userId: data.userId ?? null,
      sessionId: data.sessionId ?? null,
      payload: JSON.stringify(data.payload ?? {}),
      createdAt: new Date(),
    });
  } catch (e) {
    console.error("track failed", kind, e);
  }
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { listSessions } from "@/lib/queries";
import { appUrl } from "@/lib/env";
import { buildIcs } from "@/domain/ics";

/**
 * Subscribable feed of a crew's sessions: /cal/<token>.ics
 * Calendar apps can't send cookies, so the token in the URL is the key. It carries titles, times and
 * venues only, never names or money, and rotates with the invite link.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clean = token.replace(/\.ics$/, "");
  const db = await getDb();
  const crew = (await db.select().from(schema.crews).where(eq(schema.crews.calendarToken, clean)).limit(1))[0];
  if (!crew) return new NextResponse("Not found", { status: 404 });
  const sessions = await listSessions(crew.id);
  const base = await appUrl();
  const ics = buildIcs(
    sessions.map((s) => ({
      uid: `${s.id}@rollcall`,
      title: `${crew.name}: ${s.title}`,
      startsAt: s.startsAt,
      durationMin: s.durationMin,
      location: [s.venueName, s.venueAddress].filter(Boolean).join(", "),
      url: `${base}/crew/${crew.slug}/s/${s.id}`,
      cancelled: s.status === "cancelled",
    })),
    crew.name,
  );
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300" } });
}

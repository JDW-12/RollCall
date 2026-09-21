import { NextResponse } from "next/server";
import { findCrewBySlug, findMembership } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/queries";
import { appUrl } from "@/lib/env";
import { buildIcs } from "@/domain/ics";

/** One session as a downloadable .ics. Members only. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const crew = await findCrewBySlug(slug);
  const user = await getCurrentUser();
  if (!crew || !user || !(await findMembership(crew.id, user.id))) return new NextResponse("Not found", { status: 404 });
  const session = await getSession(id);
  if (!session || session.crewId !== crew.id) return new NextResponse("Not found", { status: 404 });
  const base = await appUrl();
  const ics = buildIcs(
    [
      {
        uid: `${session.id}@rollcall`,
        title: `${crew.name}: ${session.title}`,
        startsAt: session.startsAt,
        durationMin: session.durationMin,
        location: [session.venueName, session.venueAddress].filter(Boolean).join(", "),
        description: session.notes,
        url: `${base}/crew/${crew.slug}/s/${session.id}`,
        cancelled: session.status === "cancelled",
      },
    ],
    crew.name,
  );
  return new NextResponse(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${session.title.replace(/[^a-z0-9]+/gi, "-")}.ics"` },
  });
}

import { ImageResponse } from "next/og";
import { findCrewBySlug } from "@/lib/access";
import { getSessionBundle, listMembers } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { summarise } from "@/domain/rsvp";
import { fmtLong } from "@/lib/format";
import { OG, ogFonts } from "@/lib/og";

export const alt = "Roll Call session";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const label = { fontSize: 26, letterSpacing: 4, textTransform: "uppercase" as const, color: OG.ink3, fontFamily: OG.display, fontWeight: 700 };

function Fallback() {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: OG.ink, color: OG.ground, fontSize: 140, alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: OG.display, letterSpacing: -2 }}>
      ROLL CALL
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const fonts = ogFonts();
  const crew = await findCrewBySlug(slug);
  const bundle = crew ? await getSessionBundle(id) : null;
  if (!crew || !bundle || bundle.session.crewId !== crew.id) return new ImageResponse(<Fallback />, { ...size, fonts });

  const { session, rsvps, attendance, ratings } = bundle;
  const members = await listMembers(crew.id);
  const sport = sportOf(session.sport);
  const s = summarise(
    rsvps.map((r) => ({ userId: r.userId, status: r.status, queuedAt: r.queuedAt.getTime(), respondedAt: 0, droppedAt: null, lateDrop: r.lateDrop })),
    session.capacity,
  );
  const played = session.status === "played";
  const turnedUp = attendance.filter((a) => a.attended).length;
  const counts = new Map<string, number>();
  for (const r of ratings) if (r.category === sport.ratings[0].key) counts.set(r.rateeId, (counts.get(r.rateeId) ?? 0) + 1);
  const topVote = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const motm = topVote ? members.find((m) => m.id === topVote[0])?.name : null;
  const firstNames = rsvps
    .filter((r) => r.status === "in")
    .map((r) => members.find((m) => m.id === r.userId)?.name.split(" ")[0])
    .filter(Boolean)
    .slice(0, 9)
    .join(" · ");

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: OG.ground, color: OG.ink, padding: "52px 60px", fontFamily: OG.display }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...label }}>
          <span>
            {crew.name} · {sport.label}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="30" height="30" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill={OG.pitch} /><path d="M15 33l10 10 25-25" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ROLL CALL
          </span>
        </div>
        <div style={{ display: "flex", fontSize: 128, fontWeight: 800, textTransform: "uppercase", lineHeight: 0.92, marginTop: 30, letterSpacing: -1 }}>{session.title}</div>
        <div style={{ display: "flex", fontSize: 38, color: OG.ink2, marginTop: 22, fontWeight: 700 }}>
          {fmtLong(session.startsAt)}
          {session.venueName ? ` · ${session.venueName}` : ""}
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
            <div style={{ display: "flex", ...label, fontSize: 24 }}>{played ? (motm ? sport.ratings[0].label : "Played") : s.full ? "Full · reserves open" : `${s.spotsLeft} spots left`}</div>
            <div style={{ display: "flex", fontSize: 48, fontWeight: 700, marginTop: 4, lineHeight: 1.05 }}>{played ? (motm ?? `${turnedUp} turned up`) : firstNames || "Be the first in"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", background: played ? OG.ink : OG.pitch, color: "#fff", padding: "20px 34px 24px", borderRadius: 14 }}>
            <div style={{ display: "flex", fontSize: 140, fontWeight: 800, lineHeight: 0.9 }}>{played ? turnedUp : s.in}</div>
            <div style={{ display: "flex", ...label, color: "#fff", opacity: 0.85 }}>{played ? "turned up" : `in / ${session.capacity}`}</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

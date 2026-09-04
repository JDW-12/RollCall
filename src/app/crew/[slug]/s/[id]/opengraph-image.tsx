import { ImageResponse } from "next/og";
import { findCrewBySlug } from "@/lib/access";
import { getSessionBundle, listMembers } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { summarise } from "@/domain/rsvp";
import { fmtLong } from "@/lib/format";

export const alt = "Roll Call session";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const crew = await findCrewBySlug(slug);
  const bundle = crew ? await getSessionBundle(id) : null;
  if (!crew || !bundle || bundle.session.crewId !== crew.id) {
    return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: "#14201b", color: "#fff", fontSize: 80, alignItems: "center", justifyContent: "center", fontWeight: 800 }}>ROLL CALL</div>, size);
  }
  const { session, rsvps, attendance, ratings } = bundle;
  const members = await listMembers(crew.id);
  const sport = sportOf(session.sport);
  const s = summarise(
    rsvps.map((r) => ({ userId: r.userId, status: r.status, queuedAt: r.queuedAt.getTime(), respondedAt: 0, droppedAt: null, lateDrop: r.lateDrop })),
    session.capacity,
  );
  const played = session.status === "played";
  const turnedUp = attendance.filter((a) => a.attended).length;
  const motm = (() => {
    const counts = new Map<string, number>();
    for (const r of ratings) if (r.category === sport.ratings[0].key) counts.set(r.rateeId, (counts.get(r.rateeId) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? members.find((m) => m.id === top[0])?.name : null;
  })();
  const names = rsvps
    .filter((r) => r.status === "in")
    .map((r) => members.find((m) => m.id === r.userId)?.name.split(" ")[0])
    .filter(Boolean)
    .slice(0, 10)
    .join(" · ");

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#f5f6f2", color: "#14201b", padding: 56, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: "#6e7a73" }}>
          <span>{crew.name} · {sport.label}</span>
          <span>ROLL CALL</span>
        </div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, textTransform: "uppercase", lineHeight: 1, marginTop: 28 }}>{session.title}</div>
        <div style={{ display: "flex", fontSize: 36, color: "#3e4a44", marginTop: 18 }}>
          {fmtLong(session.startsAt)}
          {session.venueName ? ` · ${session.venueName}` : ""}
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
            <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: "#6e7a73" }}>{played ? (motm ? sport.ratings[0].label : "Played") : s.full ? "Full · reserves open" : `${s.spotsLeft} spots left`}</div>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700, marginTop: 6 }}>{played ? (motm ?? `${turnedUp} turned up`) : names || "Be the first in"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", background: played ? "#14201b" : "#1e8a4c", color: "#fff", padding: "22px 34px", borderRadius: 12 }}>
            <div style={{ display: "flex", fontSize: 120, fontWeight: 800, lineHeight: 1 }}>{played ? turnedUp : s.in}</div>
            <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, textTransform: "uppercase" }}>{played ? "turned up" : `in / ${session.capacity}`}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

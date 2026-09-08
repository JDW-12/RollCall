import { ImageResponse } from "next/og";
import { findCrewBySlug } from "@/lib/access";
import { getSessionBundle, listMembers } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { summarise } from "@/domain/rsvp";
import { fmtLong, plural } from "@/lib/format";
import { OG, OG_MARK_PATH, ogFonts } from "@/lib/og";

export const alt = "Roll Call session";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const label = { fontSize: 26, letterSpacing: 4, textTransform: "uppercase" as const, color: OG.ink3, fontFamily: OG.display, fontWeight: 700 };

function Mark() {
  return (
    <svg width="34" height="34" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill={OG.pitch} />
      <path d={OG_MARK_PATH} fill="none" stroke={OG.pitchInk} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Fallback() {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: OG.ground, color: OG.ink, fontSize: 140, alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: OG.display, letterSpacing: -2 }}>
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

  const status = played ? (motm ? sport.ratings[0].label : "Played") : s.full ? "Full · reserves open" : plural(s.spotsLeft, "spot") + " left";
  const line = played ? (motm ?? `${turnedUp} turned up`) : firstNames || "Be the first in";

  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: OG.ground, color: OG.ink, fontFamily: OG.display, overflow: "hidden" }}>
        {/* Pitch lines, faint, fading out towards the bottom right so they never end on a hard edge. */}
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, backgroundImage: "linear-gradient(rgba(242,245,239,0.05) 1px, rgba(0,0,0,0) 1px), linear-gradient(90deg, rgba(242,245,239,0.05) 1px, rgba(0,0,0,0) 1px)", backgroundSize: "40px 40px" }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, background: "linear-gradient(135deg, rgba(11,18,16,0) 20%, rgba(11,18,16,0.96) 70%)" }} />
        {/* Floodlight: a soft pitch glow behind the number tile, bottom right. */}
        <div style={{ position: "absolute", right: -220, bottom: -300, width: 900, height: 900, borderRadius: 450, background: `radial-gradient(circle at center, ${OG.glow} 0%, rgba(53,208,122,0.12) 32%, rgba(11,18,16,0) 62%)` }} />
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "48px 60px 52px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...label }}>
            <span>
              {crew.name} · {sport.label}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 14, color: OG.ink }}>
              <Mark />
              ROLL CALL
            </span>
          </div>
          <div style={{ display: "flex", fontSize: 132, fontWeight: 800, textTransform: "uppercase", lineHeight: 0.9, marginTop: 34, letterSpacing: -1, maxWidth: 1080 }}>{session.title}</div>
          <div style={{ display: "flex", fontSize: 38, color: OG.ink2, marginTop: 22, fontWeight: 700 }}>
            {fmtLong(session.startsAt)}
            {session.venueName ? ` · ${session.venueName}` : ""}
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 740 }}>
              <div style={{ display: "flex", ...label, fontSize: 24, color: OG.pitch }}>{status}</div>
              <div style={{ display: "flex", fontSize: 48, fontWeight: 700, marginTop: 6, lineHeight: 1.05, color: OG.ink }}>{line}</div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                background: played ? OG.panel : OG.pitch,
                color: played ? OG.ink : OG.pitchInk,
                border: `4px solid ${OG.pitch}`,
                padding: "18px 34px 22px",
                borderRadius: 22,
                boxShadow: `0 30px 80px -20px ${OG.glow}`,
              }}
            >
              <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 0.88, letterSpacing: -3 }}>{played ? turnedUp : s.in}</div>
              <div style={{ display: "flex", ...label, color: played ? OG.pitch : OG.pitchInk, opacity: played ? 1 : 0.8 }}>{played ? "turned up" : `in / ${session.capacity}`}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

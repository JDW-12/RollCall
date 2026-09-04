import { ImageResponse } from "next/og";
import { findCrewBySlug } from "@/lib/access";
import { getCrewTable } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { initials } from "@/lib/format";

export const alt = "Roll Call player card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string; userId: string }> }) {
  const { slug, userId } = await params;
  const crew = await findCrewBySlug(slug);
  const table = crew ? await getCrewTable(crew) : null;
  const m = table?.members.find((x) => x.id === userId);
  const row = table?.rows.find((r) => r.userId === userId);
  if (!crew || !m || !row) {
    return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: "#14201b", color: "#fff", fontSize: 80, alignItems: "center", justifyContent: "center", fontWeight: 800 }}>ROLL CALL</div>, size);
  }
  const sport = sportOf(crew.sport);
  const rank = table!.rows.findIndex((r) => r.userId === userId) + 1;
  const bg = `hsl(${m.hue} 45% 78%)`;
  const deep = `hsl(${m.hue} 40% 22%)`;
  const stats: [string, number][] = [
    ["TRN", row.card.turnsUp],
    ["FRM", row.card.form],
    [sport.ratings[0].stat, row.card.votes],
    [sport.ratings[1].stat, row.card.graft],
    ["STK", row.card.streak],
    ["PTS", Math.max(0, Math.min(99, row.points))],
  ];
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#f5f6f2", padding: 48, fontFamily: "sans-serif", color: "#14201b" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 420, background: bg, color: deep, borderRadius: 20, padding: 36, marginRight: 48 }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 1 }}>{row.card.overall}</div>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", opacity: 0.8 }}>{row.card.overall >= 85 ? "Elite" : row.card.overall >= 72 ? "Regular" : row.card.overall >= 60 ? "Squad" : "Sick note"}</div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", width: 84, height: 84, borderRadius: 42, background: deep, color: bg, alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, marginRight: 16 }}>{initials(m.name)}</div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800, textTransform: "uppercase", lineHeight: 1 }}>{m.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: "#6e7a73" }}>
            <span>
              {crew.name} · #{rank}
            </span>
            <span>ROLL CALL</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 40 }}>
            {stats.map(([k, v]) => (
              <div key={k} style={{ display: "flex", flexDirection: "column", width: "33%", marginBottom: 36 }}>
                <span style={{ fontSize: 24, letterSpacing: 4, color: "#6e7a73" }}>{k}</span>
                <span style={{ fontSize: 88, fontWeight: 800, lineHeight: 1 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", fontSize: 28, color: "#3e4a44" }}>
            {row.played} played · {row.streak} streak · {row.sickNotes} sick notes
          </div>
        </div>
      </div>
    ),
    size,
  );
}

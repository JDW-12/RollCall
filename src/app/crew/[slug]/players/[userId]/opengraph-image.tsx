import { ImageResponse } from "next/og";
import { findCrewBySlug } from "@/lib/access";
import { getCrewTable } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { initials } from "@/lib/format";
import { OG, ogFonts } from "@/lib/og";

export const alt = "Roll Call player card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string; userId: string }> }) {
  const { slug, userId } = await params;
  const fonts = ogFonts();
  const crew = await findCrewBySlug(slug);
  const table = crew ? await getCrewTable(crew) : null;
  const m = table?.members.find((x) => x.id === userId);
  const row = table?.rows.find((r) => r.userId === userId);
  if (!crew || !m || !row || !table) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: OG.ink, color: OG.ground, fontSize: 140, alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: OG.display }}>ROLL CALL</div>,
      { ...size, fonts },
    );
  }
  const sport = sportOf(crew.sport);
  const rank = table.rows.findIndex((r) => r.userId === userId) + 1;
  const tier = row.card.overall >= 85 ? "Elite" : row.card.overall >= 72 ? "Regular" : row.card.overall >= 60 ? "Squad" : "Sick note";
  const light = `hsl(${m.hue} 48% 80%)`;
  const mid = `hsl(${m.hue} 45% 66%)`;
  const deep = `hsl(${m.hue} 40% 20%)`;
  const label = { fontSize: 24, letterSpacing: 4, textTransform: "uppercase" as const, color: OG.ink3, fontWeight: 700 };
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
      <div style={{ display: "flex", width: "100%", height: "100%", background: OG.ground, padding: 44, fontFamily: OG.display, color: OG.ink }}>
        <div style={{ display: "flex", flexDirection: "column", width: 440, background: `linear-gradient(160deg, ${light} 0%, ${mid} 100%)`, color: deep, borderRadius: 22, padding: 36, marginRight: 44 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 170, fontWeight: 800, lineHeight: 0.85 }}>{row.card.overall}</div>
              <div style={{ display: "flex", ...label, color: deep, opacity: 0.75, marginTop: 12 }}>{tier}</div>
            </div>
            <div style={{ display: "flex", ...label, color: deep, opacity: 0.75, textAlign: "right", flexDirection: "column", alignItems: "flex-end" }}>
              <span>{crew.name}</span>
              <span>#{rank}</span>
            </div>
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", width: 88, height: 88, borderRadius: 44, background: deep, color: light, alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800, marginRight: 16 }}>{initials(m.name)}</div>
            <div style={{ display: "flex", fontSize: 52, fontWeight: 800, textTransform: "uppercase", lineHeight: 0.95 }}>{m.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", ...label }}>
            <span>{sport.label} · peer rated</span>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width="30" height="30" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill={OG.pitch} /><path d="M15 33l10 10 25-25" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ROLL CALL
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 34 }}>
            {stats.map(([k, v]) => (
              <div key={k} style={{ display: "flex", flexDirection: "column", width: "33%", marginBottom: 26 }}>
                <span style={{ ...label }}>{k}</span>
                <span style={{ fontSize: 112, fontWeight: 800, lineHeight: 0.9 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", fontSize: 30, color: OG.ink2, fontWeight: 700 }}>
            {row.played} played · {row.streak} streak · {row.sickNotes} sick notes · form {row.form?.toFixed(1) ?? "–"}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

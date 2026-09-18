import { ImageResponse } from "next/og";
import { findCrewBySlug } from "@/lib/access";
import { getCrewTable } from "@/lib/queries";
import { seasonAwards } from "@/domain/awards";
import { sportOf } from "@/domain/sports";
import { OG, ogFonts } from "@/lib/og";

export const alt = "Roll Call season awards";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fonts = ogFonts();
  const crew = await findCrewBySlug(slug);
  if (!crew) {
    return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: OG.ground, color: OG.ink, fontSize: 140, alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: OG.display }}>ROLL CALL</div>, { ...size, fonts });
  }
  const { rows, members } = await getCrewTable(crew);
  const awards = seasonAwards(rows, sportOf(crew.sport).ratings, 1).slice(0, 4);
  const label = { fontSize: 22, letterSpacing: 4, textTransform: "uppercase" as const, color: OG.ink3, fontWeight: 700 };
  const tone = (t: string) => (t === "pitch" ? OG.pitch : t === "card" ? "#ffc53d" : t === "red" ? "#ff5c4d" : OG.ink);
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: OG.ground, color: OG.ink, padding: "48px 56px", fontFamily: OG.display }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...label }}>
          <span>
            {crew.name} · {crew.seasonName}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="28" height="28" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill={OG.pitch} /><path d="M15 33l10 10 25-25" fill="none" stroke="#06130b" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ROLL CALL
          </span>
        </div>
        <div style={{ display: "flex", fontSize: 108, fontWeight: 800, textTransform: "uppercase", lineHeight: 0.9, marginTop: 20 }}>Season awards</div>
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 34, gap: 16 }}>
          {awards.map((a) => {
            const m = members.find((x) => x.id === a.userId);
            return (
              <div key={a.key} style={{ display: "flex", flexDirection: "column", width: 528, background: OG.panel, border: `2px solid ${tone(a.tone)}`, borderRadius: 16, padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", ...label, color: tone(a.tone) }}>
                  <span>{a.label}</span>
                  <span>
                    {a.value} {a.unit}
                  </span>
                </div>
                <div style={{ display: "flex", fontSize: 54, fontWeight: 800, textTransform: "uppercase", lineHeight: 1, marginTop: 8 }}>{m?.name ?? "?"}</div>
              </div>
            );
          })}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

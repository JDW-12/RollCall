import { ImageResponse } from "next/og";
import { findCrewBySlug } from "@/lib/access";
import { getCrewTable } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { ratingsFor } from "@/domain/ratings";
import { golfSlots } from "@/components/player-card";
import { golfPlayers } from "@/lib/golf-card";
import { initials } from "@/lib/format";
import { OG, OG_MARK_PATH, ogFonts, ogTier } from "@/lib/og";

export const alt = "Roll Call player card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function Mark() {
  return (
    <svg width="34" height="34" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill={OG.pitch} />
      <path d={OG_MARK_PATH} fill="none" stroke={OG.pitchInk} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function Image({ params }: { params: Promise<{ slug: string; userId: string }> }) {
  const { slug, userId } = await params;
  const fonts = ogFonts();
  const crew = await findCrewBySlug(slug);
  const table = crew ? await getCrewTable(crew) : null;
  const m = table?.members.find((x) => x.id === userId);
  const row = table?.rows.find((r) => r.userId === userId);
  if (!crew || !m || !row || !table) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: OG.ground, color: OG.ink, fontSize: 140, alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: OG.display, letterSpacing: -2 }}>ROLL CALL</div>,
      { ...size, fonts },
    );
  }
  const sport = sportOf(crew.sport);
  const cats = ratingsFor(crew.sport, crew.ratings);
  // Golf is scored on the card and the votes: rank, points and rating all come from the golf leaderboard.
  const golf = sport.games.includes("stableford") ? (await golfPlayers(crew)).player(userId) : null;
  const rank = golf ? golf.rank : table.rows.findIndex((r) => r.userId === userId) + 1;
  const overall = golf ? golf.card.overall : row.card.overall;
  const tier = ogTier(overall, !!golf);
  const elite = tier === "Elite";

  // The player's own colour as the card ground, in hsl because satori cannot read oklch.
  const h = m.hue;
  const h2 = (h + 40) % 360;
  const light = `hsl(${h} 58% 84%)`;
  const mid = `hsl(${h} 52% 64%)`;
  const end = elite ? `hsl(${h2} 62% 58%)` : `hsl(${h} 46% 52%)`;
  const deep = `hsl(${h} 42% 15%)`;
  const avatarInk = `hsl(${h} 60% 88%)`;

  const label = { fontSize: 22, letterSpacing: 4, textTransform: "uppercase" as const, fontWeight: 700 };
  const stats: [string, number][] = golf ? golfSlots(golf.card, golf.row.points) : [
    ["TRN", row.card.turnsUp],
    ["FRM", row.card.form],
    [cats[0].stat, row.card.votes],
    [cats[1].stat, row.card.graft],
    ["STK", row.card.streak],
    ["PTS", Math.max(0, Math.min(99, row.points))],
  ];

  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: OG.ground, fontFamily: OG.display, color: OG.ink, overflow: "hidden" }}>
        {/* Pitch lines, faint, fading out towards the bottom right, then the floodlight behind the card. */}
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, backgroundImage: "linear-gradient(rgba(242,245,239,0.05) 1px, rgba(0,0,0,0) 1px), linear-gradient(90deg, rgba(242,245,239,0.05) 1px, rgba(0,0,0,0) 1px)", backgroundSize: "40px 40px" }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, background: "linear-gradient(160deg, rgba(11,18,16,0) 25%, rgba(11,18,16,0.96) 75%)" }} />
        <div style={{ position: "absolute", left: -260, top: -220, width: 1000, height: 1000, borderRadius: 500, background: `radial-gradient(circle at center, ${OG.glow} 0%, rgba(53,208,122,0.1) 34%, rgba(11,18,16,0) 62%)` }} />

        <div style={{ display: "flex", width: "100%", height: "100%", padding: 40 }}>
          {/* The card, as close to PlayerCard v2 as satori allows. */}
          <div
            style={{
              display: "flex",
              width: 420,
              height: 550,
              background: `linear-gradient(155deg, ${light} 0%, ${mid} 55%, ${end} 100%)`,
              color: deep,
              borderRadius: 26,
              padding: 5,
              marginRight: 44,
              boxShadow: "0 40px 80px -30px rgba(0,0,0,0.8)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                borderRadius: 22,
                border: "2px solid rgba(255,255,255,0.45)",
                padding: "24px 26px 22px",
                backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 40%)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 148, fontWeight: 800, lineHeight: 0.85, letterSpacing: -3 }}>{overall}</div>
                  <div style={{ display: "flex", ...label, fontSize: 20, opacity: 0.8, marginTop: 10 }}>{tier}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", width: 52, height: 52, borderRadius: 26, background: "rgba(0,0,0,0.14)", alignItems: "center", justifyContent: "center", ...label, fontSize: 18, letterSpacing: 1, opacity: 0.9 }}>
                    #{rank}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", ...label, fontSize: 18, letterSpacing: 3, opacity: 0.8, marginTop: 10, lineHeight: 1.25, textAlign: "right" }}>
                    <span>{crew.name}</span>
                    <span>{sport.label}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", width: 84, height: 84, borderRadius: 42, background: deep, color: avatarInk, alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, marginRight: 16, border: "3px solid rgba(255,255,255,0.4)" }}>
                  {initials(m.name)}
                </div>
                <div style={{ display: "flex", fontSize: 48, fontWeight: 800, textTransform: "uppercase", lineHeight: 0.92, maxWidth: 240 }}>{m.name}</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", borderTop: "2px solid rgba(0,0,0,0.18)", marginTop: 18, paddingTop: 12 }}>
                {stats.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", width: "33.33%", justifyContent: "space-between", alignItems: "baseline", paddingRight: 14, marginBottom: 4 }}>
                    <span style={{ ...label, fontSize: 16, letterSpacing: 2, opacity: 0.75 }}>{k}</span>
                    <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", ...label, fontSize: 15, letterSpacing: 3, opacity: 0.65, marginTop: 6 }}>
                <span>{sport.label}</span>
                <span>Roll Call</span>
              </div>
            </div>
          </div>

          {/* Stats big on dark. */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...label, fontSize: 26, color: OG.ink3 }}>
              <span>{crew.name} · peer rated</span>
              <span style={{ display: "flex", alignItems: "center", gap: 14, color: OG.ink }}>
                <Mark />
                ROLL CALL
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", marginTop: 30 }}>
              {stats.map(([k, v]) => (
                <div key={k} style={{ display: "flex", flexDirection: "column", width: "33.33%", marginBottom: 22 }}>
                  <span style={{ ...label, color: OG.pitch }}>{k}</span>
                  <span style={{ fontSize: 118, fontWeight: 800, lineHeight: 0.88, letterSpacing: -2, marginTop: 6 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flex: 1 }} />
            <div style={{ display: "flex", fontSize: 30, color: OG.ink2, fontWeight: 700 }}>
              {row.played} played · {row.streak} streak · {row.sickNotes} sick notes · form {row.form?.toFixed(1) ?? "–"}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

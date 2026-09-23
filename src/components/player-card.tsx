import type { CardStats } from "@/domain/table";
import type { RatingCategory } from "@/domain/sports";
import { initials } from "@/lib/format";
import { SportIcon } from "./icons";
import { Tilt } from "./tilt";
import { FlagEmblem } from "./golf/marks";
import { cls } from "./ui";

export type Tier = "elite" | "gold" | "silver" | "bronze";

export function tierOf(overall: number): Tier {
  if (overall >= 85) return "elite";
  if (overall >= 72) return "gold";
  if (overall >= 60) return "silver";
  return "bronze";
}

const TIER_LABEL: Record<Tier, string> = { elite: "Elite", gold: "Gold", silver: "Silver", bronze: "Sick note" };

/** Card ground per tier: the player's own hue for gold/silver/bronze, a holographic-leaning mix for elite. */
function ground(tier: Tier, hue: number): string {
  switch (tier) {
    case "elite":
      return `linear-gradient(155deg, oklch(0.93 0.06 ${hue}) 0%, oklch(0.8 0.13 ${hue}) 55%, oklch(0.7 0.16 ${(hue + 40) % 360}) 100%)`;
    case "gold":
      return `linear-gradient(155deg, oklch(0.92 0.09 88) 0%, oklch(0.78 0.15 80) 60%, oklch(0.66 0.15 70) 100%)`;
    case "silver":
      return `linear-gradient(155deg, oklch(0.94 0.01 250) 0%, oklch(0.8 0.02 250) 60%, oklch(0.68 0.03 250) 100%)`;
    default:
      return `linear-gradient(155deg, oklch(0.86 0.06 55) 0%, oklch(0.7 0.1 50) 60%, oklch(0.56 0.1 45) 100%)`;
  }
}

/**
 * Golf crews swap the six slots for the numbers a golfer cares about, and rate the card on their
 * scoring (see golfRating) rather than on turning up.
 */
export type GolfCardStats = { handicap: number | null; avg: number | null; best: number | null; birdies: number; wins: number; rounds: number; overall: number };

/** Golf's bottom tier: nobody on a golf card is a sick note, they just haven't found their swing yet. */
const GOLF_TIER_LABEL: Record<Tier, string> = { elite: "Green jacket", gold: "Gold", silver: "Silver", bronze: "Hacker" };

/**
 * Golf card grounds. Elite wears the green jacket (and gets gold trim and light ink to match); the
 * bottom tier is bunker sand rather than bronze.
 */
function golfGround(tier: Tier, hue: number): string {
  switch (tier) {
    case "elite":
      return "linear-gradient(155deg, #3a8a52 0%, #226b3a 50%, #174f2a 100%)";
    case "bronze":
      return "linear-gradient(155deg, #f3e3b8 0%, #dcc28a 58%, #bb9c60 100%)";
    default:
      return ground(tier, hue);
  }
}

export function golfSlots(g: GolfCardStats, points: number): [string, number][] {
  return [
    ["HCP", g.handicap ?? 0],
    ["AVG", Math.round(g.avg ?? 0)],
    ["BST", g.best ?? 0],
    ["BRD", Math.min(99, g.birdies)],
    ["WIN", Math.min(99, g.wins)],
    ["PTS", Math.max(0, Math.min(999, points))],
  ];
}

export type PlayerCardProps = {
  name: string;
  hue: number;
  crewName: string;
  sport: string;
  sportLabel: string;
  card: CardStats;
  rank: number;
  categories: RatingCategory[];
  points: number;
  season?: string;
  tilt?: boolean;
  className?: string;
  golf?: GolfCardStats | null;
};

/**
 * The collectible. Tier frame by overall rating, foil sheen, the player's colour as the ground,
 * six stats. Rendered in-page; the share-card image route draws the same thing.
 */
export function PlayerCard({ name, hue, crewName, sport, sportLabel, card, rank, categories, points, season, tilt = true, className, golf }: PlayerCardProps) {
  const overall = golf ? golf.overall : card.overall;
  const tier = tierOf(overall);
  const jacket = !!golf && tier === "elite";
  const dark = jacket ? "#f6efd2" : `oklch(0.22 0.05 ${hue})`;
  const stats: [string, number][] = golf ? golfSlots(golf, points) : [
    ["TRN", card.turnsUp],
    ["FRM", card.form],
    [categories[0]?.stat ?? "MOT", card.votes],
    [categories[1]?.stat ?? "GRF", card.graft],
    ["STK", card.streak],
    ["PTS", Math.max(0, Math.min(99, points))],
  ];
  const body = (
    <div
      className={cls("foil rounded-[18px] p-[3px] shadow-[var(--shadow)]", tier === "elite" && !jacket && "foil-elite", className)}
      style={{ background: golf ? golfGround(tier, hue) : ground(tier, hue), color: dark }}
    >
      {/* Golf cards are dimpled like the ball; the texture sits under the content and never over the numbers' ink. */}
      {golf ? <div className="dimples absolute inset-0 opacity-60 pointer-events-none" aria-hidden="true" /> : null}
      <div
        className={cls("relative rounded-[15px] border p-4 flex flex-col gap-3 h-full", jacket ? "border-[#d9b85c]" : "border-white/40")}
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 40%)", boxShadow: jacket ? "inset 0 0 0 1px rgba(217,184,92,0.5)" : undefined }}
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="display text-[66px] font-extrabold leading-[0.85] tnum">{overall}</span>
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase mt-1.5 opacity-75">{(golf ? GOLF_TIER_LABEL : TIER_LABEL)[tier]}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.12)" }}>
              {golf ? <FlagEmblem size={22} /> : <SportIcon sport={sport} size={18} />}
            </span>
            <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-right opacity-75 leading-tight">
              {crewName}
              <br />#{rank}
              {season ? (
                <>
                  <br />
                  {season}
                </>
              ) : null}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="w-14 h-14 rounded-full flex items-center justify-center display text-xl font-bold shrink-0 ring-2 ring-white/40" style={jacket ? { background: "#123d22", color: "#f6efd2" } : { background: dark, color: `oklch(0.93 0.05 ${hue})` }}>
            {initials(name)}
          </span>
          <span className="display text-[28px] font-extrabold uppercase leading-[0.92] wrap-anywhere">{name}</span>
        </div>
        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 border-t pt-3 mt-auto" style={{ borderColor: "rgba(0,0,0,0.18)" }}>
          {stats.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] tracking-[0.12em] opacity-75">{k}</span>
              <span className="display text-[22px] font-bold tnum">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.14em] uppercase opacity-60">
          <span>{golf ? `${sportLabel} · ${golf.rounds} ${golf.rounds === 1 ? "round" : "rounds"}` : sportLabel}</span>
          <span>{golf ? "Roll Call Golf Club" : "Roll Call"}</span>
        </div>
      </div>
    </div>
  );
  return tilt ? <Tilt>{body}</Tilt> : body;
}

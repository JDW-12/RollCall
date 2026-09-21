import type { CardStats } from "@/domain/table";
import type { RatingCategory } from "@/domain/sports";
import { initials } from "@/lib/format";
import { SportIcon } from "./icons";
import { Tilt } from "./tilt";
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

/** Golf crews swap the six slots for the numbers a golfer cares about. */
export type GolfCardStats = { handicap: number | null; avg: number | null; best: number | null; birdies: number; wins: number; rounds: number };

export function golfSlots(g: GolfCardStats, points: number): [string, number][] {
  return [
    ["HCP", g.handicap ?? 0],
    ["AVG", Math.round(g.avg ?? 0)],
    ["BST", g.best ?? 0],
    ["BRD", Math.min(99, g.birdies)],
    ["WIN", Math.min(99, g.wins)],
    ["PTS", Math.max(0, Math.min(99, points))],
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
  const tier = tierOf(card.overall);
  const dark = `oklch(0.22 0.05 ${hue})`;
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
      className={cls("foil rounded-[18px] p-[3px] shadow-[var(--shadow)]", tier === "elite" && "foil-elite", className)}
      style={{ background: ground(tier, hue), color: dark }}
    >
      <div className="rounded-[15px] border border-white/40 p-4 flex flex-col gap-3 h-full" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 40%)" }}>
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="display text-[66px] font-extrabold leading-[0.85] tnum">{card.overall}</span>
            <span className="font-mono text-[10px] tracking-[0.16em] uppercase mt-1.5 opacity-75">{TIER_LABEL[tier]}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.12)" }}>
              <SportIcon sport={sport} size={18} />
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
          <span className="w-14 h-14 rounded-full flex items-center justify-center display text-xl font-bold shrink-0 ring-2 ring-white/40" style={{ background: dark, color: `oklch(0.93 0.05 ${hue})` }}>
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
          <span>{sportLabel}</span>
          <span>Roll Call</span>
        </div>
      </div>
    </div>
  );
  return tilt ? <Tilt>{body}</Tilt> : body;
}

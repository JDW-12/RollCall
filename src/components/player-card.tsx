import type { CardStats } from "@/domain/table";
import type { RatingCategory } from "@/domain/sports";
import { initials } from "@/lib/format";

/** FIFA-style card built from peer ratings and attendance. Rendered in-page; the OG route draws the same thing. */
export function PlayerCard({ name, hue, crewName, sportLabel, card, rank, categories, votes }: { name: string; hue: number; crewName: string; sportLabel: string; card: CardStats; rank: number; categories: RatingCategory[]; votes: Record<string, number> }) {
  const tier = card.overall >= 85 ? "Elite" : card.overall >= 72 ? "Regular" : card.overall >= 60 ? "Squad" : "Sick note";
  return (
    <div
      className="rounded-md p-5 flex flex-col gap-4 text-[oklch(0.15_0.05_var(--h))]"
      style={{ ["--h" as string]: hue, background: `linear-gradient(160deg, oklch(0.9 0.08 ${hue}) 0%, oklch(0.78 0.12 ${hue}) 100%)` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="display text-[64px] font-extrabold leading-none tnum">{card.overall}</div>
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-80">{tier}</div>
        </div>
        <div className="text-right font-mono text-[11px] uppercase tracking-[0.12em] opacity-80">
          {crewName}
          <br />
          {sportLabel} · #{rank}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-16 h-16 rounded-full flex items-center justify-center display text-2xl font-bold" style={{ background: `oklch(0.3 0.08 ${hue})`, color: `oklch(0.92 0.05 ${hue})` }}>
          {initials(name)}
        </span>
        <div className="display text-3xl font-bold uppercase leading-none wrap-anywhere">{name}</div>
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-2 border-t pt-3" style={{ borderColor: `oklch(0.5 0.08 ${hue} / 0.4)` }}>
        {[
          ["TRN", card.turnsUp],
          ["FRM", card.form],
          [categories[0]?.stat ?? "MOT", card.votes],
          [categories[1]?.stat ?? "GRF", card.graft],
          ["STK", card.streak],
          [categories[2]?.stat ?? "HWL", Math.min(99, 45 + (votes[categories[2]?.key ?? "howler"] ?? 0) * 9)],
        ].map(([k, v]) => (
          <div key={String(k)} className="flex items-baseline justify-between">
            <span className="font-mono text-[11px] tracking-[0.1em] opacity-80">{k}</span>
            <span className="display text-2xl font-bold tnum">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCrewPage } from "@/lib/access";
import { getCrewLedger, getCrewTable } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { turnUpRate } from "@/domain/table";
import { CrewShell } from "@/components/shell";
import { PlayerCard } from "@/components/player-card";
import { ShareButtons } from "@/components/share";
import { PageTitle, Panel, Stat } from "@/components/ui";
import { pounds } from "@/lib/format";
import { getUser } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const u = await getUser(userId);
  return { title: u?.name ?? "Player" };
}

export default async function PlayerPage({ params }: { params: Promise<{ slug: string; userId: string }> }) {
  const { slug, userId } = await params;
  const { crew, user } = await requireCrewPage(slug);
  const { rows, members } = await getCrewTable(crew);
  const m = members.find((x) => x.id === userId);
  const row = rows.find((r) => r.userId === userId);
  if (!m || !row) notFound();
  const rank = rows.findIndex((r) => r.userId === userId) + 1;
  const sport = sportOf(crew.sport);
  const { balances } = await getCrewLedger(crew.id);
  const owed = balances.get(userId)?.owed ?? 0;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/crew/${crew.slug}/players/${userId}`;
  return (
    <CrewShell crew={crew} user={user} active="table">
      <PageTitle eyebrow={`#${rank} in ${crew.name}`} title={m.name} />
      <div className="grid gap-4 sm:grid-cols-[300px_1fr] items-start">
        <PlayerCard name={m.name} hue={m.hue} crewName={crew.name} sportLabel={sport.label} card={row.card} rank={rank} categories={sport.ratings} points={row.points} />
        <div className="flex flex-col gap-3">
          <Panel className="p-4 grid grid-cols-2 gap-4">
            <Stat label="Played" value={row.played} />
            <Stat label="Turns up" value={row.expected + row.lateDrops ? `${Math.round(turnUpRate(row) * 100)}%` : "–"} tone={turnUpRate(row) >= 0.85 ? "good" : undefined} />
            <Stat label="Form" value={row.form?.toFixed(1) ?? "–"} />
            <Stat label="Streak" value={row.streak} tone={row.streak >= 3 ? "good" : undefined} />
            <Stat label="Points" value={row.points} />
            <Stat label="Sick notes" value={row.sickNotes} tone={row.sickNotes > 0 ? "bad" : undefined} sub={row.sickNotes ? `${row.lateDrops} late · ${row.noShows} no-show` : undefined} />
          </Panel>
          <Panel className="p-4 flex flex-col gap-1">
            <div className="eyebrow">Votes</div>
            {sport.ratings.map((c) => (
              <div key={c.key} className="flex items-center justify-between text-sm">
                <span>{c.label}</span>
                <span className="tnum font-semibold">{row.votes[c.key] ?? 0}</span>
              </div>
            ))}
          </Panel>
          <Panel className="p-4 flex items-center justify-between">
            <span className="eyebrow">Balance</span>
            <span className={`display text-2xl font-bold tnum ${owed > 0 ? "text-red" : "text-pitch-deep"}`}>{owed > 0 ? `Owes ${pounds(owed)}` : owed < 0 ? `In credit ${pounds(-owed)}` : "Settled"}</span>
          </Panel>
          <ShareButtons text={`${m.name}'s ${crew.name} card. Overall ${row.card.overall}.`} url={url} label="Share card" />
        </div>
      </div>
    </CrewShell>
  );
}

import { appUrl } from "@/lib/env";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireCrewPage } from "@/lib/access";
import { getCrewLedger, getCrewTable, getUser } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { turnUpRate } from "@/domain/table";
import { CrewShell } from "@/components/shell";
import { PlayerCard } from "@/components/player-card";
import { ShareButtons } from "@/components/share";
import { AnimatedNumber } from "@/components/animated-number";
import { FormDots } from "@/components/sparkline";
import { IconCoins, IconFlame, IconTrophy } from "@/components/icons";
import { PageTitle, Panel, Stat, cls } from "@/components/ui";
import { pounds } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const u = await getUser(userId);
  return { title: u?.name ?? "Player" };
}

const BAR = ["bg-pitch", "bg-pitch-deep", "bg-card"];

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
  const url = `${await appUrl()}/crew/${crew.slug}/players/${userId}`;
  const hasRate = row.expected + row.lateDrops > 0;
  const rate = Math.round(turnUpRate(row) * 100);
  const maxVotes = Math.max(1, ...sport.ratings.map((c) => row.votes[c.key] ?? 0));

  return (
    <CrewShell crew={crew} user={user} active="table">
      <PageTitle eyebrow={`#${rank} in ${crew.name} · ${crew.seasonName}`} title={m.name} />

      <div className="grid gap-5 sm:grid-cols-[minmax(0,340px)_1fr] items-start">
        <div className="w-full max-w-[340px] mx-auto sm:mx-0 anim-rise">
          <PlayerCard name={m.name} hue={m.hue} crewName={crew.name} sport={crew.sport} sportLabel={sport.label} card={row.card} rank={rank} categories={sport.ratings} points={row.points} season={crew.seasonName} tilt />
        </div>

        <div className="flex flex-col gap-3">
          <Panel className="p-4 grid grid-cols-3 gap-x-3 gap-y-5 anim-rise-2">
            <Stat label="Points" value={<AnimatedNumber value={row.points} />} />
            <Stat label="Played" value={<AnimatedNumber value={row.played} />} sub={<FormDots history={row.history} />} />
            <Stat label="Turns up" value={hasRate ? <AnimatedNumber value={rate} suffix="%" /> : "–"} tone={hasRate ? (rate >= 85 ? "good" : rate < 60 ? "bad" : undefined) : undefined} />
            <Stat label="Form" value={row.form === null ? "–" : <AnimatedNumber value={row.form} decimals={1} />} sub="last five, out of 10" />
            <Stat
              label="Streak"
              value={
                <span className="inline-flex items-center gap-1">
                  <IconFlame size={22} className={cls(row.streak >= 3 ? "text-card anim-flame" : "text-ink-3")} />
                  <AnimatedNumber value={row.streak} />
                </span>
              }
              tone={row.streak >= 3 ? "good" : undefined}
              sub="in a row"
            />
            <Stat label="Sick notes" value={<AnimatedNumber value={row.sickNotes} />} tone={row.sickNotes > 0 ? "bad" : undefined} sub={`${row.lateDrops} late · ${row.noShows} no-show`} />
          </Panel>

          <Panel className="p-4 flex flex-col gap-3 anim-rise-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-md bg-ground-2 border border-line flex items-center justify-center shrink-0 text-pitch">
                <IconTrophy size={16} />
              </span>
              <div className="eyebrow">Votes</div>
            </div>
            {sport.ratings.map((c, i) => {
              const n = row.votes[c.key] ?? 0;
              return (
                <div key={c.key} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{c.label}</span>
                    <span className="display text-xl font-bold tnum">{n}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ground-2 overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={maxVotes} aria-valuenow={n} aria-label={c.label}>
                    <div className={cls("h-full rounded-full", BAR[i] ?? "bg-ink-3")} style={{ width: `${Math.round((n / maxVotes) * 100)}%`, transition: "width .6s cubic-bezier(.2,.8,.2,1)" }} />
                  </div>
                </div>
              );
            })}
          </Panel>

          <Panel className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-md bg-ground-2 border border-line flex items-center justify-center shrink-0 text-ink-2">
                <IconCoins size={16} />
              </span>
              <span className="eyebrow">Balance</span>
            </div>
            <span className={cls("display text-2xl font-bold tnum", owed > 0 ? "text-red" : "text-pitch")}>{owed > 0 ? `Owes ${pounds(owed)}` : owed < 0 ? `In credit ${pounds(-owed)}` : "Settled"}</span>
          </Panel>

          <ShareButtons text={`${m.name}'s ${crew.name} card. Overall ${row.card.overall}.`} url={url} label="Share card" />
        </div>
      </div>
    </CrewShell>
  );
}

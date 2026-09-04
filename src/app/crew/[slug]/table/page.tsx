import type { Metadata } from "next";
import Link from "next/link";
import { requireCrewPage } from "@/lib/access";
import { getCrewTable } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { turnUpRate } from "@/domain/table";
import { CrewShell } from "@/components/shell";
import { Avatar } from "@/components/avatar";
import { PageTitle, Panel, Pill } from "@/components/ui";

export const metadata: Metadata = { title: "Table" };

export default async function TablePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { crew, user } = await requireCrewPage(slug);
  const { rows, members } = await getCrewTable(crew);
  const sport = sportOf(crew.sport);
  const top = sport.ratings[0];
  const sick = [...rows].filter((r) => r.sickNotes > 0).sort((a, b) => b.sickNotes - a.sickNotes).slice(0, 3);
  const streaks = [...rows].filter((r) => r.streak >= 2).sort((a, b) => b.streak - a.streak).slice(0, 3);
  const played = rows.reduce((t, r) => t + r.played, 0);
  return (
    <CrewShell crew={crew} user={user} active="table">
      <PageTitle eyebrow={crew.seasonName} title="The table">
        +3 for turning up, +{top.points} per {top.label.toLowerCase()} vote, +1 per {sport.ratings[1].label.toLowerCase()} vote, −2 late drop, −3 no-show.
      </PageTitle>
      {played === 0 && rows.every((r) => r.sickNotes === 0) ? (
        <p className="text-ink-2">Nothing on the board yet. It fills in once the organiser confirms the first session as played.</p>
      ) : (
        <>
          <Panel className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="eyebrow text-left bg-ground-2">
                  <th className="font-normal px-3 py-2 w-8">#</th>
                  <th className="font-normal px-2 py-2">Player</th>
                  <th className="font-normal px-2 py-2 text-right">Pl</th>
                  <th className="font-normal px-2 py-2 text-right">Turns up</th>
                  <th className="font-normal px-2 py-2 text-right">Form</th>
                  <th className="font-normal px-2 py-2 text-right">{top.stat}</th>
                  <th className="font-normal px-2 py-2 text-right">Sick</th>
                  <th className="font-normal px-3 py-2 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const m = members.find((x) => x.id === r.userId);
                  if (!m) return null;
                  const rate = r.expected + r.lateDrops > 0 ? Math.round(turnUpRate(r) * 100) : null;
                  return (
                    <tr key={r.userId} className="border-t border-line-2 hover:bg-ground-2">
                      <td className="px-3 py-2 display text-lg font-bold text-ink-3 tnum">{i + 1}</td>
                      <td className="px-2 py-2">
                        <Link href={`/crew/${crew.slug}/players/${r.userId}`} className="flex items-center gap-2">
                          <Avatar name={m.name} hue={m.hue} size={28} />
                          <span className="font-semibold truncate">{m.name}</span>
                          {r.streak >= 3 ? <Pill tone="good">{r.streak}🔥</Pill> : null}
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-right tnum">{r.played}</td>
                      <td className="px-2 py-2 text-right tnum">{rate === null ? <span className="text-ink-3">–</span> : <span className={rate >= 85 ? "text-pitch-deep" : rate < 60 ? "text-red" : ""}>{rate}%</span>}</td>
                      <td className="px-2 py-2 text-right tnum">{r.form?.toFixed(1) ?? <span className="text-ink-3">–</span>}</td>
                      <td className="px-2 py-2 text-right tnum">{r.votes[top.key] ?? 0}</td>
                      <td className="px-2 py-2 text-right tnum">{r.sickNotes ? <span className="text-red">{r.sickNotes}</span> : 0}</td>
                      <td className="px-3 py-2 text-right tnum display text-xl font-bold">{r.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
          <div className="grid gap-3 sm:grid-cols-2 mt-4">
            <Panel className="p-4">
              <div className="eyebrow mb-2">Sick note leaderboard</div>
              {sick.length === 0 ? (
                <p className="text-sm text-ink-3">Clean sheet. Nobody&apos;s let the crew down.</p>
              ) : (
                <ol className="flex flex-col gap-1.5">
                  {sick.map((r) => {
                    const m = members.find((x) => x.id === r.userId)!;
                    return (
                      <li key={r.userId} className="flex items-center gap-2 text-sm">
                        <Avatar name={m.name} hue={m.hue} size={24} />
                        <span className="flex-1">{m.name}</span>
                        <span className="text-ink-2 text-xs">
                          {r.lateDrops} late · {r.noShows} no-show
                        </span>
                        <span className="display font-bold text-red tnum">{r.sickNotes}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Panel>
            <Panel className="p-4">
              <div className="eyebrow mb-2">Streaks</div>
              {streaks.length === 0 ? (
                <p className="text-sm text-ink-3">Turn up twice in a row to start one.</p>
              ) : (
                <ol className="flex flex-col gap-1.5">
                  {streaks.map((r) => {
                    const m = members.find((x) => x.id === r.userId)!;
                    return (
                      <li key={r.userId} className="flex items-center gap-2 text-sm">
                        <Avatar name={m.name} hue={m.hue} size={24} />
                        <span className="flex-1">{m.name}</span>
                        <span className="display font-bold text-pitch-deep tnum">{r.streak} in a row</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Panel>
          </div>
        </>
      )}
    </CrewShell>
  );
}

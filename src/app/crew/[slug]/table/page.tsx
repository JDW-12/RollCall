import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireCrewPage } from "@/lib/access";
import { getCrewTable, getSessionBundle, listSessions } from "@/lib/queries";
import type { RatingCategory } from "@/domain/sports";
import { ratingsFor } from "@/domain/ratings";
import { POINTS, turnUpRate, type TableRow } from "@/domain/table";
import { CrewShell } from "@/components/shell";
import { Avatar } from "@/components/avatar";
import { FormDots } from "@/components/sparkline";
import { IconAlert, IconArrowDown, IconArrowUp, IconFlame, IconMedal, IconTrophy } from "@/components/icons";
import { LinkButton, PageTitle, Panel, cls } from "@/components/ui";

export const metadata: Metadata = { title: "Table" };

type Member = { id: string; name: string; hue: number };

/**
 * Where everyone stood before the latest played session. Points are exact (the latest session's
 * contribution is subtracted using the same rules as the table); the tie-breakers reuse current form and
 * turn-up rate. One extra query, whatever the season length. Null until two sessions have been played.
 */
async function previousRanks(crewId: string, rows: TableRow[], categories: RatingCategory[]): Promise<Map<string, number> | null> {
  const played = (await listSessions(crewId)).filter((s) => s.status === "played").sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  if (played.length < 2) return null;
  const bundle = await getSessionBundle(played[played.length - 1].id);
  if (!bundle) return null;
  const votesBy = new Map<string, Record<string, number>>();
  for (const r of bundle.ratings) {
    const v = votesBy.get(r.rateeId) ?? {};
    v[r.category] = (v[r.category] ?? 0) + 1;
    votesBy.set(r.rateeId, v);
  }
  const delta = (userId: string) => {
    const r = bundle.rsvps.find((x) => x.userId === userId);
    if (r?.lateDrop) return POINTS.lateDrop;
    const confirmed = bundle.attendance.find((a) => a.userId === userId)?.attended;
    if ((!r || r.status !== "in") && confirmed === undefined) return 0;
    if (!(confirmed ?? true)) return POINTS.noShow;
    const v = votesBy.get(userId) ?? {};
    return categories.reduce<number>((pts, c) => pts + (v[c.key] ?? 0) * c.points, POINTS.attended);
  };
  const before = rows
    .map((r) => ({ userId: r.userId, points: r.points - delta(r.userId), form: r.form ?? 0, rate: turnUpRate(r) }))
    .sort((a, b) => b.points - a.points || b.form - a.form || b.rate - a.rate || a.userId.localeCompare(b.userId));
  return new Map(before.map((p, i) => [p.userId, i + 1]));
}

const MEDAL = ["var(--card)", "var(--ink-3)", "oklch(0.68 0.13 50)"];

function Movement({ now, before }: { now: number; before?: number }) {
  if (before === undefined || before === now) return <span className="w-3 inline-block" aria-hidden="true" />;
  const up = before > now;
  return (
    <span className={cls("inline-flex items-center font-mono text-[10px] tnum", up ? "text-pitch" : "text-red")} aria-label={up ? `Up ${before - now}` : `Down ${now - before}`}>
      {up ? <IconArrowUp size={12} strokeWidth={2.4} /> : <IconArrowDown size={12} strokeWidth={2.4} />}
      {Math.abs(before - now)}
    </span>
  );
}

function Streak({ n, className }: { n: number; className?: string }) {
  if (n < 2) return null;
  return (
    <span className={cls("inline-flex items-center gap-0.5 font-mono text-[11px] text-card tnum", className)} aria-label={`${n} in a row`}>
      <IconFlame size={14} className={n >= 3 ? "anim-flame" : undefined} />
      {n}
    </span>
  );
}

function Podium({ rows, members, slug }: { rows: TableRow[]; members: Member[]; slug: string }) {
  const top = rows.slice(0, 3).map((r) => ({ r, m: members.find((x) => x.id === r.userId) }));
  // Centre is first. Second on the left, third on the right.
  const order = [1, 0, 2].filter((i) => top[i]?.m);
  const plinth = ["h-14", "h-9", "h-6"];
  return (
    <div className="grid grid-cols-3 gap-2 items-end px-2 pt-2 anim-rise" aria-label="Top three">
      {order.map((i) => {
        const { r, m } = top[i];
        const first = i === 0;
        return (
          <Link key={r.userId} href={`/crew/${slug}/players/${r.userId}`} className={cls("flex flex-col items-center gap-1.5 press", i === 1 && "order-1", first && "order-2", i === 2 && "order-3")}>
            <span className="relative">
              <Avatar name={m!.name} hue={m!.hue} size={first ? 76 : 56} className={cls("ring-2 ring-ground", first && "shadow-[var(--shadow)]")} />
              <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-panel border border-line flex items-center justify-center" style={{ color: MEDAL[i] }}>
                <IconMedal size={16} strokeWidth={2.2} />
              </span>
            </span>
            <span className={cls("font-semibold text-center leading-tight truncate max-w-full px-1", first ? "text-base" : "text-sm text-ink-2")}>{m!.name}</span>
            <span className={cls("display font-extrabold tnum leading-none", first ? "text-[44px]" : "text-[30px] text-ink-2")}>{r.points}</span>
            <span className="eyebrow">pts</span>
            <span className={cls("w-full rounded-t-md surface flex items-start justify-center pt-1.5 display text-lg font-bold tnum", plinth[i], first ? "text-pitch border-pitch/40" : "text-ink-3")}>{i + 1}</span>
          </Link>
        );
      })}
    </div>
  );
}

function SidePanel({ icon, title, children, className }: { icon: ReactNode; title: string; children: ReactNode; className?: string }) {
  return (
    <Panel className={cls("p-4 flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-md bg-ground-2 border border-line flex items-center justify-center shrink-0">{icon}</span>
        <div className="eyebrow">{title}</div>
      </div>
      {children}
    </Panel>
  );
}

export default async function TablePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { crew, user } = await requireCrewPage(slug);
  const { rows, members } = await getCrewTable(crew);
  const cats = ratingsFor(crew.sport, crew.ratings);
  const top = cats[0];
  const sick = [...rows].filter((r) => r.sickNotes > 0).sort((a, b) => b.sickNotes - a.sickNotes).slice(0, 3);
  const streaks = [...rows].filter((r) => r.streak >= 2).sort((a, b) => b.streak - a.streak).slice(0, 3);
  const played = rows.reduce((t, r) => t + r.played, 0);
  const live = !(played === 0 && rows.every((r) => r.sickNotes === 0));
  const before = live ? await previousRanks(crew.id, rows, cats) : null;

  return (
    <CrewShell crew={crew} user={user} active="table">
      <PageTitle eyebrow={crew.seasonName} title="The table" action={<LinkButton href={`/crew/${crew.slug}/season`} variant="secondary" className="min-h-9 px-3 text-sm">Season awards</LinkButton>}>
        +3 for turning up, +{top.points} per {top.label.toLowerCase()} vote, +1 per {cats[1].label.toLowerCase()} vote, −2 late drop, −3 no-show.
      </PageTitle>
      {!live ? (
        <Panel className="p-8 flex flex-col items-center text-center gap-3 anim-rise">
          <span className="w-14 h-14 rounded-full bg-pitch-soft text-pitch flex items-center justify-center">
            <IconTrophy size={28} />
          </span>
          <div className="display text-2xl font-bold uppercase">Nothing on the board yet</div>
          <p className="text-ink-2 max-w-[38ch]">It fills in once the organiser confirms the first session as played.</p>
        </Panel>
      ) : (
        <>
          <Podium rows={rows} members={members} slug={crew.slug} />

          <Panel className="overflow-x-auto mt-4 anim-rise-2">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="eyebrow text-left bg-ground-2">
                  <th className="font-normal pl-3 pr-1 py-2.5 w-12">#</th>
                  <th className="font-normal px-2 py-2.5">Player</th>
                  <th className="font-normal px-2 py-2.5">Last 5</th>
                  <th className="font-normal px-2 py-2.5 text-right">Turns up</th>
                  <th className="font-normal px-2 py-2.5 text-right">Form</th>
                  <th className="font-normal px-2 py-2.5 text-right">{top.stat}</th>
                  <th className="font-normal px-2 py-2.5 text-right">Sick</th>
                  <th className="font-normal px-3 py-2.5 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const m = members.find((x) => x.id === r.userId);
                  if (!m) return null;
                  const rate = r.expected + r.lateDrops > 0 ? Math.round(turnUpRate(r) * 100) : null;
                  return (
                    <tr key={r.userId} className="border-t border-line-2 hover:bg-ground-2">
                      <td className="pl-3 pr-1 py-2">
                        <span className="flex items-center gap-1">
                          <span className={cls("display text-xl font-bold tnum w-5", i < 3 ? "text-ink" : "text-ink-3")}>{i + 1}</span>
                          {before ? <Movement now={i + 1} before={before.get(r.userId)} /> : null}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <Link href={`/crew/${crew.slug}/players/${r.userId}`} className="flex items-center gap-2 min-w-0">
                          <Avatar name={m.name} hue={m.hue} size={30} />
                          <span className="font-semibold truncate">{m.name}</span>
                          <Streak n={r.streak} />
                        </Link>
                      </td>
                      <td className="px-2 py-2">
                        <FormDots history={r.history} />
                      </td>
                      <td className="px-2 py-2 text-right tnum">
                        {rate === null ? <span className="text-ink-3">–</span> : <span className={cls("font-semibold", rate >= 85 ? "text-pitch" : rate < 60 ? "text-red" : "text-ink-2")}>{rate}%</span>}
                      </td>
                      <td className="px-2 py-2 text-right tnum text-ink-2">{r.form?.toFixed(1) ?? <span className="text-ink-3">–</span>}</td>
                      <td className="px-2 py-2 text-right tnum text-ink-2">{r.votes[top.key] ?? 0}</td>
                      <td className="px-2 py-2 text-right tnum">{r.sickNotes ? <span className="text-red font-semibold">{r.sickNotes}</span> : <span className="text-ink-3">0</span>}</td>
                      <td className="px-3 py-2 text-right tnum display text-2xl font-extrabold">{r.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2 mt-4 anim-rise-3">
            <SidePanel icon={<IconAlert size={16} className="text-red" />} title="Sick note leaderboard">
              {sick.length === 0 ? (
                <p className="text-sm text-ink-3">Clean sheet. Nobody&apos;s let the crew down.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {sick.map((r) => {
                    const m = members.find((x) => x.id === r.userId)!;
                    return (
                      <li key={r.userId} className="flex items-center gap-2.5 text-sm">
                        <Avatar name={m.name} hue={m.hue} size={28} />
                        <span className="flex-1 font-semibold truncate">{m.name}</span>
                        <span className="text-ink-3 text-xs tnum">
                          {r.lateDrops} late · {r.noShows} no-show
                        </span>
                        <span className="display text-2xl font-extrabold text-red tnum w-8 text-right">{r.sickNotes}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </SidePanel>
            <SidePanel icon={<IconFlame size={16} className="text-card" />} title="Streaks">
              {streaks.length === 0 ? (
                <p className="text-sm text-ink-3">Turn up twice in a row to start one.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {streaks.map((r) => {
                    const m = members.find((x) => x.id === r.userId)!;
                    return (
                      <li key={r.userId} className="flex items-center gap-2.5 text-sm">
                        <Avatar name={m.name} hue={m.hue} size={28} />
                        <span className="flex-1 font-semibold truncate">{m.name}</span>
                        <span className="text-ink-3 text-xs">in a row</span>
                        <span className="display text-2xl font-extrabold text-pitch tnum w-8 text-right inline-flex items-center justify-end gap-0.5">
                          <IconFlame size={16} className={cls("text-card", r.streak >= 3 && "anim-flame")} />
                          {r.streak}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </SidePanel>
          </div>
        </>
      )}
    </CrewShell>
  );
}

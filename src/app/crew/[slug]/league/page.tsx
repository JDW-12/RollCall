import type { Metadata } from "next";
import Link from "next/link";
import { nowMs } from "@/lib/clock";
import { requireCrewPage } from "@/lib/access";
import { crewMatchStats, listCompetitions, listFixtures, listMembers } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { PROVIDER_LABEL, fixtureLine, resultOf, sameTeam, teamRecord, type Provider, type StandingRow } from "@/domain/league";
import { seasonLeaders, seasonStats } from "@/domain/match-stats";
import { CrewShell } from "@/components/shell";
import { Avatar } from "@/components/avatar";
import { ResultPills } from "@/components/sparkline";
import { IconBolt, IconFlag, IconMedal, IconPin } from "@/components/icons";
import { EmptyState, Eyebrow, LinkButton, PageTitle, Panel, Pill, Stat, cls } from "@/components/ui";
import { fmtDay, relativeDay } from "@/lib/format";

export const metadata: Metadata = { title: "League" };

export default async function LeaguePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ c?: string }> }) {
  const { slug } = await params;
  const { c } = await searchParams;
  const { crew, user, isOrganiser } = await requireCrewPage(slug);
  const sport = sportOf(crew.sport);
  const [competitions, fixtures, members, season] = await Promise.all([listCompetitions(crew.id), listFixtures(crew.id), listMembers(crew.id), crewMatchStats(crew.id)]);

  const selected = competitions.find((x) => x.id === c) ?? competitions[0] ?? null;
  const mine = selected ? fixtures.filter((f) => f.competitionId === selected.id) : fixtures;
  const now = nowMs();
  const played = mine.filter((f) => f.goalsFor !== null && f.goalsAgainst !== null);
  const upcoming = mine.filter((f) => f.goalsFor === null && f.startsAt.getTime() > now - 6 * 60 * 60_000).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const record = teamRecord(mine.map((f) => ({ goalsFor: f.goalsFor, goalsAgainst: f.goalsAgainst, startsAt: f.startsAt.getTime(), competitionId: f.competitionId })));
  const standings: StandingRow[] = selected?.standings ? (JSON.parse(selected.standings) as StandingRow[]) : [];
  const usInTable = standings.find((r) => sameTeam(r.team, selected?.teamName || crew.name));
  const stats = seasonStats(season.stats, season.appearances);
  const leaders = seasonLeaders(stats);
  const name = (id: string) => members.find((m) => m.id === id);
  const member = (id: string) => name(id)?.name ?? "Someone";

  return (
    <CrewShell crew={crew} user={user} active="league">
      <PageTitle
        eyebrow={selected ? `${PROVIDER_LABEL[selected.provider as Provider] ?? "League"} · ${crew.seasonName}` : crew.seasonName}
        title={selected ? selected.name : "League"}
        action={
          isOrganiser ? (
            <LinkButton href={`/crew/${crew.slug}/settings#league`} variant="secondary" className="min-h-9 px-3 text-sm">
              {competitions.length ? "Edit" : "Link a league"}
            </LinkButton>
          ) : undefined
        }
      >
        {selected?.externalUrl ? (
          <a href={selected.externalUrl} target="_blank" rel="noreferrer noopener" className="text-sm font-semibold text-pitch underline">
            Open it on {PROVIDER_LABEL[selected.provider as Provider] ?? "the league site"}
          </a>
        ) : null}
      </PageTitle>

      {competitions.length > 1 ? (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-3">
          {competitions.map((comp) => (
            <Link
              key={comp.id}
              href={`/crew/${crew.slug}/league?c=${comp.id}`}
              className={cls("press shrink-0 rounded-full border px-3 h-9 inline-flex items-center text-xs font-semibold whitespace-nowrap", comp.id === selected?.id ? "border-pitch bg-pitch-soft text-pitch" : "border-line bg-panel-2 text-ink-2")}
            >
              {comp.name}
            </Link>
          ))}
        </div>
      ) : null}

      {!competitions.length && !fixtures.length ? (
        <>
          <EmptyState
            title="No league linked"
            body={`Playing in a league or a cup? Link it and every fixture, result and player stat lands here. ${isOrganiser ? "" : "Ask an organiser to set it up."}`}
            action={isOrganiser ? <LinkButton href={`/crew/${crew.slug}/settings#league`}>Link a league</LinkButton> : undefined}
          />
          {sport.finders.length ? (
            <section className="mt-5 flex flex-col gap-2">
              <Eyebrow>Find one</Eyebrow>
              {sport.finders.map((f) => (
                <a key={f.url} href={f.url} target="_blank" rel="noreferrer noopener" className="press surface p-4 flex items-start gap-3 hover:border-ink-3">
                  <span className="w-9 h-9 rounded-md bg-ground-2 border border-line flex items-center justify-center shrink-0 text-pitch">
                    <IconFlag size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="font-semibold block">{f.label}</span>
                    <span className="text-sm text-ink-2 block">{f.blurb}</span>
                  </span>
                </a>
              ))}
            </section>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col gap-5">
          <Panel className="p-4 grid grid-cols-3 gap-x-3 gap-y-5 anim-rise">
            <Stat label="Played" value={record.played} />
            <Stat label="Record" value={`${record.won}-${record.drawn}-${record.lost}`} sub="W-D-L" />
            <Stat label="Points" value={record.points} tone={record.points > 0 ? "good" : undefined} />
            <Stat label="Scored" value={record.goalsFor} />
            <Stat label="Conceded" value={record.goalsAgainst} tone={record.goalsAgainst > record.goalsFor ? "bad" : undefined} />
            <div className="flex flex-col gap-1 min-w-0">
              <Eyebrow>Form</Eyebrow>
              {record.form.length ? <ResultPills results={record.form} /> : <span className="text-ink-3">–</span>}
            </div>
          </Panel>

          {upcoming.length ? (
            <section className="flex flex-col gap-2 anim-rise-2">
              <Eyebrow>Next up</Eyebrow>
              {upcoming.slice(0, 4).map((f) => (
                <Link key={f.id} href={`/crew/${crew.slug}/s/${f.id}`} className="press surface p-4 flex items-center justify-between gap-3 hover:border-ink-3">
                  <div className="min-w-0">
                    <div className="display text-xl font-bold uppercase truncate">{fixtureLine({ us: selected?.teamName || crew.name, opponent: f.opponent, homeAway: f.homeAway, goalsFor: null, goalsAgainst: null })}</div>
                    <div className="text-sm text-ink-2 flex items-center gap-2 flex-wrap">
                      <span>{relativeDay(f.startsAt)}</span>
                      {f.round ? (
                        <>
                          <span className="text-ink-3">·</span>
                          <span>{f.round}</span>
                        </>
                      ) : null}
                      {f.venueName ? (
                        <>
                          <span className="text-ink-3">·</span>
                          <span className="inline-flex items-center gap-1">
                            <IconPin size={13} />
                            {f.venueName}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <Pill tone={f.homeAway === "home" ? "good" : "neutral"}>{f.homeAway === "home" ? "Home" : f.homeAway === "away" ? "Away" : "Neutral"}</Pill>
                </Link>
              ))}
            </section>
          ) : null}

          {standings.length ? (
            <section className="flex flex-col gap-2 anim-rise-2">
              <div className="flex items-end justify-between gap-3">
                <Eyebrow>The table</Eyebrow>
                <span className="text-xs text-ink-3">{selected?.standingsUpdatedAt ? `Pasted ${fmtDay(selected.standingsUpdatedAt)}` : ""}</span>
              </div>
              <Panel className="overflow-x-auto">
                <table className="w-full text-sm font-mono tnum">
                  <thead>
                    <tr className="eyebrow text-left">
                      <th className="font-normal px-3 py-2">#</th>
                      <th className="font-normal py-2">Team</th>
                      <th className="font-normal py-2 px-1 text-right">P</th>
                      <th className="font-normal py-2 px-1 text-right">W</th>
                      <th className="font-normal py-2 px-1 text-right">D</th>
                      <th className="font-normal py-2 px-1 text-right">L</th>
                      <th className="font-normal py-2 px-1 text-right">GD</th>
                      <th className="font-normal px-3 py-2 text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((r) => {
                      const us = usInTable && r.team === usInTable.team;
                      return (
                        <tr key={`${r.position}-${r.team}`} className={cls("border-t border-line-2", us && "bg-pitch-soft")}>
                          <td className="px-3 py-2 text-ink-3">{r.position}</td>
                          <td className={cls("py-2 font-sans truncate max-w-[16ch]", us ? "font-bold text-pitch" : "font-semibold")}>{r.team}</td>
                          <td className="py-2 px-1 text-right">{r.played}</td>
                          <td className="py-2 px-1 text-right">{r.won}</td>
                          <td className="py-2 px-1 text-right">{r.drawn}</td>
                          <td className="py-2 px-1 text-right">{r.lost}</td>
                          <td className="py-2 px-1 text-right text-ink-2">{r.goalDifference === null ? "–" : r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}</td>
                          <td className={cls("px-3 py-2 text-right font-bold", us && "text-pitch")}>{r.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Panel>
            </section>
          ) : isOrganiser && selected ? (
            <Panel className="p-4 anim-rise-2">
              <Eyebrow className="mb-2">The table</Eyebrow>
              <p className="text-sm text-ink-2">
                Neither the FA nor Powerleague offer a feed anyone can read, so the table is pasted in.{" "}
                <Link href={`/crew/${crew.slug}/settings#league`} className="underline font-semibold text-pitch">
                  Copy it off your league page
                </Link>{" "}
                and it renders here.
              </p>
            </Panel>
          ) : null}

          {played.length ? (
            <section className="flex flex-col gap-2 anim-rise-3">
              <Eyebrow>Results</Eyebrow>
              <Panel className="divide-y divide-line-2">
                {played.map((f) => {
                  const r = resultOf(f.goalsFor, f.goalsAgainst)!;
                  return (
                    <Link key={f.id} href={`/crew/${crew.slug}/s/${f.id}`} className="flex items-center gap-3 px-3 py-2.5 press hover:bg-ground-2">
                      <span className={cls("w-7 h-7 rounded-md flex items-center justify-center display font-bold text-sm shrink-0", r === "W" ? "bg-pitch text-pitch-ink" : r === "D" ? "bg-ground-2 text-ink-2 border border-line" : "bg-red-soft text-red")}>{r}</span>
                      <span className="flex-1 min-w-0">
                        <span className="font-semibold block truncate">{fixtureLine({ us: selected?.teamName || crew.name, opponent: f.opponent, homeAway: f.homeAway, goalsFor: f.goalsFor, goalsAgainst: f.goalsAgainst })}</span>
                        <span className="text-xs text-ink-3">
                          {fmtDay(f.startsAt)}
                          {f.round ? ` · ${f.round}` : ""}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </Panel>
            </section>
          ) : null}

          {stats.some((s) => s.apps > 0) ? (
            <section className="flex flex-col gap-2 anim-rise-3">
              <Eyebrow>Players</Eyebrow>
              {leaders.topScorer || leaders.topAssister || leaders.bestRated ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {leaders.topScorer ? <LeaderCard icon={<IconMedal size={16} />} label="Top scorer" who={member(leaders.topScorer.userId)} value={`${leaders.topScorer.goals} goal${leaders.topScorer.goals === 1 ? "" : "s"}`} /> : null}
                  {leaders.topAssister ? <LeaderCard icon={<IconBolt size={16} />} label="Most assists" who={member(leaders.topAssister.userId)} value={`${leaders.topAssister.assists}`} /> : null}
                  {leaders.bestRated ? <LeaderCard icon={<IconMedal size={16} />} label="Best rated" who={member(leaders.bestRated.userId)} value={`${leaders.bestRated.avgRating}/10`} /> : null}
                </div>
              ) : null}
              <Panel className="overflow-x-auto">
                <table className="w-full text-sm font-mono tnum">
                  <thead>
                    <tr className="eyebrow text-left">
                      <th className="font-normal px-3 py-2">Player</th>
                      <th className="font-normal py-2 text-right">Apps</th>
                      <th className="font-normal py-2 text-right">Gls</th>
                      <th className="font-normal py-2 text-right">Ast</th>
                      <th className="font-normal px-3 py-2 text-right">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats
                      .filter((s) => s.apps > 0)
                      .map((s) => {
                        const m = name(s.userId);
                        return (
                          <tr key={s.userId} className="border-t border-line-2">
                            <td className="px-3 py-2">
                              <Link href={`/crew/${crew.slug}/players/${s.userId}`} className="flex items-center gap-2 min-w-0 font-sans font-semibold press">
                                {m ? <Avatar name={m.name} hue={m.hue} size={26} /> : null}
                                <span className="truncate">{m?.name ?? "Someone"}</span>
                              </Link>
                            </td>
                            <td className="py-2 text-right text-ink-2">{s.apps}</td>
                            <td className={cls("py-2 text-right", s.goals ? "text-pitch font-bold" : "")}>{s.goals || "–"}</td>
                            <td className="py-2 text-right">{s.assists || "–"}</td>
                            <td className="px-3 py-2 text-right">{s.avgRating ?? "–"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </Panel>
              <p className="text-xs text-ink-3">Apps come from who the organiser confirmed played. Goals, assists and ratings are entered on each fixture.</p>
            </section>
          ) : null}
        </div>
      )}
    </CrewShell>
  );
}

function LeaderCard({ icon, label, who, value }: { icon: React.ReactNode; label: string; who: string; value: string }) {
  return (
    <div className="surface p-3 flex items-center gap-3">
      <span className="w-9 h-9 rounded-md bg-ground-2 border border-line flex items-center justify-center shrink-0 text-pitch">{icon}</span>
      <span className="min-w-0">
        <span className="eyebrow block">{label}</span>
        <span className="font-semibold block truncate">{who}</span>
        <span className="text-xs text-ink-3">{value}</span>
      </span>
    </div>
  );
}

import { appUrl } from "@/lib/env";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { optionalCrewPage } from "@/lib/access";
import { PlayerPreview } from "@/components/previews";
import { track } from "@/lib/events";
import { crewMatchStats, getCrewLedger, getCrewTable, getUser, golfRounds } from "@/lib/queries";
import { golfStats } from "@/domain/golf-stats";
import { seasonStats } from "@/domain/match-stats";
import { RESULT_LABEL } from "@/domain/golf-highlights";
import { sportOf } from "@/domain/sports";
import { ratingsFor } from "@/domain/ratings";
import { turnUpRate } from "@/domain/table";
import { CrewShell } from "@/components/shell";
import { PlayerCard } from "@/components/player-card";
import { golfPlayers } from "@/lib/golf-card";
import { ShareButtons } from "@/components/share";
import { AnimatedNumber } from "@/components/animated-number";
import { FormDots } from "@/components/sparkline";
import { IconCoins, IconFlag, IconFlame, IconGolf, IconTrophy } from "@/components/icons";
import { PageTitle, Panel, Stat, cls } from "@/components/ui";
import { fmtToPar, pounds } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  const u = await getUser(userId);
  return { title: u?.name ?? "Player" };
}

const BAR = ["bg-pitch", "bg-pitch-deep", "bg-card"];

export default async function PlayerPage({ params }: { params: Promise<{ slug: string; userId: string }> }) {
  const { slug, userId } = await params;
  const gate = await optionalCrewPage(slug);
  if (!gate.member) {
    const t = await getCrewTable(gate.crew);
    const pm = t.members.find((x) => x.id === userId);
    const prow = t.rows.find((r) => r.userId === userId);
    if (!pm || !prow) notFound();
    await track("preview_view", { crewId: gate.crew.id, userId: gate.user?.id ?? null, payload: { what: "player", player: userId } });
    return <PlayerPreview crew={gate.crew} member={pm} row={prow} rank={t.rows.findIndex((r) => r.userId === userId) + 1} />;
  }
  const { crew, user } = gate.member;
  const { rows, members } = await getCrewTable(crew);
  const m = members.find((x) => x.id === userId);
  const row = rows.find((r) => r.userId === userId);
  if (!m || !row) notFound();
  const rank = rows.findIndex((r) => r.userId === userId) + 1;
  const sport = sportOf(crew.sport);
  const cats = ratingsFor(crew.sport, crew.ratings);
  const { balances } = await getCrewLedger(crew.id);
  const owed = balances.get(userId)?.owed ?? 0;
  const url = `${await appUrl()}/crew/${crew.slug}/players/${userId}`;
  const hasRate = row.expected + row.lateDrops > 0;
  const rate = Math.round(turnUpRate(row) * 100);
  const maxVotes = Math.max(1, ...cats.map((c) => row.votes[c.key] ?? 0));
  const golf = sport.games.includes("stableford") ? golfStats(await golfRounds(crew.id), userId) : null;
  const fixtureSeason = sport.finders.length && !sport.games.includes("stableford") ? await crewMatchStats(crew.id) : null;
  const pitch = fixtureSeason ? (seasonStats(fixtureSeason.stats, fixtureSeason.appearances).find((r) => r.userId === userId) ?? null) : null;
  // Golf: the card's points, rank and rating come from the golf leaderboard, not the attendance table.
  const golfPlayer = golf ? (await golfPlayers(crew)).player(userId) : null;
  const golfCard = golfPlayer?.card ?? null;

  return (
    <CrewShell crew={crew} user={user} active="table">
      <PageTitle eyebrow={`#${golfPlayer?.rank ?? rank} in ${crew.name} · ${crew.seasonName}`} title={m.name} />

      <div className="grid gap-5 sm:grid-cols-[minmax(0,340px)_1fr] items-start">
        <div className="w-full max-w-[340px] mx-auto sm:mx-0 anim-rise">
          <PlayerCard name={m.name} hue={m.hue} crewName={crew.name} sport={crew.sport} sportLabel={sport.label} card={row.card} rank={golfPlayer?.rank ?? rank} categories={cats} points={golfPlayer?.row.points ?? row.points} season={crew.seasonName} tilt golf={golfCard} />
        </div>

        <div className="flex flex-col gap-3">
          {golfPlayer ? (
            // Golf: scored on the card and the votes. No turn-up rate, streaks or sick notes.
            <Panel className="p-4 grid grid-cols-3 gap-x-3 gap-y-5 anim-rise-2">
              <Stat label="Points" value={<AnimatedNumber value={golfPlayer.row.points} />} sub={`${golfPlayer.row.stableford} Stableford + ${golfPlayer.row.votePoints} votes`} />
              <Stat label="Rounds" value={<AnimatedNumber value={golfPlayer.row.rounds} />} />
              <Stat label="Avg" value={golfPlayer.row.avg === null ? "–" : <AnimatedNumber value={golfPlayer.row.avg} decimals={1} />} sub="Stableford a round" />
            </Panel>
          ) : (
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
          )}

          {pitch && pitch.apps > 0 ? (
            <Panel className="p-4 flex flex-col gap-3 anim-rise-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-md bg-ground-2 border border-line flex items-center justify-center shrink-0 text-pitch">
                  <IconFlag size={16} />
                </span>
                <div className="eyebrow">Fixtures</div>
              </div>
              <div className="grid grid-cols-4 gap-x-3 gap-y-4">
                <Stat label="Apps" value={<AnimatedNumber value={pitch.apps} />} />
                <Stat label="Goals" value={<AnimatedNumber value={pitch.goals} />} tone={pitch.goals > 0 ? "good" : undefined} />
                <Stat label="Assists" value={<AnimatedNumber value={pitch.assists} />} />
                <Stat label="Avg" value={pitch.avgRating === null ? "–" : <AnimatedNumber value={pitch.avgRating} decimals={1} />} sub="manager's mark" />
              </div>
            </Panel>
          ) : null}

          {golf ? (
            <Panel className="p-4 flex flex-col gap-3 anim-rise-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-md bg-ground-2 border border-line flex items-center justify-center shrink-0 text-pitch">
                    <IconGolf size={16} />
                  </span>
                  <div className="eyebrow">Stableford</div>
                </div>
                {golf.handicap !== null ? <span className="eyebrow">Off {golf.handicap}</span> : null}
              </div>
              {golf.rounds || golf.results.par || golf.results.birdie || golf.results.bogey ? (
                <div className="grid grid-cols-3 gap-x-3 gap-y-4">
                  <Stat label="Rounds" value={<AnimatedNumber value={golf.rounds} />} />
                  <Stat label="Avg pts" value={<AnimatedNumber value={golf.avg ?? 0} decimals={1} />} tone={(golf.avg ?? 0) >= 36 ? "good" : undefined} />
                  <Stat label="Wins" value={<AnimatedNumber value={golf.wins} />} tone={golf.wins > 0 ? "good" : undefined} />
                  <div className="col-span-3 flex items-end justify-between gap-3">
                    <div className="text-sm">
                      <span className="text-ink-3">Best round </span>
                      <span className="display text-xl font-bold tnum">{golf.bestScore ? fmtToPar(golf.bestScore.toPar) : "–"}</span>
                      {golf.bestScore ? (
                        <span className="text-ink-3">
                          {" "}
                          · {golf.bestScore.gross} at {golf.bestScore.title}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-end gap-1 h-8" aria-label={`Last rounds: ${golf.recent.join(", ")} points`}>
                      {golf.recent.map((p, i) => (
                        <span key={i} className={cls("w-3 rounded-sm", p >= 36 ? "bg-pitch" : p >= 30 ? "bg-pitch-deep" : "bg-ink-3")} style={{ height: `${Math.max(4, Math.min(32, p * 0.7))}px` }} title={`${p} pts`} />
                      ))}
                    </div>
                  </div>
                  <div className="col-span-3 grid grid-cols-4 gap-2 text-center">
                    {(["holeInOne", "eagle", "birdie", "par"] as const).map((k) => (
                      <div key={k} className={cls("rounded-md border border-line px-2 py-1.5", golf.results[k] > 0 && k !== "par" ? "bg-pitch-soft border-pitch/40" : "bg-panel-2")}>
                        <div className={cls("display text-xl font-extrabold tnum leading-none", golf.results[k] > 0 && k !== "par" ? "text-pitch" : "")}>{golf.results[k]}</div>
                        <div className="eyebrow mt-0.5">{k === "holeInOne" ? "Aces" : `${RESULT_LABEL[k]}s`}</div>
                      </div>
                    ))}
                  </div>
                  <div className="col-span-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="eyebrow">Best hole</div>
                      <div className="font-semibold">{golf.bestHole ? `${RESULT_LABEL[golf.bestHole.result]} · ${golf.bestHole.hole}th` : "–"}</div>
                      {golf.bestHole ? <div className="text-xs text-ink-3 truncate">{golf.bestHole.title}</div> : null}
                    </div>
                    <div>
                      <div className="eyebrow">Longest drive</div>
                      <div className="font-semibold">{golf.longestDrive ? `${golf.longestDrive.yards} yds` : "–"}</div>
                      {golf.longestDrive ? <div className="text-xs text-ink-3 truncate">{golf.longestDrive.title}</div> : null}
                    </div>
                    <div>
                      <div className="eyebrow">Balls lost</div>
                      <div className={cls("font-semibold", golf.ballsLost >= 5 && "text-red")}>{golf.ballsLost}</div>
                      <div className="text-xs text-ink-3">this season</div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-2">No cards yet. Save a card on any round and the numbers start here.</p>
              )}
            </Panel>
          ) : null}

          <Panel className="p-4 flex flex-col gap-3 anim-rise-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-md bg-ground-2 border border-line flex items-center justify-center shrink-0 text-pitch">
                <IconTrophy size={16} />
              </span>
              <div className="eyebrow">Votes</div>
            </div>
            {cats.map((c, i) => {
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

          <ShareButtons text={`${m.name}'s ${crew.name} card. Overall ${row.card.overall}.`} url={url} label="Share card" crewId={crew.id} what="player" />
        </div>
      </div>
    </CrewShell>
  );
}

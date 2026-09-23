import type { Crew } from "@/db/schema";
import { sportOf } from "@/domain/sports";
import { ratingsFor } from "@/domain/ratings";
import { golfPlayers, type GolfPlayer } from "@/lib/golf-card";
import { fmtDay } from "@/lib/format";
import { PlayerCard } from "./player-card";
import { Eyebrow, LinkButton, Panel } from "./ui";
import type { CardStats } from "@/domain/table";
import { Scorecard, ordinal } from "./golf/scorecard";
import { FormChart } from "./golf/form-chart";
import { LeaderBoard } from "./golf/leader-board";

/** The golf card ignores the attendance stats, but the component still takes a row of them. */
const NO_TEAM_STATS: CardStats = { turnsUp: 0, form: 0, votes: 0, graft: 0, streak: 0, overall: 0 };

/**
 * The golf crew's home: your card beside your last round as a real scorecard, your form as flagsticks,
 * then the crew on the clubhouse leader board. It replaces the attendance table a five-a-side crew
 * sees, because golf is scored on the card.
 */
export async function GolfHome({ crew, myId }: { crew: Crew; myId: string }) {
  const { members, table, player } = await golfPlayers(crew);
  const sport = sportOf(crew.sport);
  const cats = ratingsFor(crew.sport, crew.ratings);
  const me = player(myId);
  const meMember = members.find((m) => m.id === myId);

  return (
    <>
      {me && meMember ? (
        <section className="flex flex-col gap-3 mb-8 anim-rise-2" aria-label="Your card">
          <div className="flex items-end justify-between">
            <div>
              <Eyebrow>{crew.seasonName}</Eyebrow>
              <h2 className="text-2xl font-bold uppercase">Your card</h2>
            </div>
            <LinkButton href={`/crew/${crew.slug}/players/${myId}`} variant="ghost" className="min-h-9 px-3 text-sm">
              Your stats
            </LinkButton>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,280px)_1fr] items-start">
            <div className="w-full max-w-[280px] mx-auto sm:mx-0 flex flex-col gap-3">
              <PlayerCard name={meMember.name} hue={meMember.hue} crewName={crew.name} sport={crew.sport} sportLabel={sport.label} card={NO_TEAM_STATS} rank={me.rank} categories={cats} points={me.row.points} season={crew.seasonName} golf={me.card} />
              <Form me={me} />
            </div>
            <LatestRound player={me} slug={crew.slug} />
          </div>
        </section>
      ) : null}

      <div className="mb-8 anim-rise-3">
        <LeaderBoard
          label="The crew"
          title="Leaders"
          columns={["Rds", "Last"]}
          rows={table.flatMap((r) => {
            const m = members.find((x) => x.id === r.userId);
            const p = player(r.userId);
            if (!m || !p) return [];
            return [
              {
                key: r.userId,
                href: `/crew/${crew.slug}/players/${r.userId}`,
                name: m.name,
                you: r.userId === myId,
                sub: p.latest ? `${p.latest.mine.total} pts at ${p.latest.round.course ?? p.latest.round.title} · ${ordinal(p.latest.place)}` : "No rounds yet",
                cells: [r.rounds, p.latest ? p.latest.mine.total : "–"],
                points: r.points,
              },
            ];
          })}
          footer={
            <span className="flex items-center justify-between gap-3">
              <span>Stableford points plus the crew&apos;s votes. Nothing for turning up.</span>
              <LinkButton href={`/crew/${crew.slug}/table`} variant="ghost" className="min-h-8 px-2 text-xs text-white hover:bg-white/10 shrink-0">
                Full board
              </LinkButton>
            </span>
          }
        />
      </div>
    </>
  );
}

/** Form as a stat tile: the headline average, the best, and the last five rounds as flagsticks. */
function Form({ me }: { me: GolfPlayer }) {
  if (!me.form.length) return null;
  return (
    <Panel className="p-3 flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="eyebrow">Form</div>
          <div className="text-[11px] text-ink-3">Stableford, last {me.form.length === 1 ? "round" : `${me.form.length} rounds`}</div>
        </div>
        <div className="text-right leading-none">
          <div className="display text-3xl font-extrabold">{me.card.avg?.toFixed(1) ?? "–"}</div>
          <div className="eyebrow mt-0.5">avg{me.card.best !== null ? ` · best ${me.card.best}` : ""}</div>
        </div>
      </div>
      <FormChart rounds={me.form} />
    </Panel>
  );
}

function LatestRound({ player, slug }: { player: GolfPlayer; slug: string }) {
  const latest = player.latest;
  if (!latest) {
    return (
      <Panel className="p-5 flex flex-col gap-2 items-start">
        <Eyebrow>Latest round</Eyebrow>
        <p className="text-sm text-ink-2 max-w-[42ch]">Nothing on the card yet. Play a round, fill in your scores hole by hole and hit Submit: it lands here as your scorecard and goes straight onto the leader board.</p>
      </Panel>
    );
  }
  const { round, mine, place } = latest;
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <h3 className="eyebrow">Latest round</h3>
      <Scorecard
        course={round.course ?? round.title}
        tee={latest.tee}
        date={fmtDay(new Date(round.startsAt))}
        holes={latest.holes}
        strokes={latest.strokes}
        handicap={latest.handicap}
        stableford={mine.stableford}
        votePoints={mine.votePoints}
        total={mine.total}
        place={place}
        field={round.rows.length}
      />
      <div className="flex gap-2">
        <LinkButton href={`/crew/${slug}/table?round=${round.sessionId}`} variant="secondary" className="min-h-9 px-3 text-sm">
          See the round
        </LinkButton>
        <LinkButton href={`/crew/${slug}/s/${round.sessionId}`} variant="ghost" className="min-h-9 px-3 text-sm">
          Open card
        </LinkButton>
      </div>
    </div>
  );
}

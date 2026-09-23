import Link from "next/link";
import type { Crew } from "@/db/schema";
import { sportOf } from "@/domain/sports";
import { ratingsFor } from "@/domain/ratings";
import type { Member } from "@/lib/queries";
import { golfPlayers } from "@/lib/golf-card";
import { fmtDay } from "@/lib/format";
import { Avatar } from "./avatar";
import { PlayerCard, tierOf } from "./player-card";
import { IconGolf } from "./icons";
import { Eyebrow, LinkButton, Panel, cls } from "./ui";
import type { CardStats } from "@/domain/table";

const ORDINAL = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
/** The golf card ignores the attendance stats, but the component still takes a row of them. */
const NO_TEAM_STATS: CardStats = { turnsUp: 0, form: 0, votes: 0, graft: 0, streak: 0, overall: 0 };

/**
 * The golf crew's home: your card and your last round at the top, then everyone's card in miniature
 * with how their last round went. It replaces the attendance table a five-a-side crew sees, because
 * golf is scored on the card.
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
          <div className="grid gap-4 sm:grid-cols-[minmax(0,300px)_1fr] items-start">
            <div className="w-full max-w-[300px] mx-auto sm:mx-0">
              <PlayerCard name={meMember.name} hue={meMember.hue} crewName={crew.name} sport={crew.sport} sportLabel={sport.label} card={NO_TEAM_STATS} rank={me.rank} categories={cats} points={me.row.points} season={crew.seasonName} golf={me.card} />
            </div>
            <LatestRound player={me} slug={crew.slug} members={members} />
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3 mb-8 anim-rise-3" aria-label="The crew">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>{crew.seasonName}</Eyebrow>
            <h2 className="text-2xl font-bold uppercase">The crew</h2>
          </div>
          <LinkButton href={`/crew/${crew.slug}/table`} variant="ghost" className="min-h-9 px-3 text-sm">
            Leaderboard
          </LinkButton>
        </div>
        <Panel className="overflow-hidden divide-y divide-line-2">
          {table.map((r, i) => {
            const m = members.find((x) => x.id === r.userId);
            const p = player(r.userId);
            if (!m || !p) return null;
            const tier = tierOf(p.card.overall);
            return (
              <Link key={r.userId} href={`/crew/${crew.slug}/players/${r.userId}`} className={cls("flex items-center gap-3 px-3 py-2.5 hover:bg-ground-2 press", r.userId === myId && "bg-pitch-soft")}>
                <span className={cls("display text-2xl font-bold w-6 tnum", i === 0 && r.points > 0 ? "text-pitch" : "text-ink-3")}>{i + 1}</span>
                <Avatar name={m.name} hue={m.hue} size={34} />
                <div className="flex-1 min-w-0 leading-tight">
                  <div className="font-semibold truncate">{m.name}</div>
                  <div className="text-xs text-ink-3 truncate">
                    {p.latest ? `${p.latest.mine.total} pts at ${p.latest.round.course ?? p.latest.round.title} · ${ORDINAL(p.latest.place)}` : "No rounds yet"}
                  </div>
                </div>
                {/* The card rating, coloured by tier, like a mini card. */}
                <span
                  className={cls(
                    "display text-lg font-extrabold tnum w-10 h-10 rounded-md inline-flex items-center justify-center shrink-0",
                    tier === "elite" ? "bg-pitch text-pitch-ink" : tier === "gold" ? "bg-card text-pitch-ink" : "bg-ground-2 text-ink-2 border border-line",
                  )}
                  title="Card rating"
                >
                  {p.card.overall}
                </span>
                <span className="display text-[28px] font-bold tnum w-12 text-right leading-none">{r.points}</span>
              </Link>
            );
          })}
        </Panel>
      </section>
    </>
  );
}

function LatestRound({ player, slug, members }: { player: NonNullable<ReturnType<Awaited<ReturnType<typeof golfPlayers>>["player"]>>; slug: string; members: Member[] }) {
  const latest = player.latest;
  if (!latest) {
    return (
      <Panel className="p-4 flex flex-col gap-2">
        <Eyebrow>Latest round</Eyebrow>
        <p className="text-sm text-ink-2">Nothing yet. Play a round, fill in your card and hit submit: it lands here and on the leaderboard.</p>
      </Panel>
    );
  }
  const { round, mine, place } = latest;
  const winner = round.rows[0];
  const winnerName = members.find((m) => m.id === winner?.userId)?.name;
  return (
    <Panel className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>Latest round</Eyebrow>
          <div className="display text-2xl font-bold uppercase leading-tight wrap-anywhere mt-0.5 inline-flex items-center gap-2">
            <IconGolf size={18} className="text-pitch shrink-0" />
            {round.course ?? round.title}
          </div>
          <div className="text-xs text-ink-3 mt-0.5">{fmtDay(new Date(round.startsAt))}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="display text-4xl font-extrabold tnum text-pitch leading-none">{mine.total}</div>
          <div className="eyebrow mt-1">points</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Tile label="Stableford" value={String(mine.stableford)} sub={mine.holesPlayed < round.holes ? `${mine.holesPlayed} of ${round.holes} holes` : `${round.holes} holes`} />
        <Tile label="Votes" value={`+${mine.votePoints}`} sub={mine.votePoints ? "from the crew" : "none yet"} />
        <Tile label="Finished" value={ORDINAL(place)} sub={`of ${round.rows.length}`} />
      </div>
      {winner && winner.userId !== player.row.userId && winnerName ? (
        <p className="text-xs text-ink-3">
          {winnerName} won it with {winner.total}.
        </p>
      ) : place === 1 && round.rows.length > 1 ? (
        <p className="text-xs text-pitch font-semibold">You won it.</p>
      ) : null}
      <div className="flex gap-2">
        <LinkButton href={`/crew/${slug}/table?round=${round.sessionId}`} variant="secondary" className="min-h-9 px-3 text-sm">
          See the round
        </LinkButton>
        <LinkButton href={`/crew/${slug}/s/${round.sessionId}`} variant="ghost" className="min-h-9 px-3 text-sm">
          Open card
        </LinkButton>
      </div>
    </Panel>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-line bg-panel-2 px-2 py-2">
      <div className="eyebrow">{label}</div>
      <div className="display text-2xl font-extrabold tnum leading-none mt-1">{value}</div>
      <div className="text-[11px] text-ink-3 mt-1 truncate">{sub}</div>
    </div>
  );
}

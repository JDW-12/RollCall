import "server-only";
import type { Crew, User } from "@/db/schema";
import { sportOf } from "@/domain/sports";
import type { CrewSummary } from "@/domain/dashboard";
import { crewMatchStats, getCrewTable, getNextSession, rsvpsFor } from "./queries";
import { golfPlayers } from "./golf-card";

/**
 * One summary per crew for the personal dashboard: where you sit, your card number, your numbers,
 * and the next session you can see with your answer to it. Golf reads its leader board (Stableford
 * plus votes, no attendance points); every other sport reads the crew table.
 */
export async function crewSummaries(user: User, crews: (Crew & { role: string })[]): Promise<CrewSummary[]> {
  return Promise.all(
    crews.map(async (crew): Promise<CrewSummary> => {
      const viewer = { id: user.id, isOrganiser: crew.role === "organiser" };
      const sport = sportOf(crew.sport);
      const [table, next, stats, golf] = await Promise.all([
        getCrewTable(crew),
        getNextSession(crew.id, new Date(), viewer),
        sport.finders.length ? crewMatchStats(crew.id) : Promise.resolve(null),
        crew.sport === "golf" ? golfPlayers(crew) : Promise.resolve(null),
      ]);
      const idx = table.rows.findIndex((r) => r.userId === user.id);
      const row = idx === -1 ? null : table.rows[idx];
      const me = golf?.player(user.id) ?? null;
      // "Next up" means still to come: an open session that has finished but isn't confirmed yet isn't next.
      const upcoming = next && next.startsAt.getTime() + next.durationMin * 60_000 >= Date.now() ? next : null;
      const mine = upcoming ? (await rsvpsFor([upcoming.id])).find((r) => r.userId === user.id)?.status ?? null : null;
      const scored = me ? me.row.points > 0 : !!row && row.points > 0;
      return {
        crewId: crew.id,
        slug: crew.slug,
        name: crew.name,
        sport: crew.sport,
        hue: crew.hue,
        role: crew.role,
        rank: scored ? (me ? me.rank : idx + 1) : null,
        of: table.members.length,
        points: me ? me.row.points : (row?.points ?? 0),
        rating: me ? me.card.overall : (row?.card.overall ?? 0),
        // Golf is played on the card, not the register: rounds count as played, and it stays out of turn-up.
        played: me ? me.card.rounds : (row?.played ?? 0),
        expected: me ? 0 : (row?.expected ?? 0),
        lateDrops: me ? 0 : (row?.lateDrops ?? 0),
        streak: me ? 0 : (row?.streak ?? 0),
        votes: row ? Object.values(row.votes).reduce((a, v) => a + v, 0) : 0,
        goals: stats?.stats.filter((s) => s.userId === user.id).reduce((a, s) => a + s.goals, 0) ?? 0,
        assists: stats?.stats.filter((s) => s.userId === user.id).reduce((a, s) => a + s.assists, 0) ?? 0,
        golf: me ? { bestToPar: me.card.bestToPar, rounds: me.card.rounds } : crew.sport === "golf" ? { bestToPar: null, rounds: 0 } : null,
        next: upcoming ? { id: upcoming.id, title: upcoming.title, startsAt: upcoming.startsAt.getTime(), venueName: upcoming.venueName, mine } : null,
      };
    }),
  );
}

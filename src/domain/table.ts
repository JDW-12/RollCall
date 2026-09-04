import type { RatingCategory } from "./sports";

/**
 * The crew table. Points, form, streaks and the numbers on a player card.
 * Pure: takes plain rows, returns rows. Sorted by points, then form, then turn-up rate.
 */

export const POINTS = {
  attended: 3,
  lateDrop: -2,
  noShow: -3,
} as const;

export type TableSession = {
  id: string;
  startsAt: number;
  status: "open" | "played" | "cancelled";
};

export type TableRsvp = { sessionId: string; userId: string; status: "in" | "reserve" | "out"; lateDrop: boolean };
export type TableAttendance = { sessionId: string; userId: string; attended: boolean };
export type TableRating = { sessionId: string; category: string; rateeId: string };

export type CardStats = {
  /** 0-99 each, FIFA style. */
  turnsUp: number;
  form: number;
  votes: number;
  graft: number;
  streak: number;
  overall: number;
};

export type TableRow = {
  userId: string;
  played: number;
  /** Sessions where the player held a spot at kick-off (played + no-shows). */
  expected: number;
  noShows: number;
  lateDrops: number;
  /** Late drops + no-shows. The banter stat. */
  sickNotes: number;
  /** Votes per rating category key. */
  votes: Record<string, number>;
  points: number;
  /** Rolling average of the last five sessions played, 4.0 - 10.0. Null until they've played. */
  form: number | null;
  streak: number;
  card: CardStats;
};

export type TableInput = {
  memberIds: string[];
  sessions: TableSession[];
  rsvps: TableRsvp[];
  attendance: TableAttendance[];
  ratings: TableRating[];
  categories: RatingCategory[];
};

const FORM_BASE = 6.0;
const FORM_WINDOW = 5;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Per-session performance score for a player who attended. */
export function sessionScore(votes: Record<string, number>, categories: RatingCategory[], raterCount: number): number {
  let score = FORM_BASE;
  for (const c of categories) {
    const v = votes[c.key] ?? 0;
    if (v === 0) continue;
    // Share of the room that voted for you, scaled so a unanimous MOTM pushes you to 10.
    const share = raterCount > 0 ? v / raterCount : 0;
    if (c.points >= 2) score += 4 * share;
    else if (c.points === 1) score += 2 * share;
    else score -= 1.5 * share;
  }
  return Math.round(clamp(score, 4, 10) * 10) / 10;
}

export function computeTable(input: TableInput): TableRow[] {
  const played = input.sessions
    .filter((s) => s.status === "played")
    .sort((a, b) => a.startsAt - b.startsAt);
  const playedIds = new Set(played.map((s) => s.id));

  const rsvpBy = new Map<string, TableRsvp[]>();
  for (const r of input.rsvps) {
    if (!playedIds.has(r.sessionId)) continue;
    const list = rsvpBy.get(r.sessionId) ?? [];
    list.push(r);
    rsvpBy.set(r.sessionId, list);
  }
  const attBy = new Map<string, Map<string, boolean>>();
  for (const a of input.attendance) {
    const m = attBy.get(a.sessionId) ?? new Map<string, boolean>();
    m.set(a.userId, a.attended);
    attBy.set(a.sessionId, m);
  }
  const ratingsBy = new Map<string, TableRating[]>();
  for (const r of input.ratings) {
    const list = ratingsBy.get(r.sessionId) ?? [];
    list.push(r);
    ratingsBy.set(r.sessionId, list);
  }

  const rows = new Map<string, TableRow & { scores: number[]; history: ("played" | "missed" | "skip")[] }>();
  for (const id of input.memberIds) {
    rows.set(id, {
      userId: id,
      played: 0,
      expected: 0,
      noShows: 0,
      lateDrops: 0,
      sickNotes: 0,
      votes: Object.fromEntries(input.categories.map((c) => [c.key, 0])),
      points: 0,
      form: null,
      streak: 0,
      card: { turnsUp: 0, form: 0, votes: 0, graft: 0, streak: 0, overall: 0 },
      scores: [],
      history: [],
    });
  }

  for (const s of played) {
    const rs = rsvpBy.get(s.id) ?? [];
    const att = attBy.get(s.id) ?? new Map<string, boolean>();
    const sessionRatings = ratingsBy.get(s.id) ?? [];
    const raterIds = new Set(sessionRatings.map((r) => `${r.sessionId}:${r.category}:${r.rateeId}`));
    // Number of distinct raters is not stored on the rating row; approximate by the max votes in any category
    // over all players, which equals the number of raters when everyone answered the top question.
    const perPlayerVotes = new Map<string, Record<string, number>>();
    for (const r of sessionRatings) {
      const v = perPlayerVotes.get(r.rateeId) ?? {};
      v[r.category] = (v[r.category] ?? 0) + 1;
      perPlayerVotes.set(r.rateeId, v);
    }
    let raterCount = 0;
    for (const c of input.categories) {
      let total = 0;
      for (const v of perPlayerVotes.values()) total += v[c.key] ?? 0;
      raterCount = Math.max(raterCount, total);
    }
    void raterIds;

    for (const row of rows.values()) {
      const r = rs.find((x) => x.userId === row.userId);
      if (r?.lateDrop) {
        row.lateDrops++;
        row.points += POINTS.lateDrop;
        row.history.push("missed");
        continue;
      }
      const confirmed = att.get(row.userId);
      // Expected if they held a spot, or if the organiser recorded them (a walk-on who turned up).
      if ((!r || r.status !== "in") && confirmed === undefined) {
        row.history.push("skip");
        continue;
      }
      row.expected++;
      const attended = confirmed ?? true;
      if (!attended) {
        row.noShows++;
        row.points += POINTS.noShow;
        row.history.push("missed");
        continue;
      }
      row.played++;
      row.points += POINTS.attended;
      row.history.push("played");
      const votes = perPlayerVotes.get(row.userId) ?? {};
      for (const c of input.categories) {
        const n = votes[c.key] ?? 0;
        row.votes[c.key] += n;
        row.points += n * c.points;
      }
      row.scores.push(sessionScore(votes, input.categories, raterCount));
    }
  }

  const out: TableRow[] = [];
  for (const row of rows.values()) {
    row.sickNotes = row.lateDrops + row.noShows;
    const recent = row.scores.slice(-FORM_WINDOW);
    row.form = recent.length ? Math.round((recent.reduce((a, b) => a + b, 0) / recent.length) * 10) / 10 : null;
    let streak = 0;
    for (let i = row.history.length - 1; i >= 0; i--) {
      const h = row.history[i];
      if (h === "played") streak++;
      else if (h === "missed") break;
    }
    row.streak = streak;
    row.card = cardStats(row, input.categories);
    const { scores: _s, history: _h, ...clean } = row;
    void _s;
    void _h;
    out.push(clean);
  }

  return out.sort(
    (a, b) =>
      b.points - a.points ||
      (b.form ?? 0) - (a.form ?? 0) ||
      turnUpRate(b) - turnUpRate(a) ||
      a.userId.localeCompare(b.userId),
  );
}

export function turnUpRate(row: Pick<TableRow, "played" | "expected" | "lateDrops">): number {
  const denom = row.expected + row.lateDrops;
  if (denom === 0) return 0;
  return row.played / denom;
}

export function cardStats(row: Omit<TableRow, "card">, categories: RatingCategory[]): CardStats {
  const top = categories.find((c) => c.points >= 2)?.key ?? "motm";
  const mid = categories.find((c) => c.points === 1)?.key ?? "grafter";
  const denom = row.expected + row.lateDrops;
  const turnsUp = denom === 0 ? 50 : Math.round(45 + 54 * turnUpRate(row));
  const form = row.form === null ? 50 : Math.round(((row.form - 4) / 6) * 60 + 39);
  const votes = clamp(45 + (row.votes[top] ?? 0) * 6, 45, 99);
  const graft = clamp(45 + (row.votes[mid] ?? 0) * 8, 45, 99);
  const streak = clamp(45 + row.streak * 9, 45, 99);
  const overall = Math.round(turnsUp * 0.35 + form * 0.3 + votes * 0.15 + graft * 0.1 + streak * 0.1);
  return { turnsUp, form, votes, graft, streak, overall: clamp(overall, 40, 99) };
}

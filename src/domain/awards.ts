import type { RatingCategory } from "./sports";
import { turnUpRate, type TableRow } from "./table";

/**
 * Season awards, computed from the table. Every award names one winner and the number that earned it.
 * Ties go to the higher-placed player in the table so the podium and the awards never disagree.
 */
export type Award = { key: string; label: string; blurb: string; userId: string; value: number; unit: string; tone: "pitch" | "card" | "red" | "ink" };

export function seasonAwards(rows: TableRow[], categories: RatingCategory[], minPlayed = 1): Award[] {
  const eligible = rows.filter((r) => r.played >= minPlayed);
  if (eligible.length === 0) return [];
  const top = categories[0];
  const mid = categories[1];
  const banter = categories[2];
  const pick = (score: (r: TableRow) => number, higherIsBetter = true) => {
    let best: TableRow | null = null;
    for (const r of eligible) {
      if (!best) best = r;
      else if (higherIsBetter ? score(r) > score(best) : score(r) < score(best)) best = r;
    }
    return best!;
  };
  const awards: Award[] = [];
  const champion = rows[0];
  if (champion && champion.played >= minPlayed) awards.push({ key: "champion", label: "Champion", blurb: "Top of the table when the music stopped.", userId: champion.userId, value: champion.points, unit: "pts", tone: "pitch" });
  if (top) {
    const w = pick((r) => r.votes[top.key] ?? 0);
    if ((w.votes[top.key] ?? 0) > 0) awards.push({ key: "player", label: "Player of the season", blurb: "Most votes from the people who were actually there.", userId: w.userId, value: w.votes[top.key] ?? 0, unit: "votes", tone: "pitch" });
  }
  const iron = pick((r) => turnUpRate(r) * 1000 + r.played);
  awards.push({ key: "iron", label: "Iron man", blurb: "Turned up more than anyone. Never a sick note.", userId: iron.userId, value: Math.round(turnUpRate(iron) * 100), unit: "%", tone: "ink" });
  const streak = pick((r) => r.streak);
  if (streak.streak >= 2) awards.push({ key: "streak", label: "Streak king", blurb: "Longest run of consecutive sessions.", userId: streak.userId, value: streak.streak, unit: "in a row", tone: "pitch" });
  if (mid) {
    const w = pick((r) => r.votes[mid.key] ?? 0);
    if ((w.votes[mid.key] ?? 0) > 0) awards.push({ key: "grafter", label: mid.label, blurb: "The engine room.", userId: w.userId, value: w.votes[mid.key] ?? 0, unit: "votes", tone: "card" });
  }
  // Sick note of the season considers everyone, including those who never actually made it.
  const sick = rows.reduce((best, r) => (r.sickNotes > best.sickNotes ? r : best), rows[0]);
  if (sick && sick.sickNotes > 0) awards.push({ key: "sicknote", label: "Sick note of the season", blurb: "Late drops and no-shows, counted.", userId: sick.userId, value: sick.sickNotes, unit: "sick notes", tone: "red" });
  if (banter) {
    const w = pick((r) => r.votes[banter.key] ?? 0);
    if ((w.votes[banter.key] ?? 0) > 0) awards.push({ key: "banter", label: banter.label, blurb: "Voted for by their mates. Repeatedly.", userId: w.userId, value: w.votes[banter.key] ?? 0, unit: "votes", tone: "card" });
  }
  return awards;
}

/**
 * Golf's season awards. Same shape as the team awards so the page draws them the same way, but won on
 * the card and the votes: no iron man, no streaks, no sick notes. Ties go to the higher-placed player
 * on the golf leaderboard, so the champion and the awards never disagree.
 */
export function golfSeasonAwards(
  table: { userId: string; points: number; rounds: number }[],
  stats: Map<string, { best: { points: number; title: string } | null; birdies: number; longestDrive: { yards: number; title: string } | null; ballsLost: number }>,
  votes: { category: string; rateeId: string }[],
  categories: RatingCategory[],
): Award[] {
  const eligible = table.filter((r) => r.rounds > 0 || r.points > 0);
  if (!eligible.length) return [];
  const awards: Award[] = [];
  const pick = (score: (userId: string) => number): { userId: string; value: number } | null => {
    let best: { userId: string; value: number } | null = null;
    for (const r of eligible) {
      const v = score(r.userId);
      if (v > 0 && (!best || v > best.value)) best = { userId: r.userId, value: v };
    }
    return best;
  };
  const champion = eligible[0];
  if (champion.points > 0) awards.push({ key: "champion", label: "Champion", blurb: "Top of the leaderboard: Stableford points plus the crew's votes.", userId: champion.userId, value: champion.points, unit: "pts", tone: "pitch" });
  const top = categories[0];
  if (top) {
    const w = pick((id) => votes.filter((v) => v.rateeId === id && v.category === top.key).length);
    if (w) awards.push({ key: "player", label: `${top.label} of the season`, blurb: "Voted for by the people who were out there with them.", userId: w.userId, value: w.value, unit: "votes", tone: "pitch" });
  }
  const round = pick((id) => stats.get(id)?.best?.points ?? 0);
  if (round) awards.push({ key: "round", label: "Round of the season", blurb: `The best card of the year${stats.get(round.userId)?.best?.title ? `, at ${stats.get(round.userId)!.best!.title}` : ""}.`, userId: round.userId, value: round.value, unit: "pts", tone: "card" });
  const birdies = pick((id) => stats.get(id)?.birdies ?? 0);
  if (birdies) awards.push({ key: "birdies", label: "Birdie machine", blurb: "Birdies or better, all season.", userId: birdies.userId, value: birdies.value, unit: "birdies", tone: "pitch" });
  const drive = pick((id) => stats.get(id)?.longestDrive?.yards ?? 0);
  if (drive) awards.push({ key: "drive", label: "Big hitter", blurb: "The longest drive anyone wrote down.", userId: drive.userId, value: drive.value, unit: "yds", tone: "ink" });
  const lost = pick((id) => stats.get(id)?.ballsLost ?? 0);
  if (lost) awards.push({ key: "lost", label: "Balls donated", blurb: "Generous to the lakes and the long grass.", userId: lost.userId, value: lost.value, unit: "balls", tone: "red" });
  return awards;
}

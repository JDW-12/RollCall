/**
 * Leagues and cups. The FA states publicly that it does not offer an API for Full-Time, and
 * Powerleague has none either, so a competition is: a link out, an optional official Full-Time feed
 * to embed, and a standings table the manager pastes in. Fixtures, scores and player numbers are
 * Roll Call's own, entered once and then shared with everyone who tapped in.
 */

export type Provider = "fa_fulltime" | "powerleague" | "other" | "manual";

export type StandingRow = {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDifference: number | null;
  points: number;
};

export type Result = "W" | "D" | "L";

export class LeagueError extends Error {}

const PROVIDERS: { provider: Provider; label: string; host: RegExp }[] = [
  { provider: "fa_fulltime", label: "FA Full-Time", host: /(^|\.)fulltime\.thefa\.com$/i },
  { provider: "powerleague", label: "Powerleague", host: /(^|\.)powerleague\.co\.uk$/i },
];

export const PROVIDER_LABEL: Record<Provider, string> = {
  fa_fulltime: "FA Full-Time",
  powerleague: "Powerleague",
  other: "League website",
  manual: "Run by us",
};

/** Works out who runs a league from the link the manager pasted. */
export function providerFromUrl(url: string): Provider {
  const host = hostOf(url);
  if (!host) return "manual";
  return PROVIDERS.find((p) => p.host.test(host))?.provider ?? "other";
}

function hostOf(url: string): string | null {
  try {
    return new URL(url.trim()).hostname;
  } catch {
    return null;
  }
}

/** Only http(s) links are stored, so a pasted `javascript:` never reaches an href. */
export function safeExternalUrl(url: string): string {
  const raw = url.trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    return u.toString().slice(0, 300);
  } catch {
    return "";
  }
}

/**
 * Pulls the Full-Time feed address out of whatever the league gave the manager: the embed snippet
 * from Full-Time Admin (Media → Code Snippets) or the plain page URL. Only fulltime.thefa.com is
 * accepted, so nothing else can be framed into the page.
 */
export function fullTimeEmbedUrl(input: string): string {
  const text = input.trim();
  if (!text) return "";
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>)]+/gi)) {
    const url = match[0];
    const host = hostOf(url);
    if (host && /(^|\.)fulltime\.thefa\.com$/i.test(host)) return safeExternalUrl(url);
  }
  return "";
}

/**
 * Turns a league table copied off a website into rows. Column orders vary by league, so each line
 * is read from the right: the trailing run of numbers is the stats, everything before it is the
 * team. A row is only kept when played equals won plus drawn plus lost, which quietly drops
 * headers, sponsor lines and anything else that came along with the copy.
 */
export function parseStandings(text: string): StandingRow[] {
  const rows: StandingRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    const row = parseStandingLine(line);
    if (row) rows.push({ ...row, position: rows.length + 1 });
  }
  if (!rows.length) throw new LeagueError("Couldn't read a table in that. Copy the rows straight off the league site, one team per line.");
  return rows;
}

function parseStandingLine(line: string): Omit<StandingRow, "position"> | null {
  const tokens = line.trim().split(/[\s\t|,]+/).filter(Boolean);
  if (tokens.length < 6) return null;
  // Walk back from the end while the tokens are numbers: those are the stats columns.
  let start = tokens.length;
  while (start > 0 && isNumber(tokens[start - 1])) start--;
  const name = tokens.slice(0, start).join(" ").replace(/^\d+\.?\s*/, "").replace(/^[-–]\s*/, "").trim();
  if (!name) return null;
  const nums = tokens.slice(start).map(Number);
  // A numeric suffix in the club's own name ("Athletic 1878") lands in the run, so try each start
  // and hand the numbers we skipped back to the team name.
  for (let i = 0; i + 5 <= nums.length; i++) {
    const team = i === 0 ? name : [name, ...tokens.slice(start, start + i)].join(" ").trim();
    const row = readStats(team, nums.slice(i));
    if (row) return row;
  }
  return null;
}

function readStats(team: string, n: number[]): Omit<StandingRow, "position"> | null {
  const [played, won, drawn, lost] = n;
  if (![played, won, drawn, lost].every((x) => Number.isInteger(x) && x >= 0)) return null;
  if (won + drawn + lost !== played || played === 0) return null;
  const points = n[n.length - 1];
  if (!Number.isInteger(points) || points < 0) return null;
  let goalsFor: number | null = null;
  let goalsAgainst: number | null = null;
  // P W D L F A [GD] Pts: goals only when there are enough columns between the results and the points.
  if (n.length >= 7 && Number.isInteger(n[4]) && Number.isInteger(n[5]) && n[4] >= 0 && n[5] >= 0) {
    goalsFor = n[4];
    goalsAgainst = n[5];
  }
  // P W D L GD Pts: no goal columns, but the difference is still worth keeping.
  const goalDifference = goalsFor !== null && goalsAgainst !== null ? goalsFor - goalsAgainst : n.length === 6 && Number.isInteger(n[4]) ? n[4] : null;
  return { team, played, won, drawn, lost, goalsFor, goalsAgainst, goalDifference, points };
}

function isNumber(t: string): boolean {
  return /^[-–+]?\d+$/.test(t);
}

/** Case- and punctuation-insensitive match so "Tuesday FC" finds "TUESDAY F.C." in a pasted table. */
export function sameTeam(a: string, b: string): boolean {
  return !!teamKey(a) && teamKey(a) === teamKey(b);
}

/** Strips punctuation first, so "F.C." and "FC" collapse the same way, then the usual club affixes. */
function teamKey(name: string): string {
  let k = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  let before = "";
  while (k !== before) {
    before = k;
    k = k.replace(/^(the)/, "").replace(/(fc|afc|cf|utd|united)$/, "");
  }
  return k;
}

export type PlayedFixture = { goalsFor: number | null; goalsAgainst: number | null; startsAt: number; competitionId: string | null };

export type TeamRecord = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** Most recent five first. */
  form: Result[];
};

export function resultOf(goalsFor: number | null, goalsAgainst: number | null): Result | null {
  if (goalsFor === null || goalsAgainst === null) return null;
  if (goalsFor > goalsAgainst) return "W";
  if (goalsFor < goalsAgainst) return "L";
  return "D";
}

/** The crew's own record from every fixture with a score, three points for a win. */
export function teamRecord(fixtures: PlayedFixture[], competitionId?: string | null): TeamRecord {
  const rows = fixtures
    .filter((f) => f.goalsFor !== null && f.goalsAgainst !== null)
    .filter((f) => (competitionId === undefined ? true : f.competitionId === competitionId))
    .sort((a, b) => a.startsAt - b.startsAt);
  const rec: TeamRecord = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] };
  for (const f of rows) {
    const r = resultOf(f.goalsFor, f.goalsAgainst)!;
    rec.played++;
    rec.goalsFor += f.goalsFor!;
    rec.goalsAgainst += f.goalsAgainst!;
    if (r === "W") {
      rec.won++;
      rec.points += 3;
    } else if (r === "D") {
      rec.drawn++;
      rec.points += 1;
    } else rec.lost++;
  }
  rec.goalDifference = rec.goalsFor - rec.goalsAgainst;
  rec.form = rows
    .slice(-5)
    .reverse()
    .map((f) => resultOf(f.goalsFor, f.goalsAgainst)!);
  return rec;
}

/** "Tuesday FC 3–1 Rangers" once a score is in, "v Rangers (A)" before. */
export function fixtureLine(opts: { us: string; opponent: string; homeAway: "home" | "away" | "neutral"; goalsFor: number | null; goalsAgainst: number | null }): string {
  const opponent = opts.opponent.trim() || "TBC";
  if (opts.goalsFor === null || opts.goalsAgainst === null) {
    const where = opts.homeAway === "home" ? "H" : opts.homeAway === "away" ? "A" : "N";
    return `v ${opponent} (${where})`;
  }
  return opts.homeAway === "away" ? `${opponent} ${opts.goalsAgainst}–${opts.goalsFor} ${opts.us}` : `${opts.us} ${opts.goalsFor}–${opts.goalsAgainst} ${opponent}`;
}

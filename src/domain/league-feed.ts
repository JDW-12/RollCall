import { LeagueError, parseStandings, type StandingRow } from "./league";

/**
 * Reading a league's own table feed.
 *
 * There is no open API for FA Full-Time, and the FA has deliberately closed the public snippet
 * pages to keep products from scraping league data. The front door it left open is the snippet a
 * league or team admin generates for themselves (Full-Time Admin → Media → Code Snippets, or
 * LeagueRepublic Admin → API → Code Snippets): a live feed, issued to the club, for showing the
 * club's own league data away from the league site. The manager pastes that snippet into Roll Call,
 * we read the feed address out of it, and a cron pulls the table on a schedule.
 *
 * Everything here is pure and shape-tolerant on purpose. Full-Time is a white-labelled
 * LeagueRepublic, the payload is not documented publicly, and it can change without notice, so
 * nothing below depends on an exact schema: the HTML reader maps columns by their headings and the
 * JSON reader hunts for the first array of objects that looks like a table. When both fail the
 * manager can still paste, which is why a broken feed never leaves the hub empty.
 */

export type FeedKind = "fulltime_snippet" | "leaguerepublic_api" | "none";

export type FeedRef = { url: string; kind: Exclude<FeedKind, "none"> };

const FEED_HOSTS: { host: RegExp; kind: Exclude<FeedKind, "none"> }[] = [
  { host: /(^|\.)fulltime\.thefa\.com$/i, kind: "fulltime_snippet" },
  { host: /(^|\.)leaguerepublic\.com$/i, kind: "leaguerepublic_api" },
];

/**
 * Pulls the feed address out of whatever the manager pasted: the whole snippet, a script tag, an
 * iframe, or just the URL on its own. Only the two league platforms are accepted, so a snippet
 * copied from somewhere else can never make the server fetch an arbitrary address.
 */
export function feedFromSnippet(input: string): FeedRef | null {
  const text = (input ?? "").trim();
  if (!text) return null;
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>)]+/gi)) {
    let url: URL;
    try {
      url = new URL(decodeEntities(match[0]));
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    const hit = FEED_HOSTS.find((h) => h.host.test(url.hostname));
    // Always https: these feeds serve it, and the page embedding them is https anyway.
    if (hit) return { url: `https://${url.host}${url.pathname}${url.search}`.slice(0, 500), kind: hit.kind };
  }
  return null;
}

/**
 * Reads a table out of a feed response without knowing which shape it arrived in. JSON, JSONP, a
 * script that writes HTML, or plain HTML all end up in the same rows.
 */
export function readStandingsFeed(body: string, contentType = ""): StandingRow[] {
  const attempts: StandingRow[][] = [];
  const push = (fn: () => StandingRow[]) => {
    try {
      const rows = fn();
      if (rows.length) attempts.push(rows);
    } catch {
      /* try the next shape */
    }
  };

  const looksJson = /json|javascript/i.test(contentType) || /^[\s\r\n]*[[{]/.test(body);
  if (looksJson) push(() => standingsFromJson(parseLooseJson(body)));
  if (/<t[rd]\b/i.test(body)) push(() => standingsFromHtml(body));
  // A snippet is often JavaScript that writes its markup out as string literals.
  if (!attempts.length) push(() => standingsFromHtml(unwrapScriptHtml(body)));
  if (!looksJson) push(() => standingsFromJson(parseLooseJson(body)));

  const best = attempts.sort((a, b) => b.length - a.length)[0];
  if (!best) throw new LeagueError("The league's feed answered, but there was no table in it.");
  return best.map((row, i) => ({ ...row, position: i + 1 }));
}

/* ---------------------------------- HTML ---------------------------------- */

type Field = "team" | "played" | "won" | "drawn" | "lost" | "goalsFor" | "goalsAgainst" | "goalDifference" | "points";

/** Header spellings seen across FA Full-Time, LeagueRepublic and the club sites that embed them. */
const HEADINGS: { field: Field; names: string[] }[] = [
  { field: "team", names: ["team", "teams", "club", "side", "name"] },
  { field: "played", names: ["p", "pl", "pld", "played", "gp", "mp", "games"] },
  { field: "won", names: ["w", "won", "win", "wins"] },
  { field: "drawn", names: ["d", "drawn", "draw", "draws", "t", "tied"] },
  { field: "lost", names: ["l", "lost", "loss", "losses"] },
  { field: "goalsFor", names: ["f", "gf", "for", "goalsfor", "scored", "fo"] },
  { field: "goalsAgainst", names: ["a", "ga", "against", "goalsagainst", "conceded", "ag"] },
  { field: "goalDifference", names: ["gd", "diff", "difference", "goaldifference", "+/-", "pd"] },
  { field: "points", names: ["pts", "pt", "points", "total"] },
];

/**
 * Reads every table on the page and keeps the one that yields the most sound rows. Columns are
 * matched on their headings rather than their order, because leagues configure their own.
 */
export function standingsFromHtml(html: string): StandingRow[] {
  const tables = [...html.matchAll(/<table\b[\s\S]*?<\/table>/gi)].map((m) => m[0]);
  const blocks = tables.length ? tables : [html];
  let best: StandingRow[] = [];
  for (const block of blocks) {
    const rows = tableRows(block);
    if (rows.length < 2) continue;
    const parsed = readRows(rows);
    if (parsed.length > best.length) best = parsed;
  }
  if (!best.length) throw new LeagueError("Couldn't find a league table in that page.");
  return best;
}

function tableRows(block: string): string[][] {
  return [...block.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) =>
    [...m[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => cellText(c[1])),
  );
}

function cellText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function readRows(rows: string[][]): StandingRow[] {
  const headerAt = rows.findIndex((r) => Object.keys(mapColumns(r)).length >= 5);
  if (headerAt === -1) return rowsAsText(rows);
  const cols = mapColumns(rows[headerAt]);
  const out: StandingRow[] = [];
  for (const cells of rows.slice(headerAt + 1)) {
    const row = rowFromCells(cells, cols);
    if (row) out.push({ ...row, position: out.length + 1 });
  }
  // A table whose headings we understood but whose body we didn't is worse than reading it as text.
  return out.length ? out : rowsAsText(rows);
}

/** Falls back to the plain-text reader, which copes with tables that carry no usable headings. */
function rowsAsText(rows: string[][]): StandingRow[] {
  try {
    return parseStandings(rows.map((r) => r.join("\t")).join("\n"));
  } catch {
    return [];
  }
}

function mapColumns(cells: string[]): Partial<Record<Field, number>> {
  const cols: Partial<Record<Field, number>> = {};
  cells.forEach((cell, i) => {
    const key = cell.toLowerCase().replace(/[^a-z0-9+/-]/g, "");
    if (!key) return;
    const hit = HEADINGS.find((h) => h.names.includes(key));
    // First heading wins, so a trailing "Pts (adjusted)" cannot steal the real points column.
    if (hit && cols[hit.field] === undefined) cols[hit.field] = i;
  });
  return cols;
}

function rowFromCells(cells: string[], cols: Partial<Record<Field, number>>): Omit<StandingRow, "position"> | null {
  const at = (f: Field): string => (cols[f] === undefined ? "" : (cells[cols[f]!] ?? ""));
  const team = at("team").replace(/^\d+\.?\s*/, "").trim();
  const played = int(at("played"));
  const won = int(at("won"));
  const drawn = int(at("drawn"));
  const lost = int(at("lost"));
  const points = int(at("points"));
  if (!team || played === null || won === null || drawn === null || lost === null || points === null) return null;
  // The same soundness test the pasted reader uses: it drops sponsor rows, spacers and totals.
  if (won + drawn + lost !== played) return null;
  const goalsFor = int(at("goalsFor"));
  const goalsAgainst = int(at("goalsAgainst"));
  const stated = int(at("goalDifference"));
  return {
    team,
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor !== null && goalsAgainst !== null ? goalsFor - goalsAgainst : stated,
    points,
  };
}

function int(raw: string): number | null {
  const t = raw.replace(/[−–—]/g, "-").replace(/[^0-9+-]/g, "");
  if (!/^[+-]?\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", "#39": "'", "#039": "'", "#160": " " };

function decodeEntities(s: string): string {
  return s
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
      const key = code.toLowerCase();
      if (ENTITIES[key]) return ENTITIES[key];
      if (key.startsWith("#x")) return safeChar(parseInt(key.slice(2), 16));
      if (key.startsWith("#")) return safeChar(parseInt(key.slice(1), 10));
      return m;
    })
    .replace(/\\([/"'])/g, "$1");
}

function safeChar(code: number): string {
  return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
}

/** Rebuilds the markup a snippet script writes out, so `document.write("<tr>…")` still reads. */
function unwrapScriptHtml(body: string): string {
  const parts = [...body.matchAll(/(['"])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2]);
  return decodeEntities(parts.filter((p) => /<t[rdh]\b|<table\b/i.test(p)).join(""));
}

/* ---------------------------------- JSON ---------------------------------- */

/** Handles JSONP and assignment wrappers as well as plain JSON. */
function parseLooseJson(body: string): unknown {
  const text = body.trim();
  try {
    return JSON.parse(text);
  } catch {
    /* fall through to the wrapped forms */
  }
  const start = text.search(/[[{]/);
  if (start === -1) throw new LeagueError("That feed didn't answer with data we can read.");
  const open = text[start];
  const close = open === "[" ? "]" : "}";
  const end = text.lastIndexOf(close);
  if (end <= start) throw new LeagueError("That feed didn't answer with data we can read.");
  return JSON.parse(text.slice(start, end + 1));
}

const JSON_KEYS: Record<Exclude<Field, "team">, string[]> = {
  played: ["played", "gamesplayed", "matchesplayed", "pld", "p", "gp", "mp", "fixturesplayed"],
  won: ["won", "wins", "win", "w"],
  drawn: ["drawn", "draws", "draw", "d", "tied", "ties"],
  lost: ["lost", "losses", "loss", "l"],
  goalsFor: ["goalsfor", "scoresfor", "for", "f", "gf", "scored", "pointsfor"],
  goalsAgainst: ["goalsagainst", "scoresagainst", "against", "a", "ga", "conceded", "pointsagainst"],
  goalDifference: ["goaldifference", "scoredifference", "difference", "gd", "diff"],
  points: ["points", "pts", "totalpoints", "leaguepoints"],
};

const TEAM_KEYS = ["teamname", "team", "clubname", "club", "name", "longname", "teamnamelong", "displayname"];

/**
 * Walks the payload for the first array of objects that reads like a table. Full-Time's own shape
 * isn't published, so recognising a standings row by its fields is sturdier than guessing a path.
 */
export function standingsFromJson(data: unknown): StandingRow[] {
  let best: StandingRow[] = [];
  const seen = new Set<unknown>();
  const visit = (node: unknown, depth: number) => {
    if (depth > 8 || node === null || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      const rows = node.map(jsonRow).filter((r): r is Omit<StandingRow, "position"> => !!r);
      if (rows.length > best.length) best = rows.map((r, i) => ({ ...r, position: i + 1 }));
      for (const child of node) visit(child, depth + 1);
      return;
    }
    for (const child of Object.values(node as Record<string, unknown>)) visit(child, depth + 1);
  };
  visit(data, 0);
  if (!best.length) throw new LeagueError("Couldn't find a league table in that feed.");
  return best;
}

function jsonRow(node: unknown): Omit<StandingRow, "position"> | null {
  if (!node || typeof node !== "object" || Array.isArray(node)) return null;
  const flat = new Map<string, unknown>();
  // One level of nesting is common: { team: { name }, stats: { played, … } }.
  const absorb = (obj: Record<string, unknown>, depth: number) => {
    for (const [k, v] of Object.entries(obj)) {
      const key = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!flat.has(key)) flat.set(key, v);
      if (depth < 1 && v && typeof v === "object" && !Array.isArray(v)) absorb(v as Record<string, unknown>, depth + 1);
    }
  };
  absorb(node as Record<string, unknown>, 0);

  const num = (names: string[]): number | null => {
    for (const n of names) {
      const v = flat.get(n);
      if (typeof v === "number" && Number.isSafeInteger(v)) return v;
      if (typeof v === "string") {
        const parsed = int(v);
        if (parsed !== null) return parsed;
      }
    }
    return null;
  };
  const team = (() => {
    for (const n of TEAM_KEYS) {
      const v = flat.get(n);
      if (typeof v === "string" && v.trim()) return v.trim().slice(0, 80);
    }
    return "";
  })();

  const played = num(JSON_KEYS.played);
  const won = num(JSON_KEYS.won);
  const drawn = num(JSON_KEYS.drawn);
  const lost = num(JSON_KEYS.lost);
  const points = num(JSON_KEYS.points);
  if (!team || played === null || won === null || drawn === null || lost === null || points === null) return null;
  if (won + drawn + lost !== played) return null;
  const goalsFor = num(JSON_KEYS.goalsFor);
  const goalsAgainst = num(JSON_KEYS.goalsAgainst);
  return {
    team,
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor !== null && goalsAgainst !== null ? goalsFor - goalsAgainst : num(JSON_KEYS.goalDifference),
    points,
  };
}

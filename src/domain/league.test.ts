import { describe, expect, it } from "vitest";
import { fixtureLine, fullTimeEmbedUrl, parseStandings, providerFromUrl, resultOf, safeExternalUrl, sameTeam, teamRecord, LeagueError } from "./league";

describe("providerFromUrl", () => {
  it("recognises the two places a UK crew's league actually lives", () => {
    expect(providerFromUrl("https://fulltime.thefa.com/displayTeam.html?teamID=123")).toBe("fa_fulltime");
    expect(providerFromUrl("https://www.powerleague.co.uk/league-fixtures/shoreditch")).toBe("powerleague");
    expect(providerFromUrl("https://somelocalleague.co.uk/table")).toBe("other");
    expect(providerFromUrl("not a url")).toBe("manual");
  });
});

describe("safeExternalUrl and fullTimeEmbedUrl", () => {
  it("keeps http(s) links and drops anything that could run", () => {
    expect(safeExternalUrl("https://fulltime.thefa.com/x")).toBe("https://fulltime.thefa.com/x");
    expect(safeExternalUrl("javascript:alert(1)")).toBe("");
    expect(safeExternalUrl("  ")).toBe("");
  });
  it("pulls the feed address out of a Full-Time snippet and refuses any other host", () => {
    const snippet = `<iframe src="https://fulltime.thefa.com/table.html?selectedSeason=12&selectedDivision=34" width="100%"></iframe>`;
    expect(fullTimeEmbedUrl(snippet)).toBe("https://fulltime.thefa.com/table.html?selectedSeason=12&selectedDivision=34");
    expect(fullTimeEmbedUrl(`<iframe src="https://evil.example.com/x"></iframe>`)).toBe("");
    expect(fullTimeEmbedUrl("")).toBe("");
  });
});

describe("parseStandings", () => {
  it("reads a table copied off a league site, header and all", () => {
    const rows = parseStandings(
      [
        "Pos\tTeam\tP\tW\tD\tL\tF\tA\tGD\tPts",
        "1\tHackney Wick FC\t10\t8\t1\t1\t32\t12\t20\t25",
        "2\tTuesday F.C.\t10\t7\t2\t1\t28\t14\t14\t23",
        "3\tAthletic 1878\t10\t5\t2\t3\t20\t18\t2\t17",
        "",
        "Sponsored by Some Pub",
      ].join("\n"),
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ position: 1, team: "Hackney Wick FC", played: 10, won: 8, drawn: 1, lost: 1, goalsFor: 32, goalsAgainst: 12, goalDifference: 20, points: 25 });
    expect(rows[2].team).toBe("Athletic 1878");
    expect(rows[2].points).toBe(17);
  });
  it("copes with space-separated rows and a short column set", () => {
    const rows = parseStandings("1 Rangers 6 5 0 1 15\n2 Rovers 6 3 1 2 10");
    expect(rows.map((r) => r.team)).toEqual(["Rangers", "Rovers"]);
    expect(rows[0].points).toBe(15);
    expect(rows[0].goalsFor).toBeNull();
  });
  it("keeps the goal difference when the table has no goal columns", () => {
    const rows = parseStandings("1 Rangers 6 5 0 1 9 15");
    expect(rows[0].goalDifference).toBe(9);
    expect(rows[0].goalsFor).toBeNull();
  });
  it("refuses a paste with no table in it", () => {
    expect(() => parseStandings("just some words\nand more words")).toThrow(LeagueError);
  });
});

describe("sameTeam", () => {
  it("matches how a league spells a club against how the crew does", () => {
    expect(sameTeam("Tuesday FC", "TUESDAY F.C.")).toBe(true);
    expect(sameTeam("Hackney Wick", "Hackney Wick FC")).toBe(true);
    expect(sameTeam("Rangers", "Rovers")).toBe(false);
    expect(sameTeam("", "FC")).toBe(false);
  });
});

describe("teamRecord", () => {
  const fixtures = [
    { goalsFor: 3, goalsAgainst: 1, startsAt: 1, competitionId: "league" },
    { goalsFor: 2, goalsAgainst: 2, startsAt: 2, competitionId: "league" },
    { goalsFor: 0, goalsAgainst: 4, startsAt: 3, competitionId: "league" },
    { goalsFor: 5, goalsAgainst: 0, startsAt: 4, competitionId: "cup" },
    { goalsFor: null, goalsAgainst: null, startsAt: 5, competitionId: "league" },
  ];
  it("adds up every fixture with a score, three for a win, newest form first", () => {
    const r = teamRecord(fixtures);
    expect(r).toMatchObject({ played: 4, won: 2, drawn: 1, lost: 1, goalsFor: 10, goalsAgainst: 7, goalDifference: 3, points: 7 });
    expect(r.form).toEqual(["W", "L", "D", "W"]);
  });
  it("splits by competition when asked", () => {
    expect(teamRecord(fixtures, "cup")).toMatchObject({ played: 1, won: 1, points: 3 });
    expect(teamRecord(fixtures, "league")).toMatchObject({ played: 3, points: 4 });
  });
});

describe("resultOf and fixtureLine", () => {
  it("names the result only once a score is in", () => {
    expect(resultOf(2, 1)).toBe("W");
    expect(resultOf(1, 1)).toBe("D");
    expect(resultOf(0, 1)).toBe("L");
    expect(resultOf(null, 1)).toBeNull();
  });
  it("reads the way a fixture list reads, home team first", () => {
    expect(fixtureLine({ us: "Tuesday FC", opponent: "Rangers", homeAway: "away", goalsFor: null, goalsAgainst: null })).toBe("v Rangers (A)");
    expect(fixtureLine({ us: "Tuesday FC", opponent: "Rangers", homeAway: "home", goalsFor: 3, goalsAgainst: 1 })).toBe("Tuesday FC 3–1 Rangers");
    expect(fixtureLine({ us: "Tuesday FC", opponent: "Rangers", homeAway: "away", goalsFor: 3, goalsAgainst: 1 })).toBe("Rangers 1–3 Tuesday FC");
    expect(fixtureLine({ us: "Tuesday FC", opponent: "", homeAway: "home", goalsFor: null, goalsAgainst: null })).toBe("v TBC (H)");
  });
});

import { describe, expect, it } from "vitest";
import { divisionKeyFrom, knownTeams, matchDivision, tableIsStale, teamsOf, type DivisionCandidate } from "./divisions";
import { parseStandings } from "./league";

describe("divisionKeyFrom", () => {
  it("gives two crews who linked the same page the same key, however they copied it", () => {
    const a = divisionKeyFrom("https://fulltime.thefa.com/displayTeam.html?teamID=42&divisionseason=7");
    const b = divisionKeyFrom("http://www.fulltime.thefa.com/displayTeam.html?divisionseason=7&teamID=42");
    expect(a).toBe(b);
    expect(a).toContain("fulltime.thefa.com");
  });

  it("ignores a trailing slash on the path", () => {
    expect(divisionKeyFrom("https://fulltime.thefa.com/table/")).toBe(divisionKeyFrom("https://fulltime.thefa.com/table"));
  });

  it("keeps different divisions of the same league apart", () => {
    expect(divisionKeyFrom("https://fulltime.thefa.com/table.html?division=3")).not.toBe(divisionKeyFrom("https://fulltime.thefa.com/table.html?division=4"));
  });

  it("ignores tracking parameters someone pasted from a share link", () => {
    expect(divisionKeyFrom("https://fulltime.thefa.com/x.html?id=1&utm_source=whatsapp")).toBe(divisionKeyFrom("https://fulltime.thefa.com/x.html?id=1"));
  });

  it("falls back to the feed address, and never keys on a name alone", () => {
    expect(divisionKeyFrom("", "https://fulltime.thefa.com/cs/9.js")).toContain("fulltime.thefa.com");
    // "Division 3" exists in hundreds of leagues, so no link means no sharing.
    expect(divisionKeyFrom("", "")).toBe("");
    expect(divisionKeyFrom("not a url")).toBe("");
  });
});

const TABLE = parseStandings(
  [
    "1 Hackney Wick FC 10 8 1 1 32 12 20 25",
    "2 Tuesday FC 10 7 2 1 28 14 14 23",
    "3 London Road Rovers 10 5 2 3 20 17 3 17",
    "4 Clapton Athletic 10 3 1 6 14 22 -8 10",
    "5 Bow Rangers 10 1 1 8 9 30 -21 4",
  ].join("\n"),
);

function candidate(over: Partial<DivisionCandidate> = {}): DivisionCandidate {
  return { competitionId: "c1", divisionKey: "", crewId: "crew1", crewName: "Hackney Wick", name: "Hackney Sunday, Division 3", teams: teamsOf(TABLE), updatedAt: 1000, ...over };
}

describe("matchDivision", () => {
  it("spots a crew's division from its own name and the teams it has played", () => {
    const known = knownTeams("Tuesday FC", ["Bow Rangers", "Clapton Athletic"]);
    const match = matchDivision(known, [candidate()]);
    expect(match?.candidate.name).toBe("Hackney Sunday, Division 3");
    expect(match?.matched).toHaveLength(3);
  });

  it("matches through the punctuation a league spells differently", () => {
    const known = knownTeams("TUESDAY F.C.", ["bow rangers", "Clapton Athletic FC"]);
    expect(matchDivision(known, [candidate()])).not.toBeNull();
  });

  it("says nothing until there is enough evidence", () => {
    expect(matchDivision(knownTeams("Tuesday FC", ["Bow Rangers"]), [candidate()])).toBeNull();
    // Three names, but only two of them are in that division.
    expect(matchDivision(knownTeams("Tuesday FC", ["Bow Rangers", "Somewhere Else United"]), [candidate()])).toBeNull();
  });

  it("prefers the division that matches most, then the freshest", () => {
    const other = candidate({ competitionId: "c2", name: "Other league", teams: ["Tuesday FC", "Bow Rangers", "Clapton Athletic", "Totally Different"] });
    const known = knownTeams("Tuesday FC", ["Bow Rangers", "Clapton Athletic", "London Road Rovers"]);
    expect(matchDivision(known, [other, candidate()])?.candidate.competitionId).toBe("c1");

    const stale = candidate({ competitionId: "c3", updatedAt: 1 });
    const fresh = candidate({ competitionId: "c4", updatedAt: 9999 });
    expect(matchDivision(known, [stale, fresh])?.candidate.competitionId).toBe("c4");
  });

  it("refuses to guess between two divisions that fit equally well", () => {
    const known = knownTeams("Tuesday FC", ["Bow Rangers", "Clapton Athletic"]);
    const twin = candidate({ competitionId: "c2", name: "A different league entirely" });
    expect(matchDivision(known, [candidate(), twin])).toBeNull();
  });

  it("returns nothing when no crew has sourced a table yet", () => {
    expect(matchDivision(knownTeams("Tuesday FC", ["Bow Rangers", "Clapton Athletic"]), [])).toBeNull();
  });
});

describe("tableIsStale", () => {
  const now = Date.UTC(2026, 8, 22);
  it("nudges once a table is well over a week old", () => {
    expect(tableIsStale(new Date(now - 11 * 24 * 60 * 60_000), now)).toBe(true);
    expect(tableIsStale(new Date(now - 3 * 24 * 60 * 60_000), now)).toBe(false);
    expect(tableIsStale(null, now)).toBe(false);
  });
});

describe("pasting the whole page", () => {
  it("finds the table in a copy of an entire league page", () => {
    const page = [
      "FA Full-Time",
      "Skip to content",
      "Hackney & Leyton Sunday League",
      "Home Fixtures Results Tables Contact",
      "",
      "Division 3 — Season 2026/27",
      "Pos Team P W D L F A GD Pts",
      "1 Hackney Wick FC 10 8 1 1 32 12 20 25",
      "2 Tuesday FC 10 7 2 1 28 14 14 23",
      "3 Bow Rangers 10 1 1 8 9 30 -21 4",
      "",
      "Sponsored by Greggs",
      "Last updated 21 September 2026",
      "© The Football Association 2026",
    ].join("\n");
    const rows = parseStandings(page);
    expect(rows.map((r) => r.team)).toEqual(["Hackney Wick FC", "Tuesday FC", "Bow Rangers"]);
    expect(rows[1].points).toBe(23);
  });
});

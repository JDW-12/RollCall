import { describe, expect, it } from "vitest";
import { feedFromSnippet, readStandingsFeed, standingsFromHtml, standingsFromJson } from "./league-feed";

describe("feedFromSnippet", () => {
  it("reads the address out of a script snippet", () => {
    const snippet = `<div id="lrep123456"></div>\n<script type="text/javascript" src="https://fulltime.thefa.com/client/api/cs1/123456.js?k=abc&sn=1"></script>`;
    expect(feedFromSnippet(snippet)).toEqual({ url: "https://fulltime.thefa.com/client/api/cs1/123456.js?k=abc&sn=1", kind: "fulltime_snippet" });
  });

  it("reads an iframe snippet and an entity-escaped ampersand", () => {
    const snippet = `<iframe src="https://fulltime.thefa.com/table.html?selectedSeason=12&amp;selectedDivision=7" height="400"></iframe>`;
    expect(feedFromSnippet(snippet)?.url).toBe("https://fulltime.thefa.com/table.html?selectedSeason=12&selectedDivision=7");
  });

  it("takes a bare url and spots LeagueRepublic", () => {
    expect(feedFromSnippet("https://www.leaguerepublic.com/api/standings/4433.json")).toEqual({
      url: "https://www.leaguerepublic.com/api/standings/4433.json",
      kind: "leaguerepublic_api",
    });
  });

  it("upgrades http to https so the feed is never fetched in the clear", () => {
    expect(feedFromSnippet("http://fulltime.thefa.com/table.html?id=9")?.url).toBe("https://fulltime.thefa.com/table.html?id=9");
  });

  it("refuses any other host, so a stray snippet cannot aim the server somewhere else", () => {
    expect(feedFromSnippet(`<script src="https://evil.example.com/steal.js"></script>`)).toBeNull();
    expect(feedFromSnippet(`<script src="https://fulltime.thefa.com.evil.example/x.js"></script>`)).toBeNull();
    expect(feedFromSnippet("javascript:alert(1)")).toBeNull();
    expect(feedFromSnippet("")).toBeNull();
  });

  it("ignores a decoy host earlier in the snippet", () => {
    const snippet = `<link href="https://cdn.example.com/style.css"><script src="https://fulltime.thefa.com/cs/9.js"></script>`;
    expect(feedFromSnippet(snippet)?.url).toBe("https://fulltime.thefa.com/cs/9.js");
  });
});

const HTML_TABLE = `
<div class="lrep">
<table class="standings">
  <thead><tr><th>Pos</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>F</th><th>A</th><th>GD</th><th>Pts</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>Hackney Wick FC</td><td>10</td><td>8</td><td>1</td><td>1</td><td>32</td><td>12</td><td>20</td><td>25</td></tr>
    <tr><td>2</td><td>Tuesday FC</td><td>10</td><td>7</td><td>2</td><td>1</td><td>28</td><td>14</td><td>14</td><td>23</td></tr>
    <tr><td>3</td><td>Rovers &amp; Co</td><td>10</td><td>1</td><td>1</td><td>8</td><td>9</td><td>30</td><td>&ndash;21</td><td>4</td></tr>
  </tbody>
</table>
</div>`;

describe("standingsFromHtml", () => {
  it("reads a table and decodes the team names", () => {
    const rows = standingsFromHtml(HTML_TABLE);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toMatchObject({ position: 2, team: "Tuesday FC", played: 10, won: 7, drawn: 2, lost: 1, goalsFor: 28, goalsAgainst: 14, goalDifference: 14, points: 23 });
    expect(rows[2].team).toBe("Rovers & Co");
    expect(rows[2].goalDifference).toBe(-21);
  });

  it("maps columns by heading, not by position", () => {
    const shuffled = `<table><tr><th>Team</th><th>Pts</th><th>Won</th><th>Drawn</th><th>Lost</th><th>Played</th></tr>
      <tr><td>Tuesday FC</td><td>23</td><td>7</td><td>2</td><td>1</td><td>10</td></tr></table>`;
    expect(standingsFromHtml(shuffled)[0]).toMatchObject({ team: "Tuesday FC", points: 23, won: 7, played: 10, goalsFor: null });
  });

  it("drops rows whose results do not add up, like a sponsor strip or a totals line", () => {
    const messy = `<table><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr>
      <tr><td>Sponsored by Greggs</td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td>Tuesday FC</td><td>10</td><td>7</td><td>2</td><td>1</td><td>23</td></tr>
      <tr><td>Totals</td><td>99</td><td>1</td><td>1</td><td>1</td><td>0</td></tr></table>`;
    const rows = standingsFromHtml(messy);
    expect(rows.map((r) => r.team)).toEqual(["Tuesday FC"]);
  });

  it("picks the biggest table when the page carries more than one", () => {
    const page = `<table><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr>
        <tr><td>Only One</td><td>1</td><td>1</td><td>0</td><td>0</td><td>3</td></tr></table>${HTML_TABLE}`;
    expect(standingsFromHtml(page)).toHaveLength(3);
  });

  it("still reads a table with no usable headings by falling back to the text reader", () => {
    const headless = `<table>
      <tr><td>1</td><td>Hackney Wick FC</td><td>10</td><td>8</td><td>1</td><td>1</td><td>32</td><td>12</td><td>20</td><td>25</td></tr>
      <tr><td>2</td><td>Tuesday FC</td><td>10</td><td>7</td><td>2</td><td>1</td><td>28</td><td>14</td><td>14</td><td>23</td></tr></table>`;
    const rows = standingsFromHtml(headless);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ team: "Tuesday FC", points: 23 });
  });

  it("renumbers positions from the rows it kept", () => {
    expect(standingsFromHtml(HTML_TABLE).map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it("throws when there is no table at all", () => {
    expect(() => standingsFromHtml("<p>Nothing here</p>")).toThrow();
  });
});

describe("standingsFromJson", () => {
  it("finds the rows wherever they are nested", () => {
    const payload = {
      status: "ok",
      data: { league: { name: "Division 3" }, standings: [
        { teamName: "Hackney Wick FC", played: 10, won: 8, drawn: 1, lost: 1, goalsFor: 32, goalsAgainst: 12, points: 25 },
        { teamName: "Tuesday FC", played: 10, won: 7, drawn: 2, lost: 1, goalsFor: 28, goalsAgainst: 14, points: 23 },
      ] },
    };
    const rows = standingsFromJson(payload);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ position: 2, team: "Tuesday FC", goalDifference: 14, points: 23 });
  });

  it("copes with short keys, string numbers and a nested team object", () => {
    const payload = [{ team: { name: "Tuesday FC" }, p: "10", w: "7", d: "2", l: "1", pts: "23" }];
    expect(standingsFromJson(payload)[0]).toMatchObject({ team: "Tuesday FC", played: 10, won: 7, points: 23, goalsFor: null, goalDifference: null });
  });

  it("keeps a stated goal difference when the goal columns are missing", () => {
    expect(standingsFromJson([{ team: "Tuesday FC", played: 10, won: 7, drawn: 2, lost: 1, gd: -4, points: 23 }])[0].goalDifference).toBe(-4);
  });

  it("ignores arrays that are not tables", () => {
    expect(() => standingsFromJson({ fixtures: [{ home: "A", away: "B" }] })).toThrow();
  });

  it("survives a payload that points back at itself", () => {
    const loop: Record<string, unknown> = { name: "x" };
    loop.self = loop;
    expect(() => standingsFromJson(loop)).toThrow();
  });
});

describe("readStandingsFeed", () => {
  it("reads a JSON body", () => {
    const body = JSON.stringify([{ teamName: "Tuesday FC", played: 10, won: 7, drawn: 2, lost: 1, points: 23 }]);
    expect(readStandingsFeed(body, "application/json")[0].team).toBe("Tuesday FC");
  });

  it("reads an HTML body", () => {
    expect(readStandingsFeed(HTML_TABLE, "text/html")).toHaveLength(3);
  });

  it("reads a JSONP wrapper", () => {
    const body = `lrepCallback([{"teamName":"Tuesday FC","played":10,"won":7,"drawn":2,"lost":1,"points":23}]);`;
    expect(readStandingsFeed(body, "application/javascript")[0].team).toBe("Tuesday FC");
  });

  it("reads a script that writes its markup out as strings", () => {
    const body = `document.write('<table><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr>');
      document.write('<tr><td>Tuesday FC</td><td>10</td><td>7</td><td>2</td><td>1</td><td>23</td></tr></table>');`;
    const rows = readStandingsFeed(body, "application/javascript");
    expect(rows[0]).toMatchObject({ team: "Tuesday FC", points: 23 });
  });

  it("numbers the rows it returns", () => {
    expect(readStandingsFeed(HTML_TABLE, "text/html").map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it("throws when the feed answers with nothing useful", () => {
    expect(() => readStandingsFeed("<html><body>Service unavailable</body></html>", "text/html")).toThrow();
  });
});

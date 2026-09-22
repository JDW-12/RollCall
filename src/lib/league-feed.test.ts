import { describe, expect, it } from "vitest";
import { FeedError, fetchFeed, readFeed, syncCompetition } from "./league-feed";
import type { Db } from "@/db/client";
import type { Competition } from "@/db/schema";

/**
 * The fetch side of the league feed. These are the guards that matter: the address can only ever be
 * one of the two league platforms, a redirect cannot walk it somewhere else, and a page that isn't
 * really a table says so rather than quietly wiping a crew's standings.
 */

function reply(body: string, init: { status?: number; type?: string; url?: string; headers?: Record<string, string> } = {}): typeof fetch {
  return (async () =>
    new Response(body, {
      status: init.status ?? 200,
      headers: { "content-type": init.type ?? "text/html", ...(init.headers ?? {}) },
    })) as unknown as typeof fetch;
}

/** Response.url is read-only, so a redirect is simulated by handing back an object of our own. */
function replyFrom(url: string, body: string): typeof fetch {
  return (async () => ({
    url,
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "text/html" }),
    text: async () => body,
  })) as unknown as typeof fetch;
}

const TABLE = `<table><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr>
  <tr><td>Tuesday FC</td><td>10</td><td>7</td><td>2</td><td>1</td><td>23</td></tr>
  <tr><td>Rovers</td><td>10</td><td>1</td><td>1</td><td>8</td><td>4</td></tr></table>`;

const FEED = "https://fulltime.thefa.com/cs/123.js";

describe("fetchFeed", () => {
  it("reads an allowed host", async () => {
    const { body } = await fetchFeed(FEED, reply(TABLE));
    expect(body).toContain("Tuesday FC");
  });

  it("refuses any host that isn't a league platform", async () => {
    await expect(fetchFeed("https://evil.example.com/x.js", reply(TABLE))).rejects.toBeInstanceOf(FeedError);
    await expect(fetchFeed("https://fulltime.thefa.com.evil.example/x.js", reply(TABLE))).rejects.toBeInstanceOf(FeedError);
  });

  it("refuses plain http and nonsense addresses", async () => {
    await expect(fetchFeed("http://fulltime.thefa.com/x.js", reply(TABLE))).rejects.toThrow(/https/);
    await expect(fetchFeed("not a url", reply(TABLE))).rejects.toBeInstanceOf(FeedError);
  });

  it("refuses a redirect that lands off the allowed hosts", async () => {
    await expect(fetchFeed(FEED, replyFrom("https://evil.example.com/x", TABLE))).rejects.toBeInstanceOf(FeedError);
  });

  it("allows a redirect that stays on an allowed host", async () => {
    const { body } = await fetchFeed(FEED, replyFrom("https://www.leaguerepublic.com/x", TABLE));
    expect(body).toContain("Tuesday FC");
  });

  it("explains a refusal rather than reporting an empty table", async () => {
    await expect(fetchFeed(FEED, reply("", { status: 403 }))).rejects.toThrow(/fresh snippet/);
    await expect(fetchFeed(FEED, reply("", { status: 404 }))).rejects.toThrow(/no longer exists/);
    await expect(fetchFeed(FEED, reply("", { status: 500 }))).rejects.toThrow(/500/);
  });

  it("refuses a body that is too big, declared or actual", async () => {
    await expect(fetchFeed(FEED, reply("x", { headers: { "content-length": "99000000" } }))).rejects.toThrow(/too big/);
    await expect(fetchFeed(FEED, reply("x".repeat(1_000_001)))).rejects.toThrow(/too big/);
  });

  it("turns a network failure into something a manager can read", async () => {
    const boom = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    await expect(fetchFeed(FEED, boom)).rejects.toThrow(/Couldn't reach/);
  });

  it("names a timeout for what it is", async () => {
    const slow = (async () => {
      const e = new Error("timed out");
      e.name = "TimeoutError";
      throw e;
    }) as unknown as typeof fetch;
    await expect(fetchFeed(FEED, slow)).rejects.toThrow(/too long/);
  });
});

describe("readFeed", () => {
  it("returns the rows from a table", async () => {
    const rows = await readFeed(FEED, reply(TABLE));
    expect(rows.map((r) => r.team)).toEqual(["Tuesday FC", "Rovers"]);
  });

  it("calls out a bot check instead of blaming the table", async () => {
    const challenge = `<html><head><title>Just a moment...</title></head><body><div class="cf-browser-verification"></div></body></html>`;
    await expect(readFeed(FEED, reply(challenge))).rejects.toThrow(/browser check/);
  });

  it("refuses a single-row answer, which is a broken feed rather than a one-team league", async () => {
    const one = `<table><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr>
      <tr><td>Tuesday FC</td><td>10</td><td>7</td><td>2</td><td>1</td><td>23</td></tr></table>`;
    await expect(readFeed(FEED, reply(one))).rejects.toThrow(/one row/);
  });

  it("refuses a holding page", async () => {
    await expect(readFeed(FEED, reply("<html><body>Service unavailable</body></html>"))).rejects.toThrow();
  });
});

/** Minimal stand-in for the drizzle chain, so the write behaviour can be asserted without a database. */
function fakeDb() {
  const writes: Record<string, unknown>[] = [];
  const db = {
    update: () => ({ set: (values: Record<string, unknown>) => ({ where: async () => void writes.push(values) }) }),
  } as unknown as Db;
  return { db, writes };
}

const COMP = { id: "c1", feedUrl: FEED, feedKind: "fulltime_snippet", standings: '[{"team":"Old"}]' } as unknown as Competition;

describe("syncCompetition", () => {
  it("stores the rows and marks the table live", async () => {
    const { db, writes } = fakeDb();
    const outcome = await syncCompetition(COMP, db, reply(TABLE));
    expect(outcome).toEqual({ ok: true, rows: 2 });
    expect(writes).toHaveLength(1);
    expect(writes[0].standingsSource).toBe("feed");
    expect(writes[0].syncError).toBe("");
    expect(writes[0].syncedAt).toBeInstanceOf(Date);
    expect(JSON.parse(String(writes[0].standings))[0].team).toBe("Tuesday FC");
  });

  it("records the failure and leaves the last good table alone", async () => {
    const { db, writes } = fakeDb();
    const outcome = await syncCompetition(COMP, db, reply("", { status: 500 }));
    expect(outcome.ok).toBe(false);
    expect(writes).toHaveLength(1);
    // The point of the whole thing: a bad pull must not empty a crew's table or fake a fresh sync.
    expect(writes[0]).not.toHaveProperty("standings");
    expect(writes[0]).not.toHaveProperty("syncedAt");
    expect(String(writes[0].syncError)).toMatch(/500/);
  });

  it("does nothing when no feed is linked", async () => {
    const { db, writes } = fakeDb();
    const outcome = await syncCompetition({ ...COMP, feedUrl: "", feedKind: "none" } as Competition, db, reply(TABLE));
    expect(outcome).toEqual({ ok: false, error: "No feed linked." });
    expect(writes).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import { postedRounds } from "./golf-feed";
import type { Round } from "./golf-stats";
import { defaultHoles } from "./stableford";

const holes = defaultHoles();
const par = holes.map((h) => h.par);

describe("postedRounds", () => {
  it("lists only submitted cards, newest first, scored against the par of the holes played", () => {
    const rounds: Round[] = [
      {
        sessionId: "s1",
        title: "Medal",
        startsAt: 1,
        card: {
          holes,
          handicaps: { josh: 18 },
          strokes: { josh: par.map((p) => p + 1), priya: par, tom: par },
          submitted: { josh: 100, priya: 300 },
          course: { id: "c1", name: "Griffin", tee: "Yellow" },
        },
      },
      {
        sessionId: "s2",
        title: "Knock",
        startsAt: 2,
        // Walked off after 12: +2 over the par of those twelve holes, not the full card.
        card: { holes, handicaps: {}, strokes: { josh: [...par.slice(0, 12).map((p, i) => (i < 2 ? p + 1 : p)), ...Array(6).fill(null)] }, submitted: { josh: 200 } },
      },
    ];
    const posted = postedRounds(rounds);
    expect(posted.map((p) => [p.sessionId, p.userId])).toEqual([
      ["s1", "priya"],
      ["s2", "josh"],
      ["s1", "josh"],
    ]);
    const total = par.reduce((a, p) => a + p, 0);
    expect(posted[2]).toMatchObject({ course: "Griffin", gross: total + 18, par: total, holesPlayed: 18, stableford: 36 });
    const twelve = par.slice(0, 12).reduce((a, p) => a + p, 0);
    expect(posted[1]).toMatchObject({ course: null, gross: twelve + 2, par: twelve, holesPlayed: 12 });
  });
});

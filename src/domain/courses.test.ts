import { describe, expect, it } from "vitest";
import { courseKey, coursePar, defaultStrokeIndexes, hitsFromGolfApi, holesFromLines, mergeHits, teeSetsFrom, validateHoles, type CourseHit } from "./courses";

const pars18 = "4 4 3 5 4 4 3 4 5 4 3 4 5 4 4 3 4 5";
const si18 = "7 3 15 1 11 9 17 5 13 8 16 2 10 4 12 18 6 14";

describe("validateHoles", () => {
  it("accepts a proper 18-hole card", () => {
    const holes = holesFromLines(pars18, si18);
    expect(holes).toHaveLength(18);
    expect(coursePar(holes)).toBe(72);
    expect(holes[3]).toEqual({ number: 4, par: 5, strokeIndex: 1 });
  });
  it("rejects wrong hole counts, bad pars and duplicate stroke indexes", () => {
    expect(() => holesFromLines("4 4 4")).toThrow(/9 or 18/);
    expect(() => validateHoles([{ par: 7, strokeIndex: 1 }, ...Array(8).fill({ par: 4, strokeIndex: 2 })])).toThrow(/par must be/);
    expect(() => holesFromLines("4 4 3 5 4 4 3 4 5", "1 1 2 3 4 5 6 7 8")).toThrow(/exactly once/);
  });
  it("accepts commas and tabs", () => {
    expect(holesFromLines("4,4,3,5,4,4,3,4,5", "1\t2\t3\t4\t5\t6\t7\t8\t9")).toHaveLength(9);
  });
});

describe("defaultStrokeIndexes", () => {
  it("gives every hole a unique index, hardest (longest) first, odd on the front and even on the back", () => {
    const pars = pars18.split(" ").map(Number);
    const si = defaultStrokeIndexes(pars);
    expect([...si].sort((a, b) => a - b)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(si[3]).toBe(1); // first par 5 on the front
    expect(si.slice(0, 9).every((x) => x % 2 === 1)).toBe(true);
    expect(si.slice(9).every((x) => x % 2 === 0)).toBe(true);
  });
  it("is used when a card has no SI line", () => {
    expect(holesFromLines("3 4 4 5 3 4 4 5 4")).toHaveLength(9);
  });
});

describe("courseKey and mergeHits", () => {
  const holes = holesFromLines(pars18, si18);
  const lib = (name: string, tee: string, uses: number): CourseHit => ({ name, club: "", address: "", tee, holes, source: "library", ref: name, uses });
  it("treats club suffixes and punctuation as noise", () => {
    expect(courseKey("Richmond Park Golf Club", "White")).toBe(courseKey("richmond park g.c.", "white"));
  });
  it("puts library cards first by use and drops provider duplicates", () => {
    const merged = mergeHits(
      [lib("Sundridge Park", "White", 1), lib("Richmond Park", "White", 5)],
      [{ ...lib("Richmond Park GC", "White", 0), source: "api", ref: "golfcourseapi:1:White" }, { ...lib("Coombe Hill", "Yellow", 0), source: "api", ref: "golfcourseapi:2:Yellow" }],
    );
    expect(merged.map((m) => m.name)).toEqual(["Richmond Park", "Sundridge Park", "Coombe Hill"]);
  });
});

describe("hitsFromGolfApi", () => {
  it("maps every tee set with real pars, filling in stroke indexes the provider left out", () => {
    const hits = hitsFromGolfApi({
      id: 42,
      club_name: "Richmond Park Golf Club",
      course_name: "Prince's",
      location: { address: "Roehampton Gate", city: "London" },
      tees: {
        male: [
          { tee_name: "White", holes: pars18.split(" ").map((p, i) => ({ par: Number(p), handicap: Number(si18.split(" ")[i]) })) },
          { tee_name: "Yellow", holes: pars18.split(" ").map((p) => ({ par: Number(p) })) },
        ],
        female: [{ tee_name: "Red", holes: [] }],
      },
    });
    // White has stroke indexes, Yellow has none, Red has no card at all. Two usable tees, not one:
    // a course whose pars are right is worth keeping even when the provider omits stroke indexes,
    // because the alternative is the golfer not finding their course in the search at all.
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({ name: "Prince's", club: "Richmond Park Golf Club", address: "Roehampton Gate, London", tee: "White", source: "api", ref: "golfcourseapi:42:White" });
    expect(coursePar(hits[0].holes)).toBe(72);
    expect(hits[0].holes.map((h) => h.strokeIndex)).toEqual(si18.split(" ").map(Number));
    // Yellow keeps the same pars and gets a full, sane set of indexes rather than being dropped.
    expect(hits[1].tee).toBe("Yellow");
    expect(coursePar(hits[1].holes)).toBe(72);
    expect([...hits[1].holes.map((h) => h.strokeIndex)].sort((a, b) => a - b)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });
  it("returns nothing for a course without a name", () => {
    expect(hitsFromGolfApi({ id: 1 })).toEqual([]);
  });
});

describe("hitsFromGolfApi across provider shapes", () => {
  const holes18 = Array.from({ length: 18 }, (_, i) => ({ par: [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 5, 4, 4, 3, 4][i], handicap: i + 1, yardage: 300 + i }));
  const tee = { tee_name: "White", holes: holes18 };
  const base = { id: 7, club_name: "Mannings Heath Golf Club", course_name: "Waterfall", location: { address: "Hammerpond Rd", city: "Horsham", country: "United Kingdom" } };

  it("reads the shape we originally assumed: an object of arrays", () => {
    const hits = hitsFromGolfApi({ ...base, tees: { male: [tee] } });
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ name: "Waterfall", club: "Mannings Heath Golf Club", tee: "White" });
    expect(hits[0].holes).toHaveLength(18);
  });

  it("reads a bare array of tees, which used to throw and wipe the whole search", () => {
    expect(hitsFromGolfApi({ ...base, tees: [tee] })[0].tee).toBe("White");
  });

  it("reads an object whose values are single tees rather than arrays", () => {
    expect(hitsFromGolfApi({ ...base, tees: { male: tee } })[0].tee).toBe("White");
  });

  it("reads one tee handed over on its own", () => {
    expect(hitsFromGolfApi({ ...base, tees: tee })[0].tee).toBe("White");
  });

  it("never throws, whatever arrives", () => {
    for (const tees of [null, undefined, 0, "tees", [], {}, { male: null }, { male: [null] }, { male: [{ holes: "nope" }] }]) {
      expect(() => hitsFromGolfApi({ ...base, tees } as never)).not.toThrow();
    }
  });

  it("keeps a course whose stroke indexes are missing, using sensible defaults", () => {
    const noSi = holes18.map((h) => ({ par: h.par, yardage: h.yardage }));
    const hits = hitsFromGolfApi({ ...base, tees: { male: [{ tee_name: "Yellow", holes: noSi }] } });
    expect(hits).toHaveLength(1);
    expect(new Set(hits[0].holes.map((h) => h.strokeIndex)).size).toBe(18);
  });

  it("keeps a course whose stroke indexes are duplicated nonsense", () => {
    const badSi = holes18.map((h) => ({ par: h.par, handicap: 1, yardage: h.yardage }));
    expect(hitsFromGolfApi({ ...base, tees: { male: [{ tee_name: "Red", holes: badSi }] } })).toHaveLength(1);
  });

  it("still drops a card whose pars are not golf", () => {
    const junk = holes18.map(() => ({ par: 99, handicap: 1 }));
    expect(hitsFromGolfApi({ ...base, tees: { male: [{ tee_name: "Blue", holes: junk }] } })).toHaveLength(0);
  });

  it("drops a card that is neither 9 nor 18 holes", () => {
    expect(hitsFromGolfApi({ ...base, tees: { male: [{ tee_name: "Short", holes: holes18.slice(0, 12) }] } })).toHaveLength(0);
  });
});

describe("teeSetsFrom", () => {
  const tee = { tee_name: "White", holes: [{ par: 4 }] };
  it("finds tee sets however they are nested", () => {
    expect(teeSetsFrom({ male: [{ ...tee }], female: [{ ...tee, tee_name: "Red" }] })).toHaveLength(2);
    expect(teeSetsFrom([tee])).toHaveLength(1);
    expect(teeSetsFrom(tee)).toHaveLength(1);
    expect(teeSetsFrom({ a: { b: { c: [tee] } } })).toHaveLength(1);
  });

  it("returns nothing for anything that holds no holes", () => {
    for (const x of [null, undefined, 42, "x", [], {}, { male: [] }]) expect(teeSetsFrom(x)).toEqual([]);
  });

  it("survives a payload that points back at itself", () => {
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(() => teeSetsFrom(loop)).not.toThrow();
  });
});

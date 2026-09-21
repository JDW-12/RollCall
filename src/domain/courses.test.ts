import { describe, expect, it } from "vitest";
import { courseKey, coursePar, defaultStrokeIndexes, hitsFromGolfApi, holesFromLines, mergeHits, validateHoles, type CourseHit } from "./courses";

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
  it("maps each tee set with a usable card and skips ones without stroke indexes", () => {
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
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ name: "Prince's", club: "Richmond Park Golf Club", address: "Roehampton Gate, London", tee: "White", source: "api", ref: "golfcourseapi:42:White" });
    expect(coursePar(hits[0].holes)).toBe(72);
  });
  it("returns nothing for a course without a name", () => {
    expect(hitsFromGolfApi({ id: 1 })).toEqual([]);
  });
});

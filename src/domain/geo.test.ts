import { describe, expect, it } from "vitest";
import { bearing, distance, greenDistances, toYards, type LatLon } from "./geo";
import { holesFromOverpass, overpassQuery, type OverpassJson } from "./course-geo";

// About 0.0009 degrees of latitude is 100 metres.
const north = (p: LatLon, m: number): LatLon => [p[0] + m / 111_195, p[1]];
const east = (p: LatLon, m: number): LatLon => [p[0], p[1] + m / (111_195 * Math.cos((p[0] * Math.PI) / 180))];
const tee: LatLon = [51.09, -0.23];

describe("geo", () => {
  it("measures metres and yards, and bearings", () => {
    expect(distance(tee, north(tee, 300))).toBeCloseTo(300, 0);
    expect(toYards(300)).toBe(328);
    expect(bearing(tee, north(tee, 100))).toBeCloseTo(0, 0);
    expect(bearing(tee, east(tee, 100))).toBeCloseTo(90, 0);
  });

  it("reads front, middle and back of a green from where you stand", () => {
    const c = north(tee, 300);
    // A 30 m square green centred 300 m north.
    const outline: LatLon[] = [north(east(c, -15), -15), north(east(c, 15), -15), north(east(c, 15), 15), north(east(c, -15), 15), north(east(c, -15), -15)];
    const d = greenDistances(tee, { center: c, outline });
    expect(d.middle).toBeCloseTo(300, 0);
    expect(d.front!).toBeCloseTo(285, 0);
    expect(d.back!).toBeGreaterThan(314);
    expect(greenDistances(c, { center: c, outline }).front).toBe(0);
    expect(greenDistances(tee, { center: c, outline: null })).toMatchObject({ front: null, back: null });
  });
});

/** An Overpass answer for a site with two courses, both with holes 1 and 2. */
function site(): OverpassJson {
  const g = (p: LatLon) => ({ lat: p[0], lon: p[1] });
  const square = (c: LatLon, r: number) => [north(east(c, -r), -r), north(east(c, r), -r), north(east(c, r), r), north(east(c, -r), r), north(east(c, -r), -r)].map(g);
  const westTee = east(tee, -2000);
  const hole = (id: number, ref: string, par: string, from: LatLon, len: number) => ({ type: "way", id, tags: { golf: "hole", ref, par }, geometry: [g(from), g(north(from, len))] });
  return {
    elements: [
      // Griffin, around the tee, pars 4 then 3.
      { type: "way", id: 1, tags: { leisure: "golf_course", name: "Cottesmore Griffin Course" }, geometry: square(north(tee, 300), 900) },
      hole(10, "1", "4", tee, 350),
      hole(11, "2", "3", east(tee, 100), 160),
      { type: "way", id: 12, tags: { golf: "green" }, geometry: square(north(tee, 350), 12) },
      // Phoenix, two kilometres west, pars 5 then 4.
      { type: "way", id: 2, tags: { leisure: "golf_course", name: "Phoenix" }, geometry: square(north(westTee, 300), 900) },
      hole(20, "1", "5", westTee, 480),
      hole(21, "2", "4", east(westTee, 100), 380),
    ],
  };
}

describe("holesFromOverpass", () => {
  it("picks the named course's holes when two share the site, and finds each green", () => {
    const holes = holesFromOverpass(site(), [4, 3], "Griffin")!;
    expect(holes.map((h) => [h.number, h.par])).toEqual([
      [1, 4],
      [2, 3],
    ]);
    expect(holes[0].green.outline).not.toBeNull();
    expect(distance(holes[0].tee, holes[0].green.center)).toBeCloseTo(350, -1);
    // Hole 2 has no green polygon: its line's end stands in as the middle.
    expect(holes[1].green.outline).toBeNull();
  });

  it("falls back to the pars when the name doesn't match, and gives up when too few holes are placed", () => {
    const phoenix = holesFromOverpass(site(), [5, 4], "Old course")!;
    expect(phoenix.map((h) => h.par)).toEqual([5, 4]);
    expect(holesFromOverpass({ elements: [] }, [4, 4, 3, 5], "Griffin")).toBeNull();
    expect(holesFromOverpass(site(), [4, 3, 4, 5, 4, 3, 4, 5, 4], "Griffin")).toBeNull();
  });

  it("builds a bounded Overpass query", () => {
    expect(overpassQuery([51.09, -0.23], 2000)).toContain('way["golf"="hole"](around:2000,51.09,-0.23)');
  });
});

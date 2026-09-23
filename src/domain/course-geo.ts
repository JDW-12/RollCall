import { centroid, distance, inPolygon, type Green, type LatLon } from "./geo";

/**
 * Hole-by-hole geometry for a course, read from OpenStreetMap. Mappers draw each hole as a line
 * (golf=hole, ref = hole number, par) from tee to green, the greens as polygons (golf=green) and the
 * course boundary as leisure=golf_course. That's enough for a GPS rangefinder with no one marking
 * anything by hand.
 *
 * A club often has two or more courses on one site (Cottesmore's Griffin and Phoenix), so hole 1
 * appears twice. The right set is the one inside the course boundary named like ours, else the one
 * whose pars match the card.
 */

export type HoleGeo = { number: number; par: number | null; tee: LatLon; green: Green; line: LatLon[] };
/**
 * Why a course has no hole positions: we couldn't place the course at all ("no-location"), or it was
 * found but OpenStreetMap has no numbered holes there ("no-holes"; `found` counts what was there).
 */
export type CourseGeo =
  | { status: "ok"; holes: HoleGeo[]; center: LatLon; source: "osm"; fetchedAt: number }
  | { status: "none"; center: LatLon | null; fetchedAt: number; reason?: "no-location" | "no-holes"; found?: { holes: number; greens: number } };

type OsmPoint = { lat: number; lon: number };
type OsmWay = { type: "way"; id: number; tags?: Record<string, string>; geometry?: OsmPoint[] };
type OsmRelation = { type: "relation"; id: number; tags?: Record<string, string>; members?: { type: string; role?: string; geometry?: OsmPoint[] }[] };
export type OverpassJson = { elements?: (OsmWay | OsmRelation | { type: string })[] };

const pts = (g?: OsmPoint[]): LatLon[] => (g ?? []).map((p) => [p.lat, p.lon]);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

type Candidate = { number: number; par: number | null; line: LatLon[]; name: string };
type Boundary = { name: string; rings: LatLon[][] };

/** The Overpass query for everything golf within `radius` metres of a point. */
export function overpassQuery(at: LatLon, radius = 2500): string {
  const a = `(around:${radius},${at[0]},${at[1]})`;
  return `[out:json][timeout:20];(way["golf"="hole"]${a};way["golf"="green"]${a};way["leisure"="golf_course"]${a};relation["leisure"="golf_course"]${a};);out geom;`;
}

/**
 * Pick this course's holes out of an Overpass answer. `pars` is the card's par per hole (so a nine
 * or an eighteen), `courseName` the course as named on the card ("Griffin"). Null when fewer than
 * half the holes can be placed: better no GPS than a wrong green.
 */
export function holesFromOverpass(json: OverpassJson, pars: number[], courseName: string): HoleGeo[] | null {
  const els = json.elements ?? [];
  const ways = els.filter((e): e is OsmWay => e.type === "way");
  const holes: Candidate[] = ways
    .filter((w) => w.tags?.golf === "hole" && (w.geometry?.length ?? 0) >= 2)
    .map((w) => ({ number: parseInt(w.tags?.ref ?? "", 10), par: w.tags?.par ? parseInt(w.tags.par, 10) : null, line: pts(w.geometry), name: w.tags?.name ?? "" }))
    .filter((h) => Number.isFinite(h.number) && h.number >= 1 && h.number <= pars.length);
  if (!holes.length) return null;
  const greens = ways.filter((w) => w.tags?.golf === "green" && (w.geometry?.length ?? 0) >= 4).map((w) => pts(w.geometry));
  const boundaries: Boundary[] = [
    ...ways.filter((w) => w.tags?.leisure === "golf_course" && (w.geometry?.length ?? 0) >= 4).map((w) => ({ name: w.tags?.name ?? "", rings: [pts(w.geometry)] })),
    ...els
      .filter((e): e is OsmRelation => e.type === "relation" && (e as OsmRelation).tags?.leisure === "golf_course")
      .map((r) => ({ name: r.tags?.name ?? "", rings: (r.members ?? []).filter((m) => m.role !== "inner" && (m.geometry?.length ?? 0) >= 4).map((m) => pts(m.geometry)) })),
  ];

  const pool = choosePool(holes, boundaries, pars, courseName);
  const out: HoleGeo[] = [];
  for (let n = 1; n <= pars.length; n++) {
    const options = pool.filter((h) => h.number === n);
    if (!options.length) continue;
    // Several lines for one number (two courses, or a duplicate): the one whose par matches wins.
    const pick = options.find((h) => h.par === pars[n - 1]) ?? options[0];
    const end = pick.line.at(-1)!;
    const outline = greens.find((g) => inPolygon(end, g)) ?? nearest(greens, end, 60);
    out.push({ number: n, par: pick.par, tee: pick.line[0], line: pick.line, green: outline ? { center: centroid(outline), outline } : { center: end, outline: null } });
  }
  return out.length * 2 >= pars.length ? out : null;
}

/** Narrow the candidates to one course when the site has several. */
function choosePool(holes: Candidate[], boundaries: Boundary[], pars: number[], courseName: string): Candidate[] {
  const numbers = new Set(holes.map((h) => h.number));
  const duplicated = numbers.size < holes.length;
  if (!duplicated) return holes;
  const wanted = norm(courseName);
  const inside = (b: Boundary) => holes.filter((h) => b.rings.some((r) => inPolygon(h.line[0], r) || inPolygon(h.line.at(-1)!, r)));
  // Named boundary first ("Griffin Course" for a "Griffin" card), then a hole name carrying it.
  const named = boundaries.find((b) => wanted && norm(b.name).includes(wanted) && inside(b).length);
  if (named) return inside(named);
  const byName = holes.filter((h) => wanted && norm(h.name).includes(wanted));
  if (byName.length) return byName;
  // Otherwise the boundary whose holes' pars fit the card best.
  const scored = boundaries
    .map((b) => {
      const hs = inside(b);
      return { hs, score: hs.filter((h) => h.par === pars[h.number - 1]).length };
    })
    .filter((x) => x.hs.length)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.hs ?? holes;
}

function nearest(greens: LatLon[][], p: LatLon, within: number): LatLon[] | null {
  let best: LatLon[] | null = null;
  let d = within;
  for (const g of greens) {
    const dd = distance(p, centroid(g));
    if (dd < d) [best, d] = [g, dd];
  }
  return best;
}

/** Everything's centre: where the map opens before a hole is picked. */
export function courseCenter(holes: HoleGeo[]): LatLon {
  const all = holes.flatMap((h) => [h.tee, h.green.center]);
  return [all.reduce((a, p) => a + p[0], 0) / all.length, all.reduce((a, p) => a + p[1], 0) / all.length];
}

/** What an Overpass answer holds, for the log and for saying why a course has no yardages. */
export function featureCounts(json: OverpassJson): { holes: number; greens: number } {
  const ways = (json.elements ?? []).filter((e): e is OsmWay => e.type === "way");
  return { holes: ways.filter((w) => w.tags?.golf === "hole").length, greens: ways.filter((w) => w.tags?.golf === "green").length };
}

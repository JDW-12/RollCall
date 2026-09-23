/**
 * Distances on a golf hole. Positions are [lat, lon] in degrees. At golf-hole scale (under a
 * kilometre) the haversine distance is exact enough; a phone's GPS is the limit at 3-10 metres.
 */

export type LatLon = [number, number];

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Metres between two points. */
export function distance(a: LatLon, b: LatLon): number {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const toYards = (m: number) => Math.round(m * 1.09361);

/** Compass bearing from a to b, 0-360, 0 = north. The map turns by this so the hole plays up the screen. */
export function bearing(a: LatLon, b: LatLon): number {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
  const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Local flat projection in metres around an origin: good for geometry within a hole. */
function project(origin: LatLon, p: LatLon): [number, number] {
  return [rad(p[1] - origin[1]) * R * Math.cos(rad(origin[0])), rad(p[0] - origin[0]) * R];
}

export function centroid(ring: LatLon[]): LatLon {
  const pts = ring.length > 1 && ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1] ? ring.slice(0, -1) : ring;
  const lat = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const lon = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return [lat, lon];
}

export function inPolygon(p: LatLon, ring: LatLon[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    if (yi > p[0] !== yj > p[0] && p[1] < ((xj - xi) * (p[0] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Shortest distance in metres from a point to a polygon's edge (0 when standing on it). */
function toEdge(p: LatLon, ring: LatLon[]): number {
  if (inPolygon(p, ring)) return 0;
  const o = project(p, p);
  let best = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = project(p, ring[i]);
    const b = project(p, ring[i + 1]);
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((o[0] - a[0]) * dx + (o[1] - a[1]) * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(a[0] + t * dx - o[0], a[1] + t * dy - o[1]));
  }
  return best;
}

export type Green = { center: LatLon; outline: LatLon[] | null };

/**
 * Front, middle and back of the green from where you stand, in metres. Front is the nearest edge,
 * back the farthest point of the outline, the way a rangefinder app reads them. Without an outline
 * only the middle is known.
 */
export function greenDistances(from: LatLon, green: Green): { front: number | null; middle: number; back: number | null } {
  const middle = distance(from, green.center);
  if (!green.outline || green.outline.length < 4) return { front: null, middle, back: null };
  const front = toEdge(from, green.outline);
  const back = Math.max(...green.outline.map((p) => distance(from, p)));
  return { front, middle, back: Math.max(back, middle) };
}

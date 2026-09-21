/**
 * Stableford scoring as played in UK societies: shots received per hole from the playing handicap
 * and the hole's stroke index, points = 2 + par - net strokes, floored at zero.
 */

export type Hole = { number: number; par: number; strokeIndex: number };

export type StablefordCard = {
  holes: Hole[];
  /** Where the holes came from, when picked from the library or a provider. Null id = typed or scanned but not saved. */
  course?: { id: string | null; name: string; tee: string } | null;
  /** userId -> playing handicap (whole shots) */
  handicaps: Record<string, number>;
  /** userId -> gross strokes per hole (null = not entered / picked up) */
  strokes: Record<string, (number | null)[]>;
};

export function shotsOnHole(handicap: number, strokeIndex: number, holeCount = 18): number {
  if (handicap <= 0) {
    // Plus handicaps give shots back on the highest indexes. Rare in societies; keep simple.
    return 0;
  }
  const base = Math.floor(handicap / holeCount);
  const extra = handicap % holeCount;
  return base + (strokeIndex <= extra ? 1 : 0);
}

export function stablefordPoints(gross: number | null, par: number, strokeIndex: number, handicap: number, holeCount = 18): number {
  if (gross === null) return 0;
  const net = gross - shotsOnHole(handicap, strokeIndex, holeCount);
  return Math.max(0, 2 + par - net);
}

export type StablefordTotal = { userId: string; points: number; gross: number | null; holesPlayed: number; front: number; back: number };

export function stablefordTotals(card: StablefordCard): StablefordTotal[] {
  const out: StablefordTotal[] = [];
  const holeCount = card.holes.length;
  for (const [userId, strokes] of Object.entries(card.strokes)) {
    const hcp = card.handicaps[userId] ?? 0;
    let points = 0;
    let gross = 0;
    let complete = true;
    let holesPlayed = 0;
    let front = 0;
    let back = 0;
    card.holes.forEach((h, i) => {
      const g = strokes[i] ?? null;
      const p = stablefordPoints(g, h.par, h.strokeIndex, hcp, holeCount);
      points += p;
      if (i < 9) front += p;
      else back += p;
      if (g === null) complete = false;
      else {
        gross += g;
        holesPlayed++;
      }
    });
    out.push({ userId, points, gross: complete ? gross : null, holesPlayed, front, back });
  }
  return out.sort((a, b) => b.points - a.points || b.back - a.back || a.userId.localeCompare(b.userId));
}

/** Keeps each player's strokes aligned when the course changes length (9 <-> 18 holes). */
export function resizeStrokes(strokes: Record<string, (number | null)[]>, holeCount: number): Record<string, (number | null)[]> {
  const out: Record<string, (number | null)[]> = {};
  for (const [uid, arr] of Object.entries(strokes)) out[uid] = Array.from({ length: holeCount }, (_, i) => arr[i] ?? null);
  return out;
}

/** A sensible default 18-hole layout so a card can be started before anyone types pars in. */
export function defaultHoles(): Hole[] {
  const pars = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5];
  const si = [7, 3, 15, 1, 11, 9, 17, 5, 13, 8, 16, 2, 10, 4, 12, 18, 6, 14];
  return pars.map((par, i) => ({ number: i + 1, par, strokeIndex: si[i] }));
}

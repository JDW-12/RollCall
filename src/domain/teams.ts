/**
 * Split tonight's players into two balanced sides using form, with a seeded shuffle so
 * re-rolling gives a different but still fair split.
 */

export type TeamPlayer = { userId: string; form: number | null };
export type Teams = { a: string[]; b: string[]; formA: number; formB: number; seed: number };

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function balanceTeams(players: TeamPlayer[], seed = 1): Teams {
  const rnd = mulberry32(seed);
  const withForm = players.map((p) => ({ ...p, f: p.form ?? 6.0, jitter: rnd() }));
  // Sort by form, jitter breaks ties so re-rolls differ.
  withForm.sort((x, y) => y.f - x.f || x.jitter - y.jitter);
  const a: string[] = [];
  const b: string[] = [];
  let fa = 0;
  let fb = 0;
  // Snake draft: 1st to A, 2nd and 3rd to B, 4th and 5th to A, ... keeps totals close.
  withForm.forEach((p, i) => {
    const toA = i % 4 === 0 || i % 4 === 3;
    if (toA) {
      a.push(p.userId);
      fa += p.f;
    } else {
      b.push(p.userId);
      fb += p.f;
    }
  });
  // If sizes differ by more than one (odd counts) that's expected; if form gap is large, swap the closest pair.
  const gap = () => Math.abs(fa - fb);
  if (gap() > 1.0 && a.length > 1 && b.length > 1) {
    let best: { i: number; j: number; g: number } | null = null;
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        const fi = withForm.find((p) => p.userId === a[i])!.f;
        const fj = withForm.find((p) => p.userId === b[j])!.f;
        const g = Math.abs(fa - fi + fj - (fb - fj + fi));
        if (!best || g < best.g) best = { i, j, g };
      }
    }
    if (best && best.g < gap()) {
      const fi = withForm.find((p) => p.userId === a[best.i])!.f;
      const fj = withForm.find((p) => p.userId === b[best.j])!.f;
      const tmp = a[best.i];
      a[best.i] = b[best.j];
      b[best.j] = tmp;
      fa = fa - fi + fj;
      fb = fb - fj + fi;
    }
  }
  return { a, b, formA: round1(fa / Math.max(1, a.length)), formB: round1(fb / Math.max(1, b.length)), seed };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

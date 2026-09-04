/**
 * RSVP engine. Pure functions over an in-memory list so the rules can be unit tested
 * without a database. The server action loads the rows, calls `applyRsvp`, and writes back.
 */

export type RsvpStatus = "in" | "reserve" | "out";

export type RsvpRow = {
  userId: string;
  status: RsvpStatus;
  /** Queue position. Earlier wins a spot and is promoted first. Epoch ms. */
  queuedAt: number;
  respondedAt: number;
  droppedAt: number | null;
  lateDrop: boolean;
};

export type SessionRules = {
  capacity: number;
  startsAt: number;
  rsvpDeadlineAt: number | null;
  status: "open" | "played" | "cancelled";
  lateDropHours: number;
};

export type RsvpChange =
  | { type: "joined"; userId: string }
  | { type: "reserved"; userId: string }
  | { type: "dropped"; userId: string; late: boolean }
  | { type: "left_reserve"; userId: string }
  | { type: "promoted"; userId: string };

export type RsvpResult = { rows: RsvpRow[]; changes: RsvpChange[] };

export class RsvpError extends Error {}

export function countIn(rows: RsvpRow[]): number {
  return rows.filter((r) => r.status === "in").length;
}

export function reserves(rows: RsvpRow[]): RsvpRow[] {
  return rows
    .filter((r) => r.status === "reserve")
    .sort((a, b) => a.queuedAt - b.queuedAt);
}

export function playing(rows: RsvpRow[]): RsvpRow[] {
  return rows.filter((r) => r.status === "in").sort((a, b) => a.queuedAt - b.queuedAt);
}

/** A drop is "late" once inside the crew's window before kick-off, or after the RSVP deadline if one is set. */
export function isLateDrop(rules: SessionRules, now: number): boolean {
  const windowStart = rules.startsAt - rules.lateDropHours * 3_600_000;
  if (now >= windowStart) return true;
  if (rules.rsvpDeadlineAt !== null && now >= rules.rsvpDeadlineAt) return true;
  return false;
}

export function applyRsvp(
  rules: SessionRules,
  current: RsvpRow[],
  userId: string,
  intent: "in" | "out",
  now: number,
): RsvpResult {
  if (rules.status !== "open") throw new RsvpError("This one is closed.");
  if (now >= rules.startsAt && intent === "in") throw new RsvpError("Kick-off has passed.");

  const rows = current.map((r) => ({ ...r }));
  const changes: RsvpChange[] = [];
  const me = rows.find((r) => r.userId === userId);

  if (intent === "in") {
    if (me?.status === "in") return { rows, changes };
    const hasSpace = countIn(rows) < rules.capacity;
    const status: RsvpStatus = hasSpace ? "in" : "reserve";
    if (me) {
      // Coming back after an "out" starts a fresh queue position. Moving reserve -> in keeps it.
      const keepQueue = me.status === "reserve";
      me.status = status;
      me.queuedAt = keepQueue ? me.queuedAt : now;
      me.respondedAt = now;
      me.droppedAt = null;
      me.lateDrop = false;
    } else {
      rows.push({ userId, status, queuedAt: now, respondedAt: now, droppedAt: null, lateDrop: false });
    }
    changes.push(status === "in" ? { type: "joined", userId } : { type: "reserved", userId });
    return { rows, changes };
  }

  // intent === "out"
  if (!me || me.status === "out") {
    if (!me) rows.push({ userId, status: "out", queuedAt: now, respondedAt: now, droppedAt: null, lateDrop: false });
    return { rows, changes };
  }
  if (me.status === "reserve") {
    me.status = "out";
    me.respondedAt = now;
    changes.push({ type: "left_reserve", userId });
    return { rows, changes };
  }
  // Holding a spot and leaving.
  const late = isLateDrop(rules, now);
  me.status = "out";
  me.respondedAt = now;
  me.droppedAt = now;
  me.lateDrop = late;
  changes.push({ type: "dropped", userId, late });
  promote(rows, rules.capacity, now, changes);
  return { rows, changes };
}

/** Fill free spots from the reserve queue in order. Never demotes anyone. */
export function promote(rows: RsvpRow[], capacity: number, now: number, changes: RsvpChange[] = []): RsvpChange[] {
  let free = capacity - countIn(rows);
  for (const r of reserves(rows)) {
    if (free <= 0) break;
    r.status = "in";
    r.respondedAt = now;
    free--;
    changes.push({ type: "promoted", userId: r.userId });
  }
  return changes;
}

/** Organiser changed capacity: promote reserves into any new spots. */
export function applyCapacityChange(rows: RsvpRow[], capacity: number, now: number): RsvpResult {
  const next = rows.map((r) => ({ ...r }));
  const changes = promote(next, capacity, now);
  return { rows: next, changes };
}

export function summarise(rows: RsvpRow[], capacity: number) {
  const inCount = countIn(rows);
  return {
    in: inCount,
    reserve: reserves(rows).length,
    out: rows.filter((r) => r.status === "out").length,
    spotsLeft: Math.max(0, capacity - inCount),
    full: inCount >= capacity,
    lateDrops: rows.filter((r) => r.lateDrop).length,
  };
}

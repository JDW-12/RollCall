/**
 * Money rules. Everything in pence. Positive numbers only; direction comes from the entry kind.
 */

export type CostMode = "total" | "per_head";

export type ChargeReason = "share" | "late_drop" | "no_show" | "pot";

export type Charge = {
  userId: string;
  amountPence: number;
  reason: ChargeReason;
};

/**
 * Split a total between payers so the pence add up exactly. The first payers (by order given)
 * absorb any remainder, one penny each, so nobody is ever a penny short.
 */
export function splitEvenly(totalPence: number, payerIds: string[]): Map<string, number> {
  const out = new Map<string, number>();
  if (payerIds.length === 0 || totalPence <= 0) {
    for (const id of payerIds) out.set(id, 0);
    return out;
  }
  const base = Math.floor(totalPence / payerIds.length);
  let remainder = totalPence - base * payerIds.length;
  for (const id of payerIds) {
    out.set(id, base + (remainder > 0 ? 1 : 0));
    if (remainder > 0) remainder--;
  }
  return out;
}

export type SettleInput = {
  costMode: CostMode;
  costPence: number;
  /** Everyone who held a spot at kick-off, in queue order. */
  playing: string[];
  /** Attendance confirmed by the organiser. Missing = assumed attended. */
  attended: Map<string, boolean>;
  /** Users who dropped a held spot inside the late window. They still pay. */
  lateDrops: string[];
};

/**
 * Decide who pays what once a session has been played.
 *
 * Rules the crew agreed to:
 *  - Everyone who played pays their share.
 *  - A no-show (held a spot, didn't turn up) still pays their share.
 *  - A late drop still pays their share. They freed a spot, but too late to fill it fairly.
 *  - In "total" mode the booking cost is split between everyone who owes.
 *  - In "per_head" mode each person owes the fixed amount.
 */
export function settleSession(input: SettleInput): Charge[] {
  const charges: Charge[] = [];
  const playersWhoOwe: { userId: string; reason: ChargeReason }[] = [];
  for (const userId of input.playing) {
    const attended = input.attended.get(userId) ?? true;
    playersWhoOwe.push({ userId, reason: attended ? "share" : "no_show" });
  }
  for (const userId of input.lateDrops) {
    if (!playersWhoOwe.some((p) => p.userId === userId)) {
      playersWhoOwe.push({ userId, reason: "late_drop" });
    }
  }
  if (input.costPence <= 0 || playersWhoOwe.length === 0) return charges;

  if (input.costMode === "per_head") {
    for (const p of playersWhoOwe) charges.push({ ...p, amountPence: input.costPence });
    return charges;
  }
  const shares = splitEvenly(input.costPence, playersWhoOwe.map((p) => p.userId));
  for (const p of playersWhoOwe) charges.push({ ...p, amountPence: shares.get(p.userId) ?? 0 });
  return charges;
}

export type LedgerLine = {
  userId: string;
  kind: "charge" | "payment";
  amountPence: number;
  sessionId: string | null;
};

export type Balance = { userId: string; charged: number; paid: number; owed: number };

/** Owed is what the player still needs to give the crew. Negative means the crew owes them. */
export function balances(lines: LedgerLine[]): Map<string, Balance> {
  const out = new Map<string, Balance>();
  for (const l of lines) {
    const b = out.get(l.userId) ?? { userId: l.userId, charged: 0, paid: 0, owed: 0 };
    if (l.kind === "charge") b.charged += l.amountPence;
    else b.paid += l.amountPence;
    b.owed = b.charged - b.paid;
    out.set(l.userId, b);
  }
  return out;
}

/** Preview the per-head cost for a session before it's played, given how many are currently in. */
export function previewShare(costMode: CostMode, costPence: number, headcount: number): number {
  if (costPence <= 0) return 0;
  if (costMode === "per_head") return costPence;
  if (headcount <= 0) return costPence;
  return Math.ceil(costPence / headcount);
}

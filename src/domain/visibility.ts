/**
 * Who can see a session. By default the whole crew; an organiser can instead pick people, for a
 * four-ball or a small-sided game they only want some of the crew for. Organisers always see every
 * session (they run attendance and money), and whoever pinned it always sees their own.
 *
 * Stored on the session as `invitees`: null for the whole crew, else a JSON array of member ids.
 */

export type Viewer = { id: string; isOrganiser: boolean };
export type Visible = { invitees: string | null; createdBy: string };

/** The picked member ids, or null when the whole crew can see it. Garbage reads as the whole crew's. */
export function inviteesOf(s: Pick<Visible, "invitees">): string[] | null {
  if (!s.invitees) return null;
  try {
    const v = JSON.parse(s.invitees) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : null;
  } catch {
    return null;
  }
}

export function canSeeSession(s: Visible, viewer: Viewer): boolean {
  if (viewer.isOrganiser || s.createdBy === viewer.id) return true;
  const ids = inviteesOf(s);
  return ids === null || ids.includes(viewer.id);
}

export function visibleSessions<T extends Visible>(sessions: T[], viewer: Viewer): T[] {
  return sessions.filter((s) => canSeeSession(s, viewer));
}

/**
 * What to store for a session: null for the whole crew, else the picked ids that are real members,
 * plus anyone who has already answered (so trimming the list never strands someone who said they're
 * in), plus whoever pinned it. Throws a UI-facing message when nobody else is picked.
 */
export function encodeInvitees(mode: "crew" | "picked", picked: string[], opts: { memberIds: string[]; creatorId: string; responded?: string[] }): string | null {
  if (mode === "crew") return null;
  const members = new Set(opts.memberIds);
  const ids = new Set<string>([...picked, ...(opts.responded ?? [])].filter((id) => members.has(id)));
  ids.delete(opts.creatorId);
  if (ids.size === 0) throw new Error("UI:Pick at least one person to invite, or show it to the whole crew.");
  return JSON.stringify([opts.creatorId, ...[...ids].sort()]);
}

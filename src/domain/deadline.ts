const H = 3_600_000;

/** The moment after which dropping out counts as late: the commit-by deadline if earlier, else kick-off minus the crew's window. */
export function commitBy(session: { startsAt: Date; rsvpDeadlineAt: Date | null }, lateDropHours: number): Date {
  const windowStart = new Date(session.startsAt.getTime() - lateDropHours * H);
  if (session.rsvpDeadlineAt && session.rsvpDeadlineAt.getTime() < windowStart.getTime()) return session.rsvpDeadlineAt;
  return windowStart;
}

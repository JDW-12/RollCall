import { nowMs } from "@/lib/clock";
import type { Metadata } from "next";
import { requireCrewPage } from "@/lib/access";
import { listSessions, rsvpsFor } from "@/lib/queries";
import { CrewShell } from "@/components/shell";
import { SessionCard } from "@/components/session-card";
import { EmptyState, LinkButton, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { crew, user, isOrganiser } = await requireCrewPage(slug);
  const all = await listSessions(crew.id);
  const rsvps = await rsvpsFor(all.map((s) => s.id));
  const now = nowMs();
  const upcoming = all.filter((s) => s.status === "open" && s.startsAt.getTime() + s.durationMin * 60_000 >= now).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = all.filter((s) => !upcoming.includes(s));
  return (
    <CrewShell crew={crew} user={user} active="sessions">
      <PageTitle eyebrow={`${all.length} pinned`} title="Sessions" action={isOrganiser ? <LinkButton href={`/crew/${crew.slug}/sessions/new`}>Pin a session</LinkButton> : undefined} />
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-bold uppercase text-ink-2">Upcoming</h2>
        {upcoming.length === 0 ? <EmptyState title="Nothing upcoming" action={isOrganiser ? <LinkButton href={`/crew/${crew.slug}/sessions/new`}>Pin a session</LinkButton> : undefined} /> : null}
        {upcoming.map((s) => (
          <SessionCard key={s.id} session={s} rsvps={rsvps.filter((r) => r.sessionId === s.id)} slug={crew.slug} myId={user.id} />
        ))}
      </section>
      {past.length ? (
        <section className="flex flex-col gap-2 mt-8">
          <h2 className="text-xl font-bold uppercase text-ink-2">Played</h2>
          {past.map((s) => (
            <SessionCard key={s.id} session={s} rsvps={rsvps.filter((r) => r.sessionId === s.id)} slug={crew.slug} myId={user.id} />
          ))}
        </section>
      ) : null}
    </CrewShell>
  );
}

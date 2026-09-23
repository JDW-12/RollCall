import { nowMs } from "@/lib/clock";
import { visibleSessions } from "@/domain/visibility";
import type { Metadata } from "next";
import type { Rsvp, Session } from "@/db/schema";
import { requireCrewPage } from "@/lib/access";
import { listSessions, rsvpsFor } from "@/lib/queries";
import { CrewShell } from "@/components/shell";
import { SessionCard } from "@/components/session-card";
import { IconCalendar } from "@/components/icons";
import { EmptyState, Eyebrow, LinkButton, Notice, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Sessions" };

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "Europe/London" });
const yearFmt = new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: "Europe/London" });

/** "September", or "September 2025" when it is not this year. */
function monthLabel(d: Date, now: Date): string {
  const y = yearFmt.format(d);
  return y === yearFmt.format(now) ? monthFmt.format(d) : `${monthFmt.format(d)} ${y}`;
}

function byMonth(list: Session[], now: Date): { label: string; sessions: Session[] }[] {
  const groups: { label: string; sessions: Session[] }[] = [];
  for (const s of list) {
    const label = monthLabel(s.startsAt, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.sessions.push(s);
    else groups.push({ label, sessions: [s] });
  }
  return groups;
}

export default async function SessionsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ deleted?: string }> }) {
  const { slug } = await params;
  const { deleted } = await searchParams;
  const { crew, user, isOrganiser } = await requireCrewPage(slug);
  const all = visibleSessions(await listSessions(crew.id), { id: user.id, isOrganiser });
  const rsvps = await rsvpsFor(all.map((s) => s.id));
  const now = nowMs();
  const upcoming = all.filter((s) => s.status === "open" && s.startsAt.getTime() + s.durationMin * 60_000 >= now).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = all.filter((s) => !upcoming.includes(s));
  const nowDate = new Date(now);
  const card = (s: Session, emphasis = false) => <SessionCard key={s.id} session={s} rsvps={rsvps.filter((r: Rsvp) => r.sessionId === s.id)} slug={crew.slug} myId={user.id} organiser={isOrganiser} emphasis={emphasis} />;

  return (
    <CrewShell crew={crew} user={user} active="sessions">
      <PageTitle eyebrow={`${all.length} pinned`} title="Sessions" action={isOrganiser ? <LinkButton href={`/crew/${crew.slug}/sessions/new`}>Pin a session</LinkButton> : undefined} />
      {deleted ? (
        <div className="mb-4">
          <Notice tone="good">Deleted. It&apos;s gone for everyone, and off the table.</Notice>
        </div>
      ) : null}

      <section className="flex flex-col gap-3 anim-rise">
        <div className="flex items-center gap-2">
          <IconCalendar size={18} className="text-pitch" />
          <h2 className="text-xl font-bold uppercase">Upcoming</h2>
          <span className="eyebrow ml-auto tnum">{upcoming.length}</span>
        </div>
        {upcoming.length === 0 ? <EmptyState title="Nothing upcoming" body="Nothing on the calendar yet." action={isOrganiser ? <LinkButton href={`/crew/${crew.slug}/sessions/new`}>Pin a session</LinkButton> : undefined} /> : null}
        {byMonth(upcoming, nowDate).map((g, gi) => (
          <div key={g.label} className="flex flex-col gap-2">
            <MonthRule label={g.label} />
            {g.sessions.map((s, i) => card(s, gi === 0 && i === 0))}
          </div>
        ))}
      </section>

      {past.length ? (
        <section className="flex flex-col gap-3 mt-10 anim-rise-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold uppercase text-ink-2">Past</h2>
            <span className="eyebrow ml-auto tnum">{past.length}</span>
          </div>
          {byMonth(past, nowDate).map((g) => (
            <div key={g.label} className="flex flex-col gap-2">
              <MonthRule label={g.label} />
              {g.sessions.map((s) => card(s))}
            </div>
          ))}
        </section>
      ) : null}
    </CrewShell>
  );
}

function MonthRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <Eyebrow>{label}</Eyebrow>
      <span className="flex-1 border-t border-line-2" aria-hidden="true" />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCrewPage } from "@/lib/access";
import { listSessions, rsvpsFor } from "@/lib/queries";
import { visibleSessions } from "@/domain/visibility";
import { roundInPlay } from "@/domain/play";
import { CrewShell } from "@/components/shell";
import { EmptyState, LinkButton, PageTitle, Pill } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { nowMs } from "@/lib/clock";

export const metadata: Metadata = { title: "Play" };

/**
 * The Play tab. On the day, it goes straight into play mode for your round (GPS yardages, hole by
 * hole scoring). Any other time it lists the rounds you're in, each one tap from play mode, so a
 * practice nine or an early look at the course is still easy.
 */
export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { crew, user, isOrganiser } = await requireCrewPage(slug);
  if (crew.sport !== "golf") redirect(`/crew/${slug}`);
  const all = visibleSessions(await listSessions(crew.id), { id: user.id, isOrganiser }).filter((s) => s.status !== "cancelled");
  const rsvps = await rsvpsFor(all.map((s) => s.id));
  const mine = new Set(rsvps.filter((r) => r.userId === user.id && r.status === "in").map((r) => r.sessionId));
  const now = nowMs();
  const live = roundInPlay(
    all.map((s) => ({ id: s.id, status: s.status, startsAt: s.startsAt.getTime(), durationMin: s.durationMin })),
    mine,
    now,
  );
  if (live) redirect(`/crew/${slug}/s/${live.id}/live`);

  const upcoming = all.filter((s) => mine.has(s.id) && s.startsAt.getTime() > now).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const recent = all.filter((s) => mine.has(s.id) && s.startsAt.getTime() <= now).sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime()).slice(0, 3);
  const row = (s: (typeof all)[number], label: string) => (
    <li key={s.id} className="surface flex items-center justify-between gap-3 p-3">
      <Link href={`/crew/${slug}/s/${s.id}`} className="min-w-0">
        <span className="block font-semibold truncate">{s.title}</span>
        <span className="block text-xs text-ink-3 truncate">
          {fmtDateTime(s.startsAt)}
          {s.venueName ? ` · ${s.venueName}` : ""}
        </span>
      </Link>
      <LinkButton href={`/crew/${slug}/s/${s.id}/live`} className="min-h-10 px-4 shrink-0">
        {label}
      </LinkButton>
    </li>
  );

  return (
    <CrewShell crew={crew} user={user} active="play">
      <PageTitle eyebrow="GPS yardages · live scoring" title="Play">
        On the day of a round this tab opens it straight into play mode. Until then, pick one below.
      </PageTitle>
      {upcoming.length || recent.length ? (
        <div className="flex flex-col gap-6">
          {upcoming.length ? (
            <section aria-label="Coming up">
              <h2 className="eyebrow mb-2">Coming up</h2>
              <ol className="flex flex-col gap-2">{upcoming.map((s) => row(s, "Play"))}</ol>
            </section>
          ) : null}
          {recent.length ? (
            <section aria-label="Recent">
              <h2 className="eyebrow mb-2 flex items-center gap-2">
                Recent <Pill>finish or fix a card</Pill>
              </h2>
              <ol className="flex flex-col gap-2">{recent.map((s) => row(s, "Open"))}</ol>
            </section>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="No rounds yet"
          body="Say you're in for a round and it shows up here. On the day, this tab takes you straight to the first tee."
          action={isOrganiser ? <LinkButton href={`/crew/${slug}/sessions/new`}>Pin a round</LinkButton> : <LinkButton href={`/crew/${slug}/sessions`}>See rounds</LinkButton>}
        />
      )}
    </CrewShell>
  );
}

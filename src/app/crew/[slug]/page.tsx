import { appUrl } from "@/lib/env";
import { nowMs } from "@/lib/clock";
import type { Metadata } from "next";
import Link from "next/link";
import { requireCrewPage } from "@/lib/access";
import { getCrewTable, getFeed, getNextSession, listSessions, rsvpsFor } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { CrewShell } from "@/components/shell";
import { SessionCard } from "@/components/session-card";
import { Feed } from "@/components/feed";
import { Avatar } from "@/components/avatar";
import { ShareButtons } from "@/components/share";
import { EmptyState, LinkButton, Notice, Panel, Pill } from "@/components/ui";
import { RsvpButtons } from "./s/[id]/rsvp-buttons";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function CrewHome({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const { slug } = await params;
  const { welcome } = await searchParams;
  const ctx = await requireCrewPage(slug);
  const { crew, user, isOrganiser } = ctx;
  const [next, all, feed, table] = await Promise.all([getNextSession(crew.id), listSessions(crew.id), getFeed(crew.id, 12), getCrewTable(crew)]);
  const upcoming = all.filter((s) => s.status === "open" && s.id !== next?.id && s.startsAt.getTime() > nowMs()).slice(0, 3);
  const needsConfirm = all.filter((s) => s.status === "open" && s.startsAt.getTime() + s.durationMin * 60_000 < nowMs());
  const rsvps = await rsvpsFor([next?.id, ...upcoming.map((s) => s.id), ...needsConfirm.map((s) => s.id)].filter((x): x is string => !!x));
  const inviteUrl = `${await appUrl()}/join/${crew.inviteToken}`;
  const sport = sportOf(crew.sport);
  const top = table.rows.slice(0, 5);

  return (
    <CrewShell crew={crew} user={user} active="">
      {welcome ? (
        <Panel className="p-4 mb-5 flex flex-col gap-3 border-pitch/40 bg-pitch-soft">
          <div className="display text-2xl font-bold uppercase">Crew&apos;s live. Now get them in.</div>
          <p className="text-sm text-ink-2">Drop this link in the group chat. Nobody needs to install anything, they just type their name.</p>
          <code className="text-xs bg-panel border border-line rounded-sm px-2 py-1.5 wrap-anywhere">{inviteUrl}</code>
          <ShareButtons text={`You're in ${crew.name}. Tap to join so you can RSVP to sessions:`} url={inviteUrl} label="Send to WhatsApp" />
        </Panel>
      ) : null}

      {isOrganiser && needsConfirm.length > 0 ? (
        <Notice tone="warn">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span>
              <strong>{needsConfirm[0].title}</strong> has been played. Confirm who turned up so the table and money update.
            </span>
            <LinkButton href={`/crew/${crew.slug}/s/${needsConfirm[0].id}/play`} className="min-h-9 px-3 text-sm">
              Confirm
            </LinkButton>
          </div>
        </Notice>
      ) : null}

      <section className="mt-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold uppercase">Next up</h2>
          {isOrganiser ? (
            <LinkButton href={`/crew/${crew.slug}/sessions/new`} className="min-h-9 px-3 text-sm">
              Pin a session
            </LinkButton>
          ) : null}
        </div>
        {next ? (
          <>
            <SessionCard session={next} rsvps={rsvps.filter((r) => r.sessionId === next.id)} slug={crew.slug} myId={user.id} emphasis organiser={isOrganiser} />
            {next.status === "open" && next.startsAt.getTime() > nowMs() ? (
              <RsvpButtons sessionId={next.id} mine={rsvps.find((r) => r.sessionId === next.id && r.userId === user.id)?.status ?? null} inVerb={sportOf(next.sport).inVerb} />
            ) : null}
            <InLine rsvps={rsvps.filter((r) => r.sessionId === next.id)} members={table.members} />
          </>
        ) : (
          <EmptyState
            title="Nothing pinned"
            body={isOrganiser ? `Pin the next ${sport.noun} and share it. Takes under a minute.` : "Your organiser hasn't pinned the next one yet."}
            action={isOrganiser ? <LinkButton href={`/crew/${crew.slug}/sessions/new`}>Pin a session</LinkButton> : undefined}
          />
        )}
        {upcoming.length ? (
          <div className="grid gap-2">
            {upcoming.map((s) => (
              <SessionCard key={s.id} session={s} rsvps={rsvps.filter((r) => r.sessionId === s.id)} slug={crew.slug} myId={user.id} organiser={isOrganiser} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold uppercase">{crew.seasonName} table</h2>
          <Link href={`/crew/${crew.slug}/table`} className="text-sm font-semibold text-pitch-deep">
            Full table
          </Link>
        </div>
        {table.rows.every((r) => r.played === 0 && r.sickNotes === 0) ? (
          <p className="text-sm text-ink-3">The table starts once the first session is confirmed as played.</p>
        ) : (
          <Panel className="divide-y divide-line-2">
            {top.map((r, i) => {
              const m = table.members.find((x) => x.id === r.userId);
              if (!m) return null;
              return (
                <Link key={r.userId} href={`/crew/${crew.slug}/players/${r.userId}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-ground-2">
                  <span className="display text-xl font-bold w-6 text-ink-3 tnum">{i + 1}</span>
                  <Avatar name={m.name} hue={m.hue} size={30} />
                  <span className="font-semibold flex-1 truncate">{m.name}</span>
                  {r.streak >= 3 ? <Pill tone="good">{r.streak} streak</Pill> : null}
                  {r.sickNotes > 0 ? <Pill tone="bad">{r.sickNotes} sick note{r.sickNotes === 1 ? "" : "s"}</Pill> : null}
                  <span className="display text-2xl font-bold tnum w-10 text-right">{r.points}</span>
                </Link>
              );
            })}
          </Panel>
        )}
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="text-2xl font-bold uppercase">Latest</h2>
        <Feed items={feed} members={table.members} slug={crew.slug} />
      </section>
    </CrewShell>
  );
}

function InLine({ rsvps, members }: { rsvps: { userId: string; status: string }[]; members: { id: string; name: string; hue: number }[] }) {
  const ins = rsvps.filter((r) => r.status === "in");
  const res = rsvps.filter((r) => r.status === "reserve");
  if (ins.length === 0 && res.length === 0) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap text-sm text-ink-2">
      <div className="flex -space-x-1.5">
        {ins.map((r) => {
          const m = members.find((x) => x.id === r.userId);
          return m ? <Avatar key={r.userId} name={m.name} hue={m.hue} size={28} className="ring-2 ring-ground" /> : null;
        })}
      </div>
      <span>
        {ins
          .map((r) => members.find((x) => x.id === r.userId)?.name.split(" ")[0])
          .filter(Boolean)
          .join(", ")}
        {res.length ? ` · +${res.length} reserve` : ""}
      </span>
    </div>
  );
}

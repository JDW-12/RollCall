import { appUrl } from "@/lib/env";
import { nowMs } from "@/lib/clock";
import type { Metadata } from "next";
import type { FeedItem, Rsvp, Session } from "@/db/schema";
import Link from "next/link";
import { requireCrewPage } from "@/lib/access";
import { getCrewTable, getFeed, getNextSession, golfRounds, listSessions, rsvpsFor } from "@/lib/queries";
import { postedRounds } from "@/domain/golf-feed";
import type { Round } from "@/domain/golf-stats";
import { sportOf } from "@/domain/sports";
import { summarise } from "@/domain/rsvp";
import { previewShare } from "@/domain/money";
import { CrewBand, CrewShell } from "@/components/shell";
import { SessionCard, toRows } from "@/components/session-card";
import { Feed } from "@/components/feed";
import { Avatar } from "@/components/avatar";
import { ShareButtons } from "@/components/share";
import { Ring } from "@/components/ring";
import { Countdown } from "@/components/countdown";
import { FormDots } from "@/components/sparkline";
import { IconFlame, IconPin, IconWhistle, SportIcon } from "@/components/icons";
import { EmptyState, Eyebrow, LinkButton, Panel, Pill, cls } from "@/components/ui";
import { fmtDay, fmtTime, plural, pounds, relativeDay } from "@/lib/format";
import { RsvpButtons } from "./s/[id]/rsvp-buttons";
import { GolfHome } from "@/components/golf-home";
import { CourseBanner } from "@/components/golf/course-banner";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function CrewHome({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const { slug } = await params;
  const { welcome } = await searchParams;
  const ctx = await requireCrewPage(slug);
  const { crew, user, isOrganiser } = ctx;
  // A golf crew's feed is only rounds scheduled and rounds posted; the chatter (RSVPs, joins) stays off it.
  const golfCrew = crew.sport === "golf";
  const [next, all, rawFeed, table, rounds] = await Promise.all([
    getNextSession(crew.id),
    listSessions(crew.id),
    getFeed(crew.id, 12, golfCrew ? ["session_pinned"] : undefined),
    getCrewTable(crew),
    golfCrew ? golfRounds(crew.id) : Promise.resolve([]),
  ]);
  const feed = golfCrew ? golfFeed(rawFeed, rounds, all, crew.id) : rawFeed;
  const now = nowMs();
  const upcoming = all.filter((s) => s.status === "open" && s.id !== next?.id && s.startsAt.getTime() > now).slice(0, 3);
  const needsConfirm = all.filter((s) => s.status === "open" && s.startsAt.getTime() + s.durationMin * 60_000 < now);
  const rsvps = await rsvpsFor([next?.id, ...upcoming.map((s) => s.id), ...needsConfirm.map((s) => s.id)].filter((x): x is string => !!x));
  const inviteUrl = `${await appUrl()}/join/${crew.inviteToken}`;
  const sport = sportOf(crew.sport);
  const golf = crew.sport === "golf";
  const top = table.rows.slice(0, 5);
  const tableEmpty = table.rows.every((r) => r.played === 0 && r.sickNotes === 0);

  return (
    <CrewShell crew={crew} user={user} active="">
      {golf ? (
        <CourseBanner>
          <div className="flex items-start justify-between gap-3 anim-rise">
            <div className="min-w-0 flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.22em] uppercase" style={{ color: "var(--gf-band-ink-2)" }}>
                {crew.seasonName} · Golf society
              </span>
              <h1 className="display text-[42px] sm:text-[56px] font-extrabold uppercase leading-[0.88] wrap-anywhere [text-shadow:0_2px_18px_rgba(0,0,0,0.25)]">{crew.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold anim-rise-2">
            <span className="rounded-full px-2.5 py-1 backdrop-blur-md tnum" style={{ background: "color-mix(in oklab, var(--ground) 55%, transparent)", color: "var(--ink)" }}>
              {plural(table.members.length, "member")}
            </span>
            {next && next.startsAt.getTime() > now ? (
              <span className="rounded-full px-2.5 py-1 backdrop-blur-md truncate" style={{ background: "color-mix(in oklab, var(--ground) 55%, transparent)", color: "var(--ink)" }}>
                Next tee: {relativeDay(next.startsAt)} {fmtTime(next.startsAt)}
              </span>
            ) : null}
          </div>
        </CourseBanner>
      ) : (
      <CrewBand crew={crew}>
        <div className="flex items-end justify-between gap-4 anim-rise">
          <div className="min-w-0 flex flex-col gap-1.5">
            <Eyebrow>{crew.seasonName}</Eyebrow>
            <h1 className="display text-[44px] sm:text-[56px] font-extrabold uppercase leading-[0.9] wrap-anywhere">{crew.name}</h1>
            <div className="flex items-center gap-2 text-sm text-ink-2">
              <span className="font-semibold tnum">{plural(table.members.length, "member")}</span>
              <span className="text-ink-3">·</span>
              <span>{sport.label}</span>
            </div>
          </div>
          <span className="w-14 h-14 rounded-md flex items-center justify-center shrink-0 text-ink surface-raised" style={{ background: `oklch(0.45 0.13 ${crew.hue} / 0.6)` }} aria-hidden="true">
            <SportIcon sport={crew.sport} size={30} />
          </span>
        </div>
      </CrewBand>
      )}

      {welcome ? (
        <Panel className="p-4 mb-5 flex flex-col gap-3 border-pitch/40 bg-pitch-soft anim-rise">
          <div className="display text-2xl font-bold uppercase">Crew&apos;s live. Now get them in.</div>
          <p className="text-sm text-ink-2">Drop this link in the group chat. Nobody needs to install anything, they just type their name.</p>
          <code className="text-xs bg-panel border border-line rounded-sm px-2 py-1.5 wrap-anywhere">{inviteUrl}</code>
          <ShareButtons text={`You're in ${crew.name}. Tap to join so you can RSVP to sessions:`} url={inviteUrl} label="Send to WhatsApp" crewId={crew.id} what="invite" />
        </Panel>
      ) : null}

      {isOrganiser && needsConfirm.length > 0 ? (
        <div className="mb-5 flex items-center gap-3 rounded-md border border-card/50 bg-card-soft text-card-ink px-3 py-3 anim-rise">
          <span className="w-9 h-9 rounded-full bg-card text-pitch-ink inline-flex items-center justify-center shrink-0">
            <IconWhistle size={20} strokeWidth={2} />
          </span>
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-bold uppercase display text-lg leading-none truncate">{needsConfirm[0].title} has been played</div>
            <div className="text-card-ink/80">{golf ? "Confirm who played so the money settles and voting opens." : "Confirm who turned up so the table and money update."}</div>
          </div>
          <LinkButton href={`/crew/${crew.slug}/s/${needsConfirm[0].id}/play`} className="min-h-9 px-3 text-sm bg-card text-pitch-ink hover:bg-card shrink-0">
            Confirm
          </LinkButton>
        </div>
      ) : null}

      <section className="flex flex-col gap-3 anim-rise-2">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>Next up</Eyebrow>
            <h2 className="text-2xl font-bold uppercase">{golf ? "Next round" : "Matchday"}</h2>
          </div>
          {isOrganiser ? (
            <LinkButton href={`/crew/${crew.slug}/sessions/new`} variant="secondary" className="min-h-9 px-3 text-sm">
              Pin a session
            </LinkButton>
          ) : null}
        </div>
        {next ? (
          <Poster session={next} rsvps={rsvps.filter((r) => r.sessionId === next.id)} members={table.members} slug={crew.slug} myId={user.id} organiser={isOrganiser} now={now} />
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

      {golf ? (
        <div className="mt-8">
          <GolfHome crew={crew} myId={user.id} />
        </div>
      ) : (
      <section className="mt-8 flex flex-col gap-3 anim-rise-3">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>{crew.seasonName}</Eyebrow>
            <h2 className="text-2xl font-bold uppercase">Table</h2>
          </div>
          <LinkButton href={`/crew/${crew.slug}/table`} variant="ghost" className="min-h-9 px-3 text-sm">
            Full table
          </LinkButton>
        </div>
        {tableEmpty ? (
          <p className="text-sm text-ink-3">The table starts once the first session is confirmed as played.</p>
        ) : (
          <Panel className="overflow-hidden divide-y divide-line-2">
            {top.map((r, i) => {
              const m = table.members.find((x) => x.id === r.userId);
              if (!m) return null;
              const hot = r.streak >= 3;
              return (
                <Link key={r.userId} href={`/crew/${crew.slug}/players/${r.userId}`} className={cls("flex items-center gap-3 px-3 py-2.5 hover:bg-ground-2 press", i === 0 && "bg-pitch-soft")}>
                  <span className={cls("display text-2xl font-bold w-7 tnum", i === 0 ? "text-pitch" : "text-ink-3")}>{i + 1}</span>
                  <Avatar name={m.name} hue={m.hue} size={32} />
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="font-semibold truncate leading-tight">{m.name}</span>
                    <FormDots history={r.history} />
                  </div>
                  {r.streak > 0 ? (
                    <span className={cls("inline-flex items-center gap-0.5 font-mono text-xs tnum", hot ? "text-pitch" : "text-ink-3")} aria-label={`${r.streak} session streak`}>
                      <IconFlame size={16} className={hot ? "anim-flame" : undefined} strokeWidth={hot ? 2.2 : 1.75} />
                      {r.streak}
                    </span>
                  ) : null}
                  {r.sickNotes > 0 ? <Pill tone="bad">{r.sickNotes} sick note{r.sickNotes === 1 ? "" : "s"}</Pill> : null}
                  <span className="display text-[28px] font-bold tnum w-12 text-right leading-none">{r.points}</span>
                </Link>
              );
            })}
          </Panel>
        )}
      </section>
      )}

      <section className="mt-8 flex flex-col gap-3" aria-label="Feed">
        <div>
          <Eyebrow>Feed</Eyebrow>
          <h2 className="text-2xl font-bold uppercase">Latest</h2>
        </div>
        <Feed items={feed} members={table.members} slug={crew.slug} golf={golf} />
      </section>
    </CrewShell>
  );
}

type Member = { id: string; name: string; hue: number };

/** The next session as a matchday poster: countdown, big title, spots ring, who's in, cost, RSVP. */
function Poster({ session, rsvps, members, slug, myId, organiser, now }: { session: Session; rsvps: Rsvp[]; members: Member[]; slug: string; myId: string; organiser: boolean; now: number }) {
  const sport = sportOf(session.sport);
  const sum = summarise(toRows(rsvps), session.capacity);
  const share = previewShare(session.costMode, session.costPence, sum.in);
  const future = session.startsAt.getTime() > now;
  const mine = rsvps.find((r) => r.userId === myId)?.status ?? null;
  const ins = rsvps.filter((r) => r.status === "in").map((r) => members.find((m) => m.id === r.userId)).filter((m): m is Member => !!m);
  const shown = ins.slice(0, 6);
  const more = ins.length - shown.length;
  const rel = relativeDay(session.startsAt);
  return (
    <Panel as="article" className="surface-raised relative overflow-hidden p-4 sm:p-5 flex flex-col gap-4">
      <div className={cls("absolute inset-0", session.sport === "golf" ? "fairway-lines" : "pitch-lines opacity-60")} aria-hidden="true" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Pill tone={future ? "good" : "warn"}>{rel}</Pill>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2 tnum">
            {rel !== fmtDay(session.startsAt) ? `${fmtDay(session.startsAt)} · ` : ""}
            {fmtTime(session.startsAt)}
          </span>
        </div>
        {future ? <Countdown at={session.startsAt.getTime()} className="font-mono text-[11px] uppercase tracking-[0.14em] text-pitch tnum" /> : <Pill tone="warn">{organiser ? "Needs confirming" : "Awaiting result"}</Pill>}
      </div>
      <Link href={`/crew/${slug}/s/${session.id}`} className="relative block">
        <h3 className="display text-[38px] sm:text-[48px] font-extrabold uppercase leading-[0.9] wrap-anywhere">{session.title}</h3>
        <div className="mt-2 flex items-center gap-1.5 text-sm text-ink-2">
          <IconPin size={15} className="shrink-0 text-ink-3" />
          <span className="truncate">{session.venueName || sport.label}</span>
          <span className="text-ink-3">·</span>
          <span className="shrink-0 tnum">{session.durationMin} min</span>
        </div>
      </Link>
      <div className="relative flex items-center gap-4">
        <Ring value={sum.in} max={session.capacity} size={76} label={`${sum.in}/${session.capacity}`} sub="in" />
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {ins.length ? (
            <div className="flex -space-x-2">
              {shown.map((m) => (
                <Avatar key={m.id} name={m.name} hue={m.hue} size={30} className="ring-2 ring-panel" />
              ))}
              {more > 0 ? <span className="w-[30px] h-[30px] rounded-full bg-ground-2 border border-line text-[11px] font-mono inline-flex items-center justify-center ring-2 ring-panel">+{more}</span> : null}
            </div>
          ) : null}
          <span className="text-xs text-ink-2 truncate">
            {ins.length ? shown.map((m) => m.name.split(" ")[0]).join(", ") + (more > 0 ? ` +${more}` : "") : "Nobody in yet. Be first."}
            {sum.reserve > 0 ? ` · +${sum.reserve} reserve` : ""}
          </span>
        </div>
        <div className="flex flex-col items-end shrink-0 leading-none">
          <span className="eyebrow">{session.costPence === 0 ? "Cost" : session.costMode === "per_head" ? "Per head" : "Each so far"}</span>
          <span className="display text-[34px] font-bold tnum mt-1">{session.costPence ? pounds(share) : "Free"}</span>
        </div>
      </div>
      {session.status === "open" && future ? (
        <div className="relative">
          <RsvpButtons sessionId={session.id} mine={mine} inVerb={sport.inVerb} />
        </div>
      ) : null}
    </Panel>
  );
}

/**
 * Golf feed: rounds scheduled (minus any since cancelled) and every card posted, newest first. The
 * posted rounds come off the cards themselves, so they carry today's score, corrections included.
 */
function golfFeed(pinned: FeedItem[], rounds: Round[], sessions: Session[], crewId: string): FeedItem[] {
  const cancelled = new Set(sessions.filter((s) => s.status === "cancelled").map((s) => s.id));
  const posted: FeedItem[] = postedRounds(rounds).map((r) => ({
    id: `posted:${r.sessionId}:${r.userId}`,
    crewId,
    sessionId: r.sessionId,
    kind: "round_posted",
    payload: JSON.stringify(r),
    createdAt: new Date(r.at),
  }));
  return [...pinned.filter((f) => !f.sessionId || !cancelled.has(f.sessionId)), ...posted].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 12);
}

import { appUrl } from "@/lib/env";
import { nowMs } from "@/lib/clock";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireCrewPage } from "@/lib/access";
import { getCrewLedger, getSessionBundle, listMembers } from "@/lib/queries";
import { sportOf } from "@/domain/sports";
import { playing, reserves, summarise } from "@/domain/rsvp";
import { previewShare } from "@/domain/money";
import { CrewShell } from "@/components/shell";
import { toRows } from "@/components/session-card";
import { RsvpButtons } from "./rsvp-buttons";
import { Avatar } from "@/components/avatar";
import { ShareButtons } from "@/components/share";
import { Ring } from "@/components/ring";
import { Countdown } from "@/components/countdown";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { IconClock, IconMedal, IconPin, IconWhistle } from "@/components/icons";
import { Button, Eyebrow, LinkButton, Notice, Panel, Pill, Stat, cls } from "@/components/ui";
import { TeamsPanel } from "@/components/games/teams";
import { AmericanoPanel } from "@/components/games/americano";
import { StablefordPanel } from "@/components/games/stableford";
import { PredictorPanel } from "@/components/games/predictor";
import { recordPayment, reopenSession } from "@/lib/actions/session";
import { fmtLong, fmtTime, pounds, relativeDay } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const b = await getSessionBundle(id);
  return { title: b?.session.title ?? "Session" };
}

export default async function SessionPage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ pinned?: string; rated?: string }> }) {
  const { slug, id } = await params;
  const flags = await searchParams;
  const { crew, user, isOrganiser } = await requireCrewPage(slug);
  const bundle = await getSessionBundle(id);
  if (!bundle || bundle.session.crewId !== crew.id) notFound();
  const { session, rsvps, attendance, ratings, games, entries, ledger } = bundle;
  const members = await listMembers(crew.id);
  const sport = sportOf(session.sport);
  const rows = toRows(rsvps);
  const sum = summarise(rows, session.capacity);
  const inRows = playing(rows);
  const reserveRows = reserves(rows);
  const outRows = rsvps.filter((r) => r.status === "out");
  const unanswered = members.filter((m) => !rsvps.some((r) => r.userId === m.id));
  const mine = rsvps.find((r) => r.userId === user.id)?.status ?? null;
  const member = (uid: string) => members.find((m) => m.id === uid);
  const now = nowMs();
  const started = session.startsAt.getTime() <= now;
  const finished = session.startsAt.getTime() + session.durationMin * 60_000 <= now;
  const url = `${await appUrl()}/crew/${crew.slug}/s/${session.id}`;
  const share = previewShare(session.costMode, session.costPence, sum.in);
  const game = (kind: string) => games.find((g) => g.kind === kind);
  const attended = attendance.filter((a) => a.attended);
  const noShows = attendance.length - attended.length;
  const iPlayed = attended.some((a) => a.userId === user.id);
  const iRated = ratings.some((r) => r.raterId === user.id);
  const { balances } = await getCrewLedger(crew.id);
  const canManage = isOrganiser && session.status === "open" && !started;
  const mapsHref = session.venueAddress ? `https://maps.google.com/?q=${encodeURIComponent(session.venueAddress)}` : session.venueName ? `https://maps.google.com/?q=${encodeURIComponent(session.venueName)}` : null;

  // Awards: most votes per category.
  const awards = sport.ratings.map((c) => {
    const counts = new Map<string, number>();
    for (const r of ratings) if (r.category === c.key) counts.set(r.rateeId, (counts.get(r.rateeId) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { category: c, userId: top?.[0] ?? null, votes: top?.[1] ?? 0 };
  });
  const raters = new Set(ratings.map((r) => r.raterId)).size;

  const shareText =
    session.status === "played"
      ? `${session.title}: ${attended.length} turned up. ${awards[0].userId ? `${sport.ratings[0].label}: ${member(awards[0].userId)?.name}.` : ""}`
      : `${session.title} · ${fmtLong(session.startsAt)}${session.venueName ? ` · ${session.venueName}` : ""}. ${sum.spotsLeft > 0 ? `${sum.spotsLeft} spots left, tap in:` : "Full, join the reserves:"}`;

  const charges = ledger.filter((l) => l.kind === "charge");

  return (
    <CrewShell crew={crew} user={user} active="sessions">
      {flags.pinned ? (
        <Panel className="p-4 mb-4 flex flex-col gap-3 border-pitch/40 bg-pitch-soft anim-pop">
          <div className="display text-2xl font-bold uppercase">Pinned. Now send it.</div>
          <ShareButtons text={shareText} url={url} label="Send to WhatsApp" />
        </Panel>
      ) : null}
      {flags.rated ? (
        <div className="mb-4 anim-pop">
          <Notice tone="good">Votes in. Nice one.</Notice>
        </div>
      ) : null}

      {/* Hero */}
      <header className="relative -mx-4 px-4 pt-4 pb-5 mb-4 overflow-hidden anim-rise">
        <div className="absolute inset-0 pitch-lines" aria-hidden="true" />
        <div className="relative flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow inline-flex items-center gap-2">
              {sport.label}
              <span aria-hidden="true">·</span>
              {session.status === "open" && !started ? (
                <Countdown at={session.startsAt.getTime()} className="text-pitch" />
              ) : (
                <span>
                  {relativeDay(session.startsAt)} · {fmtTime(session.startsAt)}
                </span>
              )}
            </span>
            {session.status === "played" ? <Pill tone="ink">Played</Pill> : session.status === "cancelled" ? <Pill tone="bad">Cancelled</Pill> : sum.full ? <Pill tone="ink">Full</Pill> : <Pill tone="good">{sum.spotsLeft} left</Pill>}
          </div>
          <h1 className="display text-[44px] sm:text-[56px] font-extrabold uppercase leading-[0.9] wrap-anywhere">{session.title}</h1>
          <div className="flex flex-col gap-1 text-sm text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <IconClock size={15} className="text-ink-3 shrink-0" />
              <span className="tnum">
                {fmtLong(session.startsAt)} · {session.durationMin} min
              </span>
            </span>
            {session.venueName ? (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <IconPin size={15} className="text-ink-3 shrink-0" />
                {mapsHref ? (
                  <a className="underline decoration-line underline-offset-4 hover:decoration-pitch truncate" href={mapsHref} target="_blank" rel="noreferrer">
                    {session.venueName}
                    {session.venueAddress ? ` · ${session.venueAddress}` : ""}
                  </a>
                ) : (
                  <span className="truncate">{session.venueName}</span>
                )}
              </span>
            ) : null}
          </div>
          {session.notes ? <blockquote className="text-sm text-ink-2 border-l-2 border-pitch pl-3 py-0.5 whitespace-pre-line">{session.notes}</blockquote> : null}
          {isOrganiser ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {session.status === "open" ? (
                <>
                  <LinkButton href={`/crew/${crew.slug}/s/${session.id}/play`} variant={finished ? "primary" : "secondary"} className="min-h-9 px-3 text-sm">
                    <IconWhistle size={16} />
                    Confirm who played
                  </LinkButton>
                  <LinkButton href={`/crew/${crew.slug}/s/${session.id}/edit`} variant="secondary" className="min-h-9 px-3 text-sm">
                    Edit
                  </LinkButton>
                </>
              ) : session.status === "played" ? (
                <>
                  <LinkButton href={`/crew/${crew.slug}/s/${session.id}/play`} variant="secondary" className="min-h-9 px-3 text-sm">
                    Fix attendance
                  </LinkButton>
                  <form action={reopenSession}>
                    <input type="hidden" name="sessionId" value={session.id} />
                    <Button type="submit" variant="ghost" className="min-h-9 px-3 text-sm">
                      Reopen
                    </Button>
                  </form>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {session.status === "open" ? (
        <>
          <Panel className="surface-raised p-4 flex flex-col gap-4 anim-rise-2">
            <div className="flex items-center gap-4">
              <Ring value={sum.in} max={session.capacity} size={84} label={`${sum.in}/${session.capacity}`} sub="in" />
              <div className="flex-1 grid grid-cols-2 gap-3">
                <Stat label="Reserves" value={sum.reserve} />
                <Stat label={session.costMode === "per_head" ? "Per head" : "Each so far"} value={session.costPence ? pounds(share) : "Free"} sub={session.costMode === "total" && session.costPence ? `${pounds(session.costPence)} total` : undefined} />
              </div>
            </div>
            {!started ? (
              <RsvpButtons sessionId={session.id} mine={mine} inVerb={sport.inVerb} />
            ) : (
              <Notice tone="neutral">Kick-off has passed. {isOrganiser ? "Confirm who played to close it off." : "Waiting for the organiser to confirm who played."}</Notice>
            )}
            {mine === "in" && !started ? (
              <p className="text-xs text-ink-3">
                Drop out inside {crew.lateDropHours} hours of kick-off{session.rsvpDeadlineAt ? ` or after ${fmtLong(session.rsvpDeadlineAt)}` : ""} and your share still stands.
              </p>
            ) : null}
            <ShareButtons text={shareText} url={url} compact />
          </Panel>

          <Panel className="mt-3 divide-y divide-line-2 overflow-hidden anim-rise-3">
            <Segment title="In" count={inRows.length} empty="Nobody yet. Be first.">
              {inRows.map((r, i) => {
                const m = member(r.userId);
                return m ? <Row key={r.userId} m={m} n={i + 1} chip={<Pill tone="good">In</Pill>} /> : null;
              })}
            </Segment>
            <Segment title="Reserves" count={reserveRows.length} empty="Nobody waiting. Reserves get promoted in order when someone drops.">
              {reserveRows.map((r, i) => {
                const m = member(r.userId);
                return m ? <Row key={r.userId} m={m} n={i + 1} chip={<Pill tone="warn">Reserve</Pill>} /> : null;
              })}
            </Segment>
            <Segment title="Out" count={outRows.length} empty="Nobody's said no.">
              {outRows.map((r) => {
                const m = member(r.userId);
                return m ? <Row key={r.userId} m={m} chip={r.lateDrop ? <Pill tone="bad">Late drop</Pill> : <Pill>Out</Pill>} /> : null;
              })}
            </Segment>
            <Segment title="Not answered" count={unanswered.length} empty="Everyone's answered.">
              {unanswered.map((m) => (
                <Row key={m.id} m={m} chip={<Pill>No reply</Pill>} />
              ))}
            </Segment>
          </Panel>

          {canManage ? (
            <details className="mt-3 surface overflow-hidden group">
              <summary className="px-4 py-3 text-sm font-semibold cursor-pointer flex items-center justify-between gap-3 list-none">
                <span>Manage who&apos;s in</span>
                <span className="eyebrow">Organiser</span>
              </summary>
              <div className="px-4 pb-3 flex flex-col divide-y divide-line-2">
                {inRows.map((r) => {
                  const m = member(r.userId);
                  return m && r.userId !== user.id ? <Row key={r.userId} m={m} chip={<RsvpButtons sessionId={session.id} mine="in" inVerb="In" userId={r.userId} compact />} /> : null;
                })}
                {reserveRows.map((r) => {
                  const m = member(r.userId);
                  return m && r.userId !== user.id ? <Row key={r.userId} m={m} chip={<RsvpButtons sessionId={session.id} mine="reserve" inVerb="In" userId={r.userId} compact />} /> : null;
                })}
                {unanswered.map((m) =>
                  m.id !== user.id ? <Row key={m.id} m={m} chip={<RsvpButtons sessionId={session.id} mine={null} inVerb="In" userId={m.id} compact />} /> : null,
                )}
              </div>
            </details>
          ) : null}
        </>
      ) : null}

      {session.status === "played" ? (
        <>
          <Panel className="surface-raised p-4 flex flex-col gap-4 anim-rise-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col items-center gap-1">
                <Ring value={attended.length} max={Math.max(attendance.length, 1)} size={76} label={String(attended.length)} tone="pitch" />
                <span className="eyebrow">Turned up</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className={cls("display text-[40px] font-bold leading-none tnum", noShows > 0 ? "text-red" : "text-ink-3")}>{noShows}</span>
                <span className="eyebrow">No-shows</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Ring value={raters} max={Math.max(attended.length, 1)} size={76} label={`${raters}/${attended.length}`} tone={raters >= attended.length && attended.length > 0 ? "pitch" : "ink"} />
                <span className="eyebrow">Rated</span>
              </div>
            </div>
            {iPlayed ? (
              <LinkButton href={`/crew/${crew.slug}/s/${session.id}/rate`} variant={iRated ? "secondary" : "primary"} className={cls("min-h-14 text-base w-full", !iRated && "anim-pulse")}>
                {iRated ? "Change your votes" : "Rate it, three taps"}
              </LinkButton>
            ) : null}
            <ShareButtons text={shareText} url={url} compact label="Share recap" />
          </Panel>

          <div className="mt-4">
            <Eyebrow className="mb-2">Awards</Eyebrow>
            <div className="grid gap-3 sm:grid-cols-3">
              {awards.map((a, i) => {
                const m = a.userId ? member(a.userId) : null;
                const wash = i === 0 ? "bg-pitch-soft border-pitch/50" : i === 1 ? "bg-panel-2 border-ink-3/40" : "bg-card-soft border-card/50";
                return (
                  <article key={a.category.key} className={cls("relative overflow-hidden rounded-md border p-3 flex items-center gap-3 anim-rise-3", wash)}>
                    {m ? (
                      <>
                        <Avatar name={m.name} hue={m.hue} size={52} className="ring-2 ring-panel" />
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <span className="eyebrow inline-flex items-center gap-1">
                            <IconMedal size={12} />
                            {a.category.label}
                          </span>
                          <span className="display text-xl font-bold uppercase leading-none truncate">{m.name}</span>
                          <span className="text-xs text-ink-3 tnum">
                            {a.votes} vote{a.votes === 1 ? "" : "s"}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="w-[52px] h-[52px] rounded-full border border-dashed border-line-2 shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <span className="eyebrow">{a.category.label}</span>
                          <span className="text-sm text-ink-3">No votes yet</span>
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          </div>

          <Panel className="mt-4 divide-y divide-line-2 overflow-hidden">
            <Segment title="Played" count={attended.length} empty="Nobody was marked as playing.">
              {attended.map((a) => {
                const m = member(a.userId);
                return m ? <Row key={a.userId} m={m} chip={ratings.some((r) => r.raterId === a.userId) ? <Pill tone="good">Rated</Pill> : <Pill>Not rated</Pill>} /> : null;
              })}
            </Segment>
            <Segment title="Money" count={charges.length} empty="Free session. Nothing owed.">
              {charges.map((l) => {
                const m = member(l.userId);
                const paid = ledger.filter((p) => p.kind === "payment" && p.userId === l.userId).reduce((t, p) => t + p.amountPence, 0);
                const owed = balances.get(l.userId)?.owed ?? 0;
                const settled = paid >= l.amountPence || owed <= 0;
                return m ? (
                  <Row
                    key={l.id}
                    m={m}
                    chip={
                      <div className="flex items-center gap-2">
                        {l.reason !== "share" ? <Pill tone="bad">{l.reason.replace("_", " ")}</Pill> : null}
                        <span className="display text-lg font-bold tnum">{pounds(l.amountPence)}</span>
                        {settled ? (
                          <Pill tone="good">Paid</Pill>
                        ) : isOrganiser ? (
                          <ActionForm action={recordPayment} className="gap-0">
                            <input type="hidden" name="crewId" value={crew.id} />
                            <input type="hidden" name="userId" value={l.userId} />
                            <input type="hidden" name="sessionId" value={session.id} />
                            <input type="hidden" name="amount" value={pounds(l.amountPence).slice(1)} />
                            <input type="hidden" name="method" value="transfer" />
                            <SubmitButton variant="ghost" className="min-h-8 px-2 text-xs border border-line" pendingText="…">
                              Mark paid
                            </SubmitButton>
                          </ActionForm>
                        ) : (
                          <Pill tone="warn">Owes</Pill>
                        )}
                      </div>
                    }
                  />
                ) : null;
              })}
            </Segment>
          </Panel>
        </>
      ) : null}

      {session.status !== "cancelled" && sport.games.length ? (
        <section className="mt-6 flex flex-col gap-3">
          <Eyebrow>Side games</Eyebrow>
          {sport.games.includes("teams") ? <TeamsPanel sessionId={session.id} game={game("teams")} members={members} isOrganiser={isOrganiser} inCount={inRows.length} /> : null}
          {sport.games.includes("americano") ? <AmericanoPanel sessionId={session.id} game={game("americano")} members={members} isOrganiser={isOrganiser} inCount={inRows.length} /> : null}
          {sport.games.includes("stableford") ? <StablefordPanel sessionId={session.id} game={game("stableford")} members={members} isOrganiser={isOrganiser} playerIds={inRows.map((r) => r.userId)} myId={user.id} /> : null}
          {sport.games.includes("predictor") ? <PredictorPanel sessionId={session.id} game={game("predictor")} entries={entries} members={members} isOrganiser={isOrganiser} myId={user.id} locksAt={session.startsAt.getTime()} /> : null}
        </section>
      ) : null}

      <p className="mt-6 text-xs text-ink-3">
        Pinned by {member(session.createdBy)?.name ?? "the organiser"}.{" "}
        <Link href={`/crew/${crew.slug}/sessions`} className="underline">
          All sessions
        </Link>
      </p>
    </CrewShell>
  );
}

/** One block of the segmented people panel: a heading row with a count, then rows. */
function Segment({ title, count, empty, children }: { title: string; count: number; empty: string; children: ReactNode }) {
  const arr = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <section className="px-4 py-3 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <span className="eyebrow">{title}</span>
        <span className="display text-lg font-bold tnum text-ink-3">{count}</span>
      </div>
      {arr.length === 0 ? <p className="text-sm text-ink-3 py-1">{empty}</p> : <div className="flex flex-col">{arr}</div>}
    </section>
  );
}

/** One person, one object: queue number, avatar, name, one chip. */
function Row({ m, n, chip }: { m: { name: string; hue: number }; n?: number; chip?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2 min-h-11">
      {n ? <span className="w-5 text-ink-3 tnum font-mono text-xs text-right">{n}</span> : null}
      <Avatar name={m.name} hue={m.hue} size={32} />
      <span className="font-semibold text-sm flex-1 truncate">{m.name}</span>
      {chip}
    </div>
  );
}

import { nowMs } from "@/lib/clock";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button, LinkButton, Notice, Panel, Pill, Stat } from "@/components/ui";
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/crew/${crew.slug}/s/${session.id}`;
  const share = previewShare(session.costMode, session.costPence, sum.in);
  const game = (kind: string) => games.find((g) => g.kind === kind);
  const attended = attendance.filter((a) => a.attended);
  const iPlayed = attended.some((a) => a.userId === user.id);
  const iRated = ratings.some((r) => r.raterId === user.id);
  const { balances } = await getCrewLedger(crew.id);

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

  return (
    <CrewShell crew={crew} user={user} active="sessions">
      {flags.pinned ? (
        <Panel className="p-4 mb-4 flex flex-col gap-3 border-pitch/40 bg-pitch-soft">
          <div className="display text-2xl font-bold uppercase">Pinned. Now send it.</div>
          <ShareButtons text={shareText} url={url} label="Send to WhatsApp" />
        </Panel>
      ) : null}
      {flags.rated ? <Notice tone="good">Votes in. Nice one.</Notice> : null}

      <header className="mt-3 mb-4 flex flex-col gap-2">
        <div className="eyebrow">
          {sport.label} · {relativeDay(session.startsAt)} · {fmtTime(session.startsAt)}
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[40px] font-bold uppercase leading-[0.95] wrap-anywhere">{session.title}</h1>
          {session.status === "played" ? <Pill tone="ink">Played</Pill> : session.status === "cancelled" ? <Pill tone="bad">Cancelled</Pill> : sum.full ? <Pill tone="ink">Full</Pill> : <Pill tone="good">{sum.spotsLeft} left</Pill>}
        </div>
        <div className="text-ink-2">
          {fmtLong(session.startsAt)} · {session.durationMin} min
          {session.venueName ? (
            <>
              <br />
              {session.venueName}
              {session.venueAddress ? (
                <>
                  {" · "}
                  <a className="underline" href={`https://maps.google.com/?q=${encodeURIComponent(session.venueAddress)}`} target="_blank" rel="noreferrer">
                    {session.venueAddress}
                  </a>
                </>
              ) : null}
            </>
          ) : null}
        </div>
        {session.notes ? <p className="text-sm text-ink-2 bg-ground-2 rounded-sm px-3 py-2">{session.notes}</p> : null}
        {isOrganiser ? (
          <div className="flex flex-wrap gap-2 mt-1">
            {session.status === "open" ? (
              <>
                <LinkButton href={`/crew/${crew.slug}/s/${session.id}/play`} variant={finished ? "primary" : "secondary"} className="min-h-9 px-3 text-sm">
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
      </header>

      {session.status === "open" ? (
        <>
          <Panel className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="In" value={`${sum.in}/${session.capacity}`} tone={sum.full ? "good" : undefined} />
              <Stat label="Reserve" value={sum.reserve} />
              <Stat label={session.costMode === "per_head" ? "Per head" : "Each so far"} value={session.costPence ? pounds(share) : "Free"} sub={session.costMode === "total" && session.costPence ? `${pounds(session.costPence)} total` : undefined} />
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

          <div className="grid gap-3 mt-3 sm:grid-cols-2">
            <List title={`In (${inRows.length})`} empty="Nobody yet. Be first.">
              {inRows.map((r, i) => {
                const m = member(r.userId);
                return m ? <Person key={r.userId} m={m} n={i + 1} right={isOrganiser && r.userId !== user.id && !started ? <RsvpButtons sessionId={session.id} mine="in" inVerb="In" userId={r.userId} compact /> : null} /> : null;
              })}
            </List>
            <List title={`Reserves (${reserveRows.length})`} empty="Nobody waiting. Reserves get promoted in order when someone drops.">
              {reserveRows.map((r, i) => {
                const m = member(r.userId);
                return m ? <Person key={r.userId} m={m} n={i + 1} right={isOrganiser && r.userId !== user.id && !started ? <RsvpButtons sessionId={session.id} mine="reserve" inVerb="In" userId={r.userId} compact /> : null} /> : null;
              })}
            </List>
            <List title={`Out (${outRows.length})`} empty="Nobody's said no.">
              {outRows.map((r) => {
                const m = member(r.userId);
                return m ? <Person key={r.userId} m={m} right={r.lateDrop ? <Pill tone="bad">Late drop</Pill> : null} /> : null;
              })}
            </List>
            <List title={`Not answered (${unanswered.length})`} empty="Everyone's answered.">
              {unanswered.map((m) => (
                <Person key={m.id} m={m} right={isOrganiser && !started ? <RsvpButtons sessionId={session.id} mine={null} inVerb="In" userId={m.id} compact /> : null} />
              ))}
            </List>
          </div>
        </>
      ) : null}

      {session.status === "played" ? (
        <>
          <Panel className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Turned up" value={attended.length} tone="good" />
              <Stat label="No-shows" value={attendance.length - attended.length} tone={attendance.length - attended.length > 0 ? "bad" : undefined} />
              <Stat label="Rated" value={`${raters}/${attended.length}`} />
            </div>
            {iPlayed ? (
              <LinkButton href={`/crew/${crew.slug}/s/${session.id}/rate`} variant={iRated ? "secondary" : "primary"} className="min-h-12 text-base">
                {iRated ? "Change your votes" : "Rate it, three taps"}
              </LinkButton>
            ) : null}
            <ShareButtons text={shareText} url={url} compact label="Share recap" />
          </Panel>

          <div className="grid gap-3 mt-3 sm:grid-cols-3">
            {awards.map((a) => {
              const m = a.userId ? member(a.userId) : null;
              return (
                <Panel key={a.category.key} className="p-3 flex flex-col gap-1.5">
                  <span className="eyebrow">{a.category.label}</span>
                  {m ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={m.name} hue={m.hue} size={32} />
                      <div>
                        <div className="font-semibold leading-tight">{m.name}</div>
                        <div className="text-xs text-ink-3">{a.votes} vote{a.votes === 1 ? "" : "s"}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-ink-3">No votes yet</span>
                  )}
                </Panel>
              );
            })}
          </div>

          <div className="grid gap-3 mt-3 sm:grid-cols-2">
            <List title={`Played (${attended.length})`} empty="Nobody was marked as playing.">
              {attended.map((a) => {
                const m = member(a.userId);
                return m ? <Person key={a.userId} m={m} right={ratings.some((r) => r.raterId === a.userId) ? <Pill tone="good">Rated</Pill> : null} /> : null;
              })}
            </List>
            <List title="Money" empty="Free session. Nothing owed.">
              {ledger
                .filter((l) => l.kind === "charge")
                .map((l) => {
                  const m = member(l.userId);
                  const paid = ledger.filter((p) => p.kind === "payment" && p.userId === l.userId).reduce((t, p) => t + p.amountPence, 0);
                  const owed = balances.get(l.userId)?.owed ?? 0;
                  const settled = paid >= l.amountPence || owed <= 0;
                  return m ? (
                    <Person
                      key={l.id}
                      m={m}
                      right={
                        <div className="flex items-center gap-2">
                          <span className="tnum text-sm">{pounds(l.amountPence)}</span>
                          {l.reason !== "share" ? <Pill tone="bad">{l.reason.replace("_", " ")}</Pill> : null}
                          {settled ? (
                            <Pill tone="good">Paid</Pill>
                          ) : isOrganiser ? (
                            <ActionForm action={recordPayment} className="gap-0">
                              <input type="hidden" name="crewId" value={crew.id} />
                              <input type="hidden" name="userId" value={l.userId} />
                              <input type="hidden" name="sessionId" value={session.id} />
                              <input type="hidden" name="amount" value={pounds(l.amountPence).slice(1)} />
                              <input type="hidden" name="method" value="transfer" />
                              <SubmitButton variant="secondary" className="min-h-8 px-2 text-xs" pendingText="…">
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
            </List>
          </div>
        </>
      ) : null}

      {session.status !== "cancelled" ? (
        <div className="mt-3 flex flex-col gap-3">
          {sport.games.includes("teams") ? <TeamsPanel sessionId={session.id} game={game("teams")} members={members} isOrganiser={isOrganiser} inCount={inRows.length} /> : null}
          {sport.games.includes("americano") ? <AmericanoPanel sessionId={session.id} game={game("americano")} members={members} isOrganiser={isOrganiser} inCount={inRows.length} /> : null}
          {sport.games.includes("stableford") ? <StablefordPanel sessionId={session.id} game={game("stableford")} members={members} isOrganiser={isOrganiser} playerIds={inRows.map((r) => r.userId)} myId={user.id} /> : null}
          {sport.games.includes("predictor") ? <PredictorPanel sessionId={session.id} game={game("predictor")} entries={entries} members={members} isOrganiser={isOrganiser} myId={user.id} /> : null}
        </div>
      ) : null}

      <p className="mt-6 text-xs text-ink-3">
        Pinned by {member(session.createdBy)?.name ?? "the organiser"}. <Link href={`/crew/${crew.slug}/sessions`} className="underline">All sessions</Link>
      </p>
    </CrewShell>
  );
}

function List({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <Panel className="p-3 flex flex-col gap-1">
      <div className="eyebrow mb-1">{title}</div>
      {arr.length === 0 ? <p className="text-sm text-ink-3">{empty}</p> : arr}
    </Panel>
  );
}

function Person({ m, n, right }: { m: { name: string; hue: number }; n?: number; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {n ? <span className="w-5 text-ink-3 tnum text-sm">{n}</span> : null}
      <Avatar name={m.name} hue={m.hue} size={28} />
      <span className="font-semibold text-sm flex-1 truncate">{m.name}</span>
      {right}
    </div>
  );
}

import Link from "next/link";
import type { Crew, Rsvp, Session } from "@/db/schema";
import type { Member } from "@/lib/queries";
import type { TableRow } from "@/domain/table";
import { sportOf } from "@/domain/sports";
import { ratingsFor } from "@/domain/ratings";
import { summarise } from "@/domain/rsvp";
import { previewShare } from "@/domain/money";
import { fmtLong, pounds, relativeDay } from "@/lib/format";
import { PlainShell } from "./shell";
import { Ring } from "./ring";
import { Avatar } from "./avatar";
import { PlayerCard } from "./player-card";
import { Countdown } from "./countdown";
import { LinkButton, Panel, Pill } from "./ui";
import { IconPin, SportIcon } from "./icons";
import { toRows } from "./session-card";

/** The two actions every public preview ends with. */
export function PreviewActions({ crew, primary = "join" }: { crew: Crew; primary?: "join" | "start" }) {
  const join = (
    <LinkButton href={`/join/${crew.inviteToken}`} variant={primary === "join" ? "primary" : "secondary"} className="min-h-12 text-base">
      Join {crew.name} to tap in
    </LinkButton>
  );
  const start = (
    <LinkButton href={`/go?ref=${crew.id}&to=/start`} variant={primary === "start" ? "primary" : "secondary"} className="min-h-12 text-base">
      Start your own crew
    </LinkButton>
  );
  return <div className="flex flex-col sm:flex-row gap-2">{primary === "join" ? [join, start] : [start, join]}</div>;
}

/** Read-only poster for a session link opened by someone who isn't in the crew yet. */
export function SessionPreview({ crew, session, rsvps, members }: { crew: Crew; session: Session; rsvps: Rsvp[]; members: Member[] }) {
  const sport = sportOf(session.sport);
  const s = summarise(toRows(rsvps), session.capacity);
  const ins = rsvps.filter((r) => r.status === "in").map((r) => members.find((m) => m.id === r.userId)).filter((m): m is Member => !!m);
  const played = session.status === "played";
  return (
    <PlainShell user={null}>
      <div className="max-w-md mx-auto flex flex-col gap-5 anim-rise">
        <div className="eyebrow flex items-center gap-2">
          <SportIcon sport={session.sport} size={14} /> {crew.name} · {sport.label}
        </div>
        <Panel className="surface-raised p-5 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute inset-0 pitch-lines" aria-hidden="true" />
          <div className="relative flex items-center justify-between">
            <Pill tone="good">{relativeDay(session.startsAt)}</Pill>
            {played ? <Pill tone="ink">Played</Pill> : <Countdown at={session.startsAt.getTime()} className="eyebrow text-pitch" />}
          </div>
          <h1 className="relative text-[44px] font-extrabold uppercase leading-[0.9] wrap-anywhere">{session.title}</h1>
          <div className="relative text-ink-2 text-sm flex flex-col gap-1">
            <span>{fmtLong(session.startsAt)}</span>
            {session.venueName ? (
              <span className="flex items-center gap-1.5">
                <IconPin size={14} /> {session.venueName}
              </span>
            ) : null}
          </div>
          <div className="relative flex items-center gap-4">
            <Ring value={s.in} max={session.capacity} size={72} label={`${s.in}/${session.capacity}`} sub="in" tone={s.full ? "ink" : "pitch"} />
            <div className="flex-1 min-w-0">
              <div className="flex -space-x-1.5 mb-1">
                {ins.slice(0, 7).map((m) => (
                  <Avatar key={m.id} name={m.name} hue={m.hue} size={28} className="ring-2 ring-panel" />
                ))}
              </div>
              <div className="text-xs text-ink-2 truncate">{ins.map((m) => m.name.split(" ")[0]).join(", ") || "Nobody in yet"}</div>
            </div>
            {session.costPence > 0 ? (
              <div className="text-right">
                <div className="display text-2xl font-bold tnum">{pounds(previewShare(session.costMode, session.costPence, s.in))}</div>
                <div className="eyebrow">each</div>
              </div>
            ) : null}
          </div>
        </Panel>
        <p className="text-sm text-ink-2">
          {played ? "This one's been played." : s.full ? "It's full, but the reserve list is open and promotes automatically." : `${s.spotsLeft} spot${s.spotsLeft === 1 ? "" : "s"} left.`} Join the crew to tap in; it takes your name and nothing else.
        </p>
        <PreviewActions crew={crew} primary="join" />
        <p className="text-xs text-ink-3">
          Roll Call is the app for your crew, not your sport. <Link href="/" className="underline">How it works</Link>
        </p>
      </div>
    </PlainShell>
  );
}

/** Public card page for a player link. The card is the ad. */
export function PlayerPreview({ crew, member, row, rank }: { crew: Crew; member: Member; row: TableRow; rank: number }) {
  const sport = sportOf(crew.sport);
  return (
    <PlainShell user={null}>
      <div className="max-w-md mx-auto flex flex-col gap-5 anim-rise">
        <div className="eyebrow">
          {crew.name} · {sport.label} · #{rank}
        </div>
        <div className="max-w-[340px] mx-auto w-full">
          <PlayerCard name={member.name} hue={member.hue} crewName={crew.name} sport={crew.sport} sportLabel={sport.label} card={row.card} rank={rank} categories={ratingsFor(crew.sport, crew.ratings)} points={row.points} season={crew.seasonName} />
        </div>
        <p className="text-sm text-ink-2 text-center">
          Peer-rated by the people who were actually there. {row.played} played, {row.streak} in a row, {row.sickNotes} sick note{row.sickNotes === 1 ? "" : "s"}.
        </p>
        <PreviewActions crew={crew} primary="start" />
      </div>
    </PlainShell>
  );
}

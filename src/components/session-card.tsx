import { nowMs } from "@/lib/clock";
import Link from "next/link";
import type { Session, Rsvp } from "@/db/schema";
import { sportOf } from "@/domain/sports";
import { summarise } from "@/domain/rsvp";
import { previewShare } from "@/domain/money";
import { fmtDay, fmtTime, pounds, relativeDay } from "@/lib/format";
import { Ring } from "./ring";
import { IconPin } from "./icons";
import { Pill, cls } from "./ui";

export function toRows(rsvps: Rsvp[]) {
  return rsvps.map((r) => ({
    userId: r.userId,
    status: r.status,
    queuedAt: r.queuedAt.getTime(),
    respondedAt: r.respondedAt.getTime(),
    droppedAt: r.droppedAt?.getTime() ?? null,
    lateDrop: r.lateDrop,
  }));
}

/** The matchday poster in miniature: day and time stacked on the left, a spots ring on the right. */
export function SessionCard({ session, rsvps, slug, myId, emphasis = false, organiser = false }: { session: Session; rsvps: Rsvp[]; slug: string; myId: string; emphasis?: boolean; organiser?: boolean }) {
  const sport = sportOf(session.sport);
  const s = summarise(toRows(rsvps), session.capacity);
  const mine = rsvps.find((r) => r.userId === myId)?.status;
  const share = previewShare(session.costMode, session.costPence, s.in);
  const past = session.startsAt.getTime() < nowMs();
  const unconfirmed = past && session.status === "open";
  const rel = relativeDay(session.startsAt);
  const [weekday, dayNum, month] = fmtDay(session.startsAt).split(" ");
  const topLabel = rel === fmtDay(session.startsAt) ? weekday : rel;
  const cost = session.costPence > 0 ? (session.costMode === "per_head" ? `${pounds(share)} each` : s.in === 0 ? `${pounds(session.costPence)} to split` : `${pounds(share)} each so far`) : "Free";

  return (
    <Link
      href={`/crew/${slug}/s/${session.id}`}
      className={cls(
        "press relative block p-4 rounded-md border overflow-hidden",
        emphasis ? "bg-pitch-soft border-pitch" : "surface hover:border-ink-3",
        session.status === "cancelled" && "opacity-70",
      )}
    >
      {unconfirmed ? <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-card" aria-hidden="true" /> : null}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center w-14 shrink-0 text-center leading-none">
          <span className="eyebrow text-ink-2">{topLabel}</span>
          <span className="display text-[34px] font-bold tnum mt-0.5">{dayNum}</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 tnum mt-1">
            {month} · {fmtTime(session.startsAt)}
          </span>
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <div className="display text-2xl font-bold uppercase leading-[0.95] truncate">{session.title}</div>
          <div className="text-sm text-ink-2 truncate flex items-center gap-1.5">
            <IconPin size={14} className="shrink-0 text-ink-3" />
            <span className="truncate">{session.venueName || sport.label}</span>
          </div>
          <div className="text-sm font-semibold tnum">{cost}</div>
        </div>
        <div className="shrink-0">
          {session.status === "played" ? (
            <Pill tone="ink">Played</Pill>
          ) : session.status === "cancelled" ? (
            <Pill tone="bad">Cancelled</Pill>
          ) : (
            <Ring value={s.in} max={session.capacity} size={56} stroke={6} label={String(s.in)} sub={`of ${session.capacity}`} tone={unconfirmed ? "card" : "pitch"} />
          )}
        </div>
      </div>
      {session.status === "open" ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {mine === "in" ? <Pill tone="good">You&apos;re in</Pill> : mine === "reserve" ? <Pill tone="warn">You&apos;re reserve</Pill> : mine === "out" ? <Pill>You&apos;re out</Pill> : <Pill tone="warn">Not answered</Pill>}
          {s.reserve > 0 ? <Pill>{s.reserve} reserve</Pill> : null}
          {s.full ? <Pill tone="ink">Full</Pill> : <Pill tone="good">{s.spotsLeft} spots left</Pill>}
          {unconfirmed ? <Pill tone="warn">{organiser ? "Needs confirming" : "Awaiting result"}</Pill> : null}
          {session.invitees ? <Pill tone="ink">Invite only</Pill> : null}
        </div>
      ) : null}
    </Link>
  );
}

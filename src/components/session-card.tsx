import { nowMs } from "@/lib/clock";
import Link from "next/link";
import type { Session, Rsvp } from "@/db/schema";
import { sportOf } from "@/domain/sports";
import { summarise } from "@/domain/rsvp";
import { previewShare } from "@/domain/money";
import { fmtDay, fmtTime, pounds, relativeDay } from "@/lib/format";
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

export function SessionCard({ session, rsvps, slug, myId, emphasis = false }: { session: Session; rsvps: Rsvp[]; slug: string; myId: string; emphasis?: boolean }) {
  const sport = sportOf(session.sport);
  const s = summarise(toRows(rsvps), session.capacity);
  const mine = rsvps.find((r) => r.userId === myId)?.status;
  const share = previewShare(session.costMode, session.costPence, s.in);
  const past = session.startsAt.getTime() < nowMs();
  return (
    <Link href={`/crew/${slug}/s/${session.id}`} className={cls("block rounded-md border p-4 hover:border-ink-3", emphasis ? "bg-pitch-soft border-pitch/30" : "bg-panel border-line")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow">
            {relativeDay(session.startsAt)} · {fmtTime(session.startsAt)}
            {relativeDay(session.startsAt) !== fmtDay(session.startsAt) ? ` · ${fmtDay(session.startsAt)}` : ""}
          </div>
          <div className="display text-2xl font-bold uppercase leading-tight truncate mt-0.5">{session.title}</div>
          <div className="text-sm text-ink-2 truncate">
            {session.venueName || sport.label}
            {session.costPence > 0 ? ` · ${pounds(share)} ${session.costMode === "per_head" ? "each" : "each so far"}` : " · Free"}
          </div>
        </div>
        <div className="text-right shrink-0">
          {session.status === "played" ? (
            <Pill tone="ink">Played</Pill>
          ) : session.status === "cancelled" ? (
            <Pill tone="bad">Cancelled</Pill>
          ) : (
            <>
              <div className="display text-4xl font-bold leading-none tnum">{s.in}</div>
              <div className="eyebrow">in / {session.capacity}</div>
            </>
          )}
        </div>
      </div>
      {session.status === "open" ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {mine === "in" ? <Pill tone="good">You&apos;re in</Pill> : mine === "reserve" ? <Pill tone="warn">You&apos;re reserve</Pill> : mine === "out" ? <Pill>You&apos;re out</Pill> : <Pill tone="warn">Not answered</Pill>}
          {s.reserve > 0 ? <Pill>{s.reserve} reserve</Pill> : null}
          {s.full ? <Pill tone="ink">Full</Pill> : <Pill tone="good">{s.spotsLeft} spots left</Pill>}
          {past ? <Pill tone="warn">Needs confirming</Pill> : null}
        </div>
      ) : null}
    </Link>
  );
}

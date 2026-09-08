import Link from "next/link";
import type { FeedItem } from "@/db/schema";
import type { Member } from "@/lib/queries";
import { relativeDay, fmtTime } from "@/lib/format";
import { IconCheck, IconClock, IconFlame, IconPin, IconWhistle, IconX } from "./icons";
import { cls } from "./ui";

type Glyph = "pin" | "check" | "x" | "flame" | "whistle" | "clock";

const GLYPH: Record<Glyph, { Icon: typeof IconPin; tone: string }> = {
  pin: { Icon: IconPin, tone: "bg-pitch-soft text-pitch" },
  check: { Icon: IconCheck, tone: "bg-pitch-soft text-pitch" },
  x: { Icon: IconX, tone: "bg-red-soft text-red" },
  flame: { Icon: IconFlame, tone: "bg-card-soft text-card-ink" },
  whistle: { Icon: IconWhistle, tone: "bg-ground-2 text-ink-2" },
  clock: { Icon: IconClock, tone: "bg-ground-2 text-ink-2" },
};

export function Feed({ items, members, slug }: { items: FeedItem[]; members: Member[]; slug: string }) {
  const name = (id?: unknown) => (typeof id === "string" ? (members.find((m) => m.id === id)?.name ?? "Someone") : "Someone");
  const lines = items
    .map((it) => {
      const p = safeJson(it.payload);
      const link = it.sessionId ? `/crew/${slug}/s/${it.sessionId}` : null;
      let text: string | null = null;
      let glyph: Glyph = "whistle";
      switch (it.kind) {
        case "crew_created":
          text = `${name(p.by)} started the crew.`;
          glyph = "whistle";
          break;
        case "joined":
          text = `${name(p.userId)} joined.`;
          glyph = "check";
          break;
        case "session_pinned":
          text = `${name(p.by)} pinned ${String(p.title ?? "a session")}.`;
          glyph = "pin";
          break;
        case "joined_session":
          text = `${name(p.userId)} is in.`;
          glyph = "check";
          break;
        case "left":
          text = `${name(p.userId)} left the crew.`;
          glyph = "x";
          break;
        case "reserved":
          text = `${name(p.userId)} is on the reserve list.`;
          glyph = "clock";
          break;
        case "dropped":
          text = p.late ? `${name(p.userId)} dropped out late.` : `${name(p.userId)} dropped out.`;
          glyph = "x";
          break;
        case "left_reserve":
          text = `${name(p.userId)} left the reserve list.`;
          glyph = "x";
          break;
        case "promoted":
          text = `${name(p.userId)} got promoted off the reserves.`;
          glyph = "check";
          break;
        case "session_played":
          text = `${String(p.title ?? "Session")} played. ${Number(p.turnedUp ?? 0)} turned up${Number(p.noShows ?? 0) ? `, ${Number(p.noShows)} no-show` : ""}.`;
          glyph = "whistle";
          break;
        case "session_cancelled":
          text = `${name(p.by)} cancelled ${String(p.title ?? "a session")}.`;
          glyph = "x";
          break;
        case "rated":
          text = `${name(p.userId)} rated the session.`;
          glyph = "flame";
          break;
        case "americano_started":
          text = `Americano started with ${Number(p.players ?? 0)} players.`;
          glyph = "whistle";
          break;
        case "race_result":
          text = `Race result is in.`;
          glyph = "flame";
          break;
        default:
          text = null;
      }
      return text ? { id: it.id, text, link, at: it.createdAt, glyph } : null;
    })
    .filter((x): x is { id: string; text: string; link: string | null; at: Date; glyph: Glyph } => x !== null);
  if (lines.length === 0) return <p className="text-sm text-ink-3">Nothing yet. Pin a session to get going.</p>;
  return (
    <ol className="flex flex-col divide-y divide-line-2">
      {lines.map((l) => {
        const { Icon, tone } = GLYPH[l.glyph];
        const body = (
          <>
            <span className={cls("w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0", tone)}>
              <Icon size={13} strokeWidth={2.2} />
            </span>
            <span className="flex-1 min-w-0 truncate">{l.text}</span>
            <span className="eyebrow shrink-0 tnum">
              {relativeDay(l.at)} {fmtTime(l.at)}
            </span>
          </>
        );
        return (
          <li key={l.id} className="text-sm">
            {l.link ? (
              <Link href={l.link} className="flex items-center gap-2.5 py-1.5 -mx-2 px-2 rounded-sm hover:bg-ground-2">
                {body}
              </Link>
            ) : (
              <div className="flex items-center gap-2.5 py-1.5">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}

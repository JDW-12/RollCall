import Link from "next/link";
import type { FeedItem } from "@/db/schema";
import type { Member } from "@/lib/queries";
import { relativeDay, fmtTime } from "@/lib/format";

export function Feed({ items, members, slug }: { items: FeedItem[]; members: Member[]; slug: string }) {
  const name = (id?: unknown) => (typeof id === "string" ? (members.find((m) => m.id === id)?.name ?? "Someone") : "Someone");
  const lines = items
    .map((it) => {
      const p = safeJson(it.payload);
      const link = it.sessionId ? `/crew/${slug}/s/${it.sessionId}` : null;
      let text: string | null = null;
      switch (it.kind) {
        case "crew_created":
          text = `${name(p.by)} started the crew.`;
          break;
        case "joined":
          text = `${name(p.userId)} joined.`;
          break;
        case "session_pinned":
          text = `${name(p.by)} pinned ${String(p.title ?? "a session")}.`;
          break;
        case "joined_session":
          text = `${name(p.userId)} is in.`;
          break;
        case "left":
          text = `${name(p.userId)} left the crew.`;
          break;
        case "reserved":
          text = `${name(p.userId)} is on the reserve list.`;
          break;
        case "dropped":
          text = p.late ? `${name(p.userId)} dropped out late.` : `${name(p.userId)} dropped out.`;
          break;
        case "left_reserve":
          text = `${name(p.userId)} left the reserve list.`;
          break;
        case "promoted":
          text = `${name(p.userId)} got promoted off the reserves.`;
          break;
        case "session_played":
          text = `${String(p.title ?? "Session")} played. ${Number(p.turnedUp ?? 0)} turned up${Number(p.noShows ?? 0) ? `, ${Number(p.noShows)} no-show` : ""}.`;
          break;
        case "session_cancelled":
          text = `${name(p.by)} cancelled ${String(p.title ?? "a session")}.`;
          break;
        case "rated":
          text = `${name(p.userId)} rated the session.`;
          break;
        case "americano_started":
          text = `Americano started with ${Number(p.players ?? 0)} players.`;
          break;
        case "race_result":
          text = `Race result is in.`;
          break;
        default:
          text = null;
      }
      return text ? { id: it.id, text, link, at: it.createdAt } : null;
    })
    .filter((x): x is { id: string; text: string; link: string | null; at: Date } => x !== null);
  if (lines.length === 0) return <p className="text-sm text-ink-3">Nothing yet. Pin a session to get going.</p>;
  return (
    <ol className="flex flex-col divide-y divide-line-2">
      {lines.map((l) => (
        <li key={l.id} className="py-2 flex items-baseline justify-between gap-3 text-sm">
          {l.link ? (
            <Link href={l.link} className="hover:underline">
              {l.text}
            </Link>
          ) : (
            <span>{l.text}</span>
          )}
          <span className="eyebrow shrink-0">
            {relativeDay(l.at)} {fmtTime(l.at)}
          </span>
        </li>
      ))}
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

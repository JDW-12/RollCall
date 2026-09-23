import Link from "next/link";
import type { ReactNode } from "react";
import { cls } from "@/components/ui";
import { FlagEmblem } from "./marks";

/**
 * The clubhouse leader board: a painted green board with a gold rule, white block-capital names and
 * hand-changed number plates, the way the big tournaments still do it by the 18th green. The leader's
 * points go on a yellow plate. Ties are shown the golf way, T2 and T2.
 */

export type BoardRow = {
  key: string;
  href?: string;
  name: string;
  /** A line under the name: last round, course, anything short. */
  sub?: string;
  you?: boolean;
  /** Small plates between the name and the points, one per column. */
  cells: (string | number)[];
  points: number;
};

export function positions(points: number[]): string[] {
  return points.map((p) => {
    const first = points.indexOf(p);
    const tied = points.filter((x) => x === p).length > 1;
    return `${tied ? "T" : ""}${first + 1}`;
  });
}

export function LeaderBoard({ title = "Leaders", columns, rows, footer, label }: { title?: string; columns: string[]; rows: BoardRow[]; footer?: ReactNode; label: string }) {
  const pos = positions(rows.map((r) => r.points));
  const grid = { gridTemplateColumns: `2.25rem minmax(0,1fr) repeat(${columns.length}, 2.4rem) 3.1rem` };
  const leader = rows[0]?.points ?? 0;
  return (
    <section className="gf-board rounded-[var(--radius-md)] p-3 sm:p-4 text-white" aria-label={label}>
      <div className="flex items-center justify-between gap-3 pb-2 mb-2" style={{ borderBottom: "2px solid #c9a44c" }}>
        <div className="flex items-center gap-2">
          <FlagEmblem size={24} />
          <span className="display text-[28px] font-extrabold uppercase tracking-[0.06em] leading-none">{title}</span>
        </div>
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/60">Stableford + votes</span>
      </div>
      <div className="grid items-end gap-x-1.5 px-1 pb-1.5 font-mono text-[9px] tracking-[0.16em] uppercase text-white/60" style={grid} aria-hidden="true">
        <span>Pos</span>
        <span>Player</span>
        {columns.map((c) => (
          <span key={c} className="text-center">
            {c}
          </span>
        ))}
        <span className="text-center">Pts</span>
      </div>
      <ol className="flex flex-col gap-1.5">
        {rows.map((r, i) => {
          const top = r.points > 0 && r.points === leader;
          const body = (
            <>
              <span className="display text-xl font-bold tabular-nums text-white/90">{pos[i]}</span>
              <span className="min-w-0 leading-tight">
                <span className="display text-[19px] font-bold uppercase tracking-[0.04em] truncate block">
                  {r.name}
                  {r.you ? <span className="ml-1.5 align-middle font-mono text-[9px] tracking-[0.16em] px-1 py-px rounded-sm bg-white/15">You</span> : null}
                </span>
                {r.sub ? <span className="block text-[11px] text-white/60 truncate">{r.sub}</span> : null}
              </span>
              {r.cells.map((c, k) => (
                <span key={k} className="gf-plate rounded-[3px] h-7 flex items-center justify-center display text-base font-bold tabular-nums">
                  {c}
                </span>
              ))}
              <span className={cls("rounded-[3px] h-9 flex items-center justify-center display text-2xl font-extrabold tabular-nums", top ? "" : "gf-plate")} style={top ? { background: "linear-gradient(180deg, #ffe38a, var(--gf-leader))", color: "#2a1f00", boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.15), 0 1px 0 rgba(0,0,0,0.35)" } : undefined}>
                {r.points}
              </span>
            </>
          );
          const rowCls = cls("grid items-center gap-x-1.5 px-1 py-1 rounded-sm", r.you && "bg-white/[0.07]");
          return (
            <li key={r.key}>
              {r.href ? (
                <Link href={r.href} className={cls(rowCls, "press hover:bg-white/[0.06]")} style={grid}>
                  {body}
                </Link>
              ) : (
                <div className={rowCls} style={grid}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {footer ? <div className="mt-3 pt-2 text-xs text-white/70" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>{footer}</div> : null}
    </section>
  );
}

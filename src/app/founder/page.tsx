import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { founderMetrics, isFounder } from "@/lib/founder";
import { sportOf } from "@/domain/sports";
import { PlainShell } from "@/components/shell";
import { PageTitle, Panel, Pill, Stat, cls } from "@/components/ui";
import { fmtDay } from "@/lib/format";

export const metadata: Metadata = { title: "Founder" };

const pct = (n: number | null) => (n === null ? "–" : `${Math.round(n * 100)}%`);

export default async function FounderPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/founder");
  if (!isFounder(user.email)) notFound();
  const m = await founderMetrics();
  const maxWeek = Math.max(1, ...m.weekly.map((w) => Math.max(w.pinned, w.played)));

  return (
    <PlainShell user={user} wide>
      <PageTitle eyebrow="Pilot dashboard · targets from docs/metrics.md" title="Founder">
        North star: sessions played per crew per month. Everything else here explains that number.
      </PageTitle>

      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <Panel className="p-4"><Stat label="Crews" value={m.crews} sub={`${m.activated} activated (≥4 tapped in)`} /></Panel>
        <Panel className="p-4"><Stat label="People" value={m.members} sub="distinct members" /></Panel>
        <Panel className="p-4"><Stat label="Turn-up rate" value={pct(m.turnUpRate)} tone={m.turnUpRate !== null && m.turnUpRate >= 0.85 ? "good" : m.turnUpRate !== null && m.turnUpRate < 0.7 ? "bad" : undefined} sub="target ≥85%" /></Panel>
        <Panel className="p-4"><Stat label="Late-drop rate" value={pct(m.lateDropRate)} tone={m.lateDropRate !== null && m.lateDropRate > 0.1 ? "bad" : undefined} sub="of held spots, target ≤10%" /></Panel>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Panel className="p-4"><Stat label="Settled in 7 days" value={pct(m.settledIn7)} sub="charges covered within a week, target ≥80%" tone={m.settledIn7 !== null && m.settledIn7 >= 0.8 ? "good" : undefined} /></Panel>
        <Panel className="p-4"><Stat label="Rating completion" value={pct(m.ratingCompletion)} sub="raters over attendees, target ≥60%" tone={m.ratingCompletion !== null && m.ratingCompletion >= 0.6 ? "good" : undefined} /></Panel>
        <Panel className="p-4">
          <div className="eyebrow mb-2">Retention (pinned in last 14 days)</div>
          <div className="flex gap-4">
            {m.retention.map((r) => (
              <div key={r.weeks}>
                <div className="display text-2xl font-bold tnum">{r.cohort ? `${r.retained}/${r.cohort}` : "–"}</div>
                <div className="eyebrow">wk {r.weeks}+</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="p-4 mb-4">
        <div className="flex items-baseline justify-between mb-3">
          <div className="eyebrow">Sessions per week, last 12 weeks</div>
          <div className="flex items-center gap-4 text-xs text-ink-2">
            <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-[3px] bg-pitch inline-block" /> Played</span>
            <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-[3px] bg-line inline-block border border-ink-3" /> Pinned</span>
          </div>
        </div>
        <svg viewBox="0 0 720 180" className="w-full h-auto" role="img" aria-label="Sessions pinned and played per week">
          <line x1="32" x2="712" y1="150" y2="150" stroke="var(--line)" />
          {[0.5, 1].map((f) => (
            <g key={f}>
              <line x1="32" x2="712" y1={150 - 120 * f} y2={150 - 120 * f} stroke="var(--line-2)" />
              <text x="28" y={154 - 120 * f} textAnchor="end" fontSize="11" fill="var(--ink-3)" fontFamily="var(--font-mono)">{Math.round(maxWeek * f)}</text>
            </g>
          ))}
          {m.weekly.map((w, i) => {
            const x = 40 + i * 56;
            const hp = (w.pinned / maxWeek) * 120;
            const hd = (w.played / maxWeek) * 120;
            return (
              <g key={w.weekStart}>
                <rect x={x} y={150 - hp} width="20" height={hp} rx="3" fill="var(--line)" stroke="var(--ink-3)" strokeWidth="0.5">
                  <title>{`Week of ${fmtDay(new Date(w.weekStart))}: ${w.pinned} pinned`}</title>
                </rect>
                <rect x={x + 24} y={150 - hd} width="20" height={hd} rx="3" fill="var(--pitch)">
                  <title>{`Week of ${fmtDay(new Date(w.weekStart))}: ${w.played} played`}</title>
                </rect>
                <text x={x + 22} y="168" textAnchor="middle" fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-mono)">
                  {fmtDay(new Date(w.weekStart)).split(" ").slice(1).join(" ")}
                </text>
              </g>
            );
          })}
        </svg>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <Panel className="p-4">
          <div className="eyebrow mb-2">Growth loop</div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Share clicks" value={m.shareClicks} />
            <Stat label="Preview views" value={m.previewViews} sub="shared links opened by non-members" />
            <Stat label="Referral landings" value={m.referralLandings} />
            <Stat label="Referred crews" value={m.referredCrews} tone={m.referredCrews > 0 ? "good" : undefined} />
          </div>
          {m.referrers.length ? (
            <ol className="mt-3 text-sm divide-y divide-line-2">
              {m.referrers.map((r) => (
                <li key={r.crewId} className="py-1.5 flex justify-between">
                  <span>{r.name}</span>
                  <span className="tnum font-semibold">{r.referred} crew{r.referred === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-ink-3 mt-3">No crew has referred another yet. Referral is counted when someone starts a crew after opening a shared card.</p>
          )}
        </Panel>
        <Panel className="p-4">
          <div className="eyebrow mb-2">Crews by sport</div>
          <ul className="text-sm divide-y divide-line-2">
            {m.bySport.map((s) => (
              <li key={s.sport} className="py-1.5 flex justify-between">
                <span>{sportOf(s.sport).label}</span>
                <span className="tnum font-semibold">{s.crews}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="eyebrow text-left bg-ground-2">
              <th className="font-normal px-3 py-2">Crew</th>
              <th className="font-normal px-2 py-2">Sport</th>
              <th className="font-normal px-2 py-2 text-right">Members</th>
              <th className="font-normal px-2 py-2 text-right">Sessions</th>
              <th className="font-normal px-2 py-2 text-right">Played</th>
              <th className="font-normal px-2 py-2 text-right">Turn-up</th>
              <th className="font-normal px-2 py-2">Last pinned</th>
              <th className="font-normal px-3 py-2">Since</th>
            </tr>
          </thead>
          <tbody>
            {m.crewRows.map((c) => {
              const stale = c.lastPinned ? Date.now() - c.lastPinned.getTime() > 14 * 86_400_000 : true;
              return (
                <tr key={c.id} className="border-t border-line-2">
                  <td className="px-3 py-2 font-semibold">
                    <Link href={`/crew/${c.slug}`} className="hover:underline">{c.name}</Link>
                  </td>
                  <td className="px-2 py-2">{sportOf(c.sport).label}</td>
                  <td className="px-2 py-2 text-right tnum">{c.members}</td>
                  <td className="px-2 py-2 text-right tnum">{c.sessions}</td>
                  <td className="px-2 py-2 text-right tnum">{c.played}</td>
                  <td className={cls("px-2 py-2 text-right tnum", c.turnUp !== null && c.turnUp < 0.7 && "text-red")}>{pct(c.turnUp)}</td>
                  <td className="px-2 py-2">{c.lastPinned ? <Pill tone={stale ? "bad" : "good"}>{fmtDay(c.lastPinned)}</Pill> : <Pill tone="warn">never</Pill>}</td>
                  <td className="px-3 py-2 text-ink-3">{fmtDay(c.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <p className="text-xs text-ink-3 mt-3">Access: FOUNDER_EMAILS in the environment. Crew pages open only for members; use this table for the numbers.</p>
    </PlainShell>
  );
}

import type { Game } from "@/db/schema";
import { americanoStandings, type Americano } from "@/domain/americano";
import type { Member } from "@/lib/queries";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Panel, cls } from "@/components/ui";
import { scoreAmericano, startAmericano } from "@/lib/actions/games";

export function AmericanoPanel({ sessionId, game, members, isOrganiser, inCount }: { sessionId: string; game?: Game; members: Member[]; isOrganiser: boolean; inCount: number }) {
  const data = game ? (JSON.parse(game.data) as Americano) : null;
  const first = (id: string) => members.find((x) => x.id === id)?.name.split(" ")[0] ?? "?";
  return (
    <Panel className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold uppercase">Americano</h3>
      </div>
      {!data ? (
        isOrganiser ? (
          <ActionForm action={startAmericano}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <p className="text-sm text-ink-2">Everyone plays with and against everyone. Points scored count for you. {inCount < 4 ? "Needs four in." : `${inCount} in.`}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Points per match">
                <select name="pointsPerMatch" defaultValue="16">
                  {[16, 21, 24, 32].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Rounds">
                <input name="rounds" type="number" min={1} max={12} defaultValue={Math.max(3, inCount - 1)} inputMode="numeric" />
              </Field>
            </div>
            <SubmitButton variant="secondary" pendingText="Building…">
              Generate schedule
            </SubmitButton>
          </ActionForm>
        ) : (
          <p className="text-sm text-ink-2">The organiser can generate an americano schedule once everyone&apos;s in.</p>
        )
      ) : (
        <>
          <ol className="flex flex-col gap-2">
            {data.matches.map((m, i) => (
              <li key={i} className="border border-line rounded-sm p-2.5">
                <div className="eyebrow mb-1">
                  Round {m.round} · Court {m.court} · to {data.pointsPerMatch}
                </div>
                <ActionForm action={scoreAmericano} className="gap-2">
                  <input type="hidden" name="sessionId" value={sessionId} />
                  <input type="hidden" name="match" value={i} />
                  <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2 text-sm">
                    <span className={cls("font-semibold text-right", m.scoreA !== null && m.scoreB !== null && m.scoreA > m.scoreB && "text-pitch-deep")}>
                      {first(m.teamA[0])} &amp; {first(m.teamA[1])}
                    </span>
                    <input name="scoreA" inputMode="numeric" className="w-14 text-center tnum min-h-9 py-1" defaultValue={m.scoreA ?? ""} disabled={!isOrganiser} aria-label="Team A score" />
                    <span className="text-ink-3">v</span>
                    <input name="scoreB" inputMode="numeric" className="w-14 text-center tnum min-h-9 py-1" defaultValue={m.scoreB ?? ""} disabled={!isOrganiser} aria-label="Team B score" />
                    <span className={cls("font-semibold", m.scoreA !== null && m.scoreB !== null && m.scoreB > m.scoreA && "text-pitch-deep")}>
                      {first(m.teamB[0])} &amp; {first(m.teamB[1])}
                    </span>
                  </div>
                  {isOrganiser ? (
                    <SubmitButton variant="ghost" className="min-h-8 px-2 text-xs self-end" pendingText="…">
                      Save score
                    </SubmitButton>
                  ) : null}
                </ActionForm>
              </li>
            ))}
          </ol>
          <div>
            <div className="eyebrow mb-1">Standings</div>
            <table className="w-full text-sm">
              <tbody>
                {americanoStandings(data).map((s, i) => (
                  <tr key={s.userId} className="border-t border-line-2">
                    <td className="py-1.5 w-6 text-ink-3 tnum">{i + 1}</td>
                    <td className="py-1.5 font-semibold">{members.find((x) => x.id === s.userId)?.name ?? "?"}</td>
                    <td className="py-1.5 text-right tnum text-ink-2">{s.played} pl</td>
                    <td className="py-1.5 text-right tnum text-ink-2">{s.diff >= 0 ? "+" : ""}{s.diff}</td>
                    <td className="py-1.5 text-right tnum font-bold">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}

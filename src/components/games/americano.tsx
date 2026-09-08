import type { Game } from "@/db/schema";
import { americanoStandings, type Americano } from "@/domain/americano";
import type { Member } from "@/lib/queries";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { IconPadel } from "@/components/icons";
import { Eyebrow, Field, Panel, cls } from "@/components/ui";
import { scoreAmericano, startAmericano } from "@/lib/actions/games";

export function AmericanoPanel({ sessionId, game, members, isOrganiser, inCount }: { sessionId: string; game?: Game; members: Member[]; isOrganiser: boolean; inCount: number }) {
  const data = game ? (JSON.parse(game.data) as Americano) : null;
  const first = (id: string) => members.find((x) => x.id === id)?.name.split(" ")[0] ?? "?";
  return (
    <Panel className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconPadel size={18} className="text-pitch" />
          <h3 className="text-xl font-bold uppercase">Americano</h3>
        </div>
        {data ? <span className="eyebrow tnum">to {data.pointsPerMatch}</span> : null}
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
            {data.matches.map((m, i) => {
              const done = m.scoreA !== null && m.scoreB !== null;
              const aWins = done && m.scoreA! > m.scoreB!;
              const bWins = done && m.scoreB! > m.scoreA!;
              return (
                <li key={i} className="rounded-md border border-line bg-panel-2 overflow-hidden">
                  <div className="flex items-center justify-between px-3 pt-2">
                    <span className="eyebrow tnum">
                      R{m.round} · Court {m.court}
                    </span>
                    {done ? <span className="eyebrow text-pitch">Done</span> : null}
                  </div>
                  <ActionForm action={scoreAmericano} className="gap-2 px-3 pb-2.5 pt-1">
                    <input type="hidden" name="sessionId" value={sessionId} />
                    <input type="hidden" name="match" value={i} />
                    <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2 text-sm">
                      <span className={cls("font-semibold text-right truncate", aWins ? "text-pitch" : bWins ? "text-ink-3" : "")}>
                        {first(m.teamA[0])} &amp; {first(m.teamA[1])}
                      </span>
                      <input name="scoreA" inputMode="numeric" className="w-14 text-center tnum min-h-11 py-1 display text-2xl font-bold px-1" defaultValue={m.scoreA ?? ""} disabled={!isOrganiser} aria-label="Team A score" />
                      <span className="eyebrow">v</span>
                      <input name="scoreB" inputMode="numeric" className="w-14 text-center tnum min-h-11 py-1 display text-2xl font-bold px-1" defaultValue={m.scoreB ?? ""} disabled={!isOrganiser} aria-label="Team B score" />
                      <span className={cls("font-semibold truncate", bWins ? "text-pitch" : aWins ? "text-ink-3" : "")}>
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
              );
            })}
          </ol>
          <div>
            <Eyebrow className="mb-1">Standings</Eyebrow>
            <table className="w-full text-sm font-mono">
              <tbody>
                {americanoStandings(data).map((s, i) => (
                  <tr key={s.userId} className={cls("border-t border-line-2", i === 0 && "text-pitch")}>
                    <td className="py-1.5 w-6 tnum text-ink-3">{i + 1}</td>
                    <td className="py-1.5 font-sans font-semibold">{members.find((x) => x.id === s.userId)?.name ?? "?"}</td>
                    <td className="py-1.5 text-right tnum text-ink-2">{s.played} pl</td>
                    <td className="py-1.5 text-right tnum text-ink-2">
                      {s.diff >= 0 ? "+" : ""}
                      {s.diff}
                    </td>
                    <td className="py-1.5 text-right tnum font-bold display text-lg">{s.points}</td>
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

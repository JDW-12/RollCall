import { nowMs } from "@/lib/clock";
import type { Game, GameEntry } from "@/db/schema";
import { scorePrediction, type Prediction, type PredictorGame, DEFAULT_GRID } from "@/domain/predictor";
import type { Member } from "@/lib/queries";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Panel, Pill } from "@/components/ui";
import { setRaceResult, setupPredictor, submitPrediction } from "@/lib/actions/games";
import { fmtDateTime } from "@/lib/format";

export function PredictorPanel({ sessionId, game, entries, members, isOrganiser, myId }: { sessionId: string; game?: Game; entries: GameEntry[]; members: Member[]; isOrganiser: boolean; myId: string }) {
  const data = game ? (JSON.parse(game.data) as PredictorGame) : null;
  const locked = data ? nowMs() >= data.locksAt : false;
  const mine = entries.find((e) => e.userId === myId);
  const myPick = mine ? (JSON.parse(mine.data) as Prediction) : null;
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "?";
  const scored = data?.result
    ? entries
        .map((e) => ({ userId: e.userId, pick: JSON.parse(e.data) as Prediction, points: scorePrediction(JSON.parse(e.data) as Prediction, data.result!) }))
        .sort((a, b) => b.points - a.points)
    : null;

  return (
    <Panel className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold uppercase">Podium predictor</h3>
        <Pill>{data ? (data.result ? "Result in" : locked ? "Locked" : "Open") : "Not set up"}</Pill>
      </div>
      <p className="text-xs text-ink-3">Free to play. No prizes, no stakes. Exact spot 10 points, right driver wrong step 4, first to retire 5.</p>

      {!data && isOrganiser ? (
        <ActionForm action={setupPredictor}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <Field label="This weekend's grid" hint="One driver per line. Edit to match the entry list.">
            <textarea name="grid" rows={6} defaultValue={DEFAULT_GRID.join("\n")} />
          </Field>
          <SubmitButton variant="secondary" pendingText="Opening…">
            Open predictions
          </SubmitButton>
        </ActionForm>
      ) : null}
      {!data && !isOrganiser ? <p className="text-sm text-ink-2">The organiser opens predictions before the race.</p> : null}

      {data && !data.result && !locked ? (
        <ActionForm action={submitPrediction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <div className="grid grid-cols-3 gap-2">
            {(["p1", "p2", "p3"] as const).map((k, i) => (
              <Field key={k} label={`P${i + 1}`}>
                <select name={k} defaultValue={myPick?.podium[i] ?? ""} required>
                  <option value="" disabled>
                    Pick
                  </option>
                  {data.grid.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
          <Field label="First to retire (optional)">
            <select name="firstOut" defaultValue={myPick?.firstOut ?? ""}>
              <option value="">Skip</option>
              {data.grid.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-ink-3">Locks at {fmtDateTime(new Date(data.locksAt))}</span>
            <SubmitButton pendingText="Locking…">{myPick ? "Update picks" : "Lock in"}</SubmitButton>
          </div>
        </ActionForm>
      ) : null}

      {data && entries.length ? (
        <div>
          <div className="eyebrow mb-1">{scored ? "Scores" : `${entries.length} locked in`}</div>
          <table className="w-full text-sm">
            <tbody>
              {(scored ?? entries.map((e) => ({ userId: e.userId, pick: JSON.parse(e.data) as Prediction, points: null as number | null }))).map((row) => (
                <tr key={row.userId} className="border-t border-line-2">
                  <td className="py-1.5 font-semibold">{name(row.userId)}</td>
                  <td className="py-1.5 text-ink-2 text-xs">{locked || scored ? row.pick.podium.join(" · ") + (row.pick.firstOut ? ` · out: ${row.pick.firstOut}` : "") : "hidden until lights out"}</td>
                  <td className="py-1.5 text-right tnum font-bold">{row.points ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data && isOrganiser ? (
        <details className="border border-line rounded-md">
          <summary className="px-3 py-2.5 text-sm font-semibold cursor-pointer">{data.result ? "Edit result" : "Enter result"}</summary>
          <ActionForm action={setRaceResult} className="px-3 pb-3">
            <input type="hidden" name="sessionId" value={sessionId} />
            <div className="grid grid-cols-3 gap-2">
              {(["r1", "r2", "r3"] as const).map((k, i) => (
                <Field key={k} label={`P${i + 1}`}>
                  <select name={k} defaultValue={data.result?.finishing[i] ?? ""} required>
                    <option value="" disabled>
                      Pick
                    </option>
                    {data.grid.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <Field label="First to retire">
              <select name="firstOut" defaultValue={data.result?.firstOut ?? ""}>
                <option value="">Nobody retired</option>
                {data.grid.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <SubmitButton variant="secondary" className="self-start" pendingText="Saving…">
              Save result
            </SubmitButton>
          </ActionForm>
        </details>
      ) : null}
    </Panel>
  );
}

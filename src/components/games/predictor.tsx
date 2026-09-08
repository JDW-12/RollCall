import { nowMs } from "@/lib/clock";
import type { Game, GameEntry } from "@/db/schema";
import { scorePrediction, type Prediction, type PredictorGame, DEFAULT_GRID } from "@/domain/predictor";
import type { Member } from "@/lib/queries";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { IconFlag } from "@/components/icons";
import { Eyebrow, Field, Panel, Pill, cls } from "@/components/ui";
import { setRaceResult, setupPredictor, submitPrediction } from "@/lib/actions/games";
import { fmtDateTime } from "@/lib/format";

export function PredictorPanel({ sessionId, game, entries, members, isOrganiser, myId, locksAt }: { sessionId: string; game?: Game; entries: GameEntry[]; members: Member[]; isOrganiser: boolean; myId: string; locksAt: number }) {
  const data = game ? (JSON.parse(game.data) as PredictorGame) : null;
  const locked = data ? nowMs() >= locksAt : false;
  const mine = entries.find((e) => e.userId === myId);
  const myPick = mine ? (JSON.parse(mine.data) as Prediction) : null;
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "?";
  const scored = data?.result
    ? entries
        .map((e) => ({ userId: e.userId, pick: JSON.parse(e.data) as Prediction, points: scorePrediction(JSON.parse(e.data) as Prediction, data.result!) }))
        .sort((a, b) => b.points - a.points)
    : null;
  const state = data ? (data.result ? "result" : locked ? "locked" : "open") : "unset";

  return (
    <Panel className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconFlag size={18} className="text-pitch" />
          <h3 className="text-xl font-bold uppercase">Podium predictor</h3>
        </div>
        {state === "result" ? <Pill tone="ink">Result in</Pill> : state === "locked" ? <Pill tone="warn">Locked</Pill> : state === "open" ? <Pill tone="good">Open</Pill> : <Pill>Not set up</Pill>}
      </div>
      <p className="text-xs text-ink-3">Free to play. No prizes, no stakes. Exact spot 10 points, right driver wrong step 4, first to retire 5.</p>

      {!data && isOrganiser ? (
        <ActionForm action={setupPredictor}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <Field label="This weekend's grid" hint="One driver per line. Edit to match the entry list.">
            <textarea name="grid" rows={6} defaultValue={DEFAULT_GRID.join("\n")} className="font-mono text-sm" />
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
              <PodiumPick key={k} name={k} step={i + 1} defaultValue={myPick?.podium[i] ?? ""} grid={data.grid} required />
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
            <span className="text-xs text-ink-3 tnum">Locks at {fmtDateTime(new Date(locksAt))}</span>
            <SubmitButton pendingText="Locking…">{myPick ? "Update picks" : "Lock in"}</SubmitButton>
          </div>
        </ActionForm>
      ) : null}

      {data && locked && !data.result && myPick ? (
        <div className="grid grid-cols-3 gap-2">
          {myPick.podium.map((d, i) => (
            <div key={i} className="rounded-md border border-line bg-panel-2 p-3 flex flex-col gap-1">
              <span className="eyebrow">P{i + 1}</span>
              <span className="display text-lg font-bold uppercase leading-none truncate">{d}</span>
            </div>
          ))}
        </div>
      ) : null}

      {data && entries.length ? (
        <div>
          <Eyebrow className="mb-1">{scored ? "Scores" : `${entries.length} locked in`}</Eyebrow>
          <table className="w-full text-sm">
            <tbody>
              {(scored ?? entries.map((e) => ({ userId: e.userId, pick: JSON.parse(e.data) as Prediction, points: null as number | null }))).map((row, i) => (
                <tr key={row.userId} className={cls("border-t border-line-2", scored && i === 0 && "text-pitch")}>
                  <td className="py-1.5 font-semibold whitespace-nowrap">{name(row.userId)}</td>
                  <td className="py-1.5 text-ink-2 text-xs font-mono">{locked || scored ? row.pick.podium.join(" · ") + (row.pick.firstOut ? ` · out: ${row.pick.firstOut}` : "") : "hidden until lights out"}</td>
                  <td className="py-1.5 text-right tnum font-bold display text-lg">{row.points ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data && isOrganiser ? (
        <details className="rounded-md border border-line bg-panel-2 overflow-hidden">
          <summary className="px-3 py-2.5 text-sm font-semibold cursor-pointer flex items-center justify-between gap-3 list-none">
            <span>{data.result ? "Edit result" : "Enter result"}</span>
            <span className="eyebrow">Organiser</span>
          </summary>
          <ActionForm action={setRaceResult} className="px-3 pb-3">
            <input type="hidden" name="sessionId" value={sessionId} />
            <div className="grid grid-cols-3 gap-2">
              {(["r1", "r2", "r3"] as const).map((k, i) => (
                <PodiumPick key={k} name={k} step={i + 1} defaultValue={data.result?.finishing[i] ?? ""} grid={data.grid} required />
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

/** One big podium select with a P1/P2/P3 eyebrow. */
function PodiumPick({ name, step, defaultValue, grid, required }: { name: string; step: number; defaultValue: string; grid: string[]; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="display text-2xl font-bold tnum leading-none">P{step}</span>
      <select name={name} defaultValue={defaultValue} required={required} className="min-h-12 font-semibold">
        <option value="" disabled>
          Pick
        </option>
        {grid.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </label>
  );
}

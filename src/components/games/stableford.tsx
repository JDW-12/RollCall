import type { Game } from "@/db/schema";
import { defaultHoles, stablefordPoints, stablefordTotals, type StablefordCard } from "@/domain/stableford";
import type { Member } from "@/lib/queries";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Panel } from "@/components/ui";
import { saveStableford } from "@/lib/actions/games";

export function StablefordPanel({ sessionId, game, members, isOrganiser, playerIds, myId }: { sessionId: string; game?: Game; members: Member[]; isOrganiser: boolean; playerIds: string[]; myId: string }) {
  const card: StablefordCard = game ? (JSON.parse(game.data) as StablefordCard) : { holes: defaultHoles(), handicaps: {}, strokes: {} };
  const totals = stablefordTotals(card);
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "?";
  const editable = playerIds.includes(myId) ? [myId, ...(isOrganiser ? playerIds.filter((p) => p !== myId) : [])] : isOrganiser ? playerIds : [];
  return (
    <Panel className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold uppercase">Stableford</h3>
        <span className="eyebrow">{card.holes.length} holes · par {card.holes.reduce((a, h) => a + h.par, 0)}</span>
      </div>
      {totals.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="eyebrow text-left">
              <th className="font-normal pb-1">Player</th>
              <th className="font-normal pb-1 text-right">Hcp</th>
              <th className="font-normal pb-1 text-right">Out</th>
              <th className="font-normal pb-1 text-right">In</th>
              <th className="font-normal pb-1 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((t) => (
              <tr key={t.userId} className="border-t border-line-2">
                <td className="py-1.5 font-semibold">
                  {name(t.userId)}
                  {t.holesPlayed < card.holes.length ? <span className="text-ink-3 font-normal"> · {t.holesPlayed} holes</span> : null}
                </td>
                <td className="py-1.5 text-right tnum">{card.handicaps[t.userId] ?? 0}</td>
                <td className="py-1.5 text-right tnum">{t.front}</td>
                <td className="py-1.5 text-right tnum">{t.back}</td>
                <td className="py-1.5 text-right tnum font-bold">{t.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-ink-2">No cards yet. Enter your handicap and gross scores per hole; points work themselves out.</p>
      )}
      {editable.map((uid) => (
        <details key={uid} className="border border-line rounded-md" open={uid === myId && !card.strokes[uid]}>
          <summary className="px-3 py-2.5 text-sm font-semibold cursor-pointer">
            {uid === myId ? "Your card" : `${name(uid)}'s card`}
          </summary>
          <ActionForm action={saveStableford} className="px-3 pb-3">
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="userId" value={uid} />
            <Field label="Playing handicap">
              <input name="handicap" type="number" min={0} max={54} inputMode="numeric" defaultValue={card.handicaps[uid] ?? ""} className="max-w-[120px]" />
            </Field>
            <div className="overflow-x-auto">
              <table className="text-xs tnum">
                <thead>
                  <tr className="eyebrow">
                    <th className="text-left pr-2 font-normal">Hole</th>
                    {card.holes.map((h) => (
                      <th key={h.number} className="px-0.5 font-normal">
                        {h.number}
                      </th>
                    ))}
                  </tr>
                  <tr className="text-ink-3">
                    <td className="pr-2">Par / SI</td>
                    {card.holes.map((h) => (
                      <td key={h.number} className="px-0.5 text-center">
                        {h.par}/{h.strokeIndex}
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pr-2">Gross</td>
                    {card.holes.map((h, i) => (
                      <td key={h.number} className="px-0.5">
                        <input name={`h_${i}`} inputMode="numeric" defaultValue={card.strokes[uid]?.[i] ?? ""} className="w-9 px-0 text-center min-h-9 py-1" aria-label={`Hole ${h.number} gross`} />
                      </td>
                    ))}
                  </tr>
                  <tr className="text-ink-3">
                    <td className="pr-2">Pts</td>
                    {card.holes.map((h, i) => (
                      <td key={h.number} className="px-0.5 text-center">
                        {card.strokes[uid] ? stablefordPoints(card.strokes[uid][i] ?? null, h.par, h.strokeIndex, card.handicaps[uid] ?? 0) : ""}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <SubmitButton variant="secondary" className="self-start" pendingText="Saving…">
              Save card
            </SubmitButton>
          </ActionForm>
        </details>
      ))}
      {isOrganiser ? (
        <details className="border border-line rounded-md">
          <summary className="px-3 py-2.5 text-sm font-semibold cursor-pointer">Course: pars and stroke indexes</summary>
          <ActionForm action={saveStableford} className="px-3 pb-3">
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="mode" value="holes" />
            <input type="hidden" name="userId" value={playerIds[0] ?? myId} />
            <div className="overflow-x-auto">
              <table className="text-xs tnum">
                <tbody>
                  <tr>
                    <td className="pr-2">Par</td>
                    {card.holes.map((h, i) => (
                      <td key={h.number} className="px-0.5">
                        <input name={`par_${i}`} inputMode="numeric" defaultValue={h.par} className="w-9 px-0 text-center min-h-9 py-1" aria-label={`Hole ${h.number} par`} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="pr-2">SI</td>
                    {card.holes.map((h, i) => (
                      <td key={h.number} className="px-0.5">
                        <input name={`si_${i}`} inputMode="numeric" defaultValue={h.strokeIndex} className="w-9 px-0 text-center min-h-9 py-1" aria-label={`Hole ${h.number} stroke index`} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <SubmitButton variant="secondary" className="self-start" pendingText="Saving…">
              Save course
            </SubmitButton>
          </ActionForm>
        </details>
      ) : null}
    </Panel>
  );
}

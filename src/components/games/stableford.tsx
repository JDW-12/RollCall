import type { Game } from "@/db/schema";
import { defaultHoles, stablefordTotals, type StablefordCard } from "@/domain/stableford";
import type { Member } from "@/lib/queries";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { IconGolf } from "@/components/icons";
import { Panel, cls } from "@/components/ui";
import { saveStableford } from "@/lib/actions/games";
import { courseLabel } from "@/domain/courses";
import { CoursePicker } from "./course-picker";
import { HoleScorer } from "./hole-scorer";

export function StablefordPanel({ sessionId, game, members, isOrganiser, playerIds, myId, providerOn = false, scanOn = false }: { sessionId: string; game?: Game; members: Member[]; isOrganiser: boolean; playerIds: string[]; myId: string; providerOn?: boolean; scanOn?: boolean }) {
  const card: StablefordCard = game ? (JSON.parse(game.data) as StablefordCard) : { holes: defaultHoles(), handicaps: {}, strokes: {} };
  const totals = stablefordTotals(card);
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "?";
  // Uncontrolled inputs keep their first defaultValue, so forms remount whenever the course changes.
  const courseKey = card.holes.map((h) => `${h.par}/${h.strokeIndex}`).join(",");
  const editable = playerIds.includes(myId) ? [myId, ...(isOrganiser ? playerIds.filter((p) => p !== myId) : [])] : isOrganiser ? playerIds : [];
  const summaryCls = "px-3 py-2.5 text-sm font-semibold cursor-pointer flex items-center justify-between gap-3 list-none";
  return (
    <Panel className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconGolf size={18} className="text-pitch" />
          <h3 className="text-xl font-bold uppercase">Stableford</h3>
        </div>
        <span className="eyebrow tnum">
          {card.holes.length} holes · par {card.holes.reduce((a, h) => a + h.par, 0)}
        </span>
      </div>
      {card.course ? (
        <p className="text-sm text-ink-2 -mt-2">
          Card: <strong className="text-ink">{courseLabel(card.course)}</strong>
          {card.course.id ? " · from the course library" : ""}
        </p>
      ) : isOrganiser ? (
        <p className="text-sm text-ink-2 -mt-2">Using a standard par-72 layout. Pick the real course below so the points are right.</p>
      ) : null}
      {totals.length ? (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm font-mono tnum">
            <thead>
              <tr className="eyebrow text-left">
                <th className="font-normal pb-1.5">Player</th>
                <th className="font-normal pb-1.5 text-right">Hcp</th>
                <th className="font-normal pb-1.5 text-right">Out</th>
                <th className="font-normal pb-1.5 text-right">In</th>
                <th className="font-normal pb-1.5 text-right">Pts</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((t, i) => (
                <tr key={t.userId} className={cls("border-t border-line-2", i === 0 && "bg-pitch-soft")}>
                  <td className="py-1.5 px-1 font-sans font-semibold">
                    {name(t.userId)}
                    {t.holesPlayed < card.holes.length ? <span className="text-ink-3 font-normal font-mono text-xs"> · {t.holesPlayed} holes</span> : null}
                  </td>
                  <td className="py-1.5 text-right text-ink-2">{card.handicaps[t.userId] ?? 0}</td>
                  <td className="py-1.5 text-right">{t.front}</td>
                  <td className="py-1.5 text-right">{t.back}</td>
                  <td className={cls("py-1.5 pl-2 text-right font-bold display text-lg", i === 0 && "text-pitch")}>{t.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ink-2">No cards yet. Enter your handicap and gross scores per hole; points work themselves out.</p>
      )}
      {editable.map((uid) => (
        <details key={uid} className="rounded-md border border-line bg-panel-2 overflow-hidden" open={uid === myId && !card.strokes[uid]}>
          <summary className={summaryCls}>
            <span>{uid === myId ? "Your card" : `${name(uid)}'s card`}</span>
            <span className="eyebrow">{card.strokes[uid] ? "Saved" : "Empty"}</span>
          </summary>
          <HoleScorer key={courseKey} sessionId={sessionId} userId={uid} holes={card.holes} handicap={card.handicaps[uid] ?? null} strokes={card.strokes[uid] ?? null} />
        </details>
      ))}
      {isOrganiser ? (
        <details className="rounded-md border border-line bg-panel-2 overflow-hidden" open={!card.course && !totals.length}>
          <summary className={summaryCls}>
            <span>{card.course ? "Change course" : "Pick the course"}</span>
            <span className="eyebrow">Organiser</span>
          </summary>
          <div className="px-3 pb-3">
            <CoursePicker sessionId={sessionId} providerOn={providerOn} scanOn={scanOn} />
          </div>
        </details>
      ) : null}
      {isOrganiser ? (
        <details className="rounded-md border border-line bg-panel-2 overflow-hidden">
          <summary className={summaryCls}>
            <span>Fix pars and stroke indexes</span>
            <span className="eyebrow">{card.course?.id ? "Updates the library" : "Organiser"}</span>
          </summary>
          <ActionForm key={courseKey} action={saveStableford} className="px-3 pb-3">
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="mode" value="holes" />
            <input type="hidden" name="userId" value={playerIds[0] ?? myId} />
            <div className="overflow-x-auto">
              <table className="text-xs font-mono tnum">
                <tbody>
                  <tr>
                    <td className="pr-2">Par</td>
                    {card.holes.map((h, i) => (
                      <td key={h.number} className="px-0.5">
                        <input name={`par_${i}`} inputMode="numeric" defaultValue={h.par} className="w-9 px-0 text-center min-h-9 py-1 font-mono" aria-label={`Hole ${h.number} par`} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="pr-2">SI</td>
                    {card.holes.map((h, i) => (
                      <td key={h.number} className="px-0.5">
                        <input name={`si_${i}`} inputMode="numeric" defaultValue={h.strokeIndex} className="w-9 px-0 text-center min-h-9 py-1 font-mono" aria-label={`Hole ${h.number} stroke index`} />
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

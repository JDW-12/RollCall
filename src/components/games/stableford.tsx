import type { Game } from "@/db/schema";
import { defaultHoles, stablefordTotals, type StablefordCard } from "@/domain/stableford";
import type { Member } from "@/lib/queries";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { LinkButton, Panel, cls } from "@/components/ui";
import { saveStableford } from "@/lib/actions/games";
import { RESULT_LABEL, roundAwards, roundHighlights } from "@/domain/golf-highlights";
import { CoursePicker } from "./course-picker";
import { HoleScorer } from "./hole-scorer";
import { FlagEmblem, TeeMarker } from "@/components/golf/marks";

export function StablefordPanel({ sessionId, game, members, isOrganiser, playerIds, myId, providerOn = false, scanOn = false, liveHref }: { sessionId: string; game?: Game; members: Member[]; isOrganiser: boolean; playerIds: string[]; myId: string; providerOn?: boolean; scanOn?: boolean; liveHref?: string }) {
  const card: StablefordCard = game ? (JSON.parse(game.data) as StablefordCard) : { holes: defaultHoles(), handicaps: {}, strokes: {} };
  const totals = stablefordTotals(card);
  const highlights = roundHighlights(card);
  const awards = roundAwards(highlights);
  const birdiesOf = (id: string) => awards.birdies.find((b) => b.userId === id)?.n ?? 0;
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "?";
  // Uncontrolled inputs keep their first defaultValue, so forms remount whenever the course changes.
  const courseKey = card.holes.map((h) => `${h.par}/${h.strokeIndex}`).join(",");
  const editable = playerIds.includes(myId) ? [myId, ...(isOrganiser ? playerIds.filter((p) => p !== myId) : [])] : isOrganiser ? playerIds : [];
  const summaryCls = "px-3 py-2.5 text-sm font-semibold cursor-pointer flex items-center justify-between gap-3 list-none";
  return (
    <Panel className="p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <FlagEmblem size={26} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            {/* The round is known by where it was played; the scoring format is the small print. */}
            <h3 className="text-xl font-bold uppercase leading-tight wrap-anywhere">{card.course?.name || "Stableford"}</h3>
            {card.course ? (
              <div className="eyebrow mt-0.5 flex items-center gap-1.5">
                <TeeMarker tee={card.course.tee} size={10} />
                {card.course.tee ? `${card.course.tee} tees · ` : ""}Stableford
              </div>
            ) : null}
          </div>
        </div>
        <span className="eyebrow tnum shrink-0 mt-1">
          {card.holes.length} holes · par {card.holes.reduce((a, h) => a + h.par, 0)}
        </span>
      </div>
      {/* Play mode: GPS yardages and hole-by-hole scoring, for anyone in the round once there's a course. */}
      {liveHref && game && card.course && playerIds.includes(myId) ? (
        <LinkButton href={liveHref} className="min-h-12 text-base">
          Play live · GPS yardages
        </LinkButton>
      ) : null}
      {card.course ? null : isOrganiser ? (
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
                <th className="font-normal pb-1.5 text-right" title="Birdies or better">Brd</th>
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
                  <td className={cls("py-1.5 text-right", birdiesOf(t.userId) ? "text-pitch" : "text-ink-3")}>{birdiesOf(t.userId) || "–"}</td>
                  <td className={cls("py-1.5 pl-2 text-right font-bold display text-lg", i === 0 && "text-pitch")}>{t.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ink-2">No cards yet. Enter your handicap and gross scores per hole; points work themselves out.</p>
      )}
      {awards.bestHole || awards.longestDrive || awards.mostLost ? (
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm" aria-label="Round highlights">
          {awards.bestHole ? (
            <li className="rounded-md border border-line bg-panel-2 px-3 py-2">
              <div className="eyebrow">Shot of the day</div>
              <div className="font-semibold">
                {RESULT_LABEL[awards.bestHole.result]} <span className="text-ink-3 font-normal">· {name(awards.bestHole.userId)}, hole {awards.bestHole.hole}</span>
              </div>
            </li>
          ) : null}
          {awards.longestDrive ? (
            <li className="rounded-md border border-line bg-panel-2 px-3 py-2">
              <div className="eyebrow">Longest drive</div>
              <div className="font-semibold">
                {awards.longestDrive.yards} yds <span className="text-ink-3 font-normal">· {name(awards.longestDrive.userId)}</span>
              </div>
            </li>
          ) : null}
          {awards.mostLost ? (
            <li className="rounded-md border border-line bg-panel-2 px-3 py-2">
              <div className="eyebrow">Balls donated</div>
              <div className="font-semibold">
                {awards.mostLost.balls} <span className="text-ink-3 font-normal">· {name(awards.mostLost.userId)}</span>
              </div>
            </li>
          ) : null}
        </ul>
      ) : null}
      {editable.map((uid) => (
        <details key={uid} className="rounded-md border border-line bg-panel-2" open={uid === myId && !card.strokes[uid]}>
          <summary className={summaryCls}>
            <span>{uid === myId ? "Your card" : `${name(uid)}'s card`}</span>
            <span className="eyebrow">{card.submitted?.[uid] ? "Submitted" : card.strokes[uid] ? "Saved" : "Empty"}</span>
          </summary>
          <HoleScorer key={`${courseKey}|${game?.updatedAt.getTime() ?? 0}`} sessionId={sessionId} userId={uid} holes={card.holes} handicap={card.handicaps[uid] ?? null} strokes={card.strokes[uid] ?? null} extras={card.extras?.[uid] ?? null} />
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
                        <input name={`par_${i}`} inputMode="numeric" defaultValue={h.par} className="w-10 px-0 text-center min-h-10 py-1 font-mono" aria-label={`Hole ${h.number} par`} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="pr-2">SI</td>
                    {card.holes.map((h, i) => (
                      <td key={h.number} className="px-0.5">
                        <input name={`si_${i}`} inputMode="numeric" defaultValue={h.strokeIndex} className="w-10 px-0 text-center min-h-10 py-1 font-mono" aria-label={`Hole ${h.number} stroke index`} />
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

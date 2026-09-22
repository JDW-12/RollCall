import type { MatchStat, Session } from "@/db/schema";
import type { Member } from "@/lib/queries";
import { fixtureLine, resultOf } from "@/domain/league";
import { statLine } from "@/domain/match-stats";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { Eyebrow, Field, Panel, cls } from "@/components/ui";
import { saveMatchStats } from "@/lib/actions/league";

/**
 * The result of a fixture and who did what. Managers type it once; everyone who tapped in sees it,
 * and it feeds the season's player stats on the League tab.
 */
export function MatchResultPanel({
  session,
  crewName,
  competitionName,
  members,
  attendedIds,
  stats,
  isOrganiser,
}: {
  session: Session;
  crewName: string;
  competitionName: string | null;
  members: Member[];
  attendedIds: string[];
  stats: MatchStat[];
  isOrganiser: boolean;
}) {
  const result = resultOf(session.goalsFor, session.goalsAgainst);
  const line = fixtureLine({ us: crewName, opponent: session.opponent, homeAway: session.homeAway, goalsFor: session.goalsFor, goalsAgainst: session.goalsAgainst });
  const statOf = (userId: string) => stats.find((s) => s.userId === userId);
  const played = attendedIds.map((id) => members.find((m) => m.id === id)).filter((m): m is Member => !!m);
  const scorers = played.map((m) => ({ m, s: statOf(m.id) })).filter((x) => x.s && (x.s.goals || x.s.assists || x.s.rating !== null));

  return (
    <Panel className="p-4 flex flex-col gap-4 mt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>{competitionName ? `${competitionName}${session.round ? ` · ${session.round}` : ""}` : "Fixture"}</Eyebrow>
          <div className="display text-2xl font-bold uppercase leading-tight wrap-anywhere mt-1">{line}</div>
        </div>
        {result ? (
          <span
            className={cls(
              "w-11 h-11 rounded-md flex items-center justify-center display text-xl font-extrabold shrink-0",
              result === "W" ? "bg-pitch text-pitch-ink" : result === "D" ? "bg-ground-2 text-ink-2 border border-line" : "bg-red-soft text-red",
            )}
            aria-label={result === "W" ? "Won" : result === "D" ? "Drew" : "Lost"}
          >
            {result}
          </span>
        ) : null}
      </div>

      {scorers.length ? (
        <ul className="flex flex-col divide-y divide-line-2 rounded-md border border-line bg-panel-2" aria-label="Who did what">
          {scorers.map(({ m, s }) => (
            <li key={m.id} className="flex items-center gap-2.5 px-3 py-2">
              <Avatar name={m.name} hue={m.hue} size={28} />
              <span className="flex-1 min-w-0 font-semibold text-sm truncate">{m.name}</span>
              <span className="text-sm text-ink-2 font-mono tnum">{statLine(s!)}</span>
            </li>
          ))}
        </ul>
      ) : session.goalsFor === null ? (
        <p className="text-sm text-ink-2">{isOrganiser ? "Enter the score and who did what; it all lands on the League tab." : "The manager hasn't put the result in yet."}</p>
      ) : null}

      {isOrganiser ? (
        <details className="rounded-md border border-line bg-panel-2" open={session.goalsFor === null}>
          <summary className="px-3 py-2.5 text-sm font-semibold cursor-pointer flex items-center justify-between gap-3 list-none">
            <span>{session.goalsFor === null ? "Enter the result" : "Fix the result"}</span>
            <span className="eyebrow">Manager</span>
          </summary>
          <ActionForm action={saveMatchStats} className="px-3 pb-3" marker="result-form">
            <input type="hidden" name="sessionId" value={session.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={session.homeAway === "away" ? "Us (away)" : "Us"}>
                <input name="goalsFor" type="number" min={0} max={99} inputMode="numeric" defaultValue={session.goalsFor ?? ""} placeholder="–" className="display text-2xl font-bold tnum text-center no-spin" aria-label="Our score" />
              </Field>
              <Field label={session.opponent || "Them"}>
                <input name="goalsAgainst" type="number" min={0} max={99} inputMode="numeric" defaultValue={session.goalsAgainst ?? ""} placeholder="–" className="display text-2xl font-bold tnum text-center no-spin" aria-label="Their score" />
              </Field>
            </div>
            {played.length ? (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-[1fr_52px_52px_56px] gap-2 items-end">
                  <Eyebrow>Player</Eyebrow>
                  <Eyebrow className="text-center">Gls</Eyebrow>
                  <Eyebrow className="text-center">Ast</Eyebrow>
                  <Eyebrow className="text-center">/10</Eyebrow>
                </div>
                {played.map((m) => {
                  const s = statOf(m.id);
                  return (
                    <div key={m.id} className="grid grid-cols-[1fr_52px_52px_56px] gap-2 items-center">
                      <span className="flex items-center gap-2 min-w-0">
                        <Avatar name={m.name} hue={m.hue} size={26} />
                        <span className="text-sm font-semibold truncate">{m.name}</span>
                      </span>
                      <input name={`g_${m.id}`} type="number" min={0} max={30} inputMode="numeric" defaultValue={s?.goals || ""} placeholder="0" className="text-center min-h-10 px-0 font-mono no-spin" aria-label={`${m.name}: goals`} />
                      <input name={`a_${m.id}`} type="number" min={0} max={30} inputMode="numeric" defaultValue={s?.assists || ""} placeholder="0" className="text-center min-h-10 px-0 font-mono no-spin" aria-label={`${m.name}: assists`} />
                      <input name={`r_${m.id}`} type="number" min={1} max={10} inputMode="numeric" defaultValue={s?.rating ?? ""} placeholder="–" className="text-center min-h-10 px-0 font-mono no-spin" aria-label={`${m.name}: manager rating out of ten`} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-ink-2">Confirm who played first and they&apos;ll be listed here.</p>
            )}
            <SubmitButton pendingText="Saving…" className="self-start">
              Save the result
            </SubmitButton>
          </ActionForm>
        </details>
      ) : null}
    </Panel>
  );
}

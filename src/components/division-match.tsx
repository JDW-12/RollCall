import Link from "next/link";
import type { DivisionMatch } from "@/domain/divisions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { IconFlag } from "@/components/icons";
import { Eyebrow, Panel, Pill } from "@/components/ui";
import { adoptDivision } from "@/lib/actions/league";

/**
 * "We already have your table." Shown when another crew has sourced the division this crew is
 * playing in, worked out from the opponents they have already played. One tap and they are done —
 * no league admin, no snippet, no pasting. This is the payoff of holding tables per division rather
 * than per crew.
 */
export function DivisionMatchPanel({ match, crewId, competitionId }: { match: DivisionMatch; crewId: string; competitionId: string }) {
  return (
    <Panel className="p-4 anim-rise-2 border-pitch/40">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <Eyebrow>We&apos;ve already got this one</Eyebrow>
          <div className="display text-xl font-bold uppercase leading-tight mt-1 wrap-anywhere">{match.candidate.name}</div>
        </div>
        <IconFlag size={20} className="text-pitch shrink-0" />
      </div>
      <p className="text-sm text-ink-2">
        Another crew on Roll Call keeps this table up to date, and it has{" "}
        {match.matched.slice(0, 3).map((team, i, all) => (
          <span key={team}>
            <strong className="text-ink">{team}</strong>
            {i < all.length - 2 ? ", " : i === all.length - 2 ? " and " : ""}
          </span>
        ))}
        {match.matched.length > 3 ? ` and ${match.matched.length - 3} more of your fixtures` : ""} in it. Use it and you never have to find a table yourself.
      </p>
      <ActionForm action={adoptDivision} className="mt-3" marker="adopt-division">
        <input type="hidden" name="crewId" value={crewId} />
        <input type="hidden" name="competitionId" value={competitionId} />
        <input type="hidden" name="matchId" value={match.candidate.competitionId} />
        <SubmitButton className="self-start" pendingText="Linking…">
          That&apos;s our division
        </SubmitButton>
      </ActionForm>
    </Panel>
  );
}

/**
 * What an organiser sees when nobody has this division yet. The order matters: the cheap thing
 * first. Copying a whole page is two taps and needs no permissions, so it leads; the feed snippet
 * is the one-off that makes it permanent, and asking the secretary is a message they can forward.
 */
export function NoTableYet({ crewSlug, leagueUrl, leagueName }: { crewSlug: string; leagueUrl: string; leagueName: string }) {
  const ask = `Hi — I keep our team's fixtures and results in an app called Roll Call and it can show the ${leagueName} table automatically. Could you send me the "Table" code snippet from Full-Time admin (Media → Code Snippets)? It's a one-off and takes a minute. Thanks!`;
  return (
    <Panel className="p-4 anim-rise-2 flex flex-col gap-3">
      <div>
        <Eyebrow className="mb-2">The table</Eyebrow>
        <p className="text-sm text-ink-2">
          Nobody has sourced this division yet, so you&apos;re first. Quickest way:{" "}
          {leagueUrl ? (
            <a href={leagueUrl} target="_blank" rel="noreferrer noopener" className="underline font-semibold text-pitch">
              open your league page
            </a>
          ) : (
            "open your league page"
          )}
          , select the whole thing, copy, and{" "}
          <Link href={`/crew/${crewSlug}/settings#league`} className="underline font-semibold text-pitch">
            paste it here
          </Link>
          . You don&apos;t need to select the table neatly — we find it and ignore the rest.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="neutral">Once only</Pill>
        <a href={`https://wa.me/?text=${encodeURIComponent(ask)}`} target="_blank" rel="noreferrer noopener" className="text-sm font-semibold text-pitch underline">
          Ask your league secretary for the live feed
        </a>
      </div>
      <p className="text-xs text-ink-3">
        Whatever you do here is done for everyone: the next crew in this division gets your table without lifting a finger.
      </p>
    </Panel>
  );
}

/** A quiet reminder that a hand-pasted table has drifted. Only an organiser can do anything about it. */
export function StaleTableNudge({ crewSlug, leagueUrl }: { crewSlug: string; leagueUrl: string }) {
  return (
    <p className="text-xs text-card-ink mt-1">
      This table is over a week old.{" "}
      {leagueUrl ? (
        <>
          <a href={leagueUrl} target="_blank" rel="noreferrer noopener" className="underline font-semibold">
            Open the league page
          </a>
          , copy the lot and{" "}
        </>
      ) : null}
      <Link href={`/crew/${crewSlug}/settings#league`} className="underline font-semibold">
        paste it again
      </Link>
      .
    </p>
  );
}

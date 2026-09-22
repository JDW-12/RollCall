import type { Competition } from "@/db/schema";
import { PROVIDER_LABEL, type Provider } from "@/domain/league";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Pill } from "@/components/ui";
import { refreshStandings } from "@/lib/actions/league";
import { fmtAgo, fmtDay } from "@/lib/format";

/**
 * Where the table came from and how fresh it is. A live feed says when it last answered; a pasted
 * table says when it was pasted. If the feed has stopped answering the organiser sees why, while
 * everyone else just sees the last good table — a broken feed should never look like a broken app.
 */
export function StandingsStatus({ competition, crewId, isOrganiser }: { competition: Competition; crewId: string; isOrganiser: boolean }) {
  const live = competition.standingsSource === "feed";
  const source = PROVIDER_LABEL[competition.provider as Provider] ?? "the league";
  const stamp = live ? competition.syncedAt : competition.standingsUpdatedAt;
  const broken = !!competition.syncError && competition.feedKind !== "none";

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {broken && isOrganiser ? <Pill tone="warn">Feed stalled</Pill> : live ? <Pill tone="good">Live</Pill> : null}
      <span className="text-xs text-ink-3">
        {live ? `From ${source}` : "Pasted"}
        {stamp ? ` · ${fmtAgo(stamp)}` : ""}
      </span>
      {isOrganiser && competition.feedKind !== "none" ? (
        <ActionForm action={refreshStandings} marker="refresh-standings" className="contents">
          <input type="hidden" name="crewId" value={crewId} />
          <input type="hidden" name="competitionId" value={competition.id} />
          <SubmitButton variant="ghost" className="min-h-8 px-2 text-xs" pendingText="Checking…">
            Refresh
          </SubmitButton>
        </ActionForm>
      ) : null}
    </div>
  );
}

/** The one-line explanation an organiser needs when a feed has stopped working. */
export function StandingsError({ competition }: { competition: Competition }) {
  if (!competition.syncError || competition.feedKind === "none") return null;
  return (
    <p className="text-xs text-card-ink mt-1">
      {competition.syncError} Showing the table from {competition.standingsUpdatedAt ? fmtDay(competition.standingsUpdatedAt) : "earlier"}.
    </p>
  );
}

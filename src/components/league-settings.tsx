import type { Competition, Crew } from "@/db/schema";
import type { SportDef } from "@/domain/sports";
import { PROVIDER_LABEL, type Provider, type StandingRow } from "@/domain/league";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { IconFlag } from "@/components/icons";
import { Eyebrow, Field, Panel, Pill } from "@/components/ui";
import { deleteCompetition, saveCompetition, saveStandings } from "@/lib/actions/league";
import { Button } from "@/components/ui";
import { fmtDay } from "@/lib/format";

/**
 * Leagues and cups, set up by an organiser. Neither the FA nor Powerleague publish a feed anyone
 * can read, so this is a link out plus a table the manager pastes: reliable, and it renders in the
 * crew's own design rather than someone else's iframe.
 */
export function LeagueSettings({ crew, competitions, sport }: { crew: Crew; competitions: Competition[]; sport: SportDef }) {
  return (
    <Panel className="p-4 mb-4" id="league">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <Eyebrow>League and cups</Eyebrow>
          <p className="text-sm text-ink-2 mt-1">
            Link where you play and every fixture, result and player stat gathers on the League tab. The FA doesn&apos;t offer a feed for Full-Time, so the table is pasted in and the link opens the real
            thing.
          </p>
        </div>
        <IconFlag size={20} className="text-pitch shrink-0" />
      </div>

      {competitions.length ? (
        <div className="flex flex-col gap-2 mb-4">
          {competitions.map((comp) => (
            <details key={comp.id} className="rounded-md border border-line bg-panel-2">
              <summary className="px-3 py-2.5 text-sm font-semibold cursor-pointer flex items-center justify-between gap-3 list-none">
                <span className="min-w-0 truncate">
                  {comp.name}
                  <span className="text-ink-3 font-normal"> · {comp.kind}</span>
                </span>
                <Pill tone={comp.standings ? "good" : "neutral"}>{comp.standings ? "Table in" : PROVIDER_LABEL[comp.provider as Provider] ?? "Linked"}</Pill>
              </summary>
              <div className="px-3 pb-3 flex flex-col gap-4">
                <CompetitionFields crewId={crew.id} competition={comp} />
                <StandingsForm crewId={crew.id} competition={comp} crewName={crew.name} />
                <form action={deleteCompetition} className="self-start">
                  <input type="hidden" name="crewId" value={crew.id} />
                  <input type="hidden" name="competitionId" value={comp.id} />
                  <Button type="submit" variant="ghost" className="min-h-9 px-2 text-xs text-red">
                    Remove this competition
                  </Button>
                </form>
              </div>
            </details>
          ))}
        </div>
      ) : null}

      <details className="rounded-md border border-dashed border-line bg-panel-2" open={!competitions.length}>
        <summary className="px-3 py-2.5 text-sm font-semibold cursor-pointer list-none">{competitions.length ? "Add another" : "Link your league or cup"}</summary>
        <div className="px-3 pb-3">
          <CompetitionFields crewId={crew.id} />
        </div>
      </details>

      {sport.finders.length ? (
        <p className="text-xs text-ink-3 mt-3">
          Not in one yet?{" "}
          {sport.finders.map((f, i) => (
            <span key={f.url}>
              {i > 0 ? " · " : ""}
              <a href={f.url} target="_blank" rel="noreferrer noopener" className="underline">
                {f.label}
              </a>
            </span>
          ))}
        </p>
      ) : null}
    </Panel>
  );
}

function CompetitionFields({ crewId, competition }: { crewId: string; competition?: Competition }) {
  return (
    <ActionForm action={saveCompetition} marker="competition-form">
      <input type="hidden" name="crewId" value={crewId} />
      {competition ? <input type="hidden" name="competitionId" value={competition.id} /> : null}
      <div className="grid grid-cols-[1fr_120px] gap-2">
        <Field label="Name">
          <input name="name" defaultValue={competition?.name ?? ""} required minLength={2} maxLength={60} placeholder="Division 3" className="text-sm" />
        </Field>
        <Field label="Type">
          <select name="kind" defaultValue={competition?.kind ?? "league"} className="text-sm">
            <option value="league">League</option>
            <option value="cup">Cup</option>
            <option value="friendly">Friendlies</option>
          </select>
        </Field>
      </div>
      <Field label="Link to the league page" hint="FA Full-Time, Powerleague, or wherever your division lives.">
        <input name="externalUrl" type="url" defaultValue={competition?.externalUrl ?? ""} maxLength={300} placeholder="https://fulltime.thefa.com/…" className="text-sm" autoComplete="off" />
      </Field>
      <Field label="Your team, as the league spells it" hint="So your row is highlighted in the table.">
        <input name="teamName" defaultValue={competition?.teamName ?? ""} maxLength={60} placeholder="Tuesday FC" className="text-sm" autoComplete="off" />
      </Field>
      <SubmitButton variant="secondary" className="self-start" pendingText="Saving…">
        {competition ? "Save" : "Add competition"}
      </SubmitButton>
    </ActionForm>
  );
}

function StandingsForm({ crewId, competition, crewName }: { crewId: string; competition: Competition; crewName: string }) {
  const rows: StandingRow[] = competition.standings ? (JSON.parse(competition.standings) as StandingRow[]) : [];
  return (
    <ActionForm action={saveStandings} marker="standings-form" className="border-t border-line-2 pt-3">
      <input type="hidden" name="crewId" value={crewId} />
      <input type="hidden" name="competitionId" value={competition.id} />
      <Field
        label="The league table"
        hint={rows.length ? `${rows.length} teams, pasted ${competition.standingsUpdatedAt ? fmtDay(competition.standingsUpdatedAt) : "earlier"}. Paste again to update it.` : "Select the table on the league site, copy, paste here. Column order doesn't matter."}
      >
        <textarea
          name="table"
          rows={4}
          className="font-mono text-xs"
          placeholder={`1  ${crewName}  10  7  2  1  28  14  14  23\n2  Hackney Wick FC  10  6  2  2  24  15  9  20`}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="secondary" pendingText="Reading…">
          {rows.length ? "Update the table" : "Paste the table"}
        </SubmitButton>
        {rows.length ? (
          <SubmitButton variant="ghost" name="clear" value="1" pendingText="Clearing…">
            Clear it
          </SubmitButton>
        ) : null}
      </div>
    </ActionForm>
  );
}

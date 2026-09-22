import { nowMs } from "@/lib/clock";
import type { ReactNode } from "react";
import type { Competition, Session } from "@/db/schema";
import { SPORTS, sportOf, type SportKey } from "@/domain/sports";
import { fmtDay, pounds, toLocalInput } from "@/lib/format";
import { SportIcon } from "./icons";
import { Eyebrow, Field } from "./ui";
import { VenueChips } from "./venue-chips";
import { VenueSearch } from "./venue-search";
import type { VenueSuggestion } from "@/domain/venues";

/** Fields for creating or editing a session. Rendered inside an ActionForm. */
export function SessionFields({ defaultSport, session, crewLateDropHours, venues = [], competitions = [] }: { defaultSport: SportKey; session?: Session; crewLateDropHours: number; venues?: VenueSuggestion[]; competitions?: Competition[] }) {
  const sport = sportOf(session?.sport ?? defaultSport);
  const chosen = session?.sport ?? defaultSport;
  const nextWeek = new Date(nowMs() + 7 * 86_400_000);
  nextWeek.setUTCMinutes(0, 0, 0);
  return (
    <>
      <Block eyebrow="What" className="anim-rise">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-semibold text-ink mb-1.5">Sport</legend>
          <div className="grid grid-cols-5 gap-1.5">
            {Object.values(SPORTS).map((s) => (
              <label key={s.key} className="press flex flex-col items-center justify-center gap-1 rounded-md border border-line bg-panel-2 min-h-16 px-1 py-2 cursor-pointer has-checked:border-pitch has-checked:bg-pitch-soft has-checked:text-pitch has-focus-visible:outline-2 has-focus-visible:outline-pitch">
                <input type="radio" name="sport" value={s.key} defaultChecked={s.key === chosen} className="sr-only" />
                <SportIcon sport={s.key} size={22} />
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-center leading-tight">{s.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Title" hint={`e.g. "${sport.label === "Race weekend" ? "British GP" : `${sport.label} ${fmtDay(nextWeek).split(" ")[0]}`}"`}>
          <input name="title" required minLength={2} maxLength={60} defaultValue={session?.title ?? ""} placeholder={sport.label === "Football" ? "Tuesday 5s" : `${sport.label} ${sport.noun}`} />
        </Field>
        <Field label="Notes">
          <textarea name="notes" rows={2} maxLength={500} defaultValue={session?.notes ?? ""} placeholder="Bibs are in Josh's car. Bring change for the barrier." />
        </Field>
      </Block>

      {competitions.length ? (
        <Block eyebrow="Fixture" className="anim-rise-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Competition" hint="League, cup or nothing for a friendly.">
              <select name="competitionId" defaultValue={session?.competitionId ?? ""}>
                <option value="">No competition</option>
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Round" hint="Optional. Cup round or matchday.">
              <input name="round" maxLength={40} defaultValue={session?.round ?? ""} placeholder="Quarter-final" />
            </Field>
          </div>
          <Field label="Opponent" hint="Leave empty for a kickabout with no opposition.">
            <input name="opponent" maxLength={60} defaultValue={session?.opponent ?? ""} placeholder="Hackney Wick FC" autoComplete="off" />
          </Field>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-semibold text-ink mb-1.5">Home or away</legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["home", "Home"],
                  ["away", "Away"],
                  ["neutral", "Neutral"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="press flex items-center justify-center gap-2 rounded-md border border-line bg-panel-2 min-h-11 px-2 cursor-pointer text-sm font-semibold has-checked:border-pitch has-checked:bg-pitch-soft has-checked:text-pitch">
                  <input type="radio" name="homeAway" value={value} defaultChecked={(session?.homeAway ?? "home") === value} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </Block>
      ) : null}

      <Block eyebrow="When and where" className="anim-rise-2">
        <div className="grid grid-cols-2 gap-3">
          <Field label="When">
            <input name="startsAt" type="datetime-local" required defaultValue={toLocalInput(session?.startsAt ?? nextWeek)} />
          </Field>
          <Field label="Length (min)">
            <input name="durationMin" type="number" min={15} max={720} step={5} inputMode="numeric" defaultValue={session?.durationMin ?? sport.defaultDurationMin} />
          </Field>
        </div>
        <VenueChips venues={venues} />
        <VenueSearch defaultValue={session?.venueName ?? ""} hint={sport.venueHint} />
        <Field label="Address or postcode" hint="Optional. Shows on the share card.">
          <input name="venueAddress" maxLength={120} defaultValue={session?.venueAddress ?? ""} autoComplete="off" />
        </Field>
      </Block>

      <Block eyebrow="Money and spots" className="anim-rise-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Spots">
            <input name="capacity" type="number" min={1} max={60} required inputMode="numeric" defaultValue={session?.capacity ?? sport.defaultCapacity} className="display text-2xl font-bold tnum" />
          </Field>
          <Field label="Cost (£)">
            <input name="cost" inputMode="decimal" placeholder="0" defaultValue={session ? (session.costPence ? pounds(session.costPence).slice(1) : "") : sport.defaultCostPence ? pounds(sport.defaultCostPence).slice(1) : ""} className="display text-2xl font-bold tnum" />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-semibold text-ink mb-1.5">How the cost works</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="press flex items-start gap-2 rounded-md border border-line bg-panel-2 px-3 py-2.5 has-checked:border-pitch has-checked:bg-pitch-soft cursor-pointer">
              <input type="radio" name="costMode" value="total" defaultChecked={(session?.costMode ?? sport.defaultCostMode) === "total"} className="mt-0.5" />
              <span className="text-sm">
                <strong>Split it</strong>
                <br />
                <span className="text-ink-2">Whole booking, shared by who plays</span>
              </span>
            </label>
            <label className="press flex items-start gap-2 rounded-md border border-line bg-panel-2 px-3 py-2.5 has-checked:border-pitch has-checked:bg-pitch-soft cursor-pointer">
              <input type="radio" name="costMode" value="per_head" defaultChecked={(session?.costMode ?? sport.defaultCostMode) === "per_head"} className="mt-0.5" />
              <span className="text-sm">
                <strong>Per head</strong>
                <br />
                <span className="text-ink-2">Everyone pays this amount</span>
              </span>
            </label>
          </div>
        </fieldset>
        <Field label="Commit by" hint={`Optional. After this, dropping out counts as late. Otherwise the crew's ${crewLateDropHours}-hour window applies.`}>
          <input name="rsvpDeadlineAt" type="datetime-local" defaultValue={session?.rsvpDeadlineAt ? toLocalInput(session.rsvpDeadlineAt) : ""} />
        </Field>
      </Block>
    </>
  );
}

function Block({ eyebrow, className, children }: { eyebrow: string; className?: string; children: ReactNode }) {
  return (
    <section className={["surface p-4 flex flex-col gap-4", className].filter(Boolean).join(" ")}>
      <Eyebrow>{eyebrow}</Eyebrow>
      {children}
    </section>
  );
}

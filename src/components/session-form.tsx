import { nowMs } from "@/lib/clock";
import type { Session } from "@/db/schema";
import { SPORTS, sportOf, type SportKey } from "@/domain/sports";
import { fmtDay, pounds, toLocalInput } from "@/lib/format";
import { Field } from "./ui";

/** Fields for creating or editing a session. Rendered inside an ActionForm. */
export function SessionFields({ defaultSport, session, crewLateDropHours }: { defaultSport: SportKey; session?: Session; crewLateDropHours: number }) {
  const sport = sportOf(session?.sport ?? defaultSport);
  const nextWeek = new Date(nowMs() + 7 * 86_400_000);
  nextWeek.setUTCMinutes(0, 0, 0);
  return (
    <>
      <Field label="Sport">
        <select name="sport" defaultValue={session?.sport ?? defaultSport}>
          {Object.values(SPORTS).map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Title" hint={`e.g. "${sport.label === "Race weekend" ? "British GP" : `${sport.label} ${fmtDay(nextWeek).split(" ")[0]}`}"`}>
        <input name="title" required minLength={2} maxLength={60} defaultValue={session?.title ?? ""} placeholder={sport.label === "Football" ? "Tuesday 5s" : `${sport.label} ${sport.noun}`} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="When">
          <input name="startsAt" type="datetime-local" required defaultValue={toLocalInput(session?.startsAt ?? nextWeek)} />
        </Field>
        <Field label="Length (min)">
          <input name="durationMin" type="number" min={15} max={720} step={5} inputMode="numeric" defaultValue={session?.durationMin ?? sport.defaultDurationMin} />
        </Field>
      </div>
      <Field label="Venue" hint={sport.venueHint}>
        <input name="venueName" maxLength={80} defaultValue={session?.venueName ?? ""} />
      </Field>
      <Field label="Address or postcode" hint="Optional. Shows on the share card.">
        <input name="venueAddress" maxLength={120} defaultValue={session?.venueAddress ?? ""} autoComplete="off" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Spots">
          <input name="capacity" type="number" min={1} max={60} required inputMode="numeric" defaultValue={session?.capacity ?? sport.defaultCapacity} />
        </Field>
        <Field label="Cost (£)">
          <input name="cost" inputMode="decimal" placeholder="0" defaultValue={session ? (session.costPence ? pounds(session.costPence).slice(1) : "") : sport.defaultCostPence ? pounds(sport.defaultCostPence).slice(1) : ""} />
        </Field>
      </div>
      <Field label="How the cost works">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 border border-line rounded-sm px-3 py-2.5 has-checked:border-pitch has-checked:bg-pitch-soft cursor-pointer">
            <input type="radio" name="costMode" value="total" defaultChecked={(session?.costMode ?? sport.defaultCostMode) === "total"} />
            <span className="text-sm">
              <strong>Split it</strong>
              <br />
              <span className="text-ink-2">Whole booking, shared by who plays</span>
            </span>
          </label>
          <label className="flex items-center gap-2 border border-line rounded-sm px-3 py-2.5 has-checked:border-pitch has-checked:bg-pitch-soft cursor-pointer">
            <input type="radio" name="costMode" value="per_head" defaultChecked={(session?.costMode ?? sport.defaultCostMode) === "per_head"} />
            <span className="text-sm">
              <strong>Per head</strong>
              <br />
              <span className="text-ink-2">Everyone pays this amount</span>
            </span>
          </label>
        </div>
      </Field>
      <Field label="Commit by" hint={`Optional. After this, dropping out counts as late. Otherwise the crew's ${crewLateDropHours}-hour window applies.`}>
        <input name="rsvpDeadlineAt" type="datetime-local" defaultValue={session?.rsvpDeadlineAt ? toLocalInput(session.rsvpDeadlineAt) : ""} />
      </Field>
      <Field label="Notes">
        <textarea name="notes" rows={2} maxLength={500} defaultValue={session?.notes ?? ""} placeholder="Bibs are in Sam's car. Bring change for the barrier." />
      </Field>
    </>
  );
}

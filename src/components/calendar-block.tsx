import type { Crew } from "@/db/schema";
import { Eyebrow, Panel } from "./ui";
import { IconCalendar } from "./icons";
import { ShareButtons } from "./share";

/** Subscribe-in-your-calendar block for crew settings. Works in Apple, Google and Outlook via webcal/https. */
export function CalendarBlock({ crew, appUrl }: { crew: Crew; appUrl: string }) {
  if (!crew.calendarToken) return null;
  const https = `${appUrl}/cal/${crew.calendarToken}.ics`;
  const webcal = https.replace(/^https?:/, "webcal:");
  return (
    <Panel className="p-4 mb-4">
      <Eyebrow className="flex items-center gap-1.5 mb-2">
        <IconCalendar size={14} /> Calendar
      </Eyebrow>
      <p className="text-sm text-ink-2">Every session lands in your phone&apos;s calendar and updates itself. Titles, times and venues only; no names, no money.</p>
      <div className="flex flex-wrap gap-2 mt-3">
        <a href={webcal} className="press inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-md font-semibold text-[15px] bg-pitch text-pitch-ink">
          Subscribe
        </a>
        <ShareButtons text={`${crew.name} sessions calendar:`} url={https} label="Send link" compact crewId={crew.id} what="invite" />
      </div>
      <code className="block mt-3 text-xs bg-ground-2 border border-line rounded-sm px-2 py-1.5 wrap-anywhere">{https}</code>
    </Panel>
  );
}

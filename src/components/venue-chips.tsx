"use client";

import type { VenueSuggestion } from "@/domain/venues";

/** Tap a venue to fill the name and address fields. Pure DOM, no state to keep in sync. */
export function VenueChips({ venues }: { venues: VenueSuggestion[] }) {
  if (venues.length === 0) return null;
  function pick(v: VenueSuggestion) {
    const form = document.querySelector<HTMLFormElement>("form[data-session-form]");
    if (!form) return;
    const name = form.elements.namedItem("venueName") as HTMLInputElement | null;
    const addr = form.elements.namedItem("venueAddress") as HTMLInputElement | null;
    if (name) name.value = v.name;
    if (addr && v.address) addr.value = v.address;
    name?.focus();
  }
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1" aria-label="Recent and suggested venues">
      {venues.map((v) => (
        <button key={v.name} type="button" onClick={() => pick(v)} className="press shrink-0 rounded-full border border-line bg-panel-2 px-3 h-8 text-xs font-semibold whitespace-nowrap hover:border-ink-3">
          {v.name}
          {v.count > 0 ? <span className="text-ink-3 font-normal"> · {v.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

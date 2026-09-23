"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PlaceHit } from "@/domain/places";
import type { CourseHit } from "@/domain/courses";
import { courseLabel, hitDetail } from "@/domain/courses";
import { IconGolf, IconPin } from "@/components/icons";

type Hit = PlaceHit & { course?: CourseHit };

/**
 * Venue name input with an address finder underneath. Typing looks the place up; picking a
 * result fills the name and the address field in the same form. Plain typing still works when
 * the lookup is slow or offline.
 */
export function VenueSearch({ defaultValue = "", hint }: { defaultValue?: string; hint?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [found, setHits] = useState<Hit[]>([]);
  const [course, setCourse] = useState<CourseHit | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [picked, setPicked] = useState(defaultValue);
  // Results are only shown while the typed value is still a search and not the picked venue.
  const hits = value.trim().length >= 3 && value.trim() !== picked ? found : [];
  const abort = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    const term = value.trim();
    if (term.length < 3 || term === picked) return;
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      const form = inputRef.current?.form;
      const sport = form ? String(new FormData(form).get("sport") ?? "") : "";
      try {
        // Golf: the course database first (it carries the card), then places for anything else.
        const [places, courses] = await Promise.all([
          fetch(`/api/places?q=${encodeURIComponent(term)}&sport=${encodeURIComponent(sport)}`, { signal: ac.signal }).then((r) => r.json() as Promise<{ hits?: PlaceHit[] }>),
          sport === "golf" ? fetch(`/api/courses/search?q=${encodeURIComponent(term)}`, { signal: ac.signal }).then((r) => r.json() as Promise<{ hits?: CourseHit[] }>) : Promise.resolve({ hits: [] as CourseHit[] }),
        ]);
        if (!ac.signal.aborted) {
          const courseHits: Hit[] = (courses.hits ?? []).map((c) => ({ name: c.club && c.club !== c.name ? `${c.club}, ${c.name}` : c.name, address: c.address, course: c }));
          const seen = new Set(courseHits.map((h) => h.name.toLowerCase()));
          setHits([...courseHits, ...(places.hits ?? []).filter((p) => !seen.has(p.name.toLowerCase()))].slice(0, 8));
          // Only pop the list if the venue field still has focus; otherwise it lands on top of the next field.
          setOpen(document.activeElement === inputRef.current);
          setActive(-1);
        }
      } catch {
        /* aborted or offline: the typed value stands */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [value, picked]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onPicked = (e: Event) => {
      setPicked(String((e as CustomEvent<string>).detail ?? ""));
      setCourse(null);
    };
    el.addEventListener("rc:venue-picked", onPicked);
    return () => el.removeEventListener("rc:venue-picked", onPicked);
  }, []);

  function pick(h: Hit) {
    setPicked(h.name);
    setValue(h.name);
    setHits([]);
    setOpen(false);
    setCourse(h.course ?? null);
    const addr = inputRef.current?.form?.elements.namedItem("venueAddress") as HTMLInputElement | null;
    if (addr && h.address) addr.value = h.address;
  }

  return (
    <label className="flex flex-col gap-1.5 relative">
      <span className="text-sm font-semibold text-ink">Venue</span>
      <input
        ref={inputRef}
        name="venueName"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || !hits.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(hits.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(hits[active]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        maxLength={80}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      <input type="hidden" name="courseRef" value={course ? `${course.source}:${course.ref}` : ""} />
      {course ? (
        <span className="text-xs text-pitch inline-flex items-center gap-1">
          <IconGolf size={13} /> {course.holes.length ? `Card loads: ${courseLabel(course)} · ${hitDetail(course)}` : `Card loads when you save: ${courseLabel(course)}`}
        </span>
      ) : hint ? (
        <span className="text-xs text-ink-3">{hint}</span>
      ) : null}
      {open && hits.length ? (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-[calc(100%-1.25rem)] z-30 mt-1 rounded-md border border-line bg-panel shadow-lg overflow-hidden anim-rise">
          {hits.map((h, i) => (
            <li
              key={`${h.course ? `${h.course.source}:${h.course.ref}` : "place"}|${h.name}|${h.address}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(h);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex items-start gap-2 px-3 py-2 cursor-pointer text-sm ${i === active ? "bg-pitch-soft" : ""}`}
            >
              {h.course ? <IconGolf size={15} className="mt-0.5 text-pitch shrink-0" /> : <IconPin size={15} className="mt-0.5 text-ink-3 shrink-0" />}
              <span className="min-w-0">
                <span className="font-semibold block truncate">{h.name}</span>
                <span className="text-xs text-ink-3 block truncate">{h.course ? `${h.course.tee ? `${h.course.tee} tees · ` : ""}${hitDetail(h.course)}${h.address ? ` · ${h.address}` : ""}` : h.address}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  );
}

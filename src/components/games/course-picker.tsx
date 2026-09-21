"use client";

import { useEffect, useRef, useState } from "react";
import type { CourseHit } from "@/domain/courses";
import { CourseError, coursePar, courseLabel, holesFromLines } from "@/domain/courses";
import type { Hole } from "@/domain/stableford";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { IconCamera, IconSearch } from "@/components/icons";
import { Field, cls } from "@/components/ui";
import { setCourse } from "@/lib/actions/games";

type Draft = { name: string; club: string; tee: string; holes: Hole[]; mode: "manual" | "scan"; warnings: string[] };

/**
 * Organiser picks where the pars and stroke indexes come from: search the library and the
 * course-data provider, scan a photo of the paper card, or type the two rows off it.
 */
export function CoursePicker({ sessionId, providerOn, scanOn }: { sessionId: string; providerOn: boolean; scanOn: boolean }) {
  const [q, setQ] = useState("");
  const [found, setHits] = useState<CourseHit[]>([]);
  // Results only count while the query that produced them is still long enough to search.
  const hits = q.trim().length >= 2 ? found : [];
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      setSearching(true);
      try {
        const res = await fetch(`/api/courses/search?q=${encodeURIComponent(term)}`, { signal: ac.signal });
        const body = (await res.json()) as { hits?: CourseHit[] };
        if (!ac.signal.aborted) setHits(body.hits ?? []);
      } catch {
        /* aborted or offline: keep what we had */
      } finally {
        if (!ac.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function scan(file: File) {
    setError(null);
    const fd = new FormData();
    fd.append("image", file);
    setSearching(true);
    try {
      const res = await fetch("/api/courses/scan", { method: "POST", body: fd });
      const body = (await res.json()) as { card?: Omit<Draft, "mode" | "warnings">; warnings?: string[]; error?: string };
      if (!res.ok || !body.card) setError(body.error ?? "Couldn't read that card.");
      else setDraft({ name: body.card.name, club: body.card.club, tee: body.card.tee, holes: body.card.holes, mode: "scan", warnings: body.warnings ?? [] });
    } catch {
      setError("Upload failed. Check your signal and try again.");
    } finally {
      setSearching(false);
    }
  }

  function typeIn(fd: FormData) {
    setError(null);
    try {
      const holes = holesFromLines(String(fd.get("pars") ?? ""), String(fd.get("si") ?? ""));
      setDraft({ name: String(fd.get("name") ?? "").trim(), club: "", tee: String(fd.get("tee") ?? "").trim(), holes, mode: "manual", warnings: fd.get("si") ? [] : ["No stroke indexes given, so they were filled in by par. Fix any that differ from the card."] });
    } catch (e) {
      setError(e instanceof CourseError ? e.message : "Couldn't read those numbers.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Find the course" hint={providerOn ? "Cards other crews have used, then the course database." : "Cards other crews have used. Not there? Scan or type it in below and it's saved for the next crew."}>
        <div className="relative">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Richmond Park, Sundridge, Coombe Hill…" autoComplete="off" className="pl-9" aria-label="Search golf courses" />
        </div>
      </Field>
      {hits.length ? (
        <ul className="flex flex-col divide-y divide-line-2 rounded-md border border-line bg-panel-2" aria-label="Matching courses">
          {hits.map((h) => (
            <li key={`${h.source}:${h.ref}`} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{courseLabel(h)}</div>
                <div className="text-xs text-ink-3 truncate">
                  {h.holes.length} holes · par {coursePar(h.holes)}
                  {h.address ? ` · ${h.address}` : ""}
                  {h.source === "library" ? ` · used ${h.uses}×` : " · course database"}
                </div>
              </div>
              <ActionForm action={setCourse} className="shrink-0 gap-0">
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="mode" value={h.source} />
                <input type="hidden" name="ref" value={h.ref} />
                <SubmitButton variant="secondary" className="min-h-9 px-3 text-sm" pendingText="Setting…">
                  Use
                </SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      ) : q.trim().length >= 2 && !searching ? (
        <p className="text-sm text-ink-2">Nothing matched. Scan the card or type the pars in and it&apos;ll be here next time.</p>
      ) : null}

      <div className={cls("grid gap-3", scanOn ? "sm:grid-cols-2" : "")}>
        {scanOn ? (
          <label className="press flex items-center gap-3 rounded-md border border-dashed border-line bg-panel-2 px-3 py-3 cursor-pointer hover:border-ink-3">
            <IconCamera size={22} className="text-pitch shrink-0" />
            <span className="text-sm">
              <strong>Scan the paper card</strong>
              <br />
              <span className="text-ink-2">Photo of the scorecard. You check it before it&apos;s used.</span>
            </span>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && scan(e.target.files[0])} />
          </label>
        ) : null}
        <form
          className="flex flex-col gap-2 rounded-md border border-line bg-panel-2 px-3 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            typeIn(new FormData(e.currentTarget));
          }}
        >
          <div className="text-sm font-semibold">Type it off the card</div>
          <div className="grid grid-cols-[1fr_88px] gap-2">
            <input name="name" placeholder="Course name" maxLength={80} aria-label="Course name" className="text-sm" />
            <input name="tee" placeholder="Tees" maxLength={20} aria-label="Tee set" className="text-sm" />
          </div>
          <input name="pars" placeholder="Pars: 4 4 3 5 4 4 3 4 5 4 3 4 5 4 4 3 4 5" inputMode="numeric" aria-label="Pars in hole order" className="font-mono text-sm" required />
          <input name="si" placeholder="Stroke index: 7 3 15 1 11 9 17 5 13 …" inputMode="numeric" aria-label="Stroke indexes in hole order" className="font-mono text-sm" />
          <button type="submit" className="press self-start rounded-md border border-line px-3 min-h-9 text-sm font-semibold hover:border-ink-3">
            Preview card
          </button>
        </form>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      ) : null}
      {draft ? <DraftCard sessionId={sessionId} draft={draft} onChange={setDraft} /> : null}
    </div>
  );
}

function DraftCard({ sessionId, draft, onChange }: { sessionId: string; draft: Draft; onChange: (d: Draft) => void }) {
  const setHole = (i: number, key: "par" | "strokeIndex", v: string) => {
    const holes = draft.holes.map((h, k) => (k === i ? { ...h, [key]: Number(v) || 0 } : h));
    onChange({ ...draft, holes });
  };
  return (
    <ActionForm action={setCourse} className="rounded-md border border-pitch/40 bg-pitch-soft/40 p-3">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="mode" value={draft.mode} />
      <input type="hidden" name="holes" value={JSON.stringify(draft.holes)} />
      <input type="hidden" name="club" value={draft.club} />
      <div className="flex items-center justify-between gap-3">
        <div className="eyebrow">{draft.mode === "scan" ? "Read from your photo" : "Typed card"}</div>
        <span className="eyebrow tnum">
          {draft.holes.length} holes · par {coursePar(draft.holes)}
        </span>
      </div>
      {draft.warnings.map((w) => (
        <p key={w} className="text-xs text-card-ink bg-card-soft rounded px-2 py-1">
          {w}
        </p>
      ))}
      <div className="grid grid-cols-[1fr_88px] gap-2">
        <input name="name" value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} placeholder="Course name" maxLength={80} required aria-label="Course name" className="text-sm" />
        <input name="tee" value={draft.tee} onChange={(e) => onChange({ ...draft, tee: e.target.value })} placeholder="Tees" maxLength={20} aria-label="Tee set" className="text-sm" />
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs font-mono tnum">
          <thead>
            <tr className="eyebrow">
              <th className="text-left pr-2 font-normal">Hole</th>
              {draft.holes.map((h) => (
                <th key={h.number} className="px-0.5 font-normal">
                  {h.number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pr-2">Par</td>
              {draft.holes.map((h, i) => (
                <td key={h.number} className="px-0.5">
                  <input value={h.par || ""} onChange={(e) => setHole(i, "par", e.target.value)} inputMode="numeric" className="w-9 px-0 text-center min-h-9 py-1 font-mono" aria-label={`Hole ${h.number} par`} />
                </td>
              ))}
            </tr>
            <tr>
              <td className="pr-2">SI</td>
              {draft.holes.map((h, i) => (
                <td key={h.number} className="px-0.5">
                  <input value={h.strokeIndex || ""} onChange={(e) => setHole(i, "strokeIndex", e.target.value)} inputMode="numeric" className="w-9 px-0 text-center min-h-9 py-1 font-mono" aria-label={`Hole ${h.number} stroke index`} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="save" value="1" defaultChecked />
        Save to the course library so the next crew finds it
      </label>
      <SubmitButton pendingText="Setting…" className="self-start">
        Use this card
      </SubmitButton>
    </ActionForm>
  );
}

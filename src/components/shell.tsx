import Link from "next/link";
import type { ReactNode } from "react";
import type { Crew, User } from "@/db/schema";
import { sportOf } from "@/domain/sports";
import { Avatar } from "./avatar";
import { cls } from "./ui";
import { Wordmark } from "./logo";
import { SandboxBanner } from "./sandbox-banner";
import { IconCalendar, IconCoins, IconHome, IconPeople, IconTrophy, SportIcon } from "./icons";

const tabs = [
  { key: "", label: "Home", Icon: IconHome },
  { key: "sessions", label: "Sessions", Icon: IconCalendar },
  { key: "table", label: "Table", Icon: IconTrophy },
  { key: "money", label: "Money", Icon: IconCoins },
  { key: "settings", label: "Crew", Icon: IconPeople },
];

export function CrewShell({ crew, user, active, children, wide = false }: { crew: Crew; user: User; active: string; children: ReactNode; wide?: boolean }) {
  const sport = sportOf(crew.sport);
  const width = wide ? "max-w-5xl" : "max-w-3xl";
  return (
    <div className="flex flex-col min-h-full">
      <SandboxBanner />
      <header className="sticky top-0 z-20 bg-ground/85 backdrop-blur-md border-b border-line">
        <div className={cls(width, "mx-auto px-4 h-14 flex items-center justify-between gap-3")}>
          <Link href={`/crew/${crew.slug}`} className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-ink" style={{ background: `oklch(0.45 0.13 ${crew.hue} / 0.55)` }}>
              <SportIcon sport={crew.sport} size={18} />
            </span>
            <span className="display font-bold uppercase text-xl truncate leading-none">{crew.name}</span>
            <span className="eyebrow hidden sm:inline">{sport.label}</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-0.5" aria-label="Crew">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`/crew/${crew.slug}${t.key ? `/${t.key}` : ""}`}
                aria-current={active === t.key ? "page" : undefined}
                className={cls("px-3 h-9 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold press", active === t.key ? "bg-ink text-ground" : "text-ink-2 hover:bg-ground-2")}
              >
                <t.Icon size={16} />
                {t.label}
              </Link>
            ))}
          </nav>
          <Link href="/me" className="flex items-center gap-2 shrink-0" aria-label="Your account">
            <Avatar name={user.name} hue={user.hue} size={32} />
          </Link>
        </div>
      </header>
      <main className={cls("flex-1 w-full mx-auto px-4 py-5 pb-28 sm:pb-12", width)}>{children}</main>
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-panel/90 backdrop-blur-md border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label="Crew">
        <div className="grid grid-cols-5">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/crew/${crew.slug}${t.key ? `/${t.key}` : ""}`}
              aria-current={active === t.key ? "page" : undefined}
              className={cls("h-[60px] flex flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] press", active === t.key ? "text-pitch" : "text-ink-3")}
            >
              <t.Icon size={22} strokeWidth={active === t.key ? 2.2 : 1.75} />
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Crew header band: colour wash and pitch lines behind a title. Used on crew home and settings. */
export function CrewBand({ crew, children }: { crew: Crew; children: ReactNode }) {
  return (
    <div className="relative -mx-4 px-4 pt-6 pb-5 mb-2 overflow-hidden">
      <div className="absolute inset-0 pitch-lines" aria-hidden="true" />
      <div className="absolute inset-0 -z-10" style={{ background: `radial-gradient(600px 220px at 20% 0%, oklch(0.5 0.14 ${crew.hue} / 0.35), transparent 70%)` }} aria-hidden="true" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function PlainShell({ children, user, wide = false }: { children: ReactNode; user?: User | null; wide?: boolean }) {
  const width = wide ? "max-w-6xl" : "max-w-3xl";
  return (
    <div className="flex flex-col min-h-full">
      <SandboxBanner />
      <header className="border-b border-line bg-ground/85 backdrop-blur-md sticky top-0 z-20">
        <div className={cls(width, "mx-auto px-4 h-14 flex items-center justify-between")}>
          <Link href="/" aria-label="Roll Call home">
            <Wordmark size={26} />
          </Link>
          {user ? (
            <Link href="/home" className="flex items-center gap-2 text-sm font-semibold">
              <Avatar name={user.name} hue={user.hue} size={30} />
              <span className="hidden sm:inline">{user.name}</span>
            </Link>
          ) : (
            <Link href="/signin" className="text-sm font-semibold text-ink-2">
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main className={cls("flex-1 w-full mx-auto px-4 py-6", width)}>{children}</main>
    </div>
  );
}

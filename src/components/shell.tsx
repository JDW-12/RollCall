import Link from "next/link";
import type { ReactNode } from "react";
import type { Crew, User } from "@/db/schema";
import { sportOf } from "@/domain/sports";
import { Avatar } from "./avatar";
import { cls } from "./ui";
import { Wordmark } from "./logo";
import { SandboxBanner } from "./sandbox-banner";

const tabs = [
  { key: "", label: "Home" },
  { key: "sessions", label: "Sessions" },
  { key: "table", label: "Table" },
  { key: "money", label: "Money" },
  { key: "settings", label: "Crew" },
];

export function CrewShell({ crew, user, active, children }: { crew: Crew; user: User; active: string; children: ReactNode }) {
  const sport = sportOf(crew.sport);
  return (
    <div className="flex flex-col min-h-full">
      <SandboxBanner />
      <header className="sticky top-0 z-20 bg-ground/95 backdrop-blur border-b border-line">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href={`/crew/${crew.slug}`} className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: `oklch(0.6 0.16 ${crew.hue})` }} aria-hidden />
            <span className="display font-bold uppercase text-xl truncate">{crew.name}</span>
            <span className="eyebrow hidden sm:inline">{sport.label}</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1" aria-label="Crew">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`/crew/${crew.slug}${t.key ? `/${t.key}` : ""}`}
                aria-current={active === t.key ? "page" : undefined}
                className={cls("px-3 h-9 inline-flex items-center rounded-sm text-sm font-semibold", active === t.key ? "bg-ink text-ground" : "text-ink-2 hover:bg-ground-2")}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <Link href="/me" className="flex items-center gap-2 shrink-0" aria-label="Your account">
            <Avatar name={user.name} hue={user.hue} size={32} />
          </Link>
        </div>
      </header>
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-5 pb-24 sm:pb-10">{children}</main>
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-panel border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label="Crew">
        <div className="grid grid-cols-5">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/crew/${crew.slug}${t.key ? `/${t.key}` : ""}`}
              aria-current={active === t.key ? "page" : undefined}
              className={cls("h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold uppercase tracking-wide", active === t.key ? "text-pitch-deep" : "text-ink-3")}
            >
              <span className={cls("w-6 h-1 rounded-full", active === t.key ? "bg-pitch" : "bg-transparent")} aria-hidden />
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PlainShell({ children, user, wide = false }: { children: ReactNode; user?: User | null; wide?: boolean }) {
  const width = wide ? "max-w-6xl" : "max-w-3xl";
  return (
    <div className="flex flex-col min-h-full">
      <SandboxBanner />
      <header className="border-b border-line">
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

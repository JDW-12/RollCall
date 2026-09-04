import { cls } from "./ui";

/** The mark: a tick inside a rounded square, the same one used for the app icon. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={cls("shrink-0", className)}>
      <rect width="64" height="64" rx="14" fill="var(--pitch)" />
      <path d="M15 33l10 10 25-25" fill="none" stroke="var(--pitch-ink)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={cls("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      <span className="display font-extrabold uppercase tracking-tight leading-none" style={{ fontSize: size * 0.95 }}>
        Roll Call
      </span>
    </span>
  );
}

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "press inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-md font-semibold text-[15px] leading-none select-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-pitch text-pitch-ink hover:bg-pitch-deep shadow-[0_8px_24px_-12px_var(--pitch-glow)]",
  secondary: "border border-line bg-panel-2 text-ink hover:border-ink-3",
  ghost: "text-ink-2 hover:bg-ground-2",
  danger: "border border-red/60 text-red hover:bg-red-soft",
};

export function cls(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...props} className={cls(base, variants[variant], className)} />;
}

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={cls(base, variants[variant], className)} />;
}

export function Panel({ className, children, as: Tag = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" }) {
  return <Tag className={cls("surface", className)}>{children}</Tag>;
}

export function Pill({ tone = "neutral", children, className }: { tone?: "neutral" | "good" | "warn" | "bad" | "ink"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-ground-2 text-ink-2 border border-line",
    good: "bg-pitch-soft text-pitch",
    warn: "bg-card-soft text-card-ink",
    bad: "bg-red-soft text-red",
    ink: "bg-ink text-ground",
  };
  return <span className={cls("inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono text-[11px] tracking-wide uppercase whitespace-nowrap", tones[tone], className)}>{children}</span>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cls("eyebrow", className)}>{children}</div>;
}

export function PageTitle({ eyebrow, title, action, children }: { eyebrow?: ReactNode; title: ReactNode; action?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-2 mb-5">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-[40px] font-bold uppercase leading-[0.95] wrap-anywhere">{title}</h1>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className="text-ink-2">{children}</div> : null}
    </header>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
    </label>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-line rounded-md p-6 text-center flex flex-col items-center gap-3">
      <div className="display text-2xl font-bold uppercase">{title}</div>
      {body ? <p className="text-ink-2 max-w-[42ch]">{body}</p> : null}
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "text-pitch" : tone === "warn" ? "text-card-ink" : tone === "bad" ? "text-red" : "text-ink";
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="eyebrow">{label}</span>
      <span className={cls("display text-[34px] font-bold leading-none tnum", color)}>{value}</span>
      {sub ? <span className="text-xs text-ink-3">{sub}</span> : null}
    </div>
  );
}

export function Notice({ tone = "good", children }: { tone?: "good" | "warn" | "bad" | "neutral"; children: ReactNode }) {
  const tones = {
    good: "bg-pitch-soft text-pitch border-pitch/30",
    warn: "bg-card-soft text-card-ink border-card/40",
    bad: "bg-red-soft text-red border-red/30",
    neutral: "bg-ground-2 text-ink-2 border-line",
  };
  return <div className={cls("border rounded-sm px-3 py-2.5 text-sm", tones[tone])}>{children}</div>;
}

export function Divider() {
  return <hr className="border-0 border-t border-line my-1" />;
}

import { cls } from "./ui";

/** Last five sessions as dots: played (green), missed (red), skipped (hollow). */
export function FormDots({ history, className }: { history: ("played" | "missed" | "skip")[]; className?: string }) {
  const last = history.slice(-5);
  const pad = Array.from({ length: 5 - last.length }, () => "none" as const);
  return (
    <span className={cls("inline-flex items-center gap-1", className)} aria-label={`Last five: ${last.join(", ")}`}>
      {[...pad, ...last].map((h, i) => (
        <span
          key={i}
          className={cls(
            "w-2 h-2 rounded-full",
            h === "played" && "bg-pitch",
            h === "missed" && "bg-red",
            h === "skip" && "border border-ink-3",
            h === "none" && "border border-line",
          )}
        />
      ))}
    </span>
  );
}

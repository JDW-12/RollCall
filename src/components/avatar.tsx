import { initials } from "@/lib/format";
import { cls } from "./ui";

export function Avatar({ name, hue, size = 36, className }: { name: string; hue: number; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cls("inline-flex items-center justify-center rounded-full font-display font-bold shrink-0", className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: `oklch(0.82 0.09 ${hue})`,
        color: `oklch(0.28 0.08 ${hue})`,
      }}
    >
      {initials(name)}
    </span>
  );
}

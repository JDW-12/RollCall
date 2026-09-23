import { cls } from "@/components/ui";

/** Tee markers are colour-coded on every course; the card's tee name tells us which to draw. */
const TEE: Record<string, string> = {
  white: "#f4f2ea",
  yellow: "#f2c230",
  red: "#d9342b",
  blue: "#2b6fd1",
  black: "#1c1c1c",
  green: "#2f8f46",
  gold: "#c9a13b",
  orange: "#ef8a2b",
  purple: "#7a4bd1",
  silver: "#b8bec6",
};

export function teeColour(tee: string | null | undefined): string | null {
  const key = (tee ?? "").trim().toLowerCase().split(/\s+/)[0];
  return TEE[key] ?? null;
}

/** A tee-marker ball: the tee's own colour with a ring so white still reads on paper. */
export function TeeMarker({ tee, size = 12, className }: { tee: string | null | undefined; size?: number; className?: string }) {
  const c = teeColour(tee);
  if (!c) return null;
  return (
    <span
      aria-hidden="true"
      className={cls("inline-block rounded-full shrink-0 align-middle", className)}
      style={{ width: size, height: size, background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.7), transparent 45%), ${c}`, boxShadow: "0 0 0 1px rgba(0,0,0,0.35), inset 0 -2px 3px rgba(0,0,0,0.25)" }}
    />
  );
}

/** Flag on a green: the golf emblem used on cards and headers in place of the generic sport icon. */
export function FlagEmblem({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <ellipse cx="16" cy="26" rx="12" ry="4" fill="var(--gf-green, #45a85a)" />
      <ellipse cx="16" cy="25.4" rx="9" ry="2.6" fill="var(--gf-green-2, #57bc6b)" />
      <ellipse cx="18" cy="25.6" rx="1.6" ry="0.7" fill="#0b1a12" />
      <rect x="17.3" y="5" width="1.4" height="20.6" rx="0.7" fill="var(--gf-pole, #f2efe6)" />
      <path d="M18.6 5.4 L28 8.6 L18.6 12 Z" fill="var(--gf-flag, #e2463a)" />
    </svg>
  );
}

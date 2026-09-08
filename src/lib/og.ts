import "server-only";
import fs from "node:fs";
import path from "node:path";

/** Fonts for share-card images. Read once from the repo so the cards match the app's display face. */
let cached: { name: string; data: Buffer; weight: 700 | 800; style: "normal" }[] | null = null;

export function ogFonts() {
  if (cached) return cached;
  const dir = path.join(process.cwd(), "src", "assets", "fonts");
  cached = [
    { name: "Barlow Condensed", data: fs.readFileSync(path.join(dir, "BarlowCondensed-Bold.ttf")), weight: 700, style: "normal" },
    { name: "Barlow Condensed", data: fs.readFileSync(path.join(dir, "BarlowCondensed-ExtraBold.ttf")), weight: 800, style: "normal" },
  ];
  return cached;
}

/**
 * Share-card palette: the dark floodlit theme, as literal hex because satori
 * cannot read CSS variables. Keep in step with the dark tokens in globals.css.
 */
export const OG = {
  ground: "#0b1210",
  panel: "#151f1a",
  line: "#243129",
  ink: "#f2f5ef",
  ink2: "#b7c3bb",
  ink3: "#7e8b83",
  pitch: "#35d07a",
  pitchInk: "#06130b",
  glow: "rgba(53, 208, 122, 0.38)",
  display: "Barlow Condensed",
} as const;

/** Card tier by overall rating. Mirrors tierOf() in player-card.tsx without pulling a client-leaning module into the image route. */
export function ogTier(overall: number): "Elite" | "Gold" | "Silver" | "Sick note" {
  if (overall >= 85) return "Elite";
  if (overall >= 72) return "Gold";
  if (overall >= 60) return "Silver";
  return "Sick note";
}

/** The mark as inline SVG for satori: tick in a rounded square. */
export const OG_MARK_PATH = "M15 33l10 10 25-25";

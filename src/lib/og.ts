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

export const OG = {
  ground: "#f5f6f2",
  ink: "#14201b",
  ink2: "#3e4a44",
  ink3: "#6e7a73",
  pitch: "#1e8a4c",
  display: "Barlow Condensed",
} as const;

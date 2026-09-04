import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const gen = customAlphabet(alphabet, 14);
const genToken = customAlphabet(alphabet + "ABCDEFGHIJKLMNOPQRSTUVWXYZ", 24);

export const newId = () => gen();
export const newToken = () => genToken();

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "crew";
}

/** Deterministic hue from a string so avatars stay stable without storing extra state. */
export function hueFrom(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 360;
}

import "server-only";
import { headers } from "next/headers";

/**
 * Sandbox mode: running on Vercel with no database configured. The app uses a throwaway SQLite file
 * in /tmp, seeds the demo crew on first boot, and offers one-tap demo sign-in. Data does not survive
 * a cold start. Setting DATABASE_URL turns all of this off.
 */
export function isSandbox(): boolean {
  const url = process.env.DATABASE_URL;
  const usable = !!url && !(process.env.VERCEL && url.startsWith("file:") && !url.startsWith("file:/tmp"));
  return !usable && !!process.env.VERCEL;
}

/** NEXT_PUBLIC_APP_URL is only trusted when it is a real origin; a localhost placeholder on Vercel is ignored. */
function publicUrl(): string | undefined {
  const u = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!u) return undefined;
  if (process.env.VERCEL && /localhost|127\.0\.0\.1/.test(u)) return undefined;
  return u;
}

/** Public origin for share links and cards: explicit env first, then Vercel's URLs, then the request host. */
export async function appUrl(): Promise<string> {
  const configured = publicUrl();
  if (configured) return configured;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  // Preview deployments: the branch alias is stable across pushes, the deployment URL is not.
  if (process.env.VERCEL_BRANCH_URL) return `https://${process.env.VERCEL_BRANCH_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    if (host) return `${proto}://${host}`;
  } catch {
    /* outside a request */
  }
  return "http://localhost:3000";
}

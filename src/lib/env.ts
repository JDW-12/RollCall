import "server-only";
import { headers } from "next/headers";

/**
 * Sandbox mode: running on Vercel with no database configured. The app uses a throwaway SQLite file
 * in /tmp, seeds the demo crew on first boot, and offers one-tap demo sign-in. Data does not survive
 * a cold start. Setting DATABASE_URL turns all of this off.
 */
export function isSandbox(): boolean {
  return !process.env.DATABASE_URL && !!process.env.VERCEL;
}

/** Public origin for share links and cards: explicit env first, then Vercel's URLs, then the request host. */
export async function appUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
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

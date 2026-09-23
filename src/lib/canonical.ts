/**
 * One address for the app. Every Vercel deployment also answers on its own `*.vercel.app` URL, and a
 * sign-in cookie only belongs to the host it was set on, so opening an old deployment link looked
 * like being signed out. In production those hosts forward to the project's production domain.
 *
 * Only `*.vercel.app` hosts are ever moved (a custom domain, localhost and previews are left alone),
 * and API routes never are: Stripe webhooks and the cron don't follow redirects.
 */
export function canonicalHost(req: { host: string; pathname: string }, env: { VERCEL_ENV?: string; VERCEL_PROJECT_PRODUCTION_URL?: string }): string | null {
  if (env.VERCEL_ENV !== "production") return null;
  const target = env.VERCEL_PROJECT_PRODUCTION_URL?.toLowerCase();
  const host = req.host.toLowerCase();
  if (!target || host === target) return null;
  if (!host.endsWith(".vercel.app")) return null;
  if (req.pathname.startsWith("/api/")) return null;
  return target;
}

/** How long a sign-in lasts from the last visit. Using the app keeps pushing it out. */
export const SESSION_DAYS = 180;

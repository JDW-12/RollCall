# Deployment

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `file:./data/rollcall.db` locally. `libsql://<name>.turso.io` in production. |
| `DATABASE_AUTH_TOKEN` | Turso token. Empty for a file. |
| `NEXT_PUBLIC_APP_URL` | Public origin. Used in every share link and card. Must be right. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sign-in code delivery. Empty logs codes to the console (dev only). |
| `APP_SECRET` | Reserved for webhook verification. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Card payments through Stripe Connect. Empty means "mark as paid" only. |
| `PLATFORM_FEE_BPS`, `PLATFORM_FEE_FIXED_PENCE` | Roll Call fee on card payments, default 2.5% + 20p. |
| `CRON_SECRET` | Bearer token Vercel Cron sends to `/api/cron/reminders`. |
| `FOUNDER_EMAILS` | Who can open `/founder`. |

Migrations run automatically on first database connection. To run them explicitly: `npm run db:migrate`.

## Sandbox mode (zero config)

If the app runs on Vercel with no `DATABASE_URL`, it starts in sandbox mode: a throwaway SQLite file in `/tmp`, the demo crews seeded on first boot, one-tap sign-in at `/demo` (Josh, organiser) and `/demo?as=member`, sign-in codes shown on screen, and a yellow banner saying so. Data does not survive a cold start or a redeploy. It exists so the product can be tried the minute it is deployed. Setting `DATABASE_URL` turns every part of it off.

## Vercel, first deployment from the dashboard

The Vercel GitHub integration is already installed for `jdw-12/remoovals`. Creating the project takes about a minute:

1. vercel.com → Add New → Project → Import `jdw-12/remoovals`.
2. Project name: whatever the app ends up being called. **Root Directory: `rollcall`.** Framework is detected as Next.js. Leave build settings alone. No environment variables are needed for the sandbox.
3. Deploy. The first build runs from `main`, which does not contain `rollcall/` yet, so it will fail. That is expected.
4. Settings → Git → Production Branch: set to `claude/sports-app-market-gap-4r2hks` (or merge that branch into `main`). Redeploy. Every push to that branch now deploys automatically.
5. Settings → Deployment Protection: turn Vercel Authentication off for the environment you are sharing, otherwise invite links and WhatsApp previews will hit a login wall.

Then open `https://<project>.vercel.app/demo`.

## Vercel + Turso (real data)
1. turso.tech → create a database (London region) → copy the `libsql://...` URL and create a token.
2. Vercel → Settings → Environment Variables: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, and `NEXT_PUBLIC_APP_URL` set to the public domain.
3. Redeploy. The first request applies migrations. The sandbox banner disappears and `/demo` returns 404.
4. Optional: `RESEND_API_KEY` and `EMAIL_FROM` so sign-in codes are emailed rather than logged.

Vercel's filesystem is read-only, so a `file:` database will not work there; Turso is the drop-in.

## Docker
```bash
docker build -t rollcall .
docker run -p 3000:3000 -v rollcall-data:/app/data -e NEXT_PUBLIC_APP_URL=https://your.domain rollcall
```
The image runs `next start` with the SQLite file on a volume. Good for a single VPS.

## Checks before a release
```bash
npm run check && npm run build && PLAYWRIGHT_CHROMIUM_PATH=... npm run test:e2e
```

## Stripe Connect
1. Stripe dashboard → Connect → enable Express accounts. Platform profile: marketplace, UK.
2. Set `STRIPE_SECRET_KEY`. Test mode keys work end to end.
3. Add a webhook endpoint at `https://<domain>/api/stripe/webhook` for `checkout.session.completed` and `account.updated`; set `STRIPE_WEBHOOK_SECRET`.
4. An organiser opens Crew settings → "Set up card payments" and completes Stripe's hosted onboarding. When Stripe reports charges enabled, members see "Pay £x by card" wherever they owe.
Payments are destination charges to the organiser's account with Roll Call's fee as the application fee. Roll Call never holds funds.

## Reminders
`vercel.json` schedules `/api/cron/reminders` daily at 09:00 UTC (Hobby plans allow one daily cron; Pro can run it hourly). The job emails members who haven't answered a session whose commit-by moment is within 24 hours, and the organiser a headcount, once per session. It needs `CRON_SECRET` and `RESEND_API_KEY`. Members without an email are skipped; the organiser's "Nudge the stragglers" button covers them through WhatsApp.

## Backups
SQLite: copy the file (`sqlite3 data/rollcall.db ".backup backup.db"`) or use Turso's point-in-time restore.

## Operational notes
- Share-card image routes are public by design. Do not put anything sensitive in a card.
- Login codes are single use and expire in 10 minutes; the table can be pruned freely.
- Rotate a crew's invite link from Crew settings if it leaks.

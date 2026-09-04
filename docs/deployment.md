# Deployment

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `file:./data/rollcall.db` locally. `libsql://<name>.turso.io` in production. |
| `DATABASE_AUTH_TOKEN` | Turso token. Empty for a file. |
| `NEXT_PUBLIC_APP_URL` | Public origin. Used in every share link and card. Must be right. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sign-in code delivery. Empty logs codes to the console (dev only). |
| `APP_SECRET` | Reserved for webhook verification. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Not used by v1. Present so the config shape is settled. |

Migrations run automatically on first database connection. To run them explicitly: `npm run db:migrate`.

## Vercel + Turso (recommended for the pilot)
1. Create a Turso database, copy the URL and token.
2. Import the repo, set root directory to `rollcall`.
3. Set the variables above. `NEXT_PUBLIC_APP_URL` is the production domain.
4. Deploy. First request applies migrations.

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

## Backups
SQLite: copy the file (`sqlite3 data/rollcall.db ".backup backup.db"`) or use Turso's point-in-time restore.

## Operational notes
- Share-card image routes are public by design. Do not put anything sensitive in a card.
- Login codes are single use and expire in 10 minutes; the table can be pruned freely.
- Rotate a crew's invite link from Crew settings if it leaks.

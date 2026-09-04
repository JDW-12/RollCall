# Architecture

## Shape

A single Next.js 16 app. Server components read, server actions write. The only client code is three small islands: the action form wrapper (pending state and error display), RSVP buttons, and share buttons. No global client state, no API layer of its own.

```
browser ──(RSC)──▶ src/app/*  ──▶ src/lib/queries.ts ──▶ Drizzle ──▶ libsql (SQLite / Turso)
browser ──(action POST)──▶ src/lib/actions/*.ts ──▶ src/domain/* (pure rules) ──▶ Drizzle
```

## Domain layer
`src/domain/` holds the rules as pure functions over plain data, with no database or framework imports. Server actions load rows, call the domain, and persist the result. This is what the unit tests cover and it is where the product's opinions live (what counts as late, who owes, how points work).

## Data
- Drizzle schema in `src/db/schema.ts`; SQL migrations generated into `drizzle/` with `npm run db:generate`.
- The client applies pending migrations on first connection (`getDb()`), so a fresh deploy or a fresh dev box needs no manual step.
- Timestamps are epoch milliseconds, money is integer pence, ids are 14-character random strings (unguessable, which also protects the public share-card routes).
- Foreign keys cascade so deleting a crew removes everything under it.

## Auth
Cookie session (`rc_session`, httpOnly, 180 days) pointing at an `auth_sessions` row. Two ways in: an invite link (name only, creates a guest user) or an emailed six-digit code. Codes expire in 10 minutes and are single use. Without `RESEND_API_KEY` the code is logged to the server console.

## Access control
`requireCrewPage(slug)` for pages (redirects to sign-in or the join page), `requireCrewAction(crewId, { organiser })` for actions (throws). Every action re-checks membership and role on the server; nothing trusts hidden form fields beyond ids.

## Share cards
`opengraph-image.tsx` routes render PNGs with `next/og`. They are unauthenticated by design so WhatsApp's link preview fetcher can read them; the unguessable ids are the access control. Nothing on a card is more sensitive than first names and counts.

## Timezone
All user-facing times are Europe/London regardless of server timezone. `datetime-local` inputs are parsed as London wall-clock time and stored as UTC.

## Testing
- `vitest` for `src/domain/*.test.ts`.
- Playwright `e2e/core-loop.spec.ts` boots `next start` on a throwaway SQLite file and runs the whole loop as three separate browser contexts.

## Known limits
- SQLite file storage is single-writer. Fine for a pilot; for scale use Turso (libsql) which the client already supports via `DATABASE_URL` + `DATABASE_AUTH_TOKEN`.
- Rater count for form is inferred from vote totals rather than stored. Good enough while everyone answers the first question; a `session_raters` table is the obvious v1.1 fix.
- Account merging (guest account + existing email account) is not implemented.

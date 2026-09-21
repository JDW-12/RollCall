# Launch runbook: from sandbox to a real crew

The app is live at https://rollcall-henna.vercel.app in sandbox mode (throwaway database, demo data,
codes on screen). This is the exact sequence to turn it into a real product with your own crew on it.
Do the steps in order. Steps 1 and 2 go together, because without email you cannot sign in to a real database.

Time: about 90 minutes including waiting for DNS.

## Step 1. Email (Resend)

Why first: on a real database sign-in codes are emailed. With no `RESEND_API_KEY` they are only printed to the
Vercel runtime log, so you would be locked out of your own app.

1. Go to https://resend.com and sign up (GitHub sign-in is fine).
2. API Keys → Create API Key. Name `rollcall-prod`, permission "Sending access", all domains. Copy the key (starts `re_`). It is shown once.
3. Decide the sender address:
   - Quick path for today: use `Roll Call <onboarding@resend.dev>`. Resend only delivers this test sender to the email address you signed up with. That is enough for you to sign in as the organiser. Members never need email: they join from the invite link with just a name.
   - Real path (needed before reminders and before other organisers sign in): Domains → Add Domain → enter a domain you own (e.g. `rollcall.club` or whatever the app ends up called). Resend shows 3 DNS records (MX, SPF TXT, DKIM TXT). Add them at your registrar. Click Verify. Usually done within 15 minutes, occasionally an hour. Then use `Roll Call <hello@yourdomain>`.
4. Note down `RESEND_API_KEY` and `EMAIL_FROM` for step 3.

## Step 2. Database (Turso)

1. Go to https://turso.tech and sign up with GitHub.
2. Create Database. Name `rollcall`. Group: create one called `production`, location **London (lhr)**. Free plan is fine for months.
3. On the database page copy the URL. It looks like `libsql://rollcall-<yourname>.turso.io`.
4. Create Token → read and write, no expiry. Copy it (long string starting `eyJ`).
5. Note down `DATABASE_URL` and `DATABASE_AUTH_TOKEN`.

Nothing to create inside the database. Migrations run automatically on the first request.

## Step 3. Put the values into Vercel and redeploy

1. vercel.com → rollcall project → Settings → Environment Variables.
2. Edit each of these (they exist with empty values from the import). Environment: tick **Production** only for now.

| Key | Value |
|---|---|
| `DATABASE_URL` | the `libsql://…` URL from step 2 |
| `DATABASE_AUTH_TOKEN` | the Turso token |
| `NEXT_PUBLIC_APP_URL` | `https://rollcall-henna.vercel.app` (no trailing slash; change when you add a domain) |
| `FOUNDER_EMAILS` | the email you will sign in with, lower case |
| `RESEND_API_KEY` | the `re_…` key |
| `EMAIL_FROM` | `Roll Call <onboarding@resend.dev>` for now, your verified domain later |
| `CRON_SECRET` | a random string, generate with `openssl rand -hex 32` or any password generator, 40+ characters |
| `APP_SECRET` | another random string |
| `PLATFORM_FEE_BPS` | `250` |
| `PLATFORM_FEE_FIXED_PENCE` | `20` |

Leave `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` empty until step 5.

3. Save. Env changes do not apply until a redeploy: Deployments → top deployment → ⋯ → Redeploy → untick "Use existing build cache" → Redeploy. Wait for READY (about 2 minutes).

Verify, in a private window:
- Home page has no yellow sandbox banner.
- `/demo` returns 404.
- `/signin` → enter your email → the code arrives in your inbox within a few seconds. Enter it. You are signed in.
- `/founder` opens for you (empty numbers, that is right).
- If the code does not arrive: Vercel → project → Logs, filter for `Resend error`. A 403 means the from-address domain is not verified; switch to `onboarding@resend.dev`.

Turso → your database → Tables should now show `users`, `crews`, `sessions` and the rest.

## Step 4. Reminders (cron)

Already wired: `vercel.json` schedules `/api/cron/reminders` at 09:00 UTC daily and Vercel sends `CRON_SECRET` as the bearer token.

1. Vercel → project → Settings → Cron Jobs. Confirm one job is listed. If not, the redeploy in step 3 created it; refresh.
2. Test it now rather than waiting for tomorrow. From a terminal:
   ```bash
   curl -i -H "Authorization: Bearer <your CRON_SECRET>" https://rollcall-henna.vercel.app/api/cron/reminders
   ```
   Expect `200` and a JSON body like `{"reminded":0,"headcounts":0}`. `401` means the secret does not match. `503` means the env var is not set on the deployment.
3. Reminders only email members who have an email on their account. Guest members (joined by name only) are covered by the organiser's "Nudge the stragglers" WhatsApp button.

Hobby plan allows one cron a day. That is fine: the job sends each reminder once, whenever it runs.

## Step 5. Card payments (Stripe Connect, test mode)

Do this in test mode first. Nothing real moves.

1. https://dashboard.stripe.com → create an account (UK). You do not need to finish business verification for test mode.
2. Make sure the **Test mode** toggle (top right) is on for everything below.
3. Connect → Get started → choose "Platform or marketplace". When asked how accounts onboard, choose **Express**. Complete the platform profile questions (UK, marketplace, you facilitate payments between organisers and members). This can be done in a few minutes in test mode.
4. Developers → API keys → copy the **Secret key** (`sk_test_…`).
5. Developers → Webhooks → Add endpoint:
   - URL: `https://rollcall-henna.vercel.app/api/stripe/webhook`
   - Listen to: **Events on Connected accounts** as well as your account (tick both if offered).
   - Events: `checkout.session.completed` and `account.updated`.
   - Add endpoint, then reveal the **Signing secret** (`whsec_…`).
6. Vercel → Environment Variables: set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Redeploy as in step 3.

Test the whole loop:
1. Sign in, create a crew (step 6 below), open Crew settings → "Set up card payments". Stripe's hosted Express onboarding opens. In test mode use the "Skip this form" links, or fill anything: sort code `10-88-00`, account `00012345`, any UK address, DOB over 18.
2. Back in the crew, the panel should show charges enabled within a minute (the `account.updated` webhook does this; if it stays pending, refresh, then check Stripe → Webhooks → your endpoint → recent deliveries for a non-200).
3. Create a session with a cost, RSVP as a member (second browser or phone, via the invite link), confirm played, then as that member tap "Pay by card". Card `4242 4242 4242 4242`, any future expiry, any CVC.
4. The ledger entry appears as paid by card. In Stripe test mode you will see the payment on the connected account with the platform fee (2.5% + 20p) on yours.

Go live later: repeat step 4 and 5 with live keys and a live webhook endpoint, after Stripe has verified your business. Not needed for the first crews; "mark as paid" works without Stripe.

## Step 6. Your first real crew

1. Signed in as yourself, from the home page create a crew: name, sport, London, your usual venue, kick-off time, price per head.
2. Create the first session. Set commit-by (the deadline) to a time the group actually respects, e.g. 6 pm the day before.
3. Crew settings → copy the invite link. Send it to the real WhatsApp group with one line, not a pitch. Something like: "Trying this for Tuesday, tap your name in so I stop chasing."
4. Watch `/founder` for joins and RSVPs. Do not explain features. If people ask what something is, that is a design note.
5. After the session: confirm who played, do the vote, mark payments. Then look at the table and the cards with the group in the pub. That reaction is the test.

Do not invite a second crew until the first one has done three sessions without you prompting them.

## Step 6b. Optional keys: venue finder, golf cards, scorecard scan

All three work without keys in a reduced form. Add them when the reduced form starts to bite.

1. **Google Places** (venue names and addresses as you type). Google Cloud Console → create a project → enable "Places API (New)" → Credentials → API key → restrict it to Places API (New). Set `GOOGLE_MAPS_API_KEY`. Without it the app uses the free OpenStreetMap geocoder, which is weaker on business names like "Powerleague".
2. **Golf course database.** golfcourseapi.com → sign up → API key. Set `GOLF_COURSE_API_KEY`. This is the one that makes the golf venue finder useful: with it, typing a club name on a golf session offers real courses with pars, stroke indexes and yardage, and picking one loads the card. Without it, course search only covers cards crews have already typed or scanned.
3. **Scorecard scanning.** console.anthropic.com → API keys → create. Set `ANTHROPIC_API_KEY`. Without it the "Scan the paper card" option is hidden and organisers type the two rows off the card instead.

Redeploy after adding any of them.

## Step 7. Name and domain (when you decide)

1. Pick the name. Check the `.co.uk` / `.club` / `.app` domain and the Instagram and TikTok handles in one sitting; a name without all three is a headache later.
2. Buy the domain (Cloudflare Registrar or Namecheap, about £10 a year).
3. Vercel → project → Settings → Domains → add it. Vercel shows the DNS records (an A record or a CNAME). Add them at the registrar. HTTPS is automatic.
4. Update `NEXT_PUBLIC_APP_URL` to the new domain, redeploy. Update the Stripe webhook URL and the Resend sending domain to match.
5. Tell Claude the final name; the rename across code, deck and docs is one commit.

## If something breaks

- Vercel → project → Logs is the first place. Errors from the app start with `[Roll Call]` or name the failing service (`Resend error`, `Stripe`).
- A migration error on first request means the Turso URL or token is wrong. Fix the env, redeploy.
- Rollback: Deployments → any earlier READY deployment → ⋯ → Promote to Production. The database is untouched.
- Backups: Turso keeps point-in-time restore on paid plans; on free, export from the Turso dashboard before risky changes.

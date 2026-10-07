# Security fixes — what changed and what you must do

Written after the production security review. Code changes are done and verified
locally; the sections marked **YOUR STEP** are things only you can do (they need
dashboard access or a judgement call I should not make for a live site).

Companion doc: the review itself is summarised in the conversation; this file
covers remediation.

---

## 1. Booking PATCH authorization hole (was CRITICAL)

**What was wrong.** `PATCH /api/bookings/<id>` was wrapped in `requireAuth`,
which only proves that *someone* is signed in. The handler then wrote by id
without ever checking who owned the booking:

- cancel or confirm **anyone's** appointment — which sends real
  confirmation/cancellation emails, claws back loyalty points and increments the
  victim's late-cancel / reliability counters
- overwrite **anyone's** star rating and review text

**What changed** — `app/api/bookings/[id]/route.ts`

- The handler now loads the booking and derives `session` + `existing.userId`.
- Anyone who is not the owner and not an admin gets **403**.
- Customers may only set `status: "cancelled"`. `pending` / `confirmed` /
  `completed` are staff-only, so nobody can self-confirm.
- Rating and review require ownership (an admin deliberately cannot rewrite a
  customer's words).
- Missing booking → **404** instead of a Prisma error.

**Verified.** New regression test `tests/bookings-ownership.test.ts` (9 tests).
It was run against a deliberately de-guarded copy of the route first and
**failed 5 authorization assertions**, then passed 9/9 once the guards were
restored — so it genuinely detects the bug rather than passing vacuously.

**Note.** Only `role: "admin"` is treated as staff. If employees are meant to
manage bookings, widen the `isAdmin` check deliberately — do not remove it.

---

## 2. Security headers never reached production (was HIGH)

**What was wrong.** `middleware.ts` set the CSP, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, HSTS and an API `no-store`. Netlify
serves `middleware.ts` as an edge function whose response headers are dropped,
so production sent only Netlify's own HSTS plus the `nosniff` coming from
`next.config.mjs`. There was no clickjacking protection and no CSP.

**What changed**

- All of those headers now live in `headers()` in `next.config.mjs`, which the
  Netlify adapter *does* honour (that is where `nosniff` was already coming
  from).
- `middleware.ts` is reduced to the HTTPS redirect, with a comment explaining
  why the headers must not move back.

**Verified.** In production mode (`next build` + `next start`), `/booking` now
returns `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS
and the full CSP; `script-src` correctly drops `'unsafe-eval'` outside dev; and
`/api/**` carries `Cache-Control: no-store`. In dev the whole booking flow,
Google Maps iframe and all `next/image` assets load with zero CSP violations in
the console.

**⚠️ YOUR STEP — the CSP is enforced for the first time ever.** It is byte-for-byte
the policy that was already written for production, and it has been exercised in
dev, but this is still the riskiest change in the set: a directive that is wrong
will break a page in a way that only shows up in a browser.

1. Open the Netlify **deploy preview** for the branch/PR rather than merging to
   main immediately, and click through: home (map iframe), booking wizard,
   sign-in with Google popup, profile, and one `next/image` heavy page.
2. Watch the browser console for `Refused to load/execute` messages.
3. Only then merge to main.

If a directive turns out to be missing, add the origin to the relevant list in
`next.config.mjs` — do **not** delete the CSP.

---

## 3. Cron reminder endpoint failed open (was HIGH)

**What was wrong.** `app/api/cron/reminders/route.ts` compared against
`` `Bearer ${process.env.CRON_SECRET}` ``. With `CRON_SECRET` unset in Netlify
the expected value becomes the literal string `Bearer undefined`, so anyone
guessing it could repeatedly fire the reminder blast. The comparison was also
not constant-time.

**What changed.** The route now refuses to run at all (**500**) when
`CRON_SECRET` is missing, compares with `crypto.timingSafeEqual`, and treats a
missing `Authorization` header as empty rather than `null`.

**Verified.** `tests/cron-auth.test.ts` (5 tests) including the exact
`Authorization: Bearer undefined` request — it now gets 500. The authorized path
is deliberately not tested because it would send real reminders.

**⚠️ YOUR STEP?**

1. In Netlify → Site configuration → Environment variables, confirm
   `CRON_SECRET` exists and is a long random string. It is present in your local
   `.env`, but Netlify's copy cannot be read from here.
2. Confirm whatever schedules this endpoint (Netlify scheduled function / cron
   job / external cron) sends `Authorization: Bearer <that secret>`. If it does
   not, it will start failing with 500/401 after deploy — check the logs on the
   first run.

---

## 4. Rate limiting is per-instance, not per-site (was MEDIUM)

**What was wrong.** `lib/rate-limit.ts` only uses Upstash when
`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set, otherwise it falls
back to an in-process `Map` — silently. On serverless every instance keeps its
own counter, so a "10 per minute" login limit effectively becomes
"10 per minute per warm instance". Those two variables appear nowhere in
`.env` and only in docs, so production almost certainly has no shared limiter.
Separately, the synchronous `check()` answered from the in-memory limiter even
when Upstash *was* configured, silently disabling the distributed limit.

**What changed**

- A loud `console.error` at module load in production when Redis is not
  configured, so the degraded state is visible in the logs instead of invisible.
- `check()` now **throws** when Redis is configured rather than quietly
  answering from the local counter. All seven call sites already use
  `checkAsync`, so nothing regresses.

**Verified.** `tests/rate-limit-config.test.ts` (4 tests): the production
warning appears without Redis and stays silent with it; `check()` throws when
Redis is configured and still enforces the window when it is not.

**⚠️ YOUR STEP — this one is a decision.** The code no longer hides the problem,
but it cannot create a shared counter by itself:

1. **Recommended:** create a free Upstash Redis database and set
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Netlify, then
   redeploy and confirm the warning stops appearing in the function logs.
2. **Or:** accept per-instance limits knowingly. Do not simply delete the
   warning — that removes the only signal that the limit is not global.

A related, unfixed nuance worth knowing: `getTrustedClientIp()` trusts
`x-real-ip` and the first `X-Forwarded-For` entry. On Netlify the first XFF
entry is set by the edge, so this is reasonable today, but it is worth
revisiting if the hosting changes.

---

## 5. Next.js 14.2.35 vulnerabilities (was HIGH/CRITICAL) — NOT FIXED HERE

`npm audit --omit=dev` reports **17 vulnerabilities (1 critical, 7 high, 9
moderate)**, and the critical is `next` itself. The advisories include
unauthenticated RCE in the Image Optimization API (AVIF), SSRF in rewrites via
an attacker-controlled destination hostname, cache poisoning in
middleware/proxy redirects, and unauthenticated disclosure of internal Server
Function endpoints. Your deployment is reachable: the optimizer is enabled in
`next.config.mjs` and production genuinely serves `/_next/image?...`.

**Why I did not upgrade.** `14.2.35` is already the newest 14.x (npm's `next-14`
dist-tag points at it), so there is no in-range fix. `npm audit` wants
`next@16.4.0` — a two-major jump. That is a migration with real breaking
changes, and I cannot verify a Netlify build from here, so shipping it blind to
a live site would be worse than leaving it. I also deliberately did **not** run
`npm audit fix`, because the remaining advisories it would touch (`js-yaml` via
`date-holidays`, `source-map-js`, `postcss`) are build-time/static-data paths
that are not attacker-reachable, while churning the lockfile on a repo that
needs `--legacy-peer-deps` risks breaking the only deploy path you have.

**⚠️ YOUR STEP — schedule this as its own piece of work.**

1. Branch, then bump `next` to a supported major and run
   `npm install --legacy-peer-deps`.
2. The good news: this codebase already uses the async request APIs
   (`await context!.params!`), so it is written closer to Next 15+ than to 14.
   `next@16.4.0` still accepts React `^18.2.0`, so React 19 is not forced.
3. Expect to fix: async `cookies()` / `headers()` call sites, any `params` in
   pages, and possibly image config keys.
4. Verify with `npm run build`, `npx tsc --noEmit`, `npm run lint`,
   `npm test`, then click through on a deploy preview.
5. When green, deploy and re-run `npm audit --omit=dev`.

Meanwhile, the cheapest real mitigation is to reduce the image-optimizer
surface: if you do not need `/_next/image`, set `images.unoptimized: true` and
the Image Optimization advisories stop applying to you.

---

## Bonus finding (not a security issue)

`Booking.rating` is `Int?` in `prisma/schema.prisma`, but the review flow sends
and the route rounds to **one decimal** (`Math.round(numRating * 10) / 10`).
Postgres therefore discards the fraction — a 4.6-star review is stored as 4. If
you want half-star ratings, change the column to `Float` with a migration;
otherwise simplify the JS to integers so the code stops implying precision that
the database does not keep.

---

## Verification summary

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 3 pre-existing errors in `tests/api-edge.test.ts` only |
| `npm run lint` | exit 0, 0 errors |
| `npm test` | 184/185 — the 1 failure is the pre-existing `whatsapp-prompt` gender assertion, untouched |
| `npm run build` | exit 0, "Compiled successfully" |
| Production-mode headers | verified via `next build` + `next start` |
| New tests added | 18 (9 ownership, 5 cron, 4 rate-limit) |

The three new test files live in `tests/`, which is gitignored in this repo
along with `scripts/`. They will not be committed — keep them if you want the
regression coverage, and consider un-ignoring `tests/` so this protection
survives.

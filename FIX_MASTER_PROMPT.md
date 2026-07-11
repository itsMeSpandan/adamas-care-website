# Master Prompt — Remediation Plan for Adamas Care Audit

**Purpose:** A staged, copy-paste-ready execution plan to fix every issue documented in
`AUDIT_REPORT.md`. Each stage is ordered by severity and risk, and ends with explicit
verification steps. Work **one stage at a time**, and do not start the next stage until the
current stage's verification passes.

**How to use this file:** You can paste an individual stage (or the whole file) into a coding
agent / Claude Code session. Every change lists the target file, what to change, and the
acceptance criteria. Git-commit after each stage.

**Ground rules for all stages:**
- Never commit secrets. Use placeholders, env vars, or the platform secret store.
- Run `npx tsc --noEmit` and `npm run build` after each stage.
- Preserve existing public API behavior for the frontend unless a stage explicitly changes it.
- Prefer server-side enforcement over client-side trust.

---

## STAGE 1 — CRITICAL: Secrets & Authentication Bypass (blockers)

**Goal:** Stop live credential exposure and close the JWT forgery hole. Nothing else ships
until this is done and verified.

### 1.1 — Remove hardcoded DB credentials from the schema
**File:** `prisma/schema.prisma`
- Replace the literal connection string on the `datasource db` block with:
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  ```
- Do **not** paste any real URL into this file.

### 1.2 — Purge the committed `.env` and stop tracking it
**Files:** `.gitignore`, `.env`, git history
- Add `.env` to `.gitignore` (keep `.env.example`).
- Move the real connection string + keys out of `.env` into your deployment platform's secret
  store / environment variables.
- Purge `.env` from history (e.g. `git filter-repo --path .env --invert-paths`, or BFG), then
  force-push the cleaned branch.
- Keep `.env.example` with placeholder values only (no real secrets).

### 1.3 — Rotate the compromised database password
- In Neon console, rotate the DB owner password and update `DATABASE_URL` in the deploy env.
- Confirm no code relies on the old credentials.

### 1.4 — Make the JWT secret fail-closed
**File:** `lib/auth.ts`
- Change the secret resolution so it throws if unset:
  ```ts
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set. Refusing to start with an insecure JWT secret.");
  }
  const SESSION_SECRET = new TextEncoder().encode(secret);
  ```
- Generate a strong secret and set it in the deploy environment:
  `openssl rand -base64 48`
- Keep `COOKIE_NAME` and token expiries as-is.

### 1.5 — Verification (Stage 1)
- [ ] `prisma/schema.prisma` contains no literal URL.
- [ ] `git ls-files | grep '^\.env$'` returns nothing (`.env` no longer tracked).
- [ ] `grep -rn "neondb_owner" . --include=*.ts --include=*.prisma --include=.env*` finds no hits.
- [ ] App boots with `SESSION_SECRET` set; booting **without** it throws the error above.
- [ ] `npx tsc --noEmit` and `npm run build` pass.
- [ ] Login still works end-to-end with the new secret.

---

## STAGE 2 — HIGH: Authorization, Data Exposure & Booking Integrity

**Goal:** Ensure a normal authenticated user cannot read other customers' PII, tamper with
other users' profiles/bookings, or set their own price.

### 2.1 — Scope `GET /api/bookings` to authorized roles
**File:** `app/api/bookings/route.ts`
- Change `export const GET = requireAuth(...)` to `requireRole("admin", ...)` and also allow
  employees. Implement a `requireRoleOr(...)` or check `session.role` against `["admin","employee"]`
  inside the handler, returning 403 otherwise.
- For the customer "My Bookings" view, return **only** the caller's bookings:
  `db.booking.findMany({ where: { OR: [{ userId: session.userId }, { email: session.email }] }, ... })`
  served from a separate endpoint or a role-aware branch. (The profile page already filters
  client-side; enforce it server-side too.)

### 2.2 — Enforce ownership on `PATCH /api/bookings/[id]`
**File:** `app/api/bookings/[id]/route.ts`
- After `requireAuth`, load the booking; if `session.role` is not `admin`/`employee`, require
  `booking.userId === session.userId` (or matching `email`). Otherwise 403.
- Apply the same ownership/role gate before allowing `status`/`rating` mutations.

### 2.3 — Fix profile-update IDOR
**File:** `app/api/auth/profile/route.ts`
- Remove reliance on `userId` from the body. Use `session.userId` from `getSessionFromRequest`.
- Keep the email-uniqueness check, but compare against the *current* user only.

### 2.4 — Compute booking price server-side + validate inputs
**Files:** `app/api/bookings/route.ts`, optionally `lib/queries.ts`
- Look up the service: `const service = await db.service.findUnique({ where: { id: serviceId } })`.
- Use `service.price` as the stored price; ignore any client `price`.
- Validate `employeeId` actually offers `serviceId` via `employeeService` assignment.
- Validate `date` is not in the past (compare to `now` in the employee's timezone or UTC consistently).
- Validate `slotStart`/`slotEnd` are within the employee's `EmployeeAvailability` windows for
  that day-of-week (honoring `AvailabilityOverride`), and within business hours.
- Reject `price`, negative durations, and unknown `serviceId`/`employeeId` with 400.
- Keep the existing conflict check.

### 2.5 — Fix OTP uniqueness (prevents 500 on collision)
**File:** `prisma/schema.prisma`
- Remove the global `@unique` on `PasswordResetToken.token`. Make uniqueness per-user instead:
  add `@@unique([userId, token])` (or store a random UUID lookup token + a separate non-unique OTP field).
- Run `npx prisma generate` and `npx prisma db push` (or a migration) after the change.

### 2.6 — Add `onDelete` to booking relations
**File:** `prisma/schema.prisma`
- On `Booking.service` and `Booking.employee`, set `onDelete: SetNull` (preserve history) or
  `Cascade` (delete bookings with the service/employee). Choose `SetNull` unless product says otherwise.
- Regenerate the client.

### 2.7 — Verification (Stage 2)
- [ ] As a normal user: `GET /api/bookings` returns only your bookings (or 403), never others' PII.
- [ ] As a normal user: `PATCH /api/bookings/<someone-else's-id>` returns 403.
- [ ] `PUT /api/auth/profile` with another `userId` in the body does **not** change that user.
- [ ] Booking with `price: 0` / wrong `serviceId` is rejected or charged the real service price.
- [ ] Booking a past date or out-of-window slot is rejected (400/409).
- [ ] Triggering forgot-password for two accounts does not 500.
- [ ] Deleting a service/employee that has bookings no longer 500s.
- [ ] `npx tsc --noEmit` and `npm run build` pass; `npx prisma validate` passes.

---

## STAGE 3 — MEDIUM: Hardening, Rate Limiting, Sessions & Headers

**Goal:** Close remaining abuse vectors and fix the broken session/refresh lifecycle.

### 3.1 — Replace the in-memory rate limiter
**Files:** `lib/rate-limit.ts`, all auth routes that import it
- Swap the module-level `Map` for a shared store (Upstash Redis / Vercel KV) or a DB-backed
  counter. Provide a single `rateLimit({ windowMs, max, key })` interface.
- Derive the client IP from trusted proxy headers server-side (do **not** trust a raw
  client-supplied `X-Forwarded-For`). Use the platform's `request.ip` when available.
- Add per-email/per-account limiting for `forgot-password` and `reset-password` in addition to per-IP.
- Keep the existing `Retry-After` / `X-RateLimit-*` headers.

### 3.2 — Implement or remove the refresh token
**File:** `lib/auth.ts` (+ add `app/api/auth/refresh/route.ts` if keeping it)
- **Option A (recommended):** add `POST /api/auth/refresh` that verifies the `adamascare_refresh`
  cookie (7d) and issues a new access token; call it from the client when an API returns 401.
- **Option B:** if short sessions are acceptable, delete the refresh cookie and
  `REFRESH_TOKEN_EXPIRY` and lengthen `ACCESS_TOKEN_EXPIRY` to a sane value (e.g. a few hours).
- Update `lib/auth-context.tsx` so it refreshes/re-checks the session instead of showing
  "logged in" after the token silently expires.

### 3.3 — Add a Content-Security-Policy
**File:** `middleware.ts`
- Add `Content-Security-Policy` (start strict: `default-src 'self'`; allow `images.unsplash.com`
  and `ui-avatars.com` for `img-src`; allow `https:` for `connect-src` if needed; `script-src`
  should stay `'self'` given Next.js inline scripts use nonces/hashes).
- Keep existing HSTS/frame-options/nosniff/referrer-policy/permissions-policy headers.

### 3.4 — Add database indexes
**File:** `prisma/schema.prisma`
- Add `@@index([employeeId, date])` on `Booking`, `@@index([userId])`, and
  `@@index([employeeId])` on `EmployeeAvailability`. Regenerate + migrate.

### 3.5 — Bound the employee-email generator
**File:** `lib/queries.ts` (`generateUniqueEmployeeEmail`)
- Replace `while (true)` with a bounded loop (e.g. max 50 iterations) that throws if it cannot
  allocate a unique address, instead of hanging on DB failure.

### 3.6 — Minor hardening
- `app/api/auth/forgot-password/route.ts`: keep the generic response (good), but ensure OTP is
  **never** returned in the response and **never** logged when `NODE_ENV === "production"`.
- `app/api/auth/register/route.ts`: consider returning a generic message for existing emails to
  reduce enumeration (optional, low priority).

### 3.7 — Verification (Stage 3)
- [ ] Rate limiter works across instances (or is documented as single-instance acceptable);
      `X-Forwarded-For` spoofing no longer bypasses it.
- [ ] Forgot/reset-password endpoints limit by email, not just IP.
- [ ] Sessions either refresh correctly (no silent 15-min logout) or refresh cookie is removed.
- [ ] `Content-Security-Policy` present; site still renders with no console CSP violations.
- [ ] `prisma validate` passes; indexes present after migrate.
- [ ] `generateUniqueEmployeeEmail` throws instead of looping forever on DB outage.
- [ ] `npx tsc --noEmit` and `npm run build` pass.

---

## STAGE 4 — CODE CLEANLINESS, CONSOLIDATION & DOCS

**Goal:** Reduce duplication, unify types/IDs, add validation, and document the project.

### 4.1 — Extract duplicated time/slot helpers
- Create `lib/slots.ts` exporting `timeToMinutes`, `minutesToTime`, `subtractTimeRange`,
  `mergeWindows`, `slotsOverlap`, `generateSlots` (the shared subset used by
  `availability/route.ts`, `available-slots/route.ts`, `availability/dates/route.ts`).
- Refactor the three routes to import from `lib/slots.ts`; delete the local copies.

### 4.2 — Consolidate the two availability endpoints
- Pick one canonical availability endpoint (the richer `/api/availability` with `isBooked` and
  `serviceDuration`). Have `/api/available-slots` either delegate to it or be removed, and make
  the client (`app/booking/page.tsx`) use a single, consistent time format (24h `HH:MM`).

### 4.3 — De-duplicate layouts and shared UI
- Create a `RoleLayout` component (or `components/layout/RoleGuard.tsx`) parameterized by
  `role`, `links`, and `title`; have `app/admin/layout.tsx` and `app/employee/layout.tsx` use it.
- Hoist the duplicated `statusColors` map to `lib/constants.ts` (or a shared `ui` module).
- In `app/booking/page.tsx`, replace the local `displayTime` with `lib/utils.displayTime`.

### 4.4 — Unify types and IDs
- Align `schema.prisma` with `lib/types.ts`: make `Employee.role` a proper enum (or a TS union),
  and treat `Service.category` consistently (enum or validated string).
- Replace manual `svc_${Date.now()}_${random}` / `emp_…` IDs with Prisma
  `@default(cuid())` (or `@default(uuid())`) on `Service`, `Employee`, `Testimonial` and let the
  DB generate them; update `createService`/`createEmployee` accordingly.

### 4.5 — Centralize input validation (zod)
- Add `zod` and create `lib/validators.ts` with schemas for auth, booking, service, employee,
  availability inputs. Use them in the API routes (replacing hand-rolled checks) and optionally
  share with the client forms for consistent error messages.

### 4.6 — Prune dead code
- Remove or document `lib/resend.ts` (legacy, unused) or wire it where intended.
- Remove the unused `getSession` cookie-store variant if not needed, or document its use.
- Remove any other unused imports flagged by `next lint` / `tsc`.

### 4.7 — Documentation & config hygiene
- Rewrite `README.md` with: project overview, prerequisites, env vars table (placeholder-only),
  setup (`npm install`, `npx prisma migrate dev`, `npm run dev`), scripts, and deploy notes.
- Centralize config constants (cookie names, env var names) in one module.
- Split the 700-line `booking/page.tsx` and `profile/page.tsx` into step/sub-components.

### 4.8 — Verification (Stage 4)
- [ ] No duplicate `timeToMinutes`/`mergeWindows`/etc. across routes (single source in `lib/slots.ts`).
- [ ] One availability endpoint drives the booking UI; time format is consistent.
- [ ] Admin/employee layouts share one guarded component.
- [ ] `npx next lint` reports no unused-var/duplicate-code issues introduced.
- [ ] Booking/profile pages still function; types compile with `strict`.
- [ ] `README.md` documents setup and env vars; `.env.example` is placeholder-only.
- [ ] `npx tsc --noEmit` and `npm run build` pass; manually smoke-test login → book → admin view.

---

## Cross-Stage Checklist (do at the end)
- [ ] `npm audit` / `npm outdated` reviewed; no high/critical vulnerable deps.
- [ ] `git log` / history contains no secrets (re-scan after Stage 1 purge).
- [ ] A `NODE_ENV=production` deploy was tested (CSP active, no OTP leakage, JWT secret set).
- [ ] Basic automated tests added for: auth/login, profile ownership, bookings scoping, price validation.
- [ ] Each stage committed separately with a clear message.

**Stage order is intentional:** Stage 1 (secrets/auth) is a hard blocker; Stage 2 (authz/PII)
is the highest user-impact risk; Stage 3 hardens the rest; Stage 4 is quality/maintainability.
Do not skip ahead.

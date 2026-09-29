# progress.md — WhatsApp removal + email/Push notification system + PWA

Protocol: pick first unchecked item → implement smallest change → verify → record result.
Every 3 items: `tsc --noEmit` + `lint` + `next build`.

---

## PHASE 1: WHATSAPP INVENTORY (read-only) ✅

Searched repo for: `whatsapp, wa.me, graph.facebook, waba, twilio, gupshup, interakt, wati, aisensy, otp, template, webhook` (tracked files + untracked scripts/docs).

### (a) WhatsApp API / provider code — DELETE
- `lib/whatsapp.ts` (whole file): `sendWhatsAppMessage`, `sendWhatsAppOtp`, `sendWhatsAppSlotAvailable`, `sendWhatsAppBookingConfirmation`, `isWhatsAppConfigured`, `getBusinessPhoneNumber`, Graph API fetch to `graph.facebook.com`
- `app/api/auth/register/route.ts` — imports `sendWhatsAppOtp`, sends OTP after signup (L6, L148)
- `app/api/auth/verify-email/route.ts` — "send" action sends OTP via WhatsApp (L4, L62-63)
- `app/api/bookings/[id]/route.ts` — WhatsApp confirmation + slot-available (L6, L65-66, L173-174)
- `app/api/waitlist/[id]/claim/route.ts` — WhatsApp confirmation + slot-available (L6, L154-155, L205-207)
- `scripts/test-whatsapp.ts` (test script)

### (b) OTP / password-reset logic depending on WhatsApp — REPLACE WITH EMAIL
- **Password reset today is ALREADY email-based (EmailJS 6-digit OTP)**, not WhatsApp:
  - `app/api/auth/forgot-password/route.ts` → generates 6-digit OTP into `PasswordResetToken`, sends via `lib/emailjs.ts` (`sendOtpEmail`). Response: `{message:"If an account exists with this email, an OTP has been sent."}` (also `{error}` on failure)
  - `app/api/auth/reset-password/route.ts` → body `{email, otp, password}`; response `{message:"Password has been reset successfully. You can now sign in."}`
  - `app/reset-password/page.tsx` — 2-step UI: request email → enter 6-digit OTP → new password
- **Registration verification OTP goes through WhatsApp** (must move to email):
  - `app/api/auth/register/route.ts` — requires `whatsappNumber`, stores OTP, `sendWhatsAppOtp`, response `{user, otpSent, message}`
  - `app/api/auth/verify-email/route.ts` — actions `send`/`verify` against `PasswordResetToken` (shared table!)
  - `components/ui/LoginModal.tsx` — required WhatsApp number field + "Verify WhatsApp Number" step
  - `app/verify-email/page.tsx` — standalone OTP entry page ("check your WhatsApp")
- Shared `PasswordResetToken` table used by BOTH flows (raw 6-digit OTP, `used` boolean) → becomes `tokenHash` + `usedAt` + `requestIp` per contract; verification flow needs its own storage decision.

### (c) DB models / columns / env vars used only by WhatsApp — DROP (except contact info)
- `WhatsAppMessageLog` model (prisma/schema.prisma L~"WhatsApp Message Logs") + migration table
- `SystemSetting` keys: `whatsapp_business_number` (admin settings page L15-16, read by `getBusinessPhoneNumber`), `whatsapp_cancellation_policy` (L27) — keep business_name if used elsewhere, else drop both; verify usage
- Env: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_API_VERSION`, `WHATSAPP_BUSINESS_NUMBER`, `WHATSAPP_TEST_RECIPIENT` (set in `.env`, `.env.example`)
- **KEEP**: `User.whatsappNumber` — used as contact info in profile API (`/api/auth/profile`, `/api/auth/me`), booking flow phone. NOT dropped.
- `User.passwordResetToken` relation → rework per contract (Phase 2)

### (d) Webhook / callback routes — NONE FOUND
- No webhook routes exist (`git grep webhook` → only .env.example/README/docs mentions + emailjs template refs)

### (e) Click-to-chat wa.me links (KEEP — flag, no API calls)
- `components/layout/Footer.tsx:138` → `https://wa.me/919238381831`
- `components/ui/PillNav.tsx:78` → menu item "WhatsApp" → `https://wa.me/919238381831`
- ⚠️ HUMAN DECISION: keep both (salon contact button) — they are plain links, no API.

### (f) Docs / tests / CSP / admin UI mentions — DELETE or UPDATE
- `WHATSAPP_SETUP.md` (whole file) — delete
- `README.md` — WhatsApp mentions + WHATSAPP_SETUP.md link — update
- `app/admin/whatsapp-logs/page.tsx` + `layout.tsx` + `app/api/admin/whatsapp-logs/route.ts` + nav item in `app/admin/layout.tsx:90` — delete
- `app/admin/settings/page.tsx` — "WhatsApp Configuration" card + copy — remove card
- `app/admin/settings/layout.tsx:5` description — update
- `app/privacy/page.tsx:44` — "WhatsApp number" in data collection list — reword to "phone number"
- `prisma/seed.ts` — whatsapp mentions (check context; likely seed data)
- `app/booking/page.tsx`, `components/ui/LoginModal.tsx`, `lib/queries.ts:252`, `lib/auth-context.tsx:19` — whatsappNumber field references (KEEP — contact info)
- `prisma/migrations/20260915000000_initial_baseline/migration.sql` — historical, do NOT edit
- `public/audit*.html`, `public/gallery*.html` — 0 whatsapp matches (false positives on "template" keyword? checked: 0 matches for whatsapp) ✅
- Tests: `tests/*.test.ts` — NO whatsapp/otp references ✅
- **CSP (middleware.ts L41)**: `connect-src` has NO whatsapp/graph.facebook domains ✅ — only addition needed: Firebase (`fcmregistrations.googleapis.com`, `fcm.googleapis.com`, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `firebaseremoteconfig.googleapis.com` as needed)

### Clients touching WhatsApp OTP flow
- Web: LoginModal signup step, `app/verify-email/page.tsx`, `app/reset-password/page.tsx` (email OTP — not WhatsApp)
- Flutter (per contract): calls `/api/auth/forgot-password`, `/api/auth/reset-password`, possibly `/api/auth/register` + `/api/auth/verify-email` — keep response shapes, report changes

### Extra inventory findings
- `lib/emailjs.ts` (EmailJS OTP sender) — replaced by Resend token-link flow in Phase 2; EmailJS dep removable after Phase 2 if unused elsewhere (check `@emailjs/nodejs` imports)
- `lib/email.ts` (Resend) — already exists: `sendBookingConfirmation`, `sendReminder`, `isResendConfigured`. Reused by notifyBooking.
- `app/api/cron/reminders/route.ts` — CRON_SECRET header already implemented ✅; windows tracked via `reminder24hSentAt`/`reminder2hSentAt` (2h window → contract wants ~1h)
- `vercel.json` — cron exists `*/15` → contract wants every 10 minutes
- No reschedule endpoint exists → RESCHEDULED event fires from where status changes to confirmed? (Phase 4: hook where booking date/time changes — currently no code path; document)
- Accounts with unusable email: **0 of 12** (script `scripts/inventory-accounts.ts`) — no phone-only fallback needed, but keep the check documented
- `.env` has: RESEND_API_KEY, EMAIL_FROM, EmailJS keys, WhatsApp keys, no Firebase vars yet
- Booking creation already uses `pg_advisory_xact_lock` in `app/api/bookings/route.ts` ($transaction L295)

---

## PHASE 2: EMAIL REPLACEMENT FOR PASSWORD RESET
- [x] 2.1 `PasswordResetToken` reworked → `tokenHash` (SHA-256 unique), `expiresAt` (15 min), `usedAt?`, `requestIp?`; migration applied via `db execute` + `migrate resolve` (SQL above; `migrate dev` wanted a full reset due to pre-existing history drift — refused, used live-diff instead). Verified live columns ✅
- [x] 2.2 Registration OTP moved to new `EmailVerificationToken` (`otpHash` SHA-256, `@@unique([userId, otpHash])`); register + verify-email routes updated; verify-email response shapes unchanged
- [x] 2.3 `POST /api/auth/forgot-password`: zod validation, dual rate limits (3/min/email + 10/min/IP), CSRF origin check (`lib/csrf.ts`), invalidates older tokens, 32-byte base64url token stored ONLY as SHA-256, emails `${BASE_URL}/reset-password?token=...`, always-generic 200 (even on send failure — no enumeration), dev-only link log
- [x] 2.4 `POST /api/auth/reset-password` `{token, newPassword}`: zod + same password rules as signup (8–128), hash lookup, not used/expired, bcrypt(12), mark used + update password in one transaction, `revokeAllUserTokens()` → all refresh tokens dead, 5/min/IP rate limit
- [x] 2.5 Reset page rewritten: request form (email → generic sent state) + set form (reads `?token=` hydration-safely via useEffect), expired/used → error + “Request a new link”, beige design language kept
- [x] 2.6 `sendPasswordResetEmail` added to `lib/email.ts` (branded Resend template, 15-min expiry copy, best-effort boolean)
- [x] 2.7 Phone-only accounts: **0 of 12** (`scripts/inventory-accounts.ts`) — no one locked out; fallback n/a, documented
- [x] 2.8 E2E VERIFIED (curl against dev server):
  - forgot (real) vs forgot (ghost) → identical `{message}` + 200 (enumeration-safe)
  - reset with valid token → 200; token REUSE → 400; EXPIRED token → 400; garbage token → 400
  - old refresh token after reset → 401 (revoked); old password login → 401; new password login → 200
  - `/reset-password?token=…` renders 200; cross-site Origin → 403; same-origin → 200
  - demo password restored to `Screenshot123!` after test ✅
  - gates after 6 items: `tsc` clean (3 pre-existing test errors only), `lint` clean (pre-existing warnings), `next build` ✅

### Phase 2 shape changes for Flutter (report)
1. `POST /api/auth/reset-password` body: `{email, otp, password}` → `{token, newPassword}` (contract-mandated)
2. `POST /api/auth/forgot-password` success message text: "…an OTP has been sent." → "…a password reset link has been sent." (shape `{message}` unchanged; `{error}`/429 shapes unchanged)
3. `POST /api/auth/forgot-password` no longer returns 500 when the email provider fails (enumeration-safety) — always generic 200
4. `reset-password` validation errors: "Invalid or expired OTP…" → "Invalid or expired link…" (shape `{error}` unchanged)

## PHASE 3: REMOVE WHATSAPP
- [x] 3.1 Deleted `lib/whatsapp.ts`, `scripts/test-whatsapp.ts`, `WHATSAPP_SETUP.md`; removed all imports/call sites (register, verify-email, bookings/[id], waitlist/claim)
- [x] 3.2 Registration + resend verification OTP now delivered by **Resend email** (`sendVerificationOtpEmail`); response shapes kept (`{user, otpSent, message}`, `{message}`); phone number now OPTIONAL at signup (was required for WhatsApp OTP); LoginModal + verify-email page copy updated to email
- [x] 3.3 Deleted admin whatsapp-logs page/layout/API + nav entry; settings page: dropped `whatsapp_business_number` + `whatsapp_cancellation_policy` settings, reworded card/copy; settings layout description updated
- [x] 3.4 Migration `20260929000001_drop_whatsapp_message_log` — SQL printed above BEFORE apply (DESTRUCTIVE: DROP WhatsAppMessageLog + 2 settings rows); applied via `db execute` + `migrate resolve`; status up to date ✅ `User.whatsappNumber` KEPT (contract + booking contact fallback)
- [x] 3.5 `.env.example` rewritten: removed `WHATSAPP_*` and `EMAILJS_*`, documented Resend for reset/verification emails (`.env` itself untouched — HUMAN STEPS)
- [x] 3.6 README: removed WhatsApp feature bullet/tech-stack row/env rows; updated email row + lib listing; also deleted dead `lib/emailjs.ts` + uninstalled `@emailjs/nodejs` (its only consumer was the old OTP flow)
- [x] 3.7 Privacy page: removed “WhatsApp number” from collected data (phone number remains); booking page + profile route copy reworded (waitlist copy now says email)
- [x] 3.8 Final keyword search: remaining hits are ONLY (e) approved `wa.me` links (Footer, PillNav menu) and the `whatsappNumber` contact-info field identifiers — no API/provider code remains
- Gates: tsc ✅ (3 pre-existing test errors), lint ✅ no errors, build ✅, `npm test` **64/64 pass** (incl. real-DB concurrent test)

### Phase 3 changes to report (Flutter)
1. `POST /api/auth/register`: `whatsappNumber` no longer required (still accepted); message text now says email instead of WhatsApp
2. `POST /api/auth/verify-email` action=send: sends to email; success text "Verification code sent to your email" (was "…to your WhatsApp")
3. Admin endpoint `/api/admin/whatsapp-logs` deleted (404)
4. `POST /api/auth/profile` still accepts `whatsappNumber` (contact info) — error texts now say "phone number"

### Phase 4.2 — `20260929000002_add_device_token_notification_log` (additive, non-destructive)
```sql
-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");
CREATE INDEX "NotificationLog_bookingId_idx" ON "NotificationLog"("bookingId");
CREATE UNIQUE INDEX "NotificationLog_bookingId_event_channel_key" ON "NotificationLog"("bookingId", "event", "channel");
-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## PHASE 4: NOTIFICATION BACKEND
- [x] 4.1 `firebase-admin@14.5.0` installed; `lib/firebase-admin.ts` initializes from `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` (literal `\n` unescaped), cached across hot reloads, returns null when unconfigured (push skipped, email unaffected)
- [x] 4.2 `DeviceToken` + `NotificationLog` models + migration `20260929000002_add_device_token_notification_log` (SQL above, additive) — applied, client regenerated, status up to date
- [x] 4.3 `/api/devices/register` (upsert by unique token, refreshes lastSeenAt, un-revokes, sets userId/platform/userAgent) + `/api/devices/unregister` (sets revokedAt, owner-only, idempotent ok) — both: CSRF origin check + JWT session + zod (`token` ≤4096, `platform: android|web`) + 20/min/IP rate limit
- [x] 4.4 Per-event templates in `lib/notify.ts` (CONFIRMED/RESCHEDULED/CANCELLED/REMINDER_24H/REMINDER_1H/WAITLIST_SLOT_OPEN) with `.ics` attachment on CONFIRMED + RESCHEDULED via `lib/ics.ts` (Asia/Kolkata UTC+5:30 wall-time → UTC instants; same UID for confirmed/rescheduled so calendars treat it as an update)
- [x] 4.5 `lib/notify.ts` → `notifyBooking(bookingId, event)`: recipient resolution (booking email; WAITLIST_SLOT_OPEN → current notified entry w/ claim window else top-ranked waiting), `Promise.allSettled` channel isolation, NotificationLog check-before/write-after (write only on success → failed sends retry on next call), P2002 races tolerated, never throws
- [x] 4.6 FCM `registration-token-not-registered` / `invalid-registration-token` → `revokedAt` set on that token; push logs only when ≥1 token accepted
- [x] 4.7 Call sites (all AFTER their transactions commit): booking create → CONFIRMED; `bookings/route.ts` PATCH → CONFIRMED/CANCELLED; `bookings/[id]/route.ts` PATCH → CONFIRMED, or CANCELLED → notifyWaitlistedUser (flip to notified) → WAITLIST_SLOT_OPEN; waitlist claim → CONFIRMED; dead `sendBookingConfirmation`/`sendReminder` removed from lib/email.ts
- [x] 4.8 Cron rewritten: window-based lookup (24h: hoursUntil 23–25; 1h: 0.5–1.5), ±26h date pre-filter (old 2h-band pre-filter could never match daytime slots — fixed), CRON_SECRET bearer check kept, NotificationLog provides once-per-window idempotency; `vercel.json` schedule `*/10 * * * *`
- Gates: tsc ✅ (3 pre-existing test errors only), lint ✅, build ✅ (30/30 pages)

### Phase 4 notes / deviations
- **No reschedule endpoint exists** in this codebase (Phase 1 finding) — RESCHEDULED template/ICS implemented and reachable in notifyBooking, but no code path fires it yet. Reported for Flutter/mobile parity.
- **Waitlist cascade** (claim expiry → next person) sends a **direct email**, not notifyBooking: NotificationLog's `(bookingId, event, channel)` uniqueness means the slot's primary WAITLIST_SLOT_OPEN is already logged, and the next member must still be reachable. Documented in code.
- `User` FK note: DeviceToken cascades on user delete; NotificationLog cascades on booking delete.

## PHASE 5: PWA
- [x] 5.1 `app/manifest.ts`: name/short_name/start_url `/` + scope, `display: standalone`, beige `#F5F1EA` background+theme, icons 192/512/maskable-512 → `/manifest.webmanifest` confirmed in build. Icons generated as **placeholders** by `scripts/generate-pwa-icons.ts` (dependency-free PNG encoder — beige field + dark disc, no new deps) → `public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png` ⚠️ flagged under HUMAN STEPS for real artwork
- [x] 5.2 Root layout: `metadata.appleWebApp` (capable/title/statusBarStyle → apple-mobile-web-app meta tags), `metadata.icons` + `apple: /icons/apple-touch-icon.png`, `viewport.themeColor #F5F1EA`
- [x] 5.3 `public/firebase-messaging-sw.js`: plain Web Push handler (no Firebase config needed in the SW — NEXT_PUBLIC_* lives in the page bundle); shows notification with icon/badge; `notificationclick` → focus+navigate an existing same-origin tab else `openWindow(deepLink)`; **zero fetch/cache handlers** (nothing under /api or authed routes can be cached — A7)
- [x] 5.4 `lib/firebase-client.ts`: `isFirebaseClientConfigured` / `getSwRegistration` / `getFcmToken` (positional getToken signature, vapidKey, serviceWorkerRegistration) / `deleteFcmToken`; dynamic imports keep firebase out of the main bundle; all paths return null gracefully when env unset
- Also: `firebase` (client SDK 12.19) installed; `.env.example` gained NEXT_PUBLIC_FIREBASE_* + FIREBASE_* vars; `middleware.ts` CSP `connect-src` += fcmregistrations/firebaseinstallations/fcm.googleapis.com (documented — no WhatsApp domains ever existed in CSP)
- Push payload switched to **data-only** `{type, bookingId, deepLink, title, body}` per contract (SW decides display) — updated lib/notify.ts
- Gates: tsc ✅ (3 pre-existing test errors), build ✅ incl. manifest route

## PHASE 6: INSTALL AND PUSH UX
- [x] 6.1 `hooks/useInstallPrompt.ts`: captures `beforeinstallprompt` (deferred prompt), detects standalone (`display-mode` + iOS `navigator.standalone`), detects iOS Safari; `promptInstall()` returns accepted/dismissed/unavailable; hydration-safe (`ready` guard)
- [x] 6.2 `components/ui/InstallBanner.tsx`: Chromium → "Install Grace Salon" button; iOS Safari → 3-step guide (Share → Add to Home Screen → Add); dismissal stored at `gracesalon:install-banner-dismissed-at` for **14 days** (try/catch, hidden until browser state read → hydration-safe). Mounted ONLY at: booking success screen (step 3) + My Bookings tab — never on first load
- [x] 6.3 `hooks/usePushNotifications.ts`: soft-ask state; `enable()` is the ONLY caller of `Notification.requestPermission()` (user tap); granted → getToken → `/api/devices/register`; permission refreshed on mount
- [x] 6.4 iOS: `isIosStandaloneRequired` (iOS && !standalone) → `NotificationSettings` shows the install guide instead of Enable; push offered in standalone
- [x] 6.5 `syncPushDevice()`/`unregisterPushDevice()` in lib/firebase-client.ts: token remembered at `gracesalon:push-token` (try/catch); **AuthProvider** calls syncPushDevice whenever `user` is set (refresh on every load) and `logout()` awaits unregisterPushDevice FIRST (session still valid) then logs out
- [x] 6.6 `components/ui/NotificationSettings.tsx` mounted on the account page (profile, below tabs): soft-ask card, switch toggle when granted, Enable button otherwise, denied/unconfigured messages
- Gates: tsc ✅, lint ✅, build ✅

## PHASE 7: TESTS
- [x] 7.1 Unit tests (25 new, **89 total green**):
  - `tests/notify.test.ts` (13): email idempotency, push idempotency, event isolation, channel isolation (email reject → push still sends + email not logged for retry; push reject → email unaffected), guest = email-only (deviceToken never queried), stale-token revocation for both FCM codes + mixed results, CONFIRMED attaches .ics, CANCELLED template, data-only payload {type,bookingId,deepLink,title,body}
  - `tests/password-reset.test.ts` (12): enumeration-safe (identical known/unknown responses), SHA-256-only storage (raw emailed token hashes to stored hash), older tokens invalidated, provider failure still generic 200, CSRF 403, email validation; reset: expired→400, used→400, unknown→400, hash lookup (never raw), min-8 rule, success = bcrypt($2*$12$) + mark used + `revokeAllUserTokens`
  - Mocks: firebase-admin (via `lib/firebase-admin`), Resend (via `lib/email`), Prisma, rate-limit, refresh-tokens (`vi.hoisted` for factory access)
- [x] 7.2 Manual test script — see MANUAL TEST SCRIPT section below
- Gates: `npm test` 8/8 files **89/89** ✅, tsc ✅ (3 pre-existing test errors), lint ✅

## FINAL ACCEPTANCE ✅ (all verified 2026-09-29 against live dev server + prod build)

Local email delivery was exercised through a mock Resend transport
(`scripts/mock-resend.ts`, `RESEND_BASE_URL` override — the sandbox `.env`
has an empty `RESEND_API_KEY`, so `sendTransactionalEmail` returns false and
NotificationLog (written only on success) would never populate). All other
layers are real: Prisma, notifyBooking, HTTP routes, cron, Lighthouse.

- [x] A1 Password reset entirely over email; no WhatsApp send path
  - forgot-password known vs ghost → byte-identical `{message}` + 200 (enumeration-safe)
  - reset link email delivered through Resend client (`Reset Your Password — Grace Salon` in mock log)
  - `git grep` of app/api/auth, app/reset-password, lib/email, lib/notify: no WhatsApp send path (only `whatsappNumber` contact-field identifiers remain)
- [x] A2 Repo search: whatsapp/graph.facebook/waba → only wa.me links
  - provider terms (`graph.facebook`, `sendWhatsApp`, `WHATSAPP_ACCESS_TOKEN`, `waba`) → only a middleware code comment, 2 wa.me links (Footer.tsx:138, PillNav.tsx:78 — flagged for human review), `whatsappNumber` field refs, and false positives inside base64 PNG blobs
- [x] A3 Logged-in booking → email + push; notifyBooking twice → no dupes
  - POST /api/bookings (userId set) → `CONFIRMED/email` row + `Booking Confirmed` email with `grace-salon-booking.ics` attachment
  - push: device token registered, `[Notify] Firebase not configured — skipping push` (env-gated skip; real send = HUMAN STEPS Firebase config)
  - `re-notify` ×2 → rows before=1 after=1 → no dupes
- [x] A4 Guest booking → email only, no errors
  - guest POST (no userId) → `CONFIRMED/email` only; pushChannel never queried for guests; email delivered with .ics; HTTP 201, no errors
- [x] A5 Cancel → CANCELLED; stale tokens revoked
  - PATCH status=cancelled → `CANCELLED/email` row appended (200, `Booking Cancelled` email delivered)
  - stale-token revocation covered by unit tests (`registration-token-not-registered` / `invalid-registration-token` → revokedAt; needs live Firebase to E2E — HUMAN STEPS)
- [x] A6 Reminder cron twice in window → each reminder once
  - booking ~1h out; run 1 → `sent1h:1` + 1 `Appointment Reminder` email + `REMINDER_1H/email` row; run 2 → counter still reports eligible candidates but 0 new sends (NotificationLog dedupe inside notifyBooking) — exactly 1 email in mock log
- [x] A7 SW caches nothing under /api or authed routes
  - `public/firebase-messaging-sw.js` contains only `push` + `notificationclick` listeners; zero `fetch(`, `caches`, cache APIs (grep proof); serves 200 at /firebase-messaging-sw.js in dev and prod
- [x] A8 Lighthouse installability on prod build
  - `npx lighthouse@11 --only-categories=pwa` against `next start` (Edge headless): **PWA score = 1**; `installable-manifest` PASS ("manifest and service worker meet the installability requirements"), maskable icon, splash screen, themed omnibox, viewport, content-width all PASS → `lighthouse-pwa.json`
  - prod assets verified 200: /, /manifest.webmanifest (complete: name, short_name, start_url, scope, standalone, 192/512/maskable icons), /firebase-messaging-sw.js, /icons/icon-192.png
  - note: middleware forces HTTPS when NODE_ENV=production → local prod server returns 307 unless `x-forwarded-proto: https` header present (correct for Vercel which sets it; Lighthouse run used `--extra-headers`)
- [x] A9 tsc + lint + next build clean
  - `tsc --noEmit`: only the 3 pre-existing `tests/api-edge.test.ts` Request-vs-NextRequest errors (documented, unrelated)
  - `next lint`: 0 errors, only pre-existing react-hooks/exhaustive-deps warnings
  - `next build`: success, full route table incl. `/manifest.webmanifest`, `/api/devices/*`, `/reset-password`
  - `npm test`: **89/89 green** (8 files, incl. real-DB EDGE-01 concurrency)

Cleanup after acceptance: all test bookings deleted (`1+1+1`), fixture gender restored to `other`, NotificationLog back to 0 rows, acceptance DeviceToken removed, cookie files removed.

---

## VERIFICATION LOG
- Phase 1 inventory complete (searches + scripts/inventory-accounts.ts → 0 phone-only accounts)
- CSP: no WhatsApp domains present ✅
- Tests contain no WhatsApp refs ✅

## MIGRATION SQL (printed before applying)

### Phase 2.1 — `20260929000000_password_reset_tokens_hashed` ⚠️ DESTRUCTIVE
Drops `PasswordResetToken.token` + `used` (raw OTP data is lost — transient rows only),
adds `tokenHash`/`usedAt`/`requestIp`, creates `EmailVerificationToken`.
NOTE: `prisma migrate dev` demanded a full schema reset (pre-existing drift between
migration history and live DB — unrelated to this change, `migrate diff` live→schema
shows only the SQL below). Applying via `db execute` + `migrate resolve --applied`.
```sql
-- DropIndex
DROP INDEX "PasswordResetToken_userId_token_key";
-- AlterTable
ALTER TABLE "PasswordResetToken" DROP COLUMN "token",
DROP COLUMN "used",
ADD COLUMN     "requestIp" TEXT,
ADD COLUMN     "tokenHash" TEXT NOT NULL,
ADD COLUMN     "usedAt" TIMESTAMP(3);
-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");
-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_userId_otpHash_key" ON "EmailVerificationToken"("userId", "otpHash");
-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### Phase 3.4 — `20260929000001_drop_whatsapp_message_log` ⚠️ DESTRUCTIVE
Drops the `WhatsAppMessageLog` audit table (WhatsApp-only) and deletes the two
WhatsApp-only SystemSetting rows. `User.whatsappNumber` is KEPT (contact info —
booking flow uses it as a phone fallback; contract forbids dropping it).
```sql
-- Drop WhatsApp-only message log table
DROP TABLE "WhatsAppMessageLog";
-- Remove WhatsApp-only system settings rows
DELETE FROM "SystemSetting" WHERE "key" IN ('whatsapp_business_number', 'whatsapp_cancellation_policy');
```

## MANUAL TEST SCRIPT
```bash
# 0. Prereqs: .env has DATABASE_URL, SESSION_SECRET, RESEND_API_KEY, EMAIL_FROM,
#    NEXT_PUBLIC_BASE_URL. Optional: FIREBASE_* + NEXT_PUBLIC_FIREBASE_* (push).
#    npx prisma migrate deploy && npm run dev

# 1. Password reset (email link, enumeration-safe)
curl -s -X POST localhost:3000/api/auth/forgot-password -H 'Content-Type: application/json' \
  -d '{"email":"nobody@example.com"}'          # → 200 {message}
curl -s -X POST localhost:3000/api/auth/forgot-password -H 'Content-Type: application/json' \
  -d '{"email":"known@user.com"}'              # → 200 IDENTICAL {message}; email sent
# open the emailed link → /reset-password?token=… → set new password
# then: old password → 401; refresh with old cookie → 401; token reuse → 400

# 2. Device registration (login first: POST /api/auth/login, keep cookies)
curl -s -b c.txt -X POST localhost:3000/api/devices/register \
  -H 'Content-Type: application/json' -d '{"token":"test-token","platform":"web"}'
# → {ok:true}; unregister → {ok:true} + row.revokedAt set

# 3. Booking notifications: create a booking while logged in → email row in
#    NotificationLog (CONFIRMED/email); call notifyBooking again → no second send.
#    Guest booking → email only. Cancel → CANCELLED row (+ WAITLIST_SLOT_OPEN).

# 4. Reminder cron (idempotent per window)
curl -s -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/reminders
# run twice → each eligible reminder sent once (NotificationLog dedupe)

# 5. PWA: production build → open /manifest.webmanifest, /icons/*,
#    /firebase-messaging-sw.js; Chrome DevTools → Application → Manifest →
#    "installable"; Lighthouse → Installable.

# 6. Push (requires Firebase env): browser → account page → Enable → device row
#    created; cancel a booking → system notification → click focuses the tab.
```

## HUMAN STEPS (required — cannot be done without credentials/decisions)

### 🚀 Deploy on Netlify — build pipeline VERIFIED locally, dashboard steps only
- [x] Local proof: `npx netlify-cli build --offline` ran the **full platform pipeline** → success/exit 0: build command (`npm run build`), auto-detected `@netlify/plugin-nextjs` (OpenNext adapter — do NOT pin its version), functions bundling (`___netlify-server-handler` + `reminders-cron.mjs`) and edge bundling (`middleware` → edge function). Gates also green: `npm run build` ✅, `npm test` 89/89 ✅.
- [x] `netlify.toml` (build = `npm run build`, NODE_VERSION 20, zero-config, no publish dir per official docs) + `.npmrc` (`legacy-peer-deps=true` — prevents the pre-existing vitest/vite ERESOLVE from failing Netlify's npm install)
- [x] `netlify/functions/reminders-cron.mjs` — scheduled `*/10 * * * *` (UTC, published deploys only, 30s cap) replaces Vercel Cron; calls `/api/cron/reminders` with `CRON_SECRET`. `vercel.json` kept so either host works.
- [ ] Connect the repo in the Netlify dashboard (framework auto-detected; build settings come from `netlify.toml`)
- [ ] Paste env vars into Site settings → Environment variables — full list in `MOBILE_APP_INTEGRATION.md` §10 (`DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_BASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `FIREBASE_*`, `NEXT_PUBLIC_FIREBASE_*`, optional `UPSTASH_*`)
- [ ] Post-deploy smoke: HTTPS site 200, `/manifest.webmanifest` + `/icons/icon-192.png` + `/firebase-messaging-sw.js` 200, login works, then Functions → `reminders-cron` → **Run now** → expect 200 `{"message":"Reminders processed"...}`
- [ ] Mobile alignment doc delivered: `MOBILE_APP_INTEGRATION.md` (auth cookie flow, changed shapes, push payload contract, QA checklist)

1. **Firebase project (push delivery) — server credentials DONE + verified 2026-09-29, VAPID key still needed**
   - [x] Project `grace-5f2da` created; web app added; `firebaseConfig` captured into local `.env` (`NEXT_PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,MESSAGING_SENDER_ID,APP_ID}`) and rebuilt — values verified inlined in client chunks
   - [x] Service account: `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` set in local `.env` **read directly from the downloaded JSON** (a hand-typed copy produced `invalid_grant: Invalid JWT Signature` — proven corrupted, 1708 vs 1736 chars). Verified against Google: Admin SDK mints a token and FCM rejects a bogus device token (`registration token is not a valid FCM registration token`) = full auth OK. Key file deleted after extraction; `*firebase-adminsdk*.json` added to .gitignore
   - [ ] **STILL NEEDED**: Project settings → Cloud Messaging → **Web configuration → generate key pair** → `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (currently empty — `getFcmToken` returns null without it)
   - [ ] Mirror env into Netlify → Site settings → Environment variables (or Vercel): `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `FIREBASE_*`, `NEXT_PUBLIC_FIREBASE_*` → redeploy (NEXT_PUBLIC_ vars need the redeploy to inline)
   - [ ] Verify: site → Account → Enable notifications → device row created → cancel a booking → system notification → click focuses the tab
2. **Resend email — LOCAL CONFIGURED 2026-09-29, Vercel still pending**
   - Local `.env`: real `RESEND_API_KEY` set (verified against API — auth OK) + `EMAIL_FROM="Grace Salon <onboarding@resend.dev>"` (Resend's default sender, works without domain verification)
   - ⚠️ **onboarding@resend.dev only delivers to YOUR Resend account email** — customer emails will 403/bounce until a domain is verified. Subdomain NOT required: verify the root domain (e.g. `workframe.dev`) in resend.com → Domains → add DNS records, then switch `EMAIL_FROM` to e.g. `Grace Salon <no-reply@workframe.dev>`
   - Netlify (or Vercel) → set the same `RESEND_API_KEY` + `EMAIL_FROM` there too
   - local testing trick: `RESEND_API_KEY=re_local_mock RESEND_BASE_URL=http://127.0.0.1:8099 npx tsx scripts/mock-resend.ts` (dev only, never production)
3. **PWA icons are placeholders** — `public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png` were generated by `scripts/generate-pwa-icons.ts` (beige field + dark disc). Drop real artwork over those files (192×192, 512×512, 512×512 maskable with ≥80px safe zone) or extend that script with the real logo.
4. **wa.me links — decision needed** — two click-to-chat links remain (plain `<a>` hrefs, no API): `components/layout/Footer.tsx:138` and `components/ui/PillNav.tsx:78` (`wa.me/919238381831`). Keep as salon contact buttons or remove — product call.
5. **CRON_SECRET — set locally 2026-09-29 (random 64-hex), host still pending** — `.env` now has a generated secret; copy the SAME value into Netlify → Environment variables so `/api/cron/reminders` rejects `Bearer undefined` in production (the scheduled function `netlify/functions/reminders-cron.mjs` reads it — test with Functions → Run now). Local servers must be restarted to pick it up.
6. **Local prod-server quirk** — middleware forces HTTPS when `NODE_ENV=production`, so plain `next start` 307-redirects localhost (no `x-forwarded-proto`). Expected: Vercel always sets it. For local prod checks pass `-H "x-forwarded-proto: https"` (Lighthouse: `--extra-headers`). Also make sure no stray `NODE_ENV` export pollutes the dev shell (caused earlier 307s in dev).
7. **Cancel old WhatsApp/Meta provider** — code is removed, but any Meta WABA/business account or WhatsApp API keys still in `.env` (`WHATSAPP_*`) may bill — cancel/rotate externally. Old keys left untouched in `.env` (gitignored) — delete when no longer needed.
8. **Phone-only accounts**: 0 of 12 — nobody is locked out by the email-only reset flow; no action.
9. **Flutter parity report** (from Phases 2–3): reset body `{email,otp,password}` → `{token,newPassword}`; forgot-password message text changed (shape unchanged); register no longer requires `whatsappNumber`; admin `/api/admin/whatsapp-logs` → 404. RESCHEDULED event has no firing code path yet (no reschedule endpoint exists).

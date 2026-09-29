# Mobile App Integration Guide

**Backend ↔ Flutter (and any native client) contract** for Grace Salon / Aurelia.
Last aligned: **2026-09-29** — after the WhatsApp removal, the new notification
system, and the Netlify deployment setup. Anything marked ⚠️ **CHANGED** is a
breaking change mobile must adopt.

Related server docs: [progress.md](progress.md) (phases, migrations, HUMAN STEPS).

---

## 1. Conventions

- **JSON in / JSON out**, UTF-8, `Content-Type: application/json`.
- Production base URL = the Netlify site URL (`https://<site>.netlify.app`,
  or a custom domain). Dev = `http://localhost:3099`.
- Errors are always `{ "error": "<message>" }` with a 4xx/5xx status.
  Success shapes are per-endpoint below.
- **Auth is COOKIE-based — there is no `Authorization: Bearer` support.**
  The session JWT lives in an `httpOnly` cookie. Native clients must keep a
  cookie jar (e.g. `dio` + `dio_cookie_interceptor` / `cookie_jar`, or
  `http` with manual `Cookie` header handling).
- **CSRF**: the server validates the `Origin` header *only when the client
  sends one*. Native clients that send **no `Origin` header are allowed
  through** (protected instead by JWT + rate limits). Recommendation for the
  app: **do not send an `Origin` header at all**. If you do send one, it must
  match the API host exactly or you get `403 {"error":"Invalid request origin"}`.
- Session cookies: `gracesalon_session` (access JWT, **15 min**) and
  `gracesalon_refresh` (refresh JWT, **7 days**), both `httpOnly`,
  `SameSite=Lax`, `Secure` in production.

---

## 2. Authentication

### Login
```
POST /api/auth/login   { "email": "...", "password": "..." }
→ 200 { "user": {...} }          + Set-Cookie: gracesalon_session, gracesalon_refresh
→ 400 {error: "Email and password are required"}
→ 401 {error: "Invalid email or password"}
→ 429 {error: "Too many login attempts..."} + Retry-After   (5/min per IP)
```
Store **both** cookies and attach them (`Cookie:` header) to every request.

### Session check
```
GET /api/auth/me   → 200 { "user": {...} }  |  401 {"error":"Authentication required"}
```

### Refresh (⚠️ single-use rotation — read this carefully)
```
POST /api/auth/refresh     (sends gracesalon_refresh cookie)
→ 200 { "ok": true }        + BOTH cookies rotated (new access + new refresh)
→ 401 {"error": "..."}      + refresh cookie cleared → full re-login
```
- Every refresh **revokes the old refresh token** and issues a new one.
- **Reuse detection**: presenting an already-revoked refresh token revokes
  **ALL** sessions for that user (`401 "Session compromised. All sessions
  revoked."`). Therefore the app MUST:
  1. **Serialize refreshes** (mutex/queue — never fire two refresh calls
     concurrently, e.g. from parallel API 401 retries);
  2. On any 401 from an API call → try refresh **once** → retry the original
     request once → otherwise show login;
  3. On `Session compromised` / refresh 401 → clear local session → login screen.

### Logout
```
POST /api/auth/logout            → {message:"Logged out successfully"}  (clears cookies)
POST /api/auth/logout-everywhere → {message:"All sessions revoked"}      (revokes all refresh tokens)
```
**Order matters**: call `POST /api/devices/unregister` **before** logout
(it needs a valid session), then logout.

### Rate limits (per IP, approximate across serverless instances)
| Endpoint | Limit |
|---|---|
| login | 5/min |
| register | 3/min |
| forgot-password | 3/min per email + 10/min per IP |
| reset-password | 5/min per IP |
| devices register/unregister | 20/min |
Password rules: **8–128 chars** (register + reset).

---

## 3. Signup & email verification — ⚠️ CHANGED (OTP is now EMAIL)

WhatsApp OTP is **gone**. Verification codes are emailed via Resend.

```
POST /api/auth/register   { name, email, password, gender, whatsappNumber? }
→ 201 { "user": {...}, "otpSent": true, "message": "Account created! Check your email for the verification code." }
   + session cookies (user is logged in immediately)
```
- `whatsappNumber` is now **OPTIONAL** (was required when it carried the
  WhatsApp OTP). It is kept purely as a contact field.
- `gender` is required (used for specialist availability matching).

Verification (session required — you already have cookies from register):
```
POST /api/auth/verify-email  { "action": "send" }
→ {message:"Verification code sent to your email"} | 404 {error:"User not found"} | {message:"Account already verified"}

POST /api/auth/verify-email  { "action": "verify", "otp": "123456" }
→ {message:"Account verified successfully"} | 400 {error} (wrong/expired)
```
6-digit code, **15-minute** expiry, stored SHA-256-hashed server-side.
**All in-app copy must say "email", never "WhatsApp".**

---

## 4. Password reset — ⚠️ CHANGED (token LINK, shape changed)

Body changed from `{email, otp, password}` to `{token, newPassword}`.

```
POST /api/auth/forgot-password   { "email": "..." }
→ 200 ALWAYS: {"message":"If an account exists with this email, a password reset link has been sent."}
```
The response is **intentionally identical for known and unknown emails**
(account-enumeration safety) — the UI must never say "user not found".

```
POST /api/auth/reset-password    { "token": "<from link>", "newPassword": "..." }
→ 200 {"message":"Password has been reset successfully. You can now sign in."}
→ 400 {"error": "Invalid or expired link..."}   (bad / used / expired, 15 min TTL)
→ 429 rate limited
```
- The emailed link is `{BASE_URL}/reset-password?token=...` — single-use,
  all refresh tokens revoked on success.
- Mobile UX options: (a) open the link in the in-app browser / system browser
  (it lands on the web reset page), (b) later: universal link / custom scheme
  to capture `?token=` and show a native reset screen, (c) copy-paste the token.

---

## 5. Bookings (auth required)

```
GET /api/bookings
→ 200 { "bookings": [ ... ] }        (matched by userId OR email)
```

```
POST /api/bookings
{
  "serviceId": "precision-haircut",     // or "serviceIds": [..] for multi-service
  "employeeId": "arjun-mehta",
  "date": "2026-10-05",                 // YYYY-MM-DD
  "slotStart": "10:00", "slotEnd": "11:00",
  "name": "...", "email": "...", "phone": "...",
  "notes": "...",                       // optional
  "userId": "<current user id>"         // ⚠️ SEE PUSH NOTE BELOW
}
→ 201 { "booking": {...}, "discount": null|{...} }
→ 400 missing fields / invalid service / outside availability / past date
→ 403 {"error":"This specialist is not available for your booking"}   (gender mismatch)
→ 403 same-day restriction (reliability flag)
→ 409 {"error":"This slot was just taken. Please pick another."}
```
⚠️ **Push targeting**: the server sends **push only when `booking.userId` is
set** (guest bookings with `userId: null` get **email only**). Always pass the
logged-in user's id. Server computes the price — never send one.

```
PATCH /api/bookings/:id    { "status": "confirmed" | "cancelled" }   (owner or admin)
→ 200 { "booking": {...} }
```
Cancelling triggers the **CANCELLED** notification to the customer **and**
cascades **WAITLIST_SLOT_OPEN** to the next person in line.

```
GET /api/availability?employeeId=arjun-mehta&date=2026-10-05
→ { "slots": [ { "start":"10:00", "end":"11:00", "employeeId":"...", "isBooked":false }, ... ] }
```

---

## 6. Waitlist (auth required)

```
POST /api/waitlist   { employeeId, slotStart, slotEnd, slotDate?, serviceId? }
→ 201 { "entry": {...} }
→ 409 already waiting for this slot | 400 you already have a booking for this slot

GET  /api/waitlist/me            → { "entries": [...] }        (mine)
GET  /api/waitlist?...           → { "entries": [ranked...] }   (by employee/slot)

POST /api/waitlist/:id/claim
→ 200 { "booking": {...}, "message": "Slot claimed successfully!..." }
→ 403 not yours | 404 not found
```
When a slot opens, the top-ranked member gets **WAITLIST_SLOT_OPEN**
(push + email) with a claim window; on expiry the next member is notified.

---

## 7. Push notifications — device registration & payload (SHARED CONTRACT)

### Register / unregister the FCM token (auth required)
```
POST /api/devices/register    { "token": "<FCM registration token>", "platform": "android" }
→ { "ok": true }        (upsert by token; refreshes lastSeenAt)

POST /api/devices/unregister  { "token": "..." }
→ { "ok": true }        (idempotent; sets revokedAt)
```
- `platform` enum is exactly **`"android" | "web"`** (zod-validated).
  ⚠️ Known gap: an **iOS build needs `"ios"` added to the enum** — flag it to
  the backend when the iOS app ships; do not send `"ios"` today (400).
- Token lifecycle in Flutter (`firebase_messaging`):
  1. after login → `getToken()` → `POST /api/devices/register`
  2. `onTokenRefresh` → re-register (tokens rotate)
  3. **before logout** → `POST /api/devices/unregister` (while session valid)
- Rate limit 20/min/IP.

### Push payload — **data-only** (the app must build the notification)
The server sends FCM **data messages only** — no `notification:` block:
```json
{
  "type": "CONFIRMED | RESCHEDULED | CANCELLED | REMINDER_24H | REMINDER_1H | WAITLIST_SLOT_OPEN",
  "bookingId": "<id>",
  "deepLink": "/bookings/<id>",
  "title": "Booking confirmed ✅",
  "body": "Your appointment on Fri, 3 Oct at 10:00 is confirmed."
}
```
- Android/Flutter: handle in the background message handler; display via
  `flutter_local_notifications` using `title`/`body` (data-only messages are
  not auto-displayed by the OS in every state).
- Tap → parse `deepLink` → navigate to the booking detail route
  (`/bookings/:id` in the app's router).
- `RESCHEDULED` exists in the contract but **no backend endpoint fires it yet**
  (there is no reschedule endpoint) — handle the type anyway for parity.

### Delivery rules (server-side — do not duplicate in the app)
- **Email is ALWAYS attempted** (guests included).
- **Push only** when the booking has a `userId` with ≥1 active device token.
- `NotificationLog(bookingId, event, channel)` is unique → **exactly one send
  per channel per event**; failed sends are retried on the next trigger;
  `messaging/registration-token-not-registered` / invalid tokens are
  auto-revoked server-side.
- Reminders: **24h** (23–25h window) and **~1h** (0.5–1.5h window), cron every
  10 minutes — the app does nothing for reminders except display what arrives.

---

## 8. Profile

```
PUT /api/auth/profile
{ name?, email?, avatarUrl?, whatsappNumber?, currentPassword?, newPassword? }
→ 200 { "user": {...} }        (password change requires currentPassword)
→ 401 auth required | 400/403 on validation
```
`whatsappNumber` is a plain **contact field** (kept by contract; error texts
now say "phone number"). The app must not label it as a WhatsApp verification.

Other surfaces that exist and are safe to use: `/api/services`,
`/api/employees`, `/api/testimonials`, `/api/suggest`, `/api/loyalty*`,
`/api/admin/*` (admin role only — `requireRole`, admin passes all role checks).

---

## 9. Status-code catalog

| Status | Meaning |
|---|---|
| 400 | validation / business rule (messages in `{error}`) |
| 401 | no/expired session → refresh once, else login; also refresh failures |
| 403 | role insufficient · gender mismatch · cross-site Origin (web only) |
| 404 | resource not found |
| 409 | conflicts (slot taken, duplicate waitlist, duplicate email) |
| 429 | rate limited — honor `Retry-After` when present |
| 500 | `{error}` generic; log server-side only |

`GET /api/cron/reminders` requires `Authorization: Bearer <CRON_SECRET>` —
server-internal, **never** call from the app.

---

## 10. Environment (server, Netlify)

Set in **Netlify → Site settings → Environment variables** (all required
unless noted). `NEXT_PUBLIC_*` values are inlined at **build** time — changing
them requires a redeploy.

```
DATABASE_URL            SESSION_SECRET           NEXT_PUBLIC_BASE_URL
RESEND_API_KEY          EMAIL_FROM               CRON_SECRET
FIREBASE_PROJECT_ID     FIREBASE_CLIENT_EMAIL    FIREBASE_PRIVATE_KEY   (literal \n ok)
NEXT_PUBLIC_FIREBASE_API_KEY     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID      NEXT_PUBLIC_FIREBASE_VAPID_KEY
UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   (optional, distributed rate limiting)
```

Deployment: `netlify.toml` is zero-config (Netlify's Next.js adapter handles
SSR, `/api/**` route handlers, and middleware as an edge function). Reminders
run via `netlify/functions/reminders-cron.mjs` (every 10 min, published
deploys only — it calls `/api/cron/reminders` with `CRON_SECRET`; `vercel.json`
remains for an optional Vercel deployment of the same app).

---

## 11. Mobile QA checklist

- [ ] Signup → OTP arrives **by email** → verify → logged in (cookies present)
- [ ] Forgot-password → identical generic response for real & fake email;
      emailed link resets; old password fails; old refresh cookie 401s
- [ ] Login → cookies stored → `/api/auth/me` works on a fresh app launch
- [ ] Refresh rotation: force a 401 (wait 15 min) → single refresh → retry
      succeeds; **no parallel refreshes** (reuse detection kills all sessions)
- [ ] Booking **with userId** → email received → push received (device
      registered) → tap opens `/bookings/:id`
- [ ] Guest booking (logged out) → email only, no push, no errors
- [ ] Cancel → CANCELLED push/email; waitlisted user receives WAITLIST_SLOT_OPEN
- [ ] Reminder ~1h before slot → arrives **once** even if cron ran repeatedly
- [ ] Unregister device → logout → no further pushes
- [ ] 429s handled with backoff (login: 5/min)

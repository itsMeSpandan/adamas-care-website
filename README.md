# Adamas Care — Salon & Spa Booking Platform

A full-stack salon/spa appointment-booking web app built with **Next.js 14 (App Router)**,
**TypeScript**, **Prisma + PostgreSQL**, **Tailwind CSS**, and **JWT authentication**.

Customers browse services and the team, book appointments against each specialist's real
availability, manage their profile, and reset their password via email OTP. Staff get an
admin dashboard (analytics, bookings, services, employees, schedule) and employees get a
portal with their own schedule, reviews, and weekly bookings.

---

## ✨ Features

- **Public site** — home, services catalog, team/specialists, about, contact.
- **Booking flow** — 3-step wizard: pick service → pick specialist/date/time → confirm.
  Slots are computed from each employee's weekly availability and one-off overrides, and
  double-booking is prevented.
- **Authentication** — JWT in httpOnly cookies (`jose`), bcrypt password hashing, sign up /
  sign in / sign out, profile editing, and OTP-based password reset (EmailJS).
- **Admin dashboard** — revenue & booking analytics, recent bookings, top services, and
  management of bookings, services, employees, and weekly availability / overrides.
- **Employee portal** — personal schedule, weekly timetable, this-week bookings, and reviews.
- **Security headers** — HSTS, frame-options, nosniff, referrer-policy, permissions-policy
  applied globally via `middleware.ts`.

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router), React 18 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Neon) via Prisma 6 |
| Auth | `jose` JWT in httpOnly cookies, `bcrypt` password hashing |
| Email | EmailJS (OTP) — Resend wired but legacy |
| Animation | Framer Motion, animejs |
| Validation | Server-side checks (see Security) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (a free [Neon](https://neon.tech) instance works well)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string, **must use the `postgresql://` or `postgres://` scheme** (Prisma Client rejects `prisma+postgresql://`). |
| `SESSION_SECRET` | ✅ | Strong random secret for signing JWTs. Generate with `openssl rand -base64 48`. **The app refuses to start if this is missing.** |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Base URL used in password-reset links (e.g. `http://localhost:3000`). |
| `EMAILJS_PUBLIC_KEY` / `EMAILJS_PRIVATE_KEY` / `EMAILJS_SERVICE_ID` / `EMAILJS_OTP_TEMPLATE_ID` | ⚪ | Enables OTP emails. If unset, OTPs are logged to the server console (dev). |
| `RESEND_API_KEY` / `EMAIL_FROM` | ⚪ | Legacy email provider; optional. |

### 3. Set up the database
```bash
npx prisma generate     # generate the Prisma client
npx prisma db push      # create/upddate tables from schema.prisma
npm run db:seed         # (optional) seed services, team, and demo accounts
```

### 4. Run the app
```bash
npm run dev            # http://localhost:3000
```
Production build:
```bash
npm run build && npm run start
```

---

## 🗂️ Project Structure

```
app/
  (pages)         home, services, team, about, contact, booking, profile, reset-password
  admin/          admin dashboard (analytics, bookings, services, employees, schedule)
  employee/       employee portal
  api/            Route handlers (auth, bookings, services, employees, availability, ...)
components/        UI: layout (Navbar/Footer), sections, cards, ui primitives
lib/               auth, db, queries, require-auth, rate-limit, emailjs, resend, utils, types
prisma/            schema.prisma + seed.ts
scripts/           migrate-passwords.ts (plaintext → bcrypt one-time migration)
middleware.ts      global security headers
```

---

## 👤 Demo Accounts (after seeding)

Passwords are `<email-prefix>123`. Use these to explore each role:

| Email | Password | Role |
|-------|----------|------|
| `admin@adamascare.com` | `admin123` | Admin |
| `demo@adamascare.com` | `demo123` | Customer |
| `priya@adamascare.com` | `priya123` | Employee |
| `anjali@adamascare.com` | `anjali123` | Employee |

> ⚠️ Seed accounts are created with **plaintext** passwords. Run `npm run db:seed` then
> `npx tsx scripts/migrate-passwords.ts` once to hash them, otherwise login will fail
> (the app authenticates with bcrypt).

---

## 🔐 Authentication & Authorization Model

- Sessions are JWTs stored in **httpOnly, sameSite=lax** cookies (`adamascare_session`,
  15-minute access + 7-day refresh). The access token's `role` claim gates admin/employee routes.
- API route protection helpers: `requireAuth` (any logged-in user) and `requireRole("admin", ...)`
  in `lib/require-auth.ts`.
- `GET /api/bookings` returns **all** bookings only to admin/employee; a customer sees only
  their own. `PATCH /api/bookings/[id]` enforces ownership for non-staff.
- Booking price is computed **server-side** from the selected service; client-supplied prices
  are ignored.
- Password reset uses a 6-digit OTP (cryptographically random) scoped per user.

---

## 🧪 Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:seed` | Seed services, team, demo accounts |
| `npx prisma generate` / `db push` / `db studio` | Prisma client, schema push, GUI |

---

## 🛡️ Security Notes

A security & code-cleanliness audit was performed; see **`AUDIT_REPORT.md`** and
**`STAGE1_2_REPORT.md`** for findings and remediation status. Highlights:

- **Secrets:** the DB URL and `SESSION_SECRET` come from environment variables only — never
  hardcode them, and keep `.env` out of version control (already git-ignored).
- **Done:** JWT fail-closed secret, PII scoping on bookings, profile/booking IDOR fixes,
  server-side price, per-user OTP uniqueness, safe delete cascade.
- **Still recommended:** a shared-store rate limiter (current limiter is in-memory),
  refresh-token lifecycle, a Content-Security-Policy header, and database indexes on hot columns.

---

## 📄 License

Internal project — see repository owner for usage terms.

# Grace Salon — Salon & Spa Booking Platform

A full-stack salon/spa appointment-booking web app built with **Next.js 14 (App Router)**,
**TypeScript**, **Prisma + PostgreSQL**, **Tailwind CSS**, and **JWT authentication**.

Customers browse services and the team, book appointments against each specialist's real
availability, manage their profile, and reset their password via email OTP. Staff get an
admin dashboard (analytics, bookings, services, employees, schedule, waitlist, audit logs)
and employees get a portal with their own schedule, reviews, and weekly bookings.

---

## ✨ Features

> 📄 **Full feature documentation:** See [FEATURES.md](./FEATURES.md) for comprehensive details.

- **Public site** — home, services catalog, team/specialists, about, contact.
- **Booking flow** — 3-step wizard: pick service(s) → pick specialist/date/time → confirm.
  Double-booking prevented via Postgres advisory locks + atomic DB checks.
  **Multi-service booking** with combined duration + per-transition buffer.
- **Gender-matched specialists** — users are prioritized for specialists of the same gender.
- **Waitlist** — scored waitlist with reliability tracking when slots are full.
- **Authentication** — JWT in httpOnly cookies with **refresh token rotation** and server-side
  revocation. `hash-wasm` bcrypt, OTP password reset, email verification.
- **Admin dashboard** — analytics, bookings, services, employees, schedule, holidays,
  loyalty management, waitlist dashboard, audit logs.
- **Employee portal** — personal schedule, weekly timetable, bookings, reviews.
- **Loyalty points & rewards** — earn points on completed bookings, redeem for discounts.
- **Holidays** — Indian public/festive holidays + admin custom holidays on booking calendar.
- **Transactional emails** — booking confirmations and reminders via Resend.
- **WhatsApp confirmations** — booking summaries sent via WhatsApp Cloud API.
- **Cancellation policy** — late cancellation tracking, automatic restrictions for repeat offenders.
- **Security headers** — HSTS, CSP, frame-options, nosniff, referrer-policy.
- **Redis-backed rate limiting** — Upstash Redis for distributed rate limiting across serverless instances.

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router), React 18 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Neon) via Prisma 6 |
| Auth | `jose` JWT in httpOnly cookies, `hash-wasm` bcrypt, refresh token rotation |
| Rate Limiting | Upstash Redis (`@upstash/ratelimit`) with in-memory fallback |
| Email | Resend (transactional) + EmailJS (OTP) |
| WhatsApp | WhatsApp Cloud API |
| Error Tracking | Sentry |
| Animation | Framer Motion, animejs |
| CI | GitHub Actions (lint, typecheck, test, build) |

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
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Strong random secret for signing JWTs. Generate with `openssl rand -base64 48` |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Base URL for password-reset links |
| `UPSTASH_REDIS_REST_URL` | ⚪ | Redis URL for distributed rate limiting. Falls back to in-memory when not set |
| `UPSTASH_REDIS_REST_TOKEN` | ⚪ | Redis auth token |
| `RESEND_API_KEY` | ⚪ | Resend API key for transactional emails |
| `EMAIL_FROM` | ⚪ | Sender email address for Resend |
| `EMAILJS_*` | ⚪ | EmailJS credentials for OTP password reset |
| `WHATSAPP_*` | ⚪ | WhatsApp Cloud API credentials. See [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) |
| `NEXT_PUBLIC_SENTRY_DSN` | ⚪ | Sentry DSN for error tracking |

### 3. Set up the database
```bash
npx prisma migrate deploy    # apply migrations (production)
# OR for development:
npx prisma migrate dev       # create + apply migrations
npm run db:seed              # seed services, team, demo accounts
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
  (pages)         home, services, team, about, contact, booking, profile, verify-email
  admin/          admin dashboard (analytics, bookings, services, employees, schedule, waitlist, logs)
  employee/       employee portal
  api/            Route handlers (auth, bookings, services, employees, availability, cron, health)
  account/        user account pages (loyalty, waitlist)
components/        UI: layout (PillNav/Footer), sections, cards, ui primitives
lib/               auth, db, queries, require-auth, rate-limit, email, whatsapp, refresh-tokens, scoring-engine
prisma/            schema.prisma + seed.ts + migrations/
scripts/           utility scripts
middleware.ts      security headers + HTTPS redirect
vercel.json        cron configuration for reminder emails
```

---

## 👤 Demo Accounts (after seeding)

Passwords are `<email-prefix>123`. Use these to explore each role:

| Email | Password | Role |
|-------|----------|------|
| `admin@gracesalon.com` | `admin123` | Admin |
| `demo@gracesalon.com` | `demo123` | Customer |
| `priya@gracesalon.com` | `priya123` | Employee |
| `rahul@gracesalon.com` | `rahul123` | Employee |

---

## 🧪 Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run test` | Run test suite (64 tests) |
| `npm run db:seed` | Seed services, team, demo accounts |
| `npm run db:seed-holidays` | Seed Indian public & festive holidays |
| `npm run db:seed-test-user` | Create test customer with loyalty data |
| `npm run db:backfill-loyalty` | Award points for historical completed bookings |
| `npx prisma migrate dev` | Create and apply migrations (development) |
| `npx prisma migrate deploy` | Apply pending migrations (production) |
| `npx prisma db studio` | Open Prisma GUI |

---

## 🔐 Security

- **JWT auth** with httpOnly cookies, 15min access + 7-day refresh tokens
- **Refresh token rotation** — old tokens revoked on refresh, reuse detection triggers full revocation
- **Server-side price computation** — client-supplied prices are ignored
- **Advisory lock booking** — prevents double-booking via Postgres advisory locks
- **Rate limiting** — Upstash Redis (distributed) with in-memory fallback
- **Email verification** — unverified accounts cannot book
- **Cancellation policy** — late cancels tracked, repeat offenders restricted
- **Security headers** — HSTS, CSP, X-Frame-Options, nosniff, referrer-policy
- **HTTPS enforcement** — all HTTP redirected to HTTPS in production
- **Audit logs** — all admin actions logged with IP and timestamp

---

## 📄 License

Internal project — see repository owner for usage terms.

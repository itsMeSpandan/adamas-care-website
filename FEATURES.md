# Adamas Care — Feature Documentation

Comprehensive feature reference for the Adamas Care salon & spa booking platform.

---

## 1. Public Site

- **Home** — Hero section with booking CTA, featured services, team previews, testimonials, and contact info.
- **Services Catalog** — Browsable list of all services with pricing, duration, and descriptions.
- **Team / Specialists** — Employee profiles with specialties, availability, and ratings.
- **About** — Company info, mission, and values.
- **Contact** — Contact form and business details.

---

## 2. Authentication & Authorization

| Feature | Details |
|---------|---------|
| Sign Up | Email + password registration with role assignment |
| Sign In | JWT in httpOnly cookies (`adamascare_session`, 15-min access + 7-day refresh) |
| Sign Out | Cookie clearing + session invalidation |
| Password Reset | 6-digit OTP via EmailJS, cryptographically random, scoped per user |
| Profile Editing | Name, email, phone, password change |
| Roles | `user` (customer), `employee`, `admin` |
| Route Protection | `requireAuth` and `requireRole("admin")` wrappers in `lib/require-auth.ts` |

---

## 3. Booking Flow

3-step wizard:

1. **Pick Service** — Browse and select from available services
2. **Pick Specialist / Date / Time** — Choose an employee, then a date, then an available time slot. Slots are computed from each employee's weekly availability and one-off overrides. Double-booking is prevented via atomic DB checks.
3. **Confirm** — Review summary and submit. Price is computed **server-side** from the selected service; client-supplied prices are ignored.

**Booking Statuses:** `pending` → `confirmed` → `completed` | `cancelled`

---

## 4. Admin Dashboard

### 4.1 Analytics
- Revenue & booking analytics with charts
- Recent bookings list
- Top services by bookings/revenue

### 4.2 Bookings Management
- View all bookings with filters (status, date, employee)
- Update booking status (confirm, complete, cancel)
- View booking details

### 4.3 Services Management
- CRUD operations for services (name, description, price, duration, category)
- Activate/deactivate services

### 4.4 Employees Management
- Add/edit/remove employees
- Assign services to employees
- Set weekly availability schedules
- Manage one-off availability overrides

### 4.5 Schedule Management
- View employee schedules by week
- Add/remove availability overrides
- Visual calendar with time slot display

---

## 5. Employee Portal

- **Personal Schedule** — Weekly timetable with available slots
- **This Week's Bookings** — Upcoming and recent bookings assigned to the employee
- **Reviews** — Customer reviews and ratings
- **Profile** — Edit personal info and change password

---

## 6. Loyalty Points & Rewards System

### 6.1 Overview

Customers earn loyalty points for completed bookings and can redeem them for discounts and free services. The system is fully server-side — all point calculations happen in `lib/loyalty.ts` using constants from `lib/constants.ts`.

### 6.2 Earning Points

| Setting | Value | Location |
|---------|-------|----------|
| Earning Rate | 1 point per ₹10 spent (`0.1` points per currency unit) | `lib/constants.ts` → `LOYALTY_POINTS_PER_CURRENCY_UNIT` |
| Max Balance | 100,000 points | `lib/constants.ts` → `LOYALTY_MAX_BALANCE` |
| Trigger | Booking status → `completed` | `lib/loyalty.ts` → `awardPointsForBooking()` |

**Example:** ₹85 haircut → 8 points, ₹150 massage → 15 points.

### 6.3 Clawback (Refund Reversal)

If a `completed` booking is later `cancelled`, previously earned points are deducted via a `refund_reversal` transaction. Balance is clamped at 0 — never goes negative.

### 6.4 Rewards Catalog

Admins create rewards with:

| Field | Description |
|-------|-------------|
| `name` | Reward display name |
| `description` | What the reward provides |
| `pointsCost` | Points required to redeem |
| `discountType` | `"percent"` \| `"fixed"` \| `"free_service"` |
| `discountValue` | Discount amount (e.g., 10 for 10%, 500 for ₹500 off) |
| `serviceId` | Optional — tie reward to a specific service |
| `stock` | Optional limited quantity (`null` = unlimited) |

### 6.5 Redemption Flow

1. User browses rewards in `/account/loyalty` → Rewards Catalog tab
2. Clicks "Redeem" on a reward (disabled if insufficient points or out of stock)
3. Confirms in modal → atomic DB transaction:
   - Validates balance ≥ cost and stock > 0
   - Decrements stock (if limited) via conditional `WHERE stock > 0` (prevents race conditions)
   - Deducts points from user
   - Creates `RewardRedemption` with unique 8-character code
   - Creates `LoyaltyTransaction` (type: `redeem`)
4. User sees redemption code with copy button and expiry (90 days default)

### 6.6 Applying Redemptions

Redemption codes can be applied at booking time:
- Validate code belongs to authenticated user, is `active`, not expired
- Apply discount to server-computed price
- Mark redemption as `used` + link to booking in same transaction

### 6.7 Admin Loyalty Management

| Page | Features |
|------|----------|
| `/admin/loyalty` | Tab-based dashboard |
| Overview Tab | Total points outstanding, total earned/redeemed, users with points, top 10 earners |
| Rewards Tab | CRUD for loyalty rewards, stock management |
| Redemptions Tab | All redemption records with status, codes, dates |
| **Users Tab** | All users with their loyalty points, booking count, transaction count, redemption count, member since date. Searchable by name/email. |

**Admin Actions:**
- Create/edit/delete rewards (soft-delete via `isActive: false`)
- Manual point adjustment for any user (`type: adjust`, requires note)
- View aggregate stats and top earners

### 6.8 User Loyalty Pages

| Page | URL | Features |
|------|-----|----------|
| Loyalty Dashboard | `/account/loyalty` | Current balance, transaction history with pagination, rewards catalog tab |
| Deep Link | `/account/loyalty?tab=rewards` | Auto-selects the Rewards Catalog tab |

### 6.9 Landing Page Integration

- "View Rewards" button beside "Book a Treatment" in the hero section
- Links to `/account/loyalty?tab=rewards`

### 6.10 Database Schema

**Models:**
- `LoyaltyTransaction` — Immutable ledger of all point movements (earn, redeem, adjust, expire, refund_reversal)
- `LoyaltyReward` — Reward definitions with cost, discount, and stock
- `RewardRedemption` — User redemption records with unique code, status, and expiry

**Enums:**
- `LoyaltyTransactionType`: `earn`, `redeem`, `adjust`, `expire`, `refund_reversal`
- `RedemptionStatus`: `active`, `used`, `expired`, `cancelled`

### 6.11 API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/loyalty` | GET | User | Current balance + paginated transaction history |
| `/api/loyalty/rewards` | GET | Public | List active, in-stock rewards |
| `/api/loyalty/redeem` | POST | User | Redeem a reward (atomic transaction) |
| `/api/loyalty/redemptions/[code]` | GET | User | Look up a redemption by code |
| `/api/admin/loyalty/rewards` | GET/POST/PATCH/DELETE | Admin | CRUD for loyalty rewards |
| `/api/admin/loyalty/adjust` | POST | Admin | Manual point adjustment |
| `/api/admin/loyalty/overview` | GET | Admin | Aggregate stats |
| `/api/admin/loyalty/users` | GET | Admin | All users with loyalty stats |

### 6.12 Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:backfill-loyalty` | Award points for historical completed bookings (idempotent) |
| `npm run db:seed-test-user` | Create test customer with bookings, points, and rewards |
| `npm run db:seed-holidays` | Seed Indian public + festive holidays |

---

## 7. Holidays System

### 7.1 Indian Holidays

Pre-seeded public and festive holidays for 2025–2026 based on the Indian calendar:

**2025:** Republic Day, Maha Shivaratri, Holi, Id-ul-Fitr, Ram Navami, Mahavir Jayanti, Good Friday, Dr. Ambedkar Jayanti, Buddha Purnima, Eid-ul-Adha, Independence Day, Janmashtami, Ganesh Chaturthi, Gandhi Jayanti, Dussehra, Diwali, Milad-un-Nabi, Christmas

**2026:** Republic Day, Maha Shivaratri, Holi, Id-ul-Fitr, Ram Navami, Mahavir Jayanti, Good Friday, Dr. Ambedkar Jayanti, Buddha Purnima, Eid-ul-Adha, Independence Day, Janmashtami, Ganesh Chaturthi, Gandhi Jayanti, Dussehra, Diwali, Milad-un-Nabi, Christmas

### 7.2 Custom Holidays

Admins can add custom holidays via `/admin/holidays`:
- Name, date, type (public/festival/custom), recurring flag
- Delete custom holidays
- Seed holidays for a specific year

### 7.3 Booking Integration

Holidays are displayed on the booking calendar, preventing bookings on holiday dates (or showing them as blocked/limited availability).

---

## 8. Security

- **JWT** in httpOnly, sameSite=lax cookies with access (15m) + refresh (7d) lifecycle
- **Server-side price computation** — client prices are ignored
- **IDOR protection** — session-derived user ID for booking access
- **Atomic DB operations** — `prisma.$transaction` for loyalty and booking conflicts
- **Rate limiting** — in-memory rate limiter on sensitive endpoints
- **Security headers** — HSTS, frame-options, nosniff, referrer-policy, permissions-policy
- **Password hashing** — hash-wasm bcrypt (WASM-based, Vercel-compatible)
- **OTP** — cryptographically random, scoped per user, time-limited

---

## 9. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router), React 18 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Neon) via Prisma 6 |
| Auth | `jose` JWT in httpOnly cookies, `hash-wasm` bcrypt |
| Email | EmailJS (OTP) |
| Animation | Framer Motion, animejs |
| Validation | Server-side checks |
| Hosting | Vercel |

---

## 10. Scripts Reference

| Script | Command | Purpose |
|--------|---------|---------|
| Dev server | `npm run dev` | Start development server |
| Build | `npm run build` | Production build |
| Lint | `npm run lint` | ESLint check |
| Seed DB | `npm run db:seed` | Seed services, team, demo accounts |
| Seed holidays | `npm run db:seed-holidays` | Seed Indian holidays |
| Seed test user | `npm run db:seed-test-user` | Create test customer with loyalty data |
| Backfill loyalty | `npm run db:backfill-loyalty` | Award points for historical bookings |
| Prisma generate | `npx prisma generate` | Generate Prisma client |
| Prisma push | `npx prisma db push` | Sync schema to database |
| Prisma studio | `npx prisma studio` | Open Prisma GUI |

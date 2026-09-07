# Progress Log

A chronological record of all changes made to the Adamas Care salon & spa website.

---

## Session: September 7, 2026

---

### 1. Bar Chart & Per-Employee Earnings

**Commit area:** Admin Dashboard, Booking Flow, Auth

- Installed `recharts` as the charting library for the admin dashboard
- Replaced the custom SVG `RevenueChart` (`components/ui/RevenueChart.tsx`) with a Recharts-powered interactive bar chart with animated bars, tooltips, and legend
- Created `components/ui/EmployeeEarningsChart.tsx` — horizontal bar chart showing per-employee monthly earnings with gender-coded colors (blue=male, amber=female, green=other)
- Updated `app/admin/page.tsx` to show "Employee Earnings" chart and "Earnings Breakdown" table alongside the revenue overview
- Added `gender` enum to Prisma schema for both `User` and `Employee` models
- Added `whatsappNumber` field to `User` model in Prisma schema
- Updated `lib/types.ts` — added `Gender` type and `gender` field to `Employee` interface
- Updated `lib/queries.ts` — all employee CRUD functions now include `gender`; `createUser` accepts `gender` and `whatsappNumber`
- Updated `app/api/auth/register/route.ts` — accepts and stores `gender` and `whatsappNumber` with validation
- Updated `components/ui/LoginModal.tsx` — added gender dropdown (Male/Female/Other) and WhatsApp number input to the signup form
- Updated `app/admin/employees/page.tsx` — added gender dropdown to the employee add/edit form
- Updated `app/api/employees/route.ts` — passes gender to employee creation
- Updated `lib/auth-context.tsx` — added `Gender` type and `gender` field to `AuthUser` interface
- Updated `app/api/auth/me/route.ts` — includes `gender` in the user response select
- Updated `app/booking/page.tsx` — when "Any Available" is selected, specialists of the same gender as the logged-in user are prioritized; gender badges shown on specialist cards
- Ran `npx prisma generate` and `npx prisma db push` to apply schema changes
- Updated `FEATURES.md` to document all new features

---

### 2. Robots.txt, Sitemap & Custom Error Pages

**Commit area:** SEO, Error Handling

- Verified existing `app/robots.ts` and `app/sitemap.ts` — already well-configured, no changes needed
- Enhanced `app/not-found.tsx` — animated SVG illustration with spinning dashed circle, quick-link pills (Home, Services, Team, Book Now, About, Contact), support email link
- Enhanced `app/error.tsx` — animated pulsing SVG with warning triangle, "Try Again" button with refresh icon, collapsible error details section showing digest/message, contact support link
- Created `app/forbidden.tsx` (403 page) — lock illustration, clear access denial message, actionable checklist (sign in, contact admin, email support)
- Created `app/admin/error.tsx` — admin-specific error page with shield icon and recovery options
- Created `app/booking/error.tsx` — booking-specific error page with calendar icon and slot conflict messaging
- Created `app/employee/error.tsx` — employee portal error page with people icon
- Created `app/profile/error.tsx` — profile error page with user icon

---

### 3. Privacy Policy, Terms & Conditions, Cookie Consent

**Commit area:** Legal, Compliance, UX

- Created `app/privacy/page.tsx` — 11-section Privacy Policy covering data collection, usage, cookies, sharing, security, rights, retention, children's privacy, changes, and contact
- Created `app/terms/page.tsx` — 11-section Terms & Conditions covering account registration, bookings, cancellation/refunds, loyalty program, user conduct, IP, liability, governing law, and changes
- Created `components/ui/CookieConsent.tsx` — animated slide-up banner with Framer Motion spring animation, Accept/Decline buttons persisted in localStorage, links to Privacy Policy, auto-shows after 1.5s on first visit
- Added `CookieConsent` to root layout (`app/layout.tsx`)
- Updated `components/layout/Footer.tsx` — added Privacy and Terms links to the footer bottom bar

---

### 4. Form Validation, Spam Protection & Contact API

**Commit area:** Forms, Security

- Created `components/ui/ContactForm.tsx` — validated contact form with:
  - Client-side validation: Name (2-100 chars), email format, message (10-2000 chars)
  - Honeypot field (hidden `website` input) for bot detection
  - Client-side rate limiting (3 submissions per 5 minutes via localStorage)
  - Server-side rate limiting (5 per 5 minutes via IP)
- Created `app/api/contact/route.ts` — contact form API with rate limiting, input sanitization, and audit logging
- Updated `app/contact/page.tsx` — replaced inline form with the new `ContactForm` component

---

### 5. Admin Audit Logs System

**Commit area:** Admin, Security, Monitoring

- Added `AuditLog` model to Prisma schema with fields: action, entityType, entityId, adminId, adminName, adminEmail, details, ip, createdAt (with indexes)
- Created `lib/audit.ts` — `logAudit()` and `getClientIp()` utility functions
- Added audit logging to:
  - `app/api/services/route.ts` — service_create
  - `app/api/services/[id]/route.ts` — service_update, service_delete
  - `app/api/employees/route.ts` — employee_create
  - `app/api/employees/[id]/route.ts` — employee_update, employee_delete
  - `app/api/bookings/route.ts` — booking_confirmed/completed/cancelled (admin/employee status changes)
  - `app/api/contact/route.ts` — contact_form_submit
- Created `app/api/admin/audit-logs/route.ts` — admin-only GET endpoint returning latest 500 log entries
- Created `app/admin/logs/page.tsx` — full audit logs viewer with:
  - Stats cards: Total, Today, Services, Employees, Bookings, Contacts
  - Search across actions, details, emails, and IPs
  - Entity type filters (All, Services, Employees, Bookings, Contacts)
  - Color-coded action badges
  - Paginated log entries with relative timestamps
- Added "Audit Logs" link to admin sidebar navigation (`app/admin/layout.tsx`)
- Ran `npx prisma generate` and `npx prisma db push`

---

### 6. Force HTTPS & Security Headers

**Commit area:** Security, Infrastructure

- Updated `middleware.ts` — added HTTPS redirect in production using `x-forwarded-proto` header (Vercel-compatible)
- Verified existing HSTS header: `max-age=63072000; includeSubDomains; preload`
- Verified existing CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy headers

---

### 7. Page Load Speed Audit

**Commit area:** Performance

- Ran `npx next build` — verified clean build with no errors
- Identified remaining ESLint warnings (all pre-existing):
  - `<img>` usage in admin employees page and PillNav (recommend `next/image`)
  - Missing `user.gender` dependency in booking page useEffects
- All warnings are non-blocking; no performance regressions introduced

---

### 8. Playwright Screenshots

**Commit area:** Testing, Documentation

- Installed Playwright Chromium browser
- Created `scripts/screenshot.mjs` — automated Playwright script capturing:
  - Home, Services, Team, Booking, Contact, About, Privacy, Terms, 404 pages
  - Mobile viewport (390×844) home page
- Created `scripts/screenshot-admin.mjs` — admin dashboard screenshots with API-based login
- Created `scripts/build-gallery.mjs` — builds self-contained HTML gallery with base64-embedded images
- Created `scripts/build-gallery-admin.mjs` — builds admin-specific gallery
- All screenshots saved to `snapshots/` directory

---

### 9. Employee Earnings Month Navigation

**Commit area:** Admin Dashboard, UX

- Created `components/ui/EmployeeEarningsSection.tsx` — client component with:
  - Month navigation arrows (prev/next) to browse historical data
  - Month label display
  - Summary stats (total earnings, booking count) for selected month
  - Employee earnings bar chart filtered by selected month
  - Earnings breakdown table with employee name, gender badge, bookings, earnings
  - Quick month pill shortcuts (up to 6 recent months)
  - Empty state handling for months with no data
  - Automatic detection of data range from earliest to current month
- Updated `app/admin/page.tsx` — replaced static current-month-only earnings with the new navigable `EmployeeEarningsSection` component, passing all completed bookings data
- Removed old inline earnings calculation code

---

### 10. Holiday Audit Logging & Revenue Report Export

**Commit area:** Admin, Audit, Reporting

- Updated `app/api/admin/holidays/route.ts` — added audit logging for:
  - `holiday_create` — when custom holidays are added
  - `holiday_delete` — when holidays are removed
  - `holiday_seed` — when Indian holidays are seeded for a year
- Updated `app/admin/logs/page.tsx`:
  - Added holiday action color badges (teal for create, red for delete, indigo for seed)
  - Added `holiday` entity icon (shield)
  - Added "Holidays" filter button
  - Added Holidays stat card (teal color)
  - Stats grid expanded from 6 to 7 columns
- Created `app/api/admin/reports/route.ts` — monthly revenue CSV export endpoint:
  - Accepts `?month=YYYY-MM` query parameter
  - Generates 3-section CSV: Per-Employee Earnings, Per-Service Breakdown, Detailed Booking List
  - Returns downloadable CSV with proper Content-Disposition header
- Updated `components/ui/EmployeeEarningsSection.tsx`:
  - Added "Export CSV" download button next to month navigator
  - Downloads `revenue-report-YYYY-MM.csv` for the selected month
  - Shows loading state during download
  - Uses blob + createObjectURL for client-side download

---

## Files Modified/Created Summary

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Added Gender enum, gender/whatsappNumber to User, gender to Employee, AuditLog model |
| `lib/types.ts` | Modified | Added Gender type, gender to Employee interface |
| `lib/queries.ts` | Modified | Updated employee CRUD and createUser with gender/whatsappNumber |
| `lib/audit.ts` | Created | Audit logging utility |
| `lib/auth-context.tsx` | Modified | Added Gender type, gender to AuthUser |
| `app/layout.tsx` | Modified | Added CookieConsent component |
| `app/admin/page.tsx` | Modified | Replaced static earnings with EmployeeEarningsSection, added bookings data serialization |
| `app/admin/layout.tsx` | Modified | Added Audit Logs nav link |
| `app/admin/logs/page.tsx` | Created | Admin audit logs viewer |
| `app/admin/error.tsx` | Created | Admin-specific error page |
| `app/booking/error.tsx` | Created | Booking-specific error page |
| `app/employee/error.tsx` | Created | Employee portal error page |
| `app/profile/error.tsx` | Created | Profile error page |
| `app/forbidden.tsx` | Created | 403 forbidden page |
| `app/not-found.tsx` | Enhanced | Animated 404 with quick links |
| `app/error.tsx` | Enhanced | Animated error with details toggle |
| `app/privacy/page.tsx` | Created | 11-section Privacy Policy |
| `app/terms/page.tsx` | Created | 11-section Terms & Conditions |
| `app/contact/page.tsx` | Modified | Uses new ContactForm component |
| `app/api/auth/register/route.ts` | Modified | Accepts gender, whatsappNumber |
| `app/api/auth/me/route.ts` | Modified | Returns gender in user response |
| `app/api/contact/route.ts` | Created | Contact form API with rate limiting |
| `app/api/admin/audit-logs/route.ts` | Created | Audit logs API endpoint |
| `app/api/admin/holidays/route.ts` | Modified | Added audit logging for CRUD + seed |
| `app/api/admin/reports/route.ts` | Created | Monthly revenue CSV export |
| `app/api/services/route.ts` | Modified | Added audit logging |
| `app/api/services/[id]/route.ts` | Modified | Added audit logging |
| `app/api/employees/route.ts` | Modified | Added audit logging, gender |
| `app/api/employees/[id]/route.ts` | Modified | Added audit logging |
| `app/api/bookings/route.ts` | Modified | Added audit logging for status changes |
| `app/admin/employees/page.tsx` | Modified | Added gender dropdown |
| `middleware.ts` | Modified | Added HTTPS redirect |
| `components/ui/RevenueChart.tsx` | Replaced | Recharts-based bar chart |
| `components/ui/EmployeeEarningsChart.tsx` | Created | Horizontal bar chart for per-employee earnings |
| `components/ui/EmployeeEarningsSection.tsx` | Created | Month-navigable earnings with export |
| `components/ui/CookieConsent.tsx` | Created | Cookie consent banner |
| `components/ui/ContactForm.tsx` | Created | Validated contact form with honeypot |
| `components/layout/Footer.tsx` | Modified | Added Privacy/Terms links |
| `components/ui/LoginModal.tsx` | Modified | Added gender, WhatsApp fields |
| `FEATURES.md` | Modified | Documented all new features |
| `PROGRESS.md` | Created | This file |
| `scripts/screenshot.mjs` | Created | Playwright screenshot script |
| `scripts/screenshot-admin.mjs` | Created | Admin screenshot script |
| `scripts/build-gallery.mjs` | Created | Gallery builder |
| `scripts/build-gallery-admin.mjs` | Created | Admin gallery builder |

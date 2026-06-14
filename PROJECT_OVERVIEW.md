# Project Overview — Aurelia Salon & Spa

A comprehensive guide to the Aurelia Salon & Spa web application.

---

## Table of Contents

1. [About the Project](#about-the-project)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Features](#features)
5. [Pages & Routing](#pages--routing)
6. [API Endpoints](#api-endpoints)
7. [Authentication & Authorization](#authentication--authorization)
8. [Components](#components)
9. [Design System](#design-system)
10. [Environment Setup](#environment-setup)
11. [Available Scripts](#available-scripts)

---

## About the Project

**Aurelia Salon & Spa** is a full-stack web application for a luxury beauty and wellness salon. It provides a complete booking platform where clients can browse services, view team profiles, book appointments, and leave reviews. The application also includes an admin dashboard for managing bookings, services, employees, and schedules, as well as an employee portal for viewing ratings and weekly timetables.

### Key Capabilities

- **Client-facing:** Service browsing, online booking, testimonial display, team showcase
- **Admin dashboard:** Analytics, booking management, service CRUD, employee management, schedule management
- **Employee portal:** Personal ratings overview, weekly timetable view
- **Authentication:** Multi-role login (user, employee, admin), registration, password reset via email

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.2.35 | React framework with App Router, SSR, and API routes |
| **React** | ^18 | UI library |
| **TypeScript** | ^5 | Type safety across the entire codebase |
| **Tailwind CSS** | ^3.4.1 | Utility-first CSS framework |
| **Framer Motion** | ^12.40.0 | Animations and transitions |
| **Radix UI** | Various | Accessible UI primitives (Dialog, Select, Slot) |
| **class-variance-authority** | ^0.7.1 | Component variant management |
| **clsx** | ^2.1.1 | Conditional className utility |
| **tailwind-merge** | ^3.6.0 | Intelligent Tailwind class merging |
| **date-fns** | ^4.4.0 | Date manipulation library |
| **react-day-picker** | ^10.0.1 | Date picker component |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js API Routes** | 14.2.35 | Serverless API endpoints |
| **Prisma** | ^6.19.3 | Database ORM and schema management |
| **Prisma Client** | ^6.19.3 | Type-safe database client |
| **PostgreSQL** (Neon) | — | Relational database (serverless) |
| **Resend** | ^6.12.4 | Transactional email sending |
| **crypto** (Node.js) | Built-in | Secure token generation |

### Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **PostCSS** | CSS processing |
| **tsx** | TypeScript execution for seed scripts |
| **Prisma Studio** | Visual database browser |

### Hosting & Services

| Service | Purpose |
|---------|---------|
| **Neon** | Serverless PostgreSQL database hosting |
| **Resend** | Transactional email delivery |
| **Unsplash** | Stock images for services, employees, testimonials |
| **UI Avatars** | Dynamic avatar generation |

---

## Project Structure

```
salon_spa_website/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (AuthProvider, Navbar, Footer)
│   ├── page.tsx                  # Homepage
│   ├── globals.css               # Global styles + Tailwind config
│   ├── error.tsx                 # Global error boundary
│   ├── not-found.tsx             # 404 page
│   ├── loading.tsx               # Global loading state
│   ├── robots.ts                 # SEO robots.txt
│   ├── sitemap.ts                # SEO sitemap
│   ├── fonts/                    # Local font files (Geist)
│   │
│   ├── about/                    # About page
│   │   └── page.tsx
│   ├── booking/                  # Booking flow
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── contact/                  # Contact page
│   │   └── page.tsx
│   ├── profile/                  # User profile (client-side)
│   │   └── page.tsx
│   ├── reset-password/           # Password reset page (request + set new)
│   │   └── page.tsx
│   ├── services/                 # Services listing
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── [id]/                 # Individual service page
│   │       ├── page.tsx
│   │       └── loading.tsx
│   ├── team/                     # Team listing
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── [id]/                 # Individual team member page
│   │       ├── page.tsx
│   │       └── loading.tsx
│   ├── employee/                 # Employee portal
│   │   ├── layout.tsx            # Employee sidebar layout with auth guard
│   │   └── page.tsx              # Employee dashboard (ratings + timetable)
│   │
│   ├── admin/                    # Admin dashboard
│   │   ├── layout.tsx            # Admin sidebar layout with auth guard
│   │   ├── page.tsx              # Analytics dashboard
│   │   ├── bookings/             # Booking management
│   │   │   └── page.tsx
│   │   ├── services/             # Service management
│   │   │   └── page.tsx
│   │   ├── employees/            # Employee management
│   │   │   └── page.tsx
│   │   └── schedule/             # Schedule management (CRUD)
│   │       └── page.tsx
│   │
│   └── api/                      # API routes
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── register/route.ts
│       │   ├── profile/route.ts
│       │   ├── forgot-password/route.ts  # Sends reset email via Resend
│       │   └── reset-password/route.ts
│       ├── bookings/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── employees/
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   └── [id]/schedule/route.ts
│       ├── services/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── testimonials/route.ts
│       ├── schedule/
│       │   ├── route.ts              # GET/POST/DELETE (with overlap check)
│       │   └── [id]/route.ts        # PATCH/DELETE single entry
│
├── components/                   # Reusable UI components
│   ├── layout/
│   │   ├── Navbar.tsx            # Main navigation bar
│   │   └── Footer.tsx            # Site footer
│   ├── cards/
│   │   ├── ServiceCard.tsx       # Service card component
│   │   └── TeamCard.tsx          # Team member card
│   ├── sections/
│   │   ├── HeroSection.tsx       # Homepage hero
│   │   ├── ServicesGrid.tsx      # Services grid section
│   │   ├── TeamGrid.tsx          # Team grid section
│   │   ├── TestimonialsRow.tsx   # Testimonials carousel
│   │   ├── BookingCTA.tsx        # Booking call-to-action
│   │   └── WhyUsSection.tsx      # Why choose us section
│   └── ui/
│       ├── LoginModal.tsx        # Authentication modal
│       ├── PasswordToggle.tsx    # Password visibility toggle
│       ├── RevenueChart.tsx      # Admin revenue chart
│       ├── Skeleton.tsx          # Loading skeleton
│       ├── StarIcon.tsx          # Star rating icon
│       ├── StarRating.tsx        # Interactive star rating
│       ├── Toast.tsx             # Toast notification system
│       ├── UserPanel.tsx         # User dropdown menu
│       └── WeeklyTimetable.tsx   # Weekly schedule display
│
├── lib/                          # Core libraries & utilities
│   ├── auth-context.tsx          # Authentication context provider
│   ├── db.ts                     # Prisma client singleton
│   ├── queries.ts                # Database query functions
│   ├── types.ts                  # TypeScript type definitions
│   ├── utils.ts                  # Utility functions (cn, formatPrice, displayTime)
│   └── resend.ts                 # Resend email client
│
├── prisma/
│   ├── schema.prisma             # Database schema definition
│   └── seed.ts                   # Database seed script
│
├── public/                       # Static assets (if any)
│
├── .env.local                    # Environment variables (gitignored)
├── .gitignore                    # Git ignore rules
├── next.config.mjs               # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── postcss.config.mjs            # PostCSS configuration
├── package.json                  # Dependencies and scripts
└── README.md                     # Project readme
```

---

## Features

### Client Features

- **Homepage:** Hero section, featured services, team preview, testimonials, booking CTA
- **Services:** Browse all services by category (Hair, Skin, Nails, Body, Bridal), view details and pricing
- **Team:** View team members with profiles, ratings, and service specializations
- **Booking:** Multi-step booking flow with service selection, employee preference, date/time picking
- **Profile:** View and edit profile, manage bookings, rate completed services
- **Testimonials:** Client reviews displayed across the site

### Employee Features

- **Employee Dashboard:** View personal ratings, review history, and weekly timetable
- **Sidebar Navigation:** Dedicated employee portal layout

### Admin Features

- **Analytics Dashboard:** Revenue overview, booking stats, client count, average rating
- **Booking Management:** View and update booking statuses
- **Service Management:** Create, edit, delete services with employee assignments
- **Employee Management:** Create, edit, delete employee profiles
- **Schedule Management:** CRUD weekly timetables per employee with overlap detection

### Authentication

- **Multi-role System:** Guest, User, Employee, Admin roles
- **Login/Registration:** Modal-based authentication flow
- **Password Reset:** Email-based reset flow with secure tokens
- **Session Persistence:** LocalStorage-based session management
- **Route Protection:** Role-based access control for admin and employee portals

---

## Pages & Routing

### Public Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `app/page.tsx` | Homepage with hero, services, team, testimonials |
| `/about` | `app/about/page.tsx` | About the salon |
| `/services` | `app/services/page.tsx` | All services |
| `/services/[id]` | `app/services/[id]/page.tsx` | Individual service details |
| `/team` | `app/team/page.tsx` | Team members |
| `/team/[id]` | `app/team/[id]/page.tsx` | Individual team member profile |
| `/booking` | `app/booking/page.tsx` | Multi-step booking flow |
| `/contact` | `app/contact/page.tsx` | Contact information |
| `/reset-password` | `app/reset-password/page.tsx` | Password reset (request + set new) |

### Protected Pages

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/profile` | `app/profile/page.tsx` | Authenticated | User profile & bookings |
| `/employee` | `app/employee/page.tsx` | Employee | Employee dashboard |
| `/admin` | `app/admin/page.tsx` | Admin | Analytics dashboard |
| `/admin/bookings` | `app/admin/bookings/page.tsx` | Admin | Booking management |
| `/admin/services` | `app/admin/services/page.tsx` | Admin | Service management |
| `/admin/employees` | `app/admin/employees/page.tsx` | Admin | Employee management |
| `/admin/schedule` | `app/admin/schedule/page.tsx` | Admin | Schedule management |

### Layouts

| Layout | Applies To | Features |
|--------|------------|----------|
| `app/layout.tsx` | All pages | Root layout, AuthProvider, ToastProvider, Navbar, Footer |
| `app/admin/layout.tsx` | `/admin/*` | Admin sidebar, auth guard, mobile responsive |
| `app/employee/layout.tsx` | `/employee` | Employee sidebar, auth guard |

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate user, return user data |
| POST | `/api/auth/register` | Create new user account |
| PUT | `/api/auth/profile` | Update profile or change password |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |

### Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | List all services |
| POST | `/api/services` | Create a service |
| GET | `/api/services/[id]` | Get service by ID |
| PUT | `/api/services/[id]` | Update a service |
| DELETE | `/api/services/[id]` | Delete a service |

### Employees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List all employees |
| POST | `/api/employees` | Create an employee |
| GET | `/api/employees/[id]` | Get employee by ID |
| PUT | `/api/employees/[id]` | Update an employee |
| DELETE | `/api/employees/[id]` | Delete an employee |
| GET | `/api/employees/[id]/schedule` | Get employee's weekly schedule |

### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings` | List all bookings |
| POST | `/api/bookings` | Create a booking |
| PATCH | `/api/bookings/[id]` | Update booking status or rating |

### Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schedule` | List all schedule entries |
| POST | `/api/schedule` | Create a schedule entry (with overlap check) |
| DELETE | `/api/schedule` | Bulk delete schedule entries |
| PATCH | `/api/schedule/[id]` | Update a schedule entry |
| DELETE | `/api/schedule/[id]` | Delete a schedule entry |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/testimonials` | List all testimonials |

---

## Authentication & Authorization

### User Roles

| Role | Access Level | Capabilities |
|------|-------------|--------------|
| `guest` | Public only | Browse site, view services/team |
| `user` | Public + Profile | Book appointments, manage bookings, rate services |
| `employee` | Public + Employee Portal | View personal ratings, view weekly timetable |
| `admin` | Full Access | Manage all bookings, services, employees, schedules, view analytics |

### Authentication Flow

1. User clicks "Sign In" → Opens `LoginModal`
2. User enters credentials → `POST /api/auth/login`
3. Server validates credentials → Returns user data (without password)
4. `AuthContext` stores user in state and `localStorage`
5. Role-based UI renders (admin panel, employee dashboard, etc.)

### Password Reset Flow

1. User clicks "Forgot Password?" → Navigates to `/reset-password`
2. User enters email → `POST /api/auth/forgot-password`
3. Server generates secure token → Stores in `PasswordResetToken` table
4. Server sends email via Resend with reset link
5. User clicks link → Navigates to `/reset-password?token=xxx`
6. User enters new password → `POST /api/auth/reset-password`
7. Server validates token → Updates password → Marks token as used

### Route Protection

- **Admin layout** (`app/admin/layout.tsx`): Checks `isAdmin` flag, redirects to `/` if unauthorized
- **Employee layout** (`app/employee/layout.tsx`): Checks `isEmployee` flag, redirects to `/` if unauthorized
- **Profile page**: Shows "Please sign in" if not authenticated

---

## Components

### Layout Components

| Component | File | Description |
|-----------|------|-------------|
| `Navbar` | `components/layout/Navbar.tsx` | Top navigation with links, user menu, login trigger |
| `Footer` | `components/layout/Footer.tsx` | Site footer with links and branding |

### Section Components

| Component | File | Description |
|-----------|------|-------------|
| `HeroSection` | `components/sections/HeroSection.tsx` | Full-width hero with CTA |
| `ServicesGrid` | `components/sections/ServicesGrid.tsx` | Featured services grid |
| `TeamGrid` | `components/sections/TeamGrid.tsx` | Team members grid |
| `TestimonialsRow` | `components/sections/TestimonialsRow.tsx` | Testimonials carousel |
| `BookingCTA` | `components/sections/BookingCTA.tsx` | Booking call-to-action |
| `WhyUsSection` | `components/sections/WhyUsSection.tsx` | Value proposition section |

### Card Components

| Component | File | Description |
|-----------|------|-------------|
| `ServiceCard` | `components/cards/ServiceCard.tsx` | Service preview card |
| `TeamCard` | `components/cards/TeamCard.tsx` | Team member preview card |

### UI Components

| Component | File | Description |
|-----------|------|-------------|
| `LoginModal` | `components/ui/LoginModal.tsx` | Auth modal with sign-in/sign-up tabs |
| `PasswordToggle` | `components/ui/PasswordToggle.tsx` | Password visibility toggle button |
| `RevenueChart` | `components/ui/RevenueChart.tsx` | Admin revenue bar chart |
| `Skeleton` | `components/ui/Skeleton.tsx` | Loading skeleton placeholders |
| `StarIcon` | `components/ui/StarIcon.tsx` | Individual star icon |
| `StarRating` | `components/ui/StarRating.tsx` | Interactive star rating (for reviews) |
| `Toast` | `components/ui/Toast.tsx` | Toast notification provider |
| `UserPanel` | `components/ui/UserPanel.tsx` | User dropdown menu |
| `WeeklyTimetable` | `components/ui/WeeklyTimetable.tsx` | Weekly schedule grid (card-based) |

---

## Design System

### Color Palette

The application uses a warm beige color scheme:

| Token | Hex | Usage |
|-------|-----|-------|
| `beige-50` | `#FAF7F2` | Background |
| `beige-100` | `#F0EAE0` | Light backgrounds, borders |
| `beige-200` | `#E8DFD3` | Borders, dividers |
| `beige-300` | `#D9CCBC` | Hover states |
| `beige-400` | `#C8A882` | Muted text |
| `beige-500` | `#B08B62` | Secondary text |
| `beige-600` | `#8C6A48` | Primary buttons, active states |
| `beige-700` | `#6B4E32` | Headings, primary text |
| `beige-800` | `#4A3420` | Body text |
| `beige-900` | `#2C2016` | Dark overlays |

### Typography

| Font | Variable | Usage |
|------|----------|-------|
| **Cormorant Garamond** | `--font-cormorant` | Headings (serif) |
| **Jost** | `--font-jost` | Body text (sans-serif) |

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `border-radius-card` | `16px` | Card components |
| `box-shadow-card` | `0 2px 16px rgba(44,32,22,0.06)` | Default card shadow |
| `box-shadow-card-hover` | `0 8px 32px rgba(44,32,22,0.12)` | Hover card shadow |

### Component Patterns

- **Cards:** `rounded-card border border-beige-200 bg-white shadow-card`
- **Buttons:** `btn-primary` (filled) / `btn-outline` (bordered)
- **Inputs:** `rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm`
- **Section Layout:** `section-padding` + `section-container`

---

## Environment Setup

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- A Neon PostgreSQL database (free tier available)
- A Resend account (free tier available)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd salon_spa_website

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database URL and API keys

# Push database schema
npx prisma db push

# Seed the database
npx prisma db seed

# Start development server
npm run dev
```

### `.env.local` Configuration

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
RESEND_API_KEY=re_your_key_here
EMAIL_FROM=Aurelia Salon <onboarding@resend.dev>
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Development | `npm run dev` | Start Next.js dev server |
| Build | `npm run build` | Production build |
| Start | `npm start` | Start production server |
| Lint | `npm run lint` | Run ESLint |
| DB Push | `npm run db:push` | Push schema changes to database |
| DB Seed | `npm run db:seed` | Seed database with sample data |
| DB Generate | `npm run db:generate` | Regenerate Prisma Client |
| DB Studio | `npm run db:studio` | Open Prisma Studio |

---

## Security Notes

1. **Passwords:** Currently stored in plaintext. In production, implement bcrypt hashing.
2. **Authentication:** Uses localStorage for session persistence. Consider httpOnly cookies for production.
3. **API Keys:** `.env.local` is gitignored. Never commit secrets to version control.
4. **CORS:** API routes are same-origin only. Add CORS headers for external access.
5. **Input Validation:** Basic validation exists. Add schema validation (Zod) for production.
6. **Rate Limiting:** No rate limiting on API routes. Add for production deployment.

---

## Performance Considerations

- **Images:** Uses Next.js `Image` component with `fill` and `sizes` for optimization
- **Fonts:** Google Fonts loaded with `display: "swap"` for faster initial render
- **Data Fetching:** Server components for initial page loads, client-side fetching for dynamic content
- **Loading States:** Skeleton components and loading indicators throughout
- **Caching:** API routes set `force-dynamic` to prevent stale data

---

## Deployment

The application is built for deployment on platforms that support Next.js:

- **Vercel** (recommended) — Zero-config deployment
- **Netlify** — Requires Next.js runtime
- **AWS Amplify** — Full-stack deployment
- **Docker** — Custom deployment with Node.js runtime

### Production Checklist

- [ ] Set `DATABASE_URL` to production database
- [ ] Configure `NEXT_PUBLIC_BASE_URL` to production domain
- [ ] Set up Resend with a verified domain for `EMAIL_FROM`
- [ ] Implement password hashing (bcrypt)
- [ ] Add rate limiting to API routes
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure CORS headers if needed
- [ ] Run `npx prisma migrate deploy` for schema migrations

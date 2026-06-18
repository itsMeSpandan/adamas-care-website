# Database Connection — Adamas Care

A comprehensive guide to how the database is set up, connected, and used throughout the application.

---

## Table of Contents

1. [Overview](#overview)
2. [Database Provider](#database-provider)
3. [ORM — Prisma](#orm--prisma)
4. [Schema Design](#schema-design)
5. [Connection Setup (`lib/db.ts`)](#connection-setup)
6. [Query Layer (`lib/queries.ts`)](#query-layer)
7. [API Route Usage](#api-route-usage)
8. [Seeding](#seeding)
9. [Environment Variables](#environment-variables)
10. [Common Commands](#common-commands)

---

## Overview

The application uses **Prisma** as its ORM to connect to a **PostgreSQL** database hosted on **Neon** (a serverless PostgreSQL provider). The connection is established as a singleton to prevent exhausting database connections during development with Next.js hot-reloading.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Next.js App │────▶│    Prisma    │────▶│  Neon PostgreSQL  │
│  (Server/    │     │    Client    │     │  (Remote Hosted)  │
│   API Route) │     │              │     │                    │
└──────────────┘     └──────────────┘     └──────────────────┘
```

---

## Database Provider

**Neon Serverless PostgreSQL**

- **Host:** Neon serverless PostgreSQL (AWS region)
- **Database:** `neondb`
- **Connection Mode:** SSL required (`sslmode=require`)
- **Provider in Prisma:** `postgresql`

Neon provides a serverless PostgreSQL experience with auto-scaling, branching, and a generous free tier. The connection string is stored in the environment variable `DATABASE_URL`. **Note:** The Prisma schema also contains a hardcoded connection string for development convenience, but production deployments should always use the environment variable.

---

## ORM — Prisma

### Installation

```bash
npm install prisma @prisma/client
```

### Prisma Client Generation

The Prisma Client is auto-generated from the schema. It provides a fully typed API for database access:

```bash
npx prisma generate
```

The generated client is output to `lib/generated/prisma/` (gitignored).

### Schema Location

The Prisma schema is defined in `prisma/schema.prisma`. This is the single source of truth for the database structure.

---

## Schema Design

### Enums

```prisma
enum UserRole {
  guest
  user
  employee
  admin
}

enum BookingStatus {
  confirmed
  pending
  cancelled
  completed
}
```

### Models

The schema defines **8 models** with the following relationships:

#### `User`
The authentication model. Links to employees via an optional `employeeId` field.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `name` | String | Display name |
| `email` | String | Unique, used for login |
| `password` | String | Plaintext (should be hashed in production) |
| `role` | UserRole | `guest`, `user`, `employee`, `admin` |
| `avatarUrl` | String | Profile image URL |
| `employeeId` | String? | Links to Employee model (optional) |
| `createdAt` | DateTime | Auto-set on creation |
| `updatedAt` | DateTime | Auto-updated |

**Relations:**
- `bookings` → one-to-many with `Booking`
- `passwordResetTokens` → one-to-many with `PasswordResetToken`

#### `Service`
Represents a salon/spa service offered.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Primary key (slug-style, e.g., `precision-haircut`) |
| `name` | String | Service display name |
| `category` | String | `Hair`, `Skin`, `Nails`, `Body`, `Bridal` |
| `description` | String | Short description |
| `longDescription` | String | Full description |
| `durationMinutes` | Int | Duration in minutes |
| `price` | Float | Price in INR |
| `imageUrl` | String | Service image URL |
| `featured` | Boolean | Whether to feature on homepage |

**Relations:**
- `employeeServices` → many-to-many with `Employee` (via `EmployeeService`)
- `bookings` → one-to-many with `Booking`
- `weeklySchedules` → one-to-many with `WeeklySchedule`

#### `Employee`
Represents a salon staff member.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Primary key (slug-style, e.g., `priya-sharma`) |
| `name` | String | Full name |
| `email` | String | Unique employee email (e.g., `priya@adamascare.com`) |
| `role` | String | Job title (e.g., `Lead Stylist`) |
| `bio` | String | Biography |
| `imageUrl` | String | Profile image URL |
| `rating` | Float | Average rating (0-5) |
| `reviewCount` | Int | Number of reviews |
| `instagramHandle` | String? | Optional Instagram handle |
| `yearsExperience` | Int | Years of experience |

**Relations:**
- `employeeServices` → many-to-many with `Service`
- `bookings` → one-to-many with `Booking`
- `weeklySchedules` → one-to-many with `WeeklySchedule`

#### `EmployeeService`
Junction table for the many-to-many relationship between `Employee` and `Service`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `serviceId` | String | FK → Service |
| `employeeId` | String | FK → Employee |

**Constraint:** `@@unique([serviceId, employeeId])` — prevents duplicate assignments.

#### `Booking`
Represents a client appointment.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `serviceId` | String | FK → Service |
| `employeeId` | String | FK → Employee |
| `userId` | String? | FK → User (optional, for registered users) |
| `date` | DateTime | Appointment date |
| `timeSlot` | String | Time slot (e.g., `10:00 AM`) |
| `name` | String | Client name |
| `email` | String | Client email |
| `phone` | String | Client phone |
| `notes` | String? | Optional notes |
| `status` | BookingStatus | `pending`, `confirmed`, `completed`, `cancelled` |
| `price` | Float | Booking price |
| `rating` | Int? | Client rating (1-5) |
| `review` | String? | Client review text |
| `createdAt` | DateTime | Auto-set |
| `updatedAt` | DateTime | Auto-updated |

**Relations:**
- `service` → many-to-one with `Service`
- `user` → many-to-one with `User` (optional)
- `employee` → many-to-one with `Employee`

#### `Testimonial`
Client testimonials displayed on the website.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Primary key |
| `authorName` | String | Client name |
| `avatarUrl` | String | Client avatar |
| `rating` | Int | 1-5 stars |
| `text` | String | Testimonial text |
| `service` | String | Service name |
| `date` | String | Date string |

#### `PasswordResetToken`
Stores tokens for the password reset flow.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `token` | String | Unique, cryptographically random |
| `userId` | String | FK → User |
| `expiresAt` | DateTime | Token expiry (1 hour) |
| `used` | Boolean | Whether token has been consumed |
| `createdAt` | DateTime | Auto-set |

#### `WeeklySchedule`
Stores employee weekly timetable entries.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `employeeId` | String | FK → Employee |
| `dayOfWeek` | Int | 0=Monday, 6=Sunday |
| `startTime` | String | e.g., `09:00` |
| `endTime` | String | e.g., `17:00` |
| `serviceId` | String? | FK → Service (optional) |

**Constraint:** `@@unique([employeeId, dayOfWeek, startTime])` — prevents overlapping entries.

**Relations:**
- `employee` → many-to-one with `Employee` (cascade delete)
- `service` → many-to-one with `Service` (optional)

### Entity Relationship Diagram

```
┌───────────┐       ┌──────────────────┐       ┌───────────┐
│   User    │──────▶│     Booking      │◀──────│  Service  │
│           │       │                  │       │           │
└─────┬─────┘       └────────┬─────────┘       └─────┬─────┘
      │                      │                       │
      │                      ▼                       │
      │               ┌───────────┐                  │
      │               │ Employee  │                  │
      │               │           │                  │
      │               └─────┬─────┘                  │
      │                     │                        │
      ▼                     ▼                        ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Password    │   │ EmployeeService  │   │  WeeklySchedule  │
│  Reset Token │   │  (Junction)      │   │                  │
└──────────────┘   └──────────────────┘   └──────────────────┘
```

---

## Connection Setup

### File: `lib/db.ts`

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

### Why the Singleton Pattern?

Next.js hot-reloads modules in development. Without a singleton, every hot reload would create a new `PrismaClient` instance, each opening its own database connections. This quickly exhausts the connection limit.

The fix: store the Prisma instance on `globalThis` so it persists across module reloads.

```
Development:
  Module reload → globalThis.prisma exists? → Reuse it
                 globalThis.prisma missing? → Create new one, save to globalThis

Production:
  Always create a new PrismaClient (serverless cold starts)
```

### Logging

In development, Prisma logs `error` and `warn` level messages. In production, only `error` messages are logged.

---

## Query Layer

### File: `lib/queries.ts`

This file provides a clean abstraction layer over Prisma. Instead of calling `db.service.findMany()` directly in components, the app uses named functions like `getServices()`.

### Key Functions

| Function | Purpose |
|----------|---------|
| `getServices()` | Fetches all services with employee assignments |
| `getServiceById(id)` | Fetches a single service by ID |
| `createService(data)` | Creates a new service with optional employee assignments |
| `updateService(id, data)` | Updates a service, optionally replacing employee assignments |
| `deleteService(id)` | Deletes a service (cascades to EmployeeService) |
| `getEmployees()` | Fetches all employees with their service assignments |
| `getEmployeeById(id)` | Fetches a single employee by ID |
| `createEmployee(data)` | Creates a new employee with optional service assignments |
| `updateEmployee(id, data)` | Updates an employee, optionally replacing service assignments |
| `deleteEmployee(id)` | Deletes an employee (cascades to Bookings, Services) |
| `getTestimonials()` | Fetches all testimonials |
| `findUserByEmail(email)` | Looks up a user by email (for auth) |
| `createUser(data)` | Creates a new user account |
| `updateUser(id, data)` | Updates user profile data |
| `findUserById(id)` | Looks up a user by ID |
| `createBooking(data)` | Creates a new booking |
| `getBookings()` | Fetches all bookings with relations |
| `updateBookingStatus(id, status)` | Updates booking status |
| `generateUniqueEmployeeEmail(name)` | Generates a unique email for new employees |

### Pattern: Many-to-Many via Junction Table

Services and employees have a many-to-many relationship managed through the `EmployeeService` junction table. The query functions handle this transparently:

```typescript
// Fetching employees with their service IDs
export async function getEmployees(): Promise<Employee[]> {
  const employees = await db.employee.findMany({
    include: { employeeServices: { select: { serviceId: true } } },
  });
  return employees.map((e) => ({
    ...e,
    serviceIds: e.employeeServices.map((es) => es.serviceId),
  }));
}

// Creating an employee with service assignments
export async function createEmployee(data: { /* ... */ serviceIds?: string[] }) {
  const { serviceIds, ...employeeData } = data;
  return db.employee.create({
    data: {
      ...employeeData,
      employeeServices: serviceIds?.length
        ? { create: serviceIds.map((sid) => ({ serviceId: sid })) }
        : undefined,
    },
    include: { employeeServices: { select: { serviceId: true } } },
  });
}
```

### Pattern: Replacing Assignments

When updating employee-service or service-employee assignments, the pattern is:
1. Delete all existing junction records
2. Create new junction records with the updated list

```typescript
if (serviceIds !== undefined) {
  await db.employeeService.deleteMany({ where: { employeeId: id } });
  if (serviceIds.length > 0) {
    await db.employeeService.createMany({
      data: serviceIds.map((sid) => ({ employeeId: id, serviceId: sid })),
    });
  }
}
```

---

## API Route Usage

Every API route imports `db` from `@/lib/db` or functions from `@/lib/queries`. The routes are defined in `app/api/` using Next.js App Router conventions.

### Direct `db` Usage (in routes)

Some routes use Prisma directly for complex queries:

```typescript
// app/api/schedule/route.ts — Overlap detection
const existing = await db.weeklySchedule.findFirst({
  where: {
    employeeId,
    dayOfWeek,
    OR: [
      { startTime: { lt: endTime }, endTime: { gt: startTime } },
    ],
  },
});
```

### Through Query Functions (in routes)

Most routes use the query layer:

```typescript
// app/api/auth/login/route.ts
import { findUserByEmail } from "@/lib/queries";

const user = await findUserByEmail(email);
```

### All API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/auth/login` | POST | User authentication |
| `/api/auth/register` | POST | New user registration |
| `/api/auth/profile` | PUT | Update profile/password |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Reset password with token |
| `/api/bookings` | GET, POST | List/create bookings |
| `/api/bookings/[id]` | PATCH | Update booking status/rating |
| `/api/employees` | GET, POST | List/create employees |
| `/api/employees/[id]` | GET, PUT, DELETE | CRUD single employee |
| `/api/employees/[id]/schedule` | GET | Employee's weekly schedule |
| `/api/services` | GET, POST | List/create services |
| `/api/services/[id]` | GET, PUT, DELETE | CRUD single service |
| `/api/testimonials` | GET | List testimonials |
| `/api/schedule` | GET, POST, DELETE | List/create/bulk-delete schedules |
| `/api/schedule/[id]` | PATCH, DELETE | Update/delete single schedule |

All routes set `export const dynamic = "force-dynamic"` to prevent caching of database queries.

---

## Seeding

### File: `prisma/seed.ts`

The seed script populates the database with initial data:

```bash
npx prisma db seed
```

### Seed Order

1. **Clear existing data** (in correct order for foreign key constraints):
   - Bookings → EmployeeService → WeeklySchedule → PasswordResetToken → Testimonials → Users → Services → Employees

2. **Seed Employees** (7 employees with profiles)

3. **Seed Services** (10 services with employee assignments via junction table)

4. **Seed Testimonials** (6 client reviews)

5. **Seed Users** (2 demo accounts + 6 employee accounts):
   - `demo@adamascare.com` / `demo123` (user role)
   - `admin@adamascare.com` / `admin123` (admin role)
   - `priya@adamascare.com` / `priya123` (employee role)
   - `anjali@adamascare.com` / `anjali123` (employee role)
   - `kavya@adamascare.com` / `kavya123` (employee role)
   - `rahul@adamascare.com` / `rahul123` (employee role)
   - `neha@adamascare.com` / `neha123` (employee role)
   - `sneha@adamascare.com` / `sneha123` (employee role)
   - `aarti@adamascare.com` / `aarti123` (employee role)

6. **Seed Weekly Schedules** (23 schedule entries across all employees)

### npm Script

```json
{
  "db:seed": "npx tsx prisma/seed.ts",
  "db:push": "npx prisma db push",
  "db:generate": "npx prisma generate",
  "db:studio": "npx prisma studio"
}
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `RESEND_API_KEY` | Resend email service API key | `re_xxxxx` |
| `NEXT_PUBLIC_BASE_URL` | App base URL for email links | `http://localhost:3000` |
| `EMAIL_FROM` | Sender email address | `Adamas Care <onboarding@resend.dev>` |

### `.env.local` Format

```env
# Database connection string from Neon dashboard
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Resend email service (get key from https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxx

# Email sender address (use onboarding@resend.dev for testing)
EMAIL_FROM=Adamas Care <onboarding@resend.dev>

# App base URL for email links
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

> **Note:** `.env.local` is gitignored and will not be committed to version control.

---

## Common Commands

| Command | Description |
|---------|-------------|
| `npx prisma db push` | Push schema changes to the database (no migrations) |
| `npx prisma generate` | Regenerate the Prisma Client |
| `npx prisma db seed` | Run the seed script |
| `npx prisma studio` | Open Prisma Studio (visual database browser) |
| `npx prisma migrate dev` | Create a migration (alternative to db push) |
| `npx prisma migrate deploy` | Apply pending migrations in production |

---

## Production Considerations

1. **Password Hashing:** Currently passwords are stored in plaintext. In production, use bcrypt or argon2 for hashing.

2. **Connection Pooling:** Neon provides connection pooling. For serverless deployments (Vercel, AWS Lambda), consider using `@prisma/adapter-neon` for optimal connection handling.

3. **Migrations vs Push:** `prisma db push` is great for development. For production, use `prisma migrate dev` to create proper migration files that track schema changes.

4. **Indexes:** The Prisma schema uses `@@unique` constraints which create indexes automatically. For performance-critical queries, consider adding explicit `@@index` directives.

5. **Soft Deletes:** The application uses hard deletes. For data retention, consider implementing soft deletes with a `deletedAt` field.

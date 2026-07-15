import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "adamas-care-api",
    version: "1.0.0",
    endpoints: {
      auth: {
        login: "POST /api/auth/login",
        register: "POST /api/auth/register",
        logout: "POST /api/auth/logout",
        me: "GET /api/auth/me",
        refresh: "POST /api/auth/refresh",
        profile: "PUT /api/auth/profile",
        "forgot-password": "POST /api/auth/forgot-password",
        "reset-password": "POST /api/auth/reset-password",
      },
      services: {
        list: "GET /api/services",
        get: "GET /api/services/:id",
        create: "POST /api/services",
        update: "PUT /api/services/:id",
        delete: "DELETE /api/services/:id",
      },
      employees: {
        list: "GET /api/employees",
        get: "GET /api/employees/:id",
        create: "POST /api/employees",
        update: "PUT /api/employees/:id",
        delete: "DELETE /api/employees/:id",
        schedule: "GET /api/employees/:id/schedule",
      },
      availability: {
        slots: "GET /api/availability?employeeId=&date=&serviceDuration=",
        dates: "GET /api/availability/dates?employeeId=&month=&serviceDuration=",
        legacy: "GET /api/available-slots?employeeId=&date=",
      },
      bookings: {
        list: "GET /api/bookings",
        create: "POST /api/bookings",
        update: "PATCH /api/bookings/:id",
      },
      admin: {
        availability: "GET|POST|PATCH|DELETE /api/admin/availability",
        overrides: "GET|POST|DELETE /api/admin/availability/overrides",
      },
      testimonials: "GET /api/testimonials",
    },
  });
}

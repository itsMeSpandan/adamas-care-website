/**
 * tests/api-edge.test.ts — API endpoint contract tests + edge case / abuse scenarios.
 *
 * Mocks Prisma and auth to test route handlers in isolation.
 * Covers: API-01 through API-10, EDGE-01 through EDGE-07.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ────────────────────────────────────────────────────────

const mockDb = {
  employeeService: { findMany: vi.fn() },
  employee: { findMany: vi.fn(), findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  service: { findMany: vi.fn() },
  waitlist: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  userReliability: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  booking: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  employeeAvailability: { findMany: vi.fn() },
  availabilityOverride: { findMany: vi.fn() },
  $executeRaw: vi.fn().mockResolvedValue([]),
  $transaction: vi.fn((fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb)),
};

vi.mock("@/lib/db", () => ({ db: mockDb }));

// ─── Mock Auth ──────────────────────────────────────────────────────────

const mockSession = { userId: "user-123", role: "user", email: "test@gracesalon.com" };

vi.mock("@/lib/auth", () => ({
  getSessionFromRequest: vi.fn().mockResolvedValue(mockSession),
  signToken: vi.fn().mockResolvedValue("mock-token"),
  verifyToken: vi.fn().mockResolvedValue({ userId: "user-123", role: "user", email: "test@gracesalon.com" }),
  setSessionCookies: vi.fn(),
  clearSessionCookies: vi.fn(),
}));

vi.mock("@/lib/require-auth", () => ({
  requireAuth: (handler: Function) => async (request: Request, context?: any) => {
    const session = { userId: "user-123", role: "user", email: "test@gracesalon.com" };
    return handler(request, { ...context, session });
  },
  requireRole: (role: string) => (handler: Function) => async (request: Request, context?: any) => {
    const session = { userId: "user-123", role, email: "test@gracesalon.com" };
    return handler(request, { ...context, session });
  },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/loyalty", () => ({
  applyRedemptionToBooking: vi.fn(),
  linkRedemptionToBooking: vi.fn(),
}));

// ─── Helpers ────────────────────────────────────────────────────────────

function makeRequest(method: string, url: string, body?: unknown, cookies?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookies) headers["cookie"] = cookies;
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── API-01: GET /api/employees ─────────────────────────────────────────

describe("API-01: GET /api/employees with valid serviceIds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 + array of eligible employees", async () => {
    mockDb.employeeService.findMany.mockResolvedValue([
      { employeeId: "emp-1" },
      { employeeId: "emp-2" },
    ]);
    mockDb.user.findUnique.mockResolvedValue({ gender: "male" });
    mockDb.employee.findMany.mockResolvedValue([
      { id: "emp-1", name: "Male Emp 1", gender: "male", rating: 4.5 },
      { id: "emp-2", name: "Male Emp 2", gender: "male", rating: 4.8 },
    ]);

    const { GET } = await import("@/app/api/employees/route");
    const req = makeRequest("GET", "http://localhost/api/employees?serviceIds=svc-1,svc-2");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data.employees)).toBe(true);
  });
});

// ─── API-02: GET /api/employees without serviceIds (admin) ─────────────

describe("API-02: GET /api/employees without serviceIds returns all", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all employees as a flat array", async () => {
    mockDb.employee.findMany.mockResolvedValue([
      { id: "emp-1", name: "Priya", email: "priya@gracesalon.com", role: "Stylist", gender: "female", bio: "", imageUrl: "/img.jpg", yearsExperience: 15, instagramHandle: null, rating: 5, reviewCount: 12, employeeServices: [{ serviceId: "svc-1" }, { serviceId: "svc-2" }] },
    ]);

    const { GET } = await import("@/app/api/employees/route");
    const req = makeRequest("GET", "http://localhost/api/employees");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].serviceIds).toEqual(["svc-1", "svc-2"]);
  });
});

// ─── API-03: POST /api/bookings with valid data ────────────────────────

describe("API-03: POST /api/bookings with valid data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 201 + booking object", async () => {
    mockDb.service.findMany.mockResolvedValue([{ id: "svc-1", price: 100 }]);
    mockDb.employeeService.findMany.mockResolvedValue([{ serviceId: "svc-1", employeeId: "emp-1" }]);
    mockDb.employeeAvailability.findMany.mockResolvedValue([
      { startTime: "10:00", endTime: "18:00", dayOfWeek: 1 },
    ]);
    mockDb.availabilityOverride.findMany.mockResolvedValue([]);
    mockDb.booking.findMany.mockResolvedValue([]);
    mockDb.booking.create.mockResolvedValue({ id: "booking-new", status: "pending" });

    const { POST } = await import("@/app/api/bookings/route");
    const req = makeRequest("POST", "http://localhost/api/bookings", {
      serviceId: "svc-1",
      employeeId: "emp-1",
      date: "2026-12-01",
      slotStart: "10:00",
      slotEnd: "11:00",
      name: "Test User",
      email: "test@gracesalon.com",
      phone: "+91 99999 00000",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.booking).toBeDefined();
  });
});

// ─── API-04: POST /api/bookings missing fields ────────────────────────

describe("API-04: POST /api/bookings missing fields", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 with missing required fields", async () => {
    const { POST } = await import("@/app/api/bookings/route");
    const req = makeRequest("POST", "http://localhost/api/bookings", {
      name: "Test",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });
});

// ─── API-05: POST /api/bookings with gender mismatch ──────────────────

describe("API-05: POST /api/bookings with gender mismatch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 for gender mismatch", async () => {
    mockDb.service.findMany.mockResolvedValue([{ id: "svc-1", price: 100 }]);
    mockDb.employeeService.findMany.mockResolvedValue([{ serviceId: "svc-1", employeeId: "emp-1" }]);
    mockDb.user.findUnique.mockResolvedValue({ gender: "male" }); // male user
    mockDb.employee.findUnique.mockResolvedValue({ gender: "female" }); // female employee

    const { POST } = await import("@/app/api/bookings/route");
    const req = makeRequest("POST", "http://localhost/api/bookings", {
      serviceId: "svc-1",
      employeeId: "emp-1",
      date: "2026-12-01",
      slotStart: "10:00",
      slotEnd: "11:00",
      name: "Male User",
      email: "male@gracesalon.com",
      phone: "+91 99999 00000",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("not available");
  });
});

// ─── API-06: GET /api/waitlist/me without auth ────────────────────────

describe("API-06: GET /api/waitlist/me without auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    // Override the mock to return null session
    const auth = await import("@/lib/auth");
    vi.mocked(auth.getSessionFromRequest).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/waitlist/me/route");
    const req = makeRequest("GET", "http://localhost/api/waitlist/me");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});

// ─── API-07: GET /api/waitlist/me returns own entries only ─────────────

describe("API-07: GET /api/waitlist/me returns own entries only", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only the requesting user's entries", async () => {
    mockDb.waitlist.findMany.mockResolvedValue([
      { id: "wl-1", userId: "user-123", employee: { id: "e1", name: "Emp", imageUrl: "" }, slotStart: "10:00", slotEnd: "11:00", serviceId: null, status: "waiting", createdAt: new Date(), notifiedAt: null, claimExpiresAt: null },
    ]);
    mockDb.userReliability.findUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/waitlist/me/route");
    const req = makeRequest("GET", "http://localhost/api/waitlist/me");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.entries).toHaveLength(1);
    // Verify the DB was queried with the correct userId
    expect(mockDb.waitlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-123" }) })
    );
  });
});

// ─── API-08: POST /api/waitlist creates entry ──────────────────────────

describe("API-08: POST /api/waitlist creates entry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 201 + waitlist entry", async () => {
    mockDb.waitlist.findFirst.mockResolvedValue(null); // no duplicate
    mockDb.waitlist.create.mockResolvedValue({
      id: "wl-new",
      userId: "user-123",
      employeeId: "emp-1",
      status: "waiting",
    });

    const { POST } = await import("@/app/api/waitlist/route");
    const req = makeRequest("POST", "http://localhost/api/waitlist", {
      employeeId: "emp-1",
      slotStart: "10:00",
      slotEnd: "11:00",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.entry).toBeDefined();
    expect(data.entry.status).toBe("waiting");
  });
});

// ─── API-09: GET /api/availability with serviceIds ─────────────────────

describe("API-09: GET /api/availability with serviceIds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 + slots computed from totalDuration", async () => {
    // Mock computeTotalDuration's DB call
    mockDb.service.findMany.mockResolvedValue([{ id: "s1", durationMinutes: 60 }]);
    // Mock getDynamicAvailableSlots
    mockDb.employeeAvailability.findMany.mockResolvedValue([
      { id: "ea1", employeeId: "emp-1", dayOfWeek: 1, startTime: "10:00", endTime: "18:00", isActive: true },
    ]);
    mockDb.booking.findMany.mockResolvedValue([]);
    mockDb.availabilityOverride.findMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/availability/route");
    const req = makeRequest("GET", "http://localhost/api/availability?employeeId=emp-1&date=2026-12-01&serviceIds=s1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data.slots)).toBe(true);
    expect(data.totalDurationMinutes).toBe(60);
  });
});

// ─── API-10: POST /api/bookings with past date ────────────────────────

describe("API-10: POST /api/bookings with past date", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for past date", async () => {
    // Need to mock service + employee validation so gender check passes first
    mockDb.service.findMany.mockResolvedValue([{ id: "svc-1", price: 100 }]);
    mockDb.employeeService.findMany.mockResolvedValue([{ serviceId: "svc-1", employeeId: "emp-1" }]);
    mockDb.user.findUnique.mockResolvedValue({ gender: "female" });
    mockDb.employee.findUnique.mockResolvedValue({ gender: "female" });

    const { POST } = await import("@/app/api/bookings/route");
    const req = makeRequest("POST", "http://localhost/api/bookings", {
      serviceId: "svc-1",
      employeeId: "emp-1",
      date: "2020-01-01",
      slotStart: "10:00",
      slotEnd: "11:00",
      name: "Test",
      email: "test@test.com",
      phone: "+91 99999 00000",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("past");
  });
});

// ─── EDGE-05: Missing fields → 400 not 500 ────────────────────────────

describe("EDGE-05: POST /api/bookings with empty body → 400 not 500", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for empty booking body", async () => {
    const { POST } = await import("@/app/api/bookings/route");
    const req = makeRequest("POST", "http://localhost/api/bookings", {});
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

// ─── EDGE-06: Unauthorized access to another user's waitlist ───────────

describe("EDGE-06: Unauthorized access to another user's waitlist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocked without session — returns 401", async () => {
    const auth = await import("@/lib/auth");
    vi.mocked(auth.getSessionFromRequest).mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/waitlist/me/route");
    const req = makeRequest("GET", "http://localhost/api/waitlist/me");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});

// ─── EDGE-07: Double-join waitlist for same slot ───────────────────────

describe("EDGE-07: Double-join waitlist for same slot", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 409 if already on waitlist", async () => {
    mockDb.waitlist.findFirst.mockResolvedValue({ id: "existing-entry" });

    const { POST } = await import("@/app/api/waitlist/route");
    const req = makeRequest("POST", "http://localhost/api/waitlist", {
      employeeId: "emp-1",
      slotStart: "10:00",
      slotEnd: "11:00",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain("already on the waitlist");
  });
});

// ─── EDGE-04: Multi-service duration doesn't fit anywhere ──────────────

describe("EDGE-04: Multi-service duration doesn't fit in any gap", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array, not a crash", async () => {
    // 8-hour working day, but request 10-hour duration
    mockDb.employeeAvailability.findMany.mockResolvedValue([
      { id: "ea1", employeeId: "emp-1", dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isActive: true },
    ]);
    mockDb.booking.findMany.mockResolvedValue([]);
    mockDb.availabilityOverride.findMany.mockResolvedValue([]);

    const { getDynamicAvailableSlots } = await import("@/lib/scoring-engine");
    const slots = await getDynamicAvailableSlots("emp-1", "2026-12-01", 600); // 10 hours

    expect(slots).toEqual([]);
  });
});

// ─── EDGE-02: Restricted user same-day booking blocked ────────────────

describe("EDGE-02: Restricted user same-day booking blocked", () => {
  beforeEach(() => vi.clearAllMocks());

  function todayStr() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }

  function futureDateStr(daysAhead: number) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }

  it("same-day booking rejected when restrictedUntil is in the future", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    mockDb.userReliability.findUnique.mockResolvedValue({
      userId: "user-123",
      restrictedUntil: futureDate,
    });

    const { POST } = await import("@/app/api/bookings/route");
    const req = makeRequest("POST", "http://localhost/api/bookings", {
      serviceId: "svc-1",
      employeeId: "emp-1",
      date: todayStr(),
      slotStart: "10:00",
      slotEnd: "11:00",
      name: "Test",
      email: "test@test.com",
      phone: "+91 99999 00000",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Same-day booking temporarily restricted");
  });

  it("future booking (3+ days out) succeeds even when restricted", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    mockDb.userReliability.findUnique.mockResolvedValue({
      userId: "user-123",
      restrictedUntil: futureDate,
    });
    // Mock the rest of the booking flow
    mockDb.service.findMany.mockResolvedValue([{ id: "svc-1", price: 100 }]);
    mockDb.employeeService.findMany.mockResolvedValue([{ serviceId: "svc-1", employeeId: "emp-1" }]);
    mockDb.user.findUnique.mockResolvedValue({ gender: "female" });
    mockDb.employee.findUnique.mockResolvedValue({ gender: "female" });
    mockDb.employeeAvailability.findMany.mockResolvedValue([
      { startTime: "10:00", endTime: "18:00", dayOfWeek: 1 },
    ]);
    mockDb.availabilityOverride.findMany.mockResolvedValue([]);
    mockDb.booking.findMany.mockResolvedValue([]);
    mockDb.booking.create.mockResolvedValue({ id: "booking-new", status: "pending" });

    const { POST } = await import("@/app/api/bookings/route");
    const req = makeRequest("POST", "http://localhost/api/bookings", {
      serviceId: "svc-1",
      employeeId: "emp-1",
      date: futureDateStr(3),
      slotStart: "10:00",
      slotEnd: "11:00",
      name: "Test",
      email: "test@test.com",
      phone: "+91 99999 00000",
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
  });
});

// ─── EDGE-03: Waitlist for slot user already holds ────────────────────

describe("EDGE-03: Waitlist for slot user already holds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocked when user has CONFIRMED booking for same slot", async () => {
    // No duplicate waitlist entry
    mockDb.waitlist.findFirst.mockResolvedValueOnce(null);
    // User already has a confirmed booking for this slot
    mockDb.booking.findFirst.mockResolvedValueOnce({ id: "existing-booking" });

    const { POST } = await import("@/app/api/waitlist/route");
    const req = makeRequest("POST", "http://localhost/api/waitlist", {
      employeeId: "emp-1",
      slotStart: "10:00",
      slotEnd: "11:00",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("already have a booking");
  });

  it("succeeds when joining waitlist for a DIFFERENT slot", async () => {
    // No duplicate waitlist entry
    mockDb.waitlist.findFirst.mockResolvedValueOnce(null);
    // No existing booking for this different slot
    mockDb.booking.findFirst.mockResolvedValueOnce(null);
    mockDb.waitlist.create.mockResolvedValue({
      id: "wl-new",
      userId: "user-123",
      employeeId: "emp-1",
      status: "waiting",
    });

    const { POST } = await import("@/app/api/waitlist/route");
    const req = makeRequest("POST", "http://localhost/api/waitlist", {
      employeeId: "emp-1",
      slotStart: "14:00",
      slotEnd: "15:00",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.entry).toBeDefined();
  });
});

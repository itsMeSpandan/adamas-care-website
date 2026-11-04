/**
 * tests/google-auth.test.ts — POST /api/auth/google contract tests.
 *
 * Covers the Google signup/login flow:
 *   - missing credential → 400
 *   - invalid/expired ID token → 401
 *   - Firebase unconfigured on server → 503 (before any body parsing cost)
 *   - unverified email claim → 403
 *   - new Google user → user created (emailVerified=true, random password),
 *     session cookies issued, { created: true } returned
 *   - existing Google-created user → no duplicate, { created: false },
 *     session cookies issued (login path)
 *   - unique-email race (P2002) → re-reads user and still signs in
 *   - cross-site Origin rejected (CSRF)
 *   - no password hash ever echoed back
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
  return { mockDb };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/auth", () => ({
  setSessionCookies: vi.fn(),
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({
    check: () => ({ success: true, remaining: 5, retryAfterMs: 0 }),
    checkAsync: async () => ({ success: true, remaining: 5, retryAfterMs: 0 }),
  }),
  getRateLimitKey: (req: Request, prefix: string) => `${prefix}:test`,
}));

vi.mock("@/lib/firebase-admin", () => ({
  isFirebaseConfigured: vi.fn(() => true),
  verifyGoogleIdToken: vi.fn(),
}));

import { POST as googleAuth } from "@/app/api/auth/google/route";
import { setSessionCookies } from "@/lib/auth";
import {
  isFirebaseConfigured,
  verifyGoogleIdToken,
} from "@/lib/firebase-admin";

const configuredMock = vi.mocked(isFirebaseConfigured);
const verifyMock = vi.mocked(verifyGoogleIdToken);
const cookiesMock = vi.mocked(setSessionCookies);

const decodedToken = {
  email: "New.User@Example.com",
  email_verified: true,
  name: "New User",
  picture: "https://lh3.googleusercontent.com/avatar",
  uid: "firebase-uid-1",
};

function makeRequest(body?: unknown, origin?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) headers["Origin"] = origin;
  return new Request("http://localhost/api/auth/google", {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks does NOT reset return values — restore the default
  // (the 503 test flips this to false).
  configuredMock.mockReturnValue(true);
});

describe("POST /api/auth/google", () => {
  it("400s when credential is missing", async () => {
    const res = await googleAuth(makeRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toHaveProperty("error", "Missing Google credential");
  });

  it("503s when Firebase is not configured server-side", async () => {
    configuredMock.mockReturnValue(false);
    const res = await googleAuth(makeRequest({ credential: "tok" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toHaveProperty("error");
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("401s when the ID token is invalid/expired", async () => {
    verifyMock.mockResolvedValue(null);
    const res = await googleAuth(makeRequest({ credential: "bad-token" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toHaveProperty("error");
    expect(mockDb.user.findFirst).not.toHaveBeenCalled();
  });

  it("403s when Google email is not verified", async () => {
    verifyMock.mockResolvedValue({ ...decodedToken, email_verified: false } as never);
    const res = await googleAuth(makeRequest({ credential: "tok" }));
    expect(res.status).toBe(403);
    expect(mockDb.user.create).not.toHaveBeenCalled();
    expect(cookiesMock).not.toHaveBeenCalled();
  });

  it("400s when the token has no email", async () => {
    verifyMock.mockResolvedValue({ email: undefined, email_verified: true } as never);
    const res = await googleAuth(makeRequest({ credential: "tok" }));
    expect(res.status).toBe(400);
    expect(mockDb.user.create).not.toHaveBeenCalled();
  });

  it("creates a NEW user on first sign-in (signup+login in one)", async () => {
    verifyMock.mockResolvedValue(decodedToken as never);
    mockDb.user.findFirst.mockResolvedValue(null);
    mockDb.user.create.mockResolvedValue({
      id: "user-new",
      name: "New User",
      email: "new.user@example.com", // lowercased
      password: "$2b$12$hashhashhash",
      role: "user",
      gender: null,
      avatarUrl: "https://lh3.googleusercontent.com/avatar",
      emailVerified: true,
    } as never);

    const res = await googleAuth(makeRequest({ credential: "tok" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.created).toBe(true);
    expect(body.user.email).toBe("new.user@example.com");
    expect(body.user.emailVerified).toBe(true);
    expect(body.user).not.toHaveProperty("password");

    const createArgs = mockDb.user.create.mock.calls[0][0].data;
    expect(createArgs.emailVerified).toBe(true);
    expect(createArgs.role).toBe("user");
    expect(typeof createArgs.password).toBe("string");
    expect(createArgs.password.length).toBeGreaterThan(20);

    expect(cookiesMock).toHaveBeenCalledWith({
      userId: "user-new",
      role: "user",
      email: "new.user@example.com",
    });
  });

  it("signs in an EXISTING user without creating a duplicate", async () => {
    verifyMock.mockResolvedValue(decodedToken as never);
    mockDb.user.findFirst.mockResolvedValue({
      id: "user-existing",
      name: "New User",
      email: "new.user@example.com",
      password: "$2b$12$existinghash",
      role: "user",
      emailVerified: true,
    } as never);

    const res = await googleAuth(makeRequest({ credential: "tok" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.created).toBe(false);
    expect(body.user.id).toBe("user-existing");
    expect(body.user).not.toHaveProperty("password");

    expect(mockDb.user.create).not.toHaveBeenCalled();
    expect(cookiesMock).toHaveBeenCalledWith({
      userId: "user-existing",
      role: "user",
      email: "new.user@example.com",
    });
  });

  it("recovers from a unique-email race (P2002) by re-reading the user", async () => {
    verifyMock.mockResolvedValue(decodedToken as never);
    mockDb.user.findFirst
      .mockResolvedValueOnce(null) // first lookup: not found
      .mockResolvedValueOnce({
        id: "user-raced",
        name: "New User",
        email: "new.user@example.com",
        password: "$2b$12$racedhash",
        role: "user",
        emailVerified: true,
      } as never);
    const p2002 = Object.assign(new Error("Unique constraint"), { code: "P2002" });
    mockDb.user.create.mockRejectedValue(p2002 as never);

    const res = await googleAuth(makeRequest({ credential: "tok" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe("user-raced");
    expect(cookiesMock).toHaveBeenCalled();
  });

  it("rejects cross-site Origin (CSRF)", async () => {
    const res = await googleAuth(
      makeRequest({ credential: "tok" }, "https://evil.example")
    );
    expect(res.status).toBe(403);
    expect(verifyMock).not.toHaveBeenCalled();
    expect(mockDb.user.findFirst).not.toHaveBeenCalled();
  });
});

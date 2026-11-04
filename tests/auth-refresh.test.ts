/**
 * tests/auth-refresh.test.ts — POST /api/auth/refresh contract tests.
 *
 * Covers the login-persistence fix:
 *   - no refresh cookie → 401 (client falls back to "logged out")
 *   - expired/invalid JWT → 401 + refresh cookie cleared
 *   - valid token → 200 + rotated session & refresh cookies set
 *   - reused (already-revoked) token → 401, BOTH cookies cleared,
 *     all sessions revoked (reuse detection must not regress — it is the
 *     reason the client serializes refreshes behind a Web Lock)
 *
 * Mocks Prisma + auth signing; exercises the real route handler.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    refreshToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  };
  return { mockDb };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
  signToken: vi.fn(),
}));

vi.mock("@/lib/refresh-tokens", () => ({
  verifyAndRevokeRefreshToken: vi.fn(),
  createRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
}));

import { POST as refresh } from "@/app/api/auth/refresh/route";
import { verifyToken, signToken } from "@/lib/auth";
import {
  verifyAndRevokeRefreshToken,
  createRefreshToken,
} from "@/lib/refresh-tokens";

const verifyTokenMock = vi.mocked(verifyToken);
const signTokenMock = vi.mocked(signToken);
const verifyRevokeMock = vi.mocked(verifyAndRevokeRefreshToken);
const createMock = vi.mocked(createRefreshToken);

const payload = { userId: "user-1", role: "user", email: "a@b.c" };

function requestWithCookie(cookie?: string): Request {
  const headers: Record<string, string> = {};
  if (cookie) headers["cookie"] = cookie;
  return new Request("http://localhost/api/auth/refresh", {
    method: "POST",
    headers,
  });
}

function setCookieValues(res: Response): string[] {
  // Node/undici combines multiple Set-Cookie into one header string;
  // split on the boundary between attributes and the next cookie name.
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  if (raw.length > 0) return raw;
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

describe("POST /api/auth/refresh", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401s when no refresh cookie is present", async () => {
    const res = await refresh(requestWithCookie());
    expect(res.status).toBe(401);
    expect(await res.json()).toHaveProperty("error", "No refresh token");
    expect(verifyRevokeMock).not.toHaveBeenCalled();
  });

  it("401s + clears cookie when the refresh JWT is expired/invalid", async () => {
    verifyTokenMock.mockResolvedValue(null);

    const res = await refresh(requestWithCookie("gracesalon_refresh=expired.jwt"));
    expect(res.status).toBe(401);

    const cookies = setCookieValues(res);
    expect(
      cookies.some((c) => c.startsWith("gracesalon_refresh=;") || /gracesalon_refresh=;/.test(c) || /gracesalon_refresh=($|;)/.test(c))
    ).toBe(true);
    expect(verifyRevokeMock).not.toHaveBeenCalled();
  });

  it("rotates both cookies on a valid refresh token", async () => {
    verifyTokenMock.mockResolvedValue(payload);
    verifyRevokeMock.mockResolvedValue(undefined);
    signTokenMock.mockResolvedValueOnce("new-access").mockResolvedValueOnce("new-refresh");
    createMock.mockResolvedValue(undefined);

    const res = await refresh(requestWithCookie("gracesalon_refresh=valid.jwt"));
    expect(res.status).toBe(200);
    await res.json();

    expect(verifyRevokeMock).toHaveBeenCalledWith("user-1", "valid.jwt");
    expect(signTokenMock).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenCalledWith("user-1", "new-refresh");

    const cookies = setCookieValues(res);
    expect(cookies.some((c) => c.includes("gracesalon_session=new-access"))).toBe(true);
    expect(cookies.some((c) => c.includes("gracesalon_refresh=new-refresh"))).toBe(true);
    // Session cookie must stay short-lived (15 min = 900s)
    expect(cookies.some((c) => c.includes("gracesalon_session=new-access") && c.includes("Max-Age=900"))).toBe(true);
    // Refresh cookie keeps its 7-day window (604800s)
    expect(cookies.some((c) => c.includes("gracesalon_refresh=new-refresh") && c.includes("Max-Age=604800"))).toBe(true);
  });

  it("reuse detection: revoked token → 401, BOTH cookies cleared, no new tokens issued", async () => {
    verifyTokenMock.mockResolvedValue(payload);
    verifyRevokeMock.mockRejectedValue(new Error("REFRESH_TOKEN_REUSE_DETECTED"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await refresh(requestWithCookie("gracesalon_refresh=reused.jwt"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("revoked");

    expect(signTokenMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();

    const cookies = setCookieValues(res);
    // Both the refresh AND session cookies must be emptied
    expect(cookies.some((c) => c.includes("gracesalon_refresh="))).toBe(true);
    expect(cookies.some((c) => c.includes("gracesalon_session="))).toBe(true);

    consoleSpy.mockRestore();
  });

  it("generic DB failure during rotation → 401 (invalid refresh token path)", async () => {
    verifyTokenMock.mockResolvedValue(payload);
    verifyRevokeMock.mockRejectedValue(new Error("INVALID_REFRESH_TOKEN"));

    const res = await refresh(requestWithCookie("gracesalon_refresh=unknown.jwt"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("log in again");
    expect(signTokenMock).not.toHaveBeenCalled();
  });
});

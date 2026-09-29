/**
 * tests/password-reset.test.ts — email password-reset contract tests.
 *
 * Covers (Phase 7.1):
 *   - enumeration-safe: identical responses for known vs unknown emails
 *   - raw token never stored (SHA-256 only); emailed raw token hashes to it
 *   - older unused tokens invalidated per request
 *   - reset: expired → 400, used (single-use) → 400, unknown → 400
 *   - success: bcrypt(12), mark used, revoke ALL refresh tokens
 *   - cross-site Origin rejected (CSRF)
 *
 * Mocks Prisma, Resend, and refresh-token revocation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    user: { findUnique: vi.fn(), update: vi.fn() },
    passwordResetToken: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    emailVerificationToken: { findMany: vi.fn() },
    $transaction: vi.fn(async (arg: unknown) => arg),
  };
  return { mockDb };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => ({
    check: () => ({ success: true, remaining: 5, retryAfterMs: 0 }),
    checkAsync: async () => ({ success: true, remaining: 5, retryAfterMs: 0 }),
  }),
  getRateLimitKey: (req: Request, prefix: string) => `${prefix}:test`,
  getEmailKey: (req: Request, prefix: string, email: string) => `${prefix}:${email}`,
  getTrustedClientIp: () => "test-ip",
}));

vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendTransactionalEmail: vi.fn(),
  sendVerificationOtpEmail: vi.fn(),
}));

vi.mock("@/lib/refresh-tokens", () => ({
  createRefreshToken: vi.fn(),
  verifyAndRevokeRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  revokeAllUserTokens: vi.fn(),
}));

import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { sendPasswordResetEmail } from "@/lib/email";
import { revokeAllUserTokens } from "@/lib/refresh-tokens";

const emailMock = vi.mocked(sendPasswordResetEmail);
const revokeMock = vi.mocked(revokeAllUserTokens);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonRequest(url: string, body: unknown, origin?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (origin) headers["Origin"] = origin;
  return new Request(url, { method: "POST", headers, body: JSON.stringify(body) });
}

const KNOWN_USER = { id: "user-1", email: "casey@example.com", name: "Casey" };

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.user.findUnique.mockResolvedValue(null);
  mockDb.passwordResetToken.findUnique.mockResolvedValue(null);
  mockDb.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
  mockDb.passwordResetToken.create.mockResolvedValue({});
  mockDb.passwordResetToken.update.mockResolvedValue({});
  mockDb.user.update.mockResolvedValue({});
  mockDb.$transaction.mockImplementation(async (arg: unknown) => arg);
  emailMock.mockResolvedValue(true);
});

// ─── forgot-password ─────────────────────────────────────────────────────────

describe("POST /api/auth/forgot-password", () => {
  it("is enumeration-safe: unknown and known emails return identical responses", async () => {
    // Unknown email
    mockDb.user.findUnique.mockResolvedValueOnce(null);
    const ghost = await forgotPassword(
      jsonRequest("http://localhost/api/auth/forgot-password", { email: "ghost@example.com" })
    );
    const ghostBody = await ghost.json();

    // Known email
    mockDb.user.findUnique.mockResolvedValueOnce(KNOWN_USER);
    const known = await forgotPassword(
      jsonRequest("http://localhost/api/auth/forgot-password", { email: "casey@example.com" })
    );
    const knownBody = await known.json();

    expect(ghost.status).toBe(200);
    expect(known.status).toBe(200);
    expect(ghostBody).toEqual(knownBody);
    // Email was only attempted for the existing account.
    expect(emailMock).toHaveBeenCalledTimes(1);
  });

  it("stores only the SHA-256 hash — the raw emailed token hashes to it", async () => {
    mockDb.user.findUnique.mockResolvedValue(KNOWN_USER);

    const res = await forgotPassword(
      jsonRequest("http://localhost/api/auth/forgot-password", { email: "casey@example.com" })
    );
    expect(res.status).toBe(200);

    // Older unused tokens are invalidated first.
    expect(mockDb.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", usedAt: null },
      data: { usedAt: expect.any(Date) },
    });

    const createArgs = mockDb.passwordResetToken.create.mock.calls[0][0].data;
    expect(createArgs.tokenHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    expect(createArgs.token).toBeUndefined(); // raw token NEVER stored
    expect(createArgs.requestIp).toBe("test-ip");
    expect(new Date(createArgs.expiresAt).getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);

    // The emailed link carries the RAW token, which hashes to the stored value.
    const resetUrl = emailMock.mock.calls[0][0].resetUrl as string;
    const raw = new URL(resetUrl).searchParams.get("token")!;
    expect(raw).toBeTruthy();
    expect(crypto.createHash("sha256").update(raw).digest("hex")).toBe(createArgs.tokenHash);
  });

  it("still returns the generic 200 when the email provider fails", async () => {
    mockDb.user.findUnique.mockResolvedValue(KNOWN_USER);
    emailMock.mockResolvedValue(false);

    const res = await forgotPassword(
      jsonRequest("http://localhost/api/auth/forgot-password", { email: "casey@example.com" })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: "If an account exists with this email, a password reset link has been sent.",
    });
  });

  it("rejects cross-site browser requests (CSRF)", async () => {
    const res = await forgotPassword(
      jsonRequest(
        "http://localhost/api/auth/forgot-password",
        { email: "casey@example.com" },
        "http://evil.example.com"
      )
    );
    expect(res.status).toBe(403);
    expect(mockDb.user.findUnique).not.toHaveBeenCalled();
  });

  it("validates the email shape", async () => {
    const res = await forgotPassword(
      jsonRequest("http://localhost/api/auth/forgot-password", { email: "not-an-email" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTruthy();
  });
});

// ─── reset-password ──────────────────────────────────────────────────────────

describe("POST /api/auth/reset-password", () => {
  const TOKEN = "raw-token-abc123";
  const tokenHash = crypto.createHash("sha256").update(TOKEN).digest("hex");

  function resetBody(newPassword = "BrandNewPass456!") {
    return jsonRequest("http://localhost/api/auth/reset-password", {
      token: TOKEN,
      newPassword,
    });
  }

  it("rejects an expired token", async () => {
    mockDb.passwordResetToken.findUnique.mockResolvedValue({
      id: "prt-1",
      userId: "user-1",
      tokenHash,
      expiresAt: new Date(Date.now() - 60_000), // expired 1 min ago
      usedAt: null,
    });

    const res = await resetPassword(resetBody());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid or expired/i);
    expect(mockDb.user.update).not.toHaveBeenCalled();
    expect(revokeMock).not.toHaveBeenCalled();
  });

  it("rejects an already-used token (single-use)", async () => {
    mockDb.passwordResetToken.findUnique.mockResolvedValue({
      id: "prt-1",
      userId: "user-1",
      tokenHash,
      expiresAt: new Date(Date.now() + 10 * 60_000),
      usedAt: new Date(), // consumed
    });

    const res = await resetPassword(resetBody());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid or expired/i);
    expect(mockDb.user.update).not.toHaveBeenCalled();
  });

  it("rejects an unknown token", async () => {
    mockDb.passwordResetToken.findUnique.mockResolvedValue(null);
    const res = await resetPassword(resetBody());
    expect(res.status).toBe(400);
  });

  it("looks the token up by SHA-256 hash, not raw value", async () => {
    mockDb.passwordResetToken.findUnique.mockResolvedValue({
      id: "prt-1",
      userId: "user-1",
      tokenHash,
      expiresAt: new Date(Date.now() + 10 * 60_000),
      usedAt: null,
    });
    await resetPassword(resetBody());
    expect(mockDb.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash }, // never { token: TOKEN }
    });
  });

  it("applies the signup password rules (min 8)", async () => {
    mockDb.passwordResetToken.findUnique.mockResolvedValue({
      id: "prt-1",
      userId: "user-1",
      tokenHash,
      expiresAt: new Date(Date.now() + 10 * 60_000),
      usedAt: null,
    });
    const res = await resetPassword(resetBody("short"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at least 8 characters/i);
  });

  it("success: bcrypt(12) hash, marks used, revokes ALL refresh tokens", async () => {
    mockDb.passwordResetToken.findUnique.mockResolvedValue({
      id: "prt-1",
      userId: "user-1",
      tokenHash,
      expiresAt: new Date(Date.now() + 10 * 60_000),
      usedAt: null,
    });

    const res = await resetPassword(resetBody("BrandNewPass456!"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: "Password has been reset successfully. You can now sign in.",
    });

    // Password update + token consumption happen together.
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);

    const updateCall = mockDb.user.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "user-1" });
    expect(updateCall.data.password).toMatch(/^\$2[aby]\$12\$/); // bcrypt cost 12

    expect(mockDb.passwordResetToken.update).toHaveBeenCalledWith({
      where: { id: "prt-1" },
      data: { usedAt: expect.any(Date) },
    });

    // Force re-login everywhere.
    expect(revokeMock).toHaveBeenCalledWith("user-1");
  });

  it("rejects cross-site browser requests (CSRF)", async () => {
    const res = await resetPassword(
      jsonRequest(
        "http://localhost/api/auth/reset-password",
        { token: TOKEN, newPassword: "BrandNewPass456!" },
        "http://evil.example.com"
      )
    );
    expect(res.status).toBe(403);
    expect(mockDb.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });
});

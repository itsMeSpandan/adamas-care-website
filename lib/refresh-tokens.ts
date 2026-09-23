/**
 * lib/refresh-tokens.ts — Server-side refresh token management.
 *
 * Provides DB-backed refresh token creation, verification, and revocation.
 * Tokens are stored as SHA-256 hashes (never raw JWTs).
 *
 * Flow:
 *   1. On login/register: sign JWT + call createRefreshToken(userId, jwt)
 *   2. On refresh: extract old JWT → verifyAndRevokeRefreshToken(userId, oldJwt)
 *                  → sign new JWT → createRefreshToken(userId, newJwt)
 *   3. On logout: extract JWT → revokeRefreshToken(jwt)
 *
 * Reuse detection: if a revoked token is presented, all user tokens are revoked.
 */

import crypto from "crypto";
import { db } from "@/lib/db";

/** Hash a refresh token for storage (never store raw JWTs). */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Persist a new refresh token in the DB.
 * Called during login/register/refresh after signing the JWT.
 */
export async function createRefreshToken(
  userId: string,
  rawToken: string
): Promise<void> {
  await db.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      jti: crypto.randomBytes(16).toString("hex"),
    },
  });
}

/**
 * Verify a refresh token exists and is not revoked, then revoke it.
 * Used during refresh rotation: old token is revoked before new one is issued.
 *
 * Throws on:
 *   - INVALID_REFRESH_TOKEN: token not found in DB
 *   - TOKEN_USER_MISMATCH: token belongs to different user
 *   - REFRESH_TOKEN_REUSE_DETECTED: token already revoked (all user tokens revoked)
 */
export async function verifyAndRevokeRefreshToken(
  userId: string,
  oldRawToken: string
): Promise<void> {
  const oldHash = hashToken(oldRawToken);

  const record = await db.refreshToken.findUnique({
    where: { tokenHash: oldHash },
  });

  if (!record) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  if (record.userId !== userId) {
    await revokeAllUserTokens(userId);
    throw new Error("TOKEN_USER_MISMATCH");
  }

  if (record.revoked) {
    await revokeAllUserTokens(userId);
    throw new Error("REFRESH_TOKEN_REUSE_DETECTED");
  }

  await db.refreshToken.update({
    where: { id: record.id },
    data: { revoked: true },
  });
}

/**
 * Revoke a specific refresh token (used during logout).
 */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await db.refreshToken.updateMany({
    where: { tokenHash },
    data: { revoked: true },
  });
}

/**
 * Revoke ALL refresh tokens for a user (logout everywhere / compromise).
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
}

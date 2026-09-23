import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { COOKIE_NAMES, TOKEN_EXPIRY } from "@/lib/constants";
import { createRefreshToken, revokeRefreshToken } from "@/lib/refresh-tokens";

const envSecret = process.env.SESSION_SECRET;
if (!envSecret) {
  throw new Error(
    "SESSION_SECRET is not set. Refusing to start with an insecure JWT secret."
  );
}

// Reject weak secrets: too short, common values, or low entropy
const WEAK_SECRETS = new Set([
  "secret", "password", "changeme", "default", "test",
  "supersecret", "mysecret", "jwt-secret", "keyboard cat",
]);
if (envSecret.length < 32) {
  throw new Error(
    `SESSION_SECRET is too short (${envSecret.length} chars). Must be at least 32 characters.`
  );
}
if (WEAK_SECRETS.has(envSecret.toLowerCase().trim())) {
  throw new Error(
    "SESSION_SECRET is a known weak value. Use a cryptographically random string."
  );
}
// Basic entropy check: at least 4 unique characters
const uniqueChars = new Set(envSecret).size;
if (uniqueChars < 4) {
  throw new Error(
    `SESSION_SECRET has very low entropy (${uniqueChars} unique characters). Use a random string.`
  );
}

const SESSION_SECRET = new TextEncoder().encode(envSecret);

export interface SessionPayload {
  userId: string;
  role: string;
  email: string;
}

export interface Session {
  userId: string;
  role: string;
  email: string;
}

/**
 * Sign a JWT with the given payload.
 */
export async function signToken(
  payload: SessionPayload,
  expiresIn: string
): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SESSION_SECRET);
}

/**
 * Verify a JWT and return the decoded payload.
 */
export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Set session cookies (access + refresh tokens) as httpOnly, secure, sameSite=lax.
 */
export async function setSessionCookies(
  payload: SessionPayload
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = await signToken(payload, TOKEN_EXPIRY.access);
  const refreshToken = await signToken(payload, TOKEN_EXPIRY.refresh);

  // Persist refresh token in DB for rotation and revocation
  await createRefreshToken(payload.userId, refreshToken);

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAMES.session, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set(COOKIE_NAMES.refresh, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return { accessToken, refreshToken };
}

/**
 * Clear session cookies (logout).
 */
export async function clearSessionCookies(rawRefreshToken?: string): Promise<void> {
  // Revoke the refresh token server-side if provided
  if (rawRefreshToken) {
    await revokeRefreshToken(rawRefreshToken);
  }

  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAMES.session);
  cookieStore.delete(COOKIE_NAMES.refresh);
}

/**
 * Read session from a Request object (for use in API route handlers).
 */
export async function getSessionFromRequest(
  request: Request
): Promise<Session | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAMES.session}=([^;]+)`));
  if (!match) return null;

  const token = match[1];
  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  };
}

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { COOKIE_NAMES, TOKEN_EXPIRY } from "@/lib/constants";

// Lazily resolve SESSION_SECRET so the module can be imported at build time
// without requiring the env var to be present (only needed at runtime).
function getSessionSecret(): Uint8Array {
  const envSecret = process.env.SESSION_SECRET;
  if (!envSecret) {
    throw new Error(
      "SESSION_SECRET is not set. Refusing to sign/verify JWTs without an " +
      "explicit secret. Set it in your .env or deployment environment."
    );
  }
  return new TextEncoder().encode(envSecret);
}

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
  const secret = getSessionSecret();
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Verify a JWT and return the decoded payload.
 */
export async function verifyToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret);
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
export async function clearSessionCookies(): Promise<void> {
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

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const envSecret = process.env.SESSION_SECRET;
if (!envSecret) {
  // Fail closed: never sign JWTs with a known/committed fallback secret.
  // SESSION_SECRET must be set in the deployment environment (and locally for dev).
  throw new Error(
    "SESSION_SECRET is not set. Refusing to start with an insecure JWT secret."
  );
}
const SESSION_SECRET = new TextEncoder().encode(envSecret);

const COOKIE_NAME = "adamascare_session";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

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
  const accessToken = await signToken(payload, ACCESS_TOKEN_EXPIRY);
  const refreshToken = await signToken(payload, REFRESH_TOKEN_EXPIRY);

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set("adamascare_refresh", refreshToken, {
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
  cookieStore.delete(COOKIE_NAME);
  cookieStore.delete("adamascare_refresh");
}

/**
 * Read the session from the request cookies and verify it.
 * Returns the session payload or null if invalid/expired.
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
  };
}

/**
 * Read session from a Request object (for use in API route handlers).
 */
export async function getSessionFromRequest(
  request: Request
): Promise<Session | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
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


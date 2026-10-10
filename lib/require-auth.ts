import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { isSameOrigin } from "@/lib/csrf";

type RouteHandler = (
  request: Request,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/** Methods that never change state and therefore need no origin check. */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Cross-site request forgery guard for state-changing requests.
 *
 * Session auth here is a `sameSite=lax` httpOnly cookie, which stops a
 * cross-site *fetch* from carrying it — but a same-site-style top-level
 * navigation or a form POST is still worth rejecting outright. Previously only
 * a handful of routes called `rejectCrossOrigin` by hand, so a mutation added
 * later silently had no origin check at all. Running it inside the auth
 * wrappers makes every authenticated mutation covered by construction.
 *
 * `isSameOrigin` allows requests with no `Origin` header, so the native app
 * and curl are unaffected — only a browser sending a *foreign* Origin is
 * rejected.
 */
function rejectCrossOriginMutation(request: Request): NextResponse | null {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null;
  if (isSameOrigin(request)) return null;
  return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
}

/**
 * Wraps an API route handler to require authentication.
 * Returns 401 if no valid session, 403 for a cross-origin mutation.
 */
export function requireAuth(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    const originError = rejectCrossOriginMutation(request);
    if (originError) return originError;

    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return handler(request, context);
  };
}

/**
 * Wraps an API route handler to require a specific role.
 * Returns 401 if no session, 403 if role doesn't match or the mutation is
 * cross-origin. Admin role passes all role checks.
 */
export function requireRole(
  role: string,
  handler: RouteHandler
): RouteHandler {
  return async (request, context) => {
    const originError = rejectCrossOriginMutation(request);
    if (originError) return originError;

    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    // Admin passes all role checks
    if (session.role !== role && session.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }
    return handler(request, context);
  };
}

import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

type RouteHandler = (
  request: Request,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wraps an API route handler to require authentication.
 * Returns 401 if no valid session.
 */
export function requireAuth(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
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
 * Returns 401 if no session, 403 if role doesn't match.
 * Admin role passes all role checks.
 */
export function requireRole(
  role: string,
  handler: RouteHandler
): RouteHandler {
  return async (request, context) => {
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

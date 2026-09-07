import { db } from "@/lib/db";

export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId?: string;
  adminId?: string;
  adminName?: string;
  adminEmail?: string;
  details?: string;
  ip?: string;
}

/**
 * Log an admin action to the AuditLog table.
 * Failures are silently logged to console — audit logging should never
 * break the main operation.
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId || null,
        adminId: entry.adminId || null,
        adminName: entry.adminName || null,
        adminEmail: entry.adminEmail || null,
        details: entry.details?.slice(0, 1000) || null,
        ip: entry.ip || null,
      },
    });
  } catch (error) {
    console.error("[AuditLog] Failed to write audit entry:", error);
  }
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  return "unknown";
}

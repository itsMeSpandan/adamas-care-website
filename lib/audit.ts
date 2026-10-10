import { db } from "@/lib/db";
import { getTrustedClientIp } from "@/lib/rate-limit";

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
 *
 * Delegates to the single hardened implementation so the audit trail records
 * the same (unspoofable) address the rate limiter keys on.
 */
export function getClientIp(request: Request): string {
  return getTrustedClientIp(request);
}

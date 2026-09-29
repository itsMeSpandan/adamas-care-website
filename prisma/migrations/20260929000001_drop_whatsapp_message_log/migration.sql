-- Phase 3.4: remove WhatsApp-only storage (DESTRUCTIVE — SQL logged in progress.md).
-- Drop WhatsApp-only message log table
DROP TABLE "WhatsAppMessageLog";

-- Remove WhatsApp-only system settings rows
DELETE FROM "SystemSetting" WHERE "key" IN ('whatsapp_business_number', 'whatsapp_cancellation_policy');

"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

interface SystemSetting {
  value: string;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

const PREDEFINED_SETTINGS = [
  {
    key: "whatsapp_business_number",
    label: "WhatsApp Business Number",
    description: "The phone number customers see and receive messages from (E.164 format: +919876543210)",
    placeholder: "+919876543210",
  },
  {
    key: "salon_name",
    label: "Salon Display Name",
    description: "The name shown in WhatsApp messages and notifications",
    placeholder: "Grace Salon",
  },
  {
    key: "whatsapp_cancellation_policy",
    label: "Cancellation Policy Text",
    description: "Custom cancellation policy message sent to customers",
    placeholder: "Please cancel at least 4 hours before your appointment.",
  },
  {
    key: "booking_reminder_hours",
    label: "Booking Reminder Hours",
    description: "Hours before appointment to send reminder (default: 24)",
    placeholder: "24",
  },
];

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<Record<string, SystemSetting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/system-settings");
      const data = await res.json();
      setSettings(data.settings || {});
      // Initialize edit values
      const initialValues: Record<string, string> = {};
      for (const s of PREDEFINED_SETTINGS) {
        initialValues[s.key] = data.settings?.[s.key]?.value || "";
      }
      setEditValues(initialValues);
    } catch {
      showToast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      const res = await fetch("/api/admin/system-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          value: editValues[key],
          description: PREDEFINED_SETTINGS.find((s) => s.key === key)?.description,
        }),
      });

      if (res.ok) {
        showToast("Setting saved successfully", "success");
        fetchSettings();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to save setting", "error");
      }
    } catch {
      showToast("Failed to save setting", "error");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-beige-50 p-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beige-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-beige-700">
            System Settings
          </h1>
          <p className="mt-2 text-beige-600">
            Manage WhatsApp configuration and other system settings
          </p>
        </div>

        {/* WhatsApp Configuration */}
        <div className="mb-8">
          <h2 className="mb-4 font-serif text-xl font-semibold text-beige-700">
            WhatsApp Configuration
          </h2>
          <div className="space-y-4">
            {PREDEFINED_SETTINGS.map((setting) => {
              const savedValue = settings[setting.key];
              const isSaving = saving === setting.key;
              const hasChanges = editValues[setting.key] !== (savedValue?.value || "");

              return (
                <div
                  key={setting.key}
                  className="rounded-card border border-beige-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <label className="mb-1 block text-sm font-medium text-beige-700">
                        {setting.label}
                      </label>
                      <p className="mb-3 text-xs text-beige-500">{setting.description}</p>
                      <input
                        type="text"
                        value={editValues[setting.key] || ""}
                        onChange={(e) =>
                          setEditValues({ ...editValues, [setting.key]: e.target.value })
                        }
                        placeholder={setting.placeholder}
                        className="w-full rounded-lg border border-beige-300 px-3 py-2 text-sm focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200"
                      />
                      {savedValue && (
                        <p className="mt-2 text-xs text-beige-400">
                          Last updated: {new Date(savedValue.updatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleSave(setting.key)}
                      disabled={isSaving || !hasChanges}
                      className={`mt-6 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        hasChanges
                          ? "bg-beige-600 text-white hover:bg-beige-700"
                          : "bg-beige-100 text-beige-400 cursor-not-allowed"
                      }`}
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Environment Variables Info */}
        <div className="rounded-card border border-beige-200 bg-beige-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-beige-700">
            📝 Note about Environment Variables
          </h3>
          <p className="text-xs text-beige-600">
            Some WhatsApp settings (like API tokens) are configured via environment variables
            for security reasons. The settings above are for values that admins may need to
            change at runtime without redeploying. For API credentials, update your{" "}
            <code className="rounded bg-beige-100 px-1">.env</code> file and redeploy.
          </p>
        </div>
      </div>
    </div>
  );
}

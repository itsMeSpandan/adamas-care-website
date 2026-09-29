"use client";

/**
 * NotificationSettings — account-page push notification toggle.
 *
 * Soft-ask flow (contract): shows an explanation card FIRST;
 * Notification.requestPermission() fires only when the user taps Enable.
 *
 * iOS: push requires the installed (standalone) app — on iOS Safari we show
 * the 3-step install guide instead of the Enable button.
 */

import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const IOS_STEPS = ["Tap Share in the Safari toolbar", "Choose “Add to Home Screen”", "Tap Add, then open the app"];

export default function NotificationSettings() {
  const {
    permission,
    registered,
    busy,
    isIosStandaloneRequired,
    configured,
    enable,
    disable,
  } = usePushNotifications();
  const [error, setError] = useState("");

  // iOS Safari (not standalone): push is unavailable — show the install guide.
  if (isIosStandaloneRequired) {
    return (
      <div className="rounded-card border border-beige-200 bg-white p-6 shadow-card">
        <h2 className="mb-2 font-serif text-xl font-semibold text-beige-700">
          Push Notifications
        </h2>
        <p className="mb-4 text-sm text-beige-600">
          On iPhone/iPad, notifications are available in the installed app:
        </p>
        <ol className="space-y-2">
          {IOS_STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-beige-100 text-xs font-semibold text-beige-700">
                {i + 1}
              </span>
              <span className="text-sm text-beige-700">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (permission === "unsupported") return null;

  const isOn = permission === "granted" && registered;

  const handleEnable = async () => {
    setError("");
    const ok = await enable();
    // Only a real failure: permission IS granted but token registration failed.
    // (A dismissed/denied prompt is surfaced by the permission messages below.)
    if (!ok && typeof Notification !== "undefined" && Notification.permission === "granted") {
      setError("Could not register this device. Please try again.");
    }
  };

  return (
    <div className="rounded-card border border-beige-200 bg-white p-6 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="mb-1 font-serif text-xl font-semibold text-beige-700">
            Push Notifications
          </h2>
          <p className="text-sm text-beige-600">
            Get booking confirmations, cancellations, and slot alerts on this device —
            even when the site isn&apos;t open. Email is always sent too.
          </p>
        </div>

        {/* Toggle / Enable */}
        {permission === "granted" && (
          <button
            type="button"
            role="switch"
            aria-checked={isOn}
            aria-label={isOn ? "Turn off push notifications" : "Turn on push notifications"}
            disabled={busy}
            onClick={async () => {
              setError("");
              if (isOn) {
                await disable();
              } else {
                await handleEnable();
              }
            }}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              isOn ? "bg-beige-700" : "bg-beige-300"
            } ${busy ? "opacity-60" : ""}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                isOn ? "left-6" : "left-1"
              }`}
            />
          </button>
        )}

        {permission !== "granted" && (
          <button
            type="button"
            disabled={busy || !configured}
            onClick={handleEnable}
            className="btn-primary shrink-0 px-4 py-2 text-sm"
          >
            {busy ? "Enabling…" : "Enable"}
          </button>
        )}
      </div>

      {/* Status / errors */}
      <div className="mt-3 space-y-1">
        {permission === "denied" && (
          <p className="text-xs text-red-500">
            Notifications are blocked for this site — allow them in your browser&apos;s
            site settings, then reload.
          </p>
        )}
        {permission === "default" && !configured && (
          <p className="text-xs text-beige-400">
            Push notifications are not configured yet.
          </p>
        )}
        {isOn && (
          <p className="text-xs text-emerald-600">✓ This device is registered.</p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

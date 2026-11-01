"use client";

import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { computePushToggleView } from "@/lib/profile-utils";

export function PushNotificationRow() {
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

  const toggleView = computePushToggleView({
    permission,
    registered,
    busy,
    configured,
    isIosStandaloneRequired,
    error,
  });

  const handleToggle = async () => {
    setError("");
    if (toggleView.isOn) {
      await disable();
    } else {
      const ok = await enable();
      if (!ok && typeof Notification !== "undefined" && Notification.permission === "granted") {
        setError("Could not register this device. Please try again.");
      }
    }
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 pr-2">
          <span className="text-[15px] font-medium text-[#2B241D] block">
            Push notifications
          </span>
          {toggleView.helperText && (
            <p
              className={`text-[12px] mt-0.5 ${
                toggleView.helperType === "error"
                  ? "text-red-600"
                  : toggleView.helperType === "success"
                  ? "text-emerald-700 flex items-center gap-1 font-normal"
                  : "text-[#6B5F52]"
              }`}
            >
              {toggleView.helperType === "success" && <span>✓</span>}
              <span>{toggleView.helperText}</span>
            </p>
          )}
        </div>

        {/* 44px minimum tap target wrapping the switch */}
        <div className="shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] -mr-1">
          <button
            type="button"
            role="switch"
            aria-checked={toggleView.isOn}
            aria-label={toggleView.ariaLabel}
            disabled={toggleView.isDisabled}
            onClick={handleToggle}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8573A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${
              toggleView.isOn ? "bg-[#A8573A]" : "bg-[#DDD5CA]"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none ${
                toggleView.isOn ? "translate-x-[24px]" : "translate-x-[4px]"
              } ${busy ? "opacity-75 scale-90" : ""}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

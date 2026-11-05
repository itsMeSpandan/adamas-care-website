"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useCallback } from "react";
import AuthExperience, { type AuthMode } from "@/components/auth/AuthExperience";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const redirectParam = searchParams.get("redirect") || searchParams.get("returnUrl") || "/";
  const initialMode: AuthMode = modeParam === "signup" ? "signup" : "signin";

  const handleSuccess = useCallback(() => {
    const destination =
      redirectParam.startsWith("/") && !redirectParam.startsWith("//")
        ? redirectParam
        : "/";
    router.push(destination);
  }, [redirectParam, router]);

  const handleClose = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  return (
    <div className="fixed inset-0 z-[10000] w-full min-h-[100dvh] h-full bg-[#F4EFE8] overflow-y-auto">
      <AuthExperience
        isModal={true}
        initialMode={initialMode}
        onSuccess={handleSuccess}
        onClose={handleClose}
        className="w-full min-h-[100dvh] h-full"
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[10000] w-full min-h-[100dvh] flex items-center justify-center bg-[#F4EFE8]">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#2B2420] border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

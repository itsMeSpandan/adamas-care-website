"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AuthExperience, { type AuthMode } from "@/components/auth/AuthExperience";

function LoginContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const initialMode: AuthMode = modeParam === "signup" ? "signup" : "signin";

  return <AuthExperience initialMode={initialMode} />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[100dvh] flex items-center justify-center bg-[#F4EFE8]">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#2B2420] border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

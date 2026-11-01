"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import FeedbackStepper from "@/components/feedback/FeedbackStepper";

interface EligibilityResponse {
  eligible: boolean;
  reason?: string;
  alreadySubmitted?: boolean;
  booking?: {
    id: string;
    date: string;
    timeSlot: string;
    status: string;
    completedAt?: string;
    employee: {
      id: string;
      name: string;
      role: string;
      imageUrl?: string;
    } | null;
    services: Array<{
      id: string;
      name: string;
      durationMinutes?: number;
      price?: number;
    }>;
  };
}

export default function CustomerFeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const bookingId = params?.bookingId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EligibilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // Redirect to home/login with return url
      router.push(`/?auth=signin&redirect=/account/feedback/${bookingId}`);
      return;
    }

    if (!bookingId) {
      setError("Invalid booking ID");
      setLoading(false);
      return;
    }

    fetch(`/api/feedback/eligible/${bookingId}`)
      .then((res) => {
        if (res.status === 401) {
          router.push(`/?auth=signin&redirect=/account/feedback/${bookingId}`);
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (!json) return;
        setData(json);
        if (json.error) setError(json.error);
      })
      .catch((err) => {
        console.error("Failed to load feedback eligibility:", err);
        setError("Could not load visit details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, isLoading, bookingId, router]);

  if (isLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-beige-300 border-t-[#C97B5C]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-2xl border border-beige-200 bg-white p-8 shadow-sm">
          <p className="font-serif text-xl font-semibold text-beige-800">Unable to Open Feedback</p>
          <p className="mt-2 text-sm text-beige-600">{error || "This visit cannot be reviewed."}</p>
          <Link
            href="/profile"
            className="mt-6 inline-block rounded-lg bg-[#C97B5C] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#b56b4f]"
          >
            Go to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  if (data.alreadySubmitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-2xl border border-beige-200 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            ✓
          </div>
          <h1 className="font-serif text-xl font-bold text-beige-800">Feedback Already Submitted</h1>
          <p className="mt-2 text-sm text-beige-600">
            You have already reviewed this visit. Feedback is final once submitted. Thank you for helping us elevate our care.
          </p>
          <Link
            href="/profile"
            className="mt-6 inline-block rounded-lg bg-[#C97B5C] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#b56b4f]"
          >
            Return to Bookings
          </Link>
        </div>
      </div>
    );
  }

  if (!data.eligible || !data.booking) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-2xl border border-beige-200 bg-white p-8 shadow-sm">
          <h1 className="font-serif text-xl font-bold text-beige-800">Visit Not Eligible for Review</h1>
          <p className="mt-2 text-sm text-beige-600">
            {data.reason || "This appointment cannot receive feedback at this time."}
          </p>
          <Link
            href="/profile"
            className="mt-6 inline-block rounded-lg bg-[#C97B5C] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#b56b4f]"
          >
            Return to Bookings
          </Link>
        </div>
      </div>
    );
  }

  const b = data.booking;
  const visitDate = new Date(b.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-beige-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl mb-6 flex items-center justify-between">
        <Link
          href="/profile"
          className="text-xs font-semibold text-beige-600 hover:text-beige-800 flex items-center gap-1"
        >
          ← Back to My Account
        </Link>
        <span className="text-xs text-beige-500 font-medium">Adamas Care Feedback</span>
      </div>

      <FeedbackStepper
        bookingId={b.id}
        employee={b.employee}
        services={b.services}
        dateStr={visitDate}
        timeSlot={b.timeSlot}
      />
    </div>
  );
}

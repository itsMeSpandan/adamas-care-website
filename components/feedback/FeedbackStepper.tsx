"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  EMPLOYEE_QUICK_TAGS,
  SERVICE_QUICK_TAGS,
  OVERALL_QUICK_TAGS,
} from "@/lib/feedback";

interface EmployeeInfo {
  id: string;
  name: string;
  role: string;
  imageUrl?: string;
}

interface ServiceInfo {
  id: string;
  name: string;
  durationMinutes?: number;
  price?: number;
}

interface FeedbackStepperProps {
  bookingId: string;
  employee: EmployeeInfo | null;
  services: ServiceInfo[];
  dateStr: string;
  timeSlot: string;
}

/**
 * Accessible Star Rating Radio Group
 * - Role: radiogroup & radio
 * - Min tap targets: 44px x 44px
 * - Full keyboard navigation (ArrowLeft, ArrowRight, Home, End, Enter, Space)
 * - Zero layout shift
 */
function StarRadioGroup({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  required?: boolean;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(5, star + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(1, star - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(1);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(5);
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(star);
    }
  };

  const current = hoverValue ?? value;

  return (
    <div className="space-y-1.5" role="radiogroup" aria-label={label} aria-required={required}>
      <span className="block text-xs font-semibold uppercase tracking-wider text-beige-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= current;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoverValue(star)}
              onMouseLeave={() => setHoverValue(null)}
              onKeyDown={(e) => handleKeyDown(e, star)}
              className="flex h-12 w-12 items-center justify-center rounded-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#C97B5C] focus:ring-offset-2 active:scale-95"
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill={filled ? "#F59E0B" : "none"}
                stroke={filled ? "#F59E0B" : "#D1D5DB"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-colors duration-150"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          );
        })}
        <span className="ml-2 text-sm font-semibold text-beige-700 min-w-[3rem]">
          {value > 0 ? `${value} / 5` : ""}
        </span>
      </div>
    </div>
  );
}

/**
 * NPS 0-10 Selector
 */
function NpsRadioGroup({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (val: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-beige-600">
        <span>How likely are you to recommend Adamas Care?</span>
      </div>
      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }).map((_, score) => {
          const selected = value === score;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={`flex h-11 w-full items-center justify-center rounded-md text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#C97B5C] ${
                selected
                  ? "bg-[#C97B5C] text-white shadow-sm scale-105"
                  : "bg-beige-100 text-beige-700 hover:bg-beige-200"
              }`}
              aria-label={`Score ${score} out of 10`}
            >
              {score}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-beige-500 font-medium px-1">
        <span>0 = Not likely</span>
        <span>10 = Extremely likely</span>
      </div>
    </div>
  );
}

export default function FeedbackStepper({
  bookingId,
  employee,
  services,
  dateStr,
  timeSlot,
}: FeedbackStepperProps) {
  // 1: Employee, 2: Service, 3: Overall, 4: Review Answers, 5: Thank You
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Employee rating (optional)
  const [employeeRating, setEmployeeRating] = useState<number>(0);
  const [employeeTags, setEmployeeTags] = useState<string[]>([]);
  const [employeeComment, setEmployeeComment] = useState<string>("");

  // Step 2: Service rating (optional - defaults to first service)
  const [serviceRatings, setServiceRatings] = useState<Record<string, number>>({});
  const [serviceTags, setServiceTags] = useState<Record<string, string[]>>({});
  const [serviceComments, setServiceComments] = useState<Record<string, string>>({});

  // Step 3: Overall institution rating (required)
  const [overallRating, setOverallRating] = useState<number>(0);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [overallTags, setOverallTags] = useState<string[]>([]);
  const [overallComment, setOverallComment] = useState<string>("");

  const toggleTag = (
    currentList: string[],
    setList: (val: string[]) => void,
    tag: string
  ) => {
    if (currentList.includes(tag)) {
      setList(currentList.filter((t) => t !== tag));
    } else {
      setList([...currentList, tag]);
    }
  };

  const handleNextFromStep1 = () => {
    setStep(2);
  };

  const handleSkipStep1 = () => {
    setEmployeeRating(0);
    setEmployeeTags([]);
    setEmployeeComment("");
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    setStep(3);
  };

  const handleSkipStep2 = () => {
    setServiceRatings({});
    setServiceTags({});
    setServiceComments({});
    setStep(3);
  };

  const handleProceedToReview = () => {
    if (overallRating === 0) {
      setErrorMsg("Please select an overall rating (1 to 5 stars) to proceed.");
      return;
    }
    setErrorMsg(null);
    setStep(4);
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      setErrorMsg("Overall rating is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const employeePayload =
      employee && employeeRating > 0
        ? [
            {
              employeeId: employee.id,
              rating: employeeRating,
              tags: employeeTags,
              comment: employeeComment.trim() || undefined,
            },
          ]
        : [];

    const servicePayload = services
      .filter((s) => (serviceRatings[s.id] || 0) > 0)
      .map((s) => ({
        serviceId: s.id,
        rating: serviceRatings[s.id],
        tags: serviceTags[s.id] || [],
        comment: serviceComments[s.id]?.trim() || undefined,
      }));

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          overallRating,
          npsScore: npsScore ?? undefined,
          overallTags,
          overallComment: overallComment.trim() || undefined,
          employeeRatings: employeePayload,
          serviceRatings: servicePayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit feedback.");
      }

      setStep(5);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-beige-200 bg-white p-6 shadow-sm md:p-8">
      {/* Header & Step progress */}
      {step < 5 && (
        <div className="mb-6 border-b border-beige-100 pb-4">
          <div className="flex items-center justify-between text-xs font-semibold text-beige-500">
            <span>Visit: {dateStr} at {timeSlot}</span>
            <span>Step {step} of 4</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-beige-100">
            <div
              className="h-full bg-[#C97B5C] transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 rounded-lg bg-red-50 p-3.5 text-sm text-red-700 border border-red-200" role="alert">
          {errorMsg}
        </div>
      )}

      {/* ─── STEP 1: Employee Feedback ─── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <span className="inline-block rounded-full bg-beige-100 px-3 py-1 text-xs font-semibold text-[#C97B5C]">
              Step 1 • Specialist
            </span>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-beige-800">
              How was your service with {employee?.name || "your specialist"}?
            </h2>
            <p className="mt-1 text-xs text-beige-500">
              Optional • Tell us how your specialist performed.
            </p>
          </div>

          {employee && (
            <div className="flex items-center gap-4 rounded-xl bg-beige-50/60 p-4 border border-beige-200">
              {employee.imageUrl && (
                <div className="relative h-14 w-14 overflow-hidden rounded-full border border-beige-300">
                  <Image
                    src={employee.imageUrl}
                    alt={employee.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
              )}
              <div>
                <p className="font-semibold text-beige-800">{employee.name}</p>
                <p className="text-xs text-beige-500">{employee.role}</p>
              </div>
            </div>
          )}

          <StarRadioGroup
            label={`Rate ${employee?.name || "Specialist"}`}
            value={employeeRating}
            onChange={setEmployeeRating}
          />

          {employeeRating > 0 && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-beige-600 mb-2">
                  What did you like most?
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMPLOYEE_QUICK_TAGS.map((tag) => {
                    const selected = employeeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(employeeTags, setEmployeeTags, tag)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                          selected
                            ? "bg-[#C97B5C] text-white shadow-xs"
                            : "bg-beige-100 text-beige-700 hover:bg-beige-200"
                        }`}
                      >
                        {tag} {selected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-beige-600 mb-1.5">
                  Comments for {employee?.name || "specialist"} (optional)
                </label>
                <textarea
                  rows={3}
                  value={employeeComment}
                  onChange={(e) => setEmployeeComment(e.target.value)}
                  maxLength={500}
                  placeholder="Share details about your experience..."
                  className="w-full rounded-lg border border-beige-300 p-3 text-sm focus:border-[#C97B5C] focus:outline-none focus:ring-1 focus:ring-[#C97B5C]"
                />
                <span className="block text-right text-[11px] text-beige-400">
                  {employeeComment.length} / 500
                </span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-beige-100">
            <button
              type="button"
              onClick={handleSkipStep1}
              className="text-xs font-semibold text-beige-500 hover:text-beige-700 py-2.5 px-3"
            >
              Skip this step →
            </button>
            <button
              type="button"
              onClick={handleNextFromStep1}
              className="rounded-lg bg-[#C97B5C] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#b56b4f] transition-colors"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: Service Feedback ─── */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <span className="inline-block rounded-full bg-beige-100 px-3 py-1 text-xs font-semibold text-[#C97B5C]">
              Step 2 • Services
            </span>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-beige-800">
              How were your treatments?
            </h2>
            <p className="mt-1 text-xs text-beige-500">
              Optional • Rate each service received during your visit.
            </p>
          </div>

          <div className="space-y-6">
            {services.map((srv) => {
              const currentRating = serviceRatings[srv.id] || 0;
              const currentTags = serviceTags[srv.id] || [];
              const currentComment = serviceComments[srv.id] || "";

              return (
                <div key={srv.id} className="rounded-xl border border-beige-200 bg-beige-50/40 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-beige-800">{srv.name}</p>
                    {srv.price && (
                      <span className="text-xs text-beige-500 font-medium">₹{srv.price}</span>
                    )}
                  </div>

                  <StarRadioGroup
                    label={`Rate ${srv.name}`}
                    value={currentRating}
                    onChange={(val) =>
                      setServiceRatings((prev) => ({ ...prev, [srv.id]: val }))
                    }
                  />

                  {currentRating > 0 && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-beige-600 mb-2">
                          Quick feedback:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {SERVICE_QUICK_TAGS.map((tag) => {
                            const isSelected = currentTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  const updated = isSelected
                                    ? currentTags.filter((t) => t !== tag)
                                    : [...currentTags, tag];
                                  setServiceTags((prev) => ({
                                    ...prev,
                                    [srv.id]: updated,
                                  }));
                                }}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                                  isSelected
                                    ? "bg-[#C97B5C] text-white shadow-xs"
                                    : "bg-white text-beige-700 border border-beige-300 hover:bg-beige-100"
                                }`}
                              >
                                {tag} {isSelected && "✓"}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <textarea
                          rows={2}
                          value={currentComment}
                          onChange={(e) =>
                            setServiceComments((prev) => ({
                              ...prev,
                              [srv.id]: e.target.value,
                            }))
                          }
                          maxLength={500}
                          placeholder={`Any thoughts on ${srv.name}?`}
                          className="w-full rounded-lg border border-beige-300 p-2.5 text-xs focus:border-[#C97B5C] focus:outline-none focus:ring-1 focus:ring-[#C97B5C]"
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-beige-100">
            <button
              type="button"
              onClick={handleSkipStep2}
              className="text-xs font-semibold text-beige-500 hover:text-beige-700 py-2.5 px-3"
            >
              Skip this step →
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-lg border border-beige-300 px-4 py-2.5 text-sm font-semibold text-beige-700 hover:bg-beige-50"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleNextFromStep2}
                className="rounded-lg bg-[#C97B5C] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#b56b4f] transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Overall Institution Rating (Required) ─── */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <span className="inline-block rounded-full bg-beige-100 px-3 py-1 text-xs font-semibold text-[#C97B5C]">
              Step 3 • Overall Experience
            </span>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-beige-800">
              Overall Adamas Care Experience
            </h2>
            <p className="mt-1 text-xs text-beige-500">
              Required • How was your overall appointment from start to finish?
            </p>
          </div>

          <div className="rounded-xl border-2 border-beige-300 bg-beige-50/30 p-4">
            <StarRadioGroup
              label="Overall Visit Rating"
              value={overallRating}
              onChange={setOverallRating}
              required
            />
          </div>

          {/* Quick tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-beige-600 mb-2">
              What stood out during your visit?
            </label>
            <div className="flex flex-wrap gap-2">
              {OVERALL_QUICK_TAGS.map((tag) => {
                const selected = overallTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(overallTags, setOverallTags, tag)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                      selected
                        ? "bg-[#C97B5C] text-white shadow-xs"
                        : "bg-beige-100 text-beige-700 hover:bg-beige-200"
                    }`}
                  >
                    {tag} {selected && "✓"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* NPS Score */}
          <div className="border-t border-beige-100 pt-4">
            <NpsRadioGroup value={npsScore} onChange={setNpsScore} />
          </div>

          {/* Overall Comments */}
          <div className="border-t border-beige-100 pt-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-beige-600 mb-1.5">
              Additional Comments (optional)
            </label>
            <textarea
              rows={3}
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              maxLength={1000}
              placeholder="Tell us what we did well, or where we can improve..."
              className="w-full rounded-lg border border-beige-300 p-3 text-sm focus:border-[#C97B5C] focus:outline-none focus:ring-1 focus:ring-[#C97B5C]"
            />
            <span className="block text-right text-[11px] text-beige-400">
              {overallComment.length} / 1000
            </span>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-beige-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-beige-300 px-4 py-2.5 text-sm font-semibold text-beige-700 hover:bg-beige-50"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleProceedToReview}
              className="rounded-lg bg-[#C97B5C] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#b56b4f] transition-colors"
            >
              Review Answers →
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 4: Review Your Answers Before Submitting ─── */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <span className="inline-block rounded-full bg-beige-100 px-3 py-1 text-xs font-semibold text-[#C97B5C]">
              Step 4 • Review & Confirm
            </span>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-beige-800">
              Review Your Feedback
            </h2>
            <p className="mt-1 text-xs text-beige-500">
              Please verify your ratings before submitting. Feedback is final once submitted.
            </p>
          </div>

          <div className="divide-y divide-beige-100 rounded-xl border border-beige-200 bg-beige-50/30 p-4 space-y-4">
            {/* Overall Summary */}
            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-beige-500">Overall Rating</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-amber-500">★ {overallRating} / 5</span>
                {npsScore !== null && (
                  <span className="text-xs text-beige-600">NPS: {npsScore}/10</span>
                )}
              </div>
              {overallTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {overallTags.map((t) => (
                    <span key={t} className="rounded bg-white px-2 py-0.5 text-xs font-medium text-beige-700 border border-beige-200">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {overallComment && (
                <p className="mt-2 text-xs italic text-beige-600 bg-white p-2.5 rounded border border-beige-200">
                  &ldquo;{overallComment}&rdquo;
                </p>
              )}
            </div>

            {/* Specialist Summary */}
            {employee && (
              <div className="pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-beige-500">Specialist: {employee.name}</span>
                {employeeRating > 0 ? (
                  <div className="mt-1">
                    <p className="text-sm font-semibold text-amber-500">★ {employeeRating} / 5</p>
                    {employeeTags.length > 0 && (
                      <p className="text-xs text-beige-600 mt-1">Tags: {employeeTags.join(", ")}</p>
                    )}
                    {employeeComment && (
                      <p className="text-xs italic text-beige-600 mt-1">&ldquo;{employeeComment}&rdquo;</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-beige-400 italic mt-0.5">Skipped</p>
                )}
              </div>
            )}

            {/* Services Summary */}
            <div className="pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-beige-500">Services</span>
              {services.map((s) => {
                const r = serviceRatings[s.id];
                return (
                  <div key={s.id} className="mt-1.5 flex justify-between text-xs">
                    <span className="font-medium text-beige-800">{s.name}</span>
                    <span className={r ? "font-semibold text-amber-500" : "text-beige-400 italic"}>
                      {r ? `★ ${r} / 5` : "Skipped"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-beige-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setStep(3)}
              className="rounded-lg border border-beige-300 px-4 py-2.5 text-sm font-semibold text-beige-700 hover:bg-beige-50 disabled:opacity-50"
            >
              ← Edit
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-lg bg-[#C97B5C] px-7 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#b56b4f] disabled:opacity-50 transition-colors"
            >
              {submitting ? "Submitting..." : "Submit Feedback ✓"}
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 5: Thank You Screen ─── */}
      {step === 5 && (
        <div className="py-6 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl font-bold text-beige-800">
            Thank You for Your Feedback!
          </h2>
          <p className="mx-auto max-w-sm text-sm text-beige-600">
            Your review has been recorded. Your insights help our specialists continuously elevate every Adamas Care treatment.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/profile"
              className="rounded-lg bg-[#C97B5C] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#b56b4f] transition-colors"
            >
              Return to Bookings
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-beige-300 px-5 py-2.5 text-sm font-semibold text-beige-700 hover:bg-beige-50"
            >
              Go to Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

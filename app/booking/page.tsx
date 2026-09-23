"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { format } from "date-fns";
import { Service, Employee } from "@/lib/types";
import { formatPrice, formatDuration, displayTime, cn } from "@/lib/utils";
import StarIcon from "@/components/ui/StarIcon";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
}

interface TimeSlot {
  start: string;
  end: string;
  employeeId?: string;
  isBooked?: boolean;
  waitlistCount?: number;
}

const stepLabels = ["Choose Service", "Pick Date & Time", "Confirm"];

export default function BookingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [datesLoading, setDatesLoading] = useState(false);
  const [waitlistCounts, setWaitlistCounts] = useState<Record<string, number>>({});
  const [waitlistModal, setWaitlistModal] = useState<{ slot: TimeSlot } | null>(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingResult, setBookingResult] = useState<{ id: string } | null>(null);

  // Auto-fill from auth — phone comes from WhatsApp number on profile
  const phone = user?.whatsappNumber || "";

  // Computed values for multi-service
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const selectedServiceIds = selectedServices.map((s) => s.id);

  // Helper: toggle a service in/out of the selection
  const toggleService = (service: Service) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.id === service.id);
      if (exists) {
        // Remove — also reset employee/date/slot
        setSelectedEmployee(null);
        setSelectedDate(null);
        setSelectedSlot(null);
        return prev.filter((s) => s.id !== service.id);
      }
      // Add — also reset employee/date/slot
      setSelectedEmployee(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      return [...prev, service];
    });
  };

  useEffect(() => {
    if (user) {
      setName((prev) => prev || user.name);
      setEmail((prev) => prev || user.email);
    }
  }, [user]);

  // Helper: get employee IDs who offer ALL selected services and match gender
  const getEligibleEmployeeIds = (): string[] => {
    let empIds = employees
      .filter((e) => selectedServiceIds.every((sid) => e.serviceIds.includes(sid)))
      .map((e) => e.id);
    // Strict: only show same-gender specialists
    if (user?.gender) {
      const sameGender = employees
        .filter(
          (e) =>
            selectedServiceIds.every((sid) => e.serviceIds.includes(sid)) &&
            e.gender === user.gender
        )
        .map((e) => e.id);
      if (sameGender.length > 0) empIds = sameGender;
    }
    return empIds;
  };

  // Fetch services, employees, and holidays
  useEffect(() => {
    const year = new Date().getFullYear();
    Promise.all([
      fetch("/api/services").then((res) => res.json()),
      fetch("/api/employees").then((res) => res.json()),
      fetch(`/api/holidays?year=${year}`).then((res) => res.json()),
    ])
      .then(([servicesData, employeesData, holidaysData]) => {
        setServices(servicesData);
        setEmployees(Array.isArray(employeesData) ? employeesData : employeesData.employees || []);
        setHolidays(holidaysData.holidays || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch available dates when entering step 2
  useEffect(() => {
    if (step !== 2 || selectedServices.length === 0) return;
    setDatesLoading(true);
    setSelectedDate(null);
    setSelectedSlot(null);

    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    if (selectedEmployee) {
      fetch(
        `/api/availability/dates?employeeId=${selectedEmployee.id}&month=${monthStr}&serviceDuration=${totalDuration}`
      )
        .then((res) => res.json())
        .then((data) => setAvailableDates(data.dates || []))
        .catch(() => setAvailableDates([]))
        .finally(() => setDatesLoading(false));
    } else {
      const empIds = getEligibleEmployeeIds();
      Promise.all(
        empIds.map((eid) =>
          fetch(
            `/api/availability/dates?employeeId=${eid}&month=${monthStr}&serviceDuration=${totalDuration}`
          ).then((res) => res.json())
        )
      )
        .then((results) => {
          const allDates = new Set<string>();
          for (const r of results) {
            for (const d of r.dates || []) {
              allDates.add(d);
            }
          }
          setAvailableDates(Array.from(allDates));
        })
        .catch(() => setAvailableDates([]))
        .finally(() => setDatesLoading(false));
    }
  }, [step, selectedServices, selectedEmployee, employees, user?.gender]);

  // Fetch available slots when date is selected
  useEffect(() => {
    if (!selectedDate || selectedServices.length === 0) {
      setAvailableSlots([]);
      return;
    }
    setSlotsLoading(true);
    setSelectedSlot(null);

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    if (selectedEmployee) {
      fetch(
        `/api/availability?employeeId=${selectedEmployee.id}&date=${dateStr}&serviceDuration=${totalDuration}`
      )
        .then((res) => res.json())
        .then((data) => {
          setAvailableSlots(data.slots || []);
          setWaitlistCounts(data.waitlistCounts || {});
        })
        .catch(() => setAvailableSlots([]))
        .finally(() => setSlotsLoading(false));
    } else {
      const empIds = getEligibleEmployeeIds();
      if (empIds.length === 0) {
        setAvailableSlots([]);
        setWaitlistCounts({});
        setSlotsLoading(false);
        return;
      }

      fetch(
        `/api/availability/combined?employeeIds=${empIds.join(",")}&date=${dateStr}&serviceDuration=${totalDuration}`
      )
        .then((res) => res.json())
        .then((data) => {
          const slots: TimeSlot[] = (data.slots || []).map((s: { start: string; end: string; employeeId?: string }) => ({
            start: s.start,
            end: s.end,
            employeeId: s.employeeId,
            isBooked: false,
          }));
          const occupied: TimeSlot[] = (data.occupiedSlots || []).map((s: { start: string; end: string }) => ({
            start: s.start,
            end: s.end,
            employeeId: undefined,
            isBooked: true,
          }));
          setAvailableSlots([...slots, ...occupied].sort((a, b) => a.start.localeCompare(b.start)));
          setWaitlistCounts(data.waitlistCounts || {});
        })
        .catch(() => setAvailableSlots([]))
        .finally(() => setSlotsLoading(false));
    }
  }, [selectedDate, selectedServices, selectedEmployee, employees, user?.gender]);

  // Available employees for specialist selection — ONLY same gender
  const availableEmployees =
    selectedServices.length > 0
      ? employees.filter(
          (e) =>
            selectedServiceIds.every((sid) => e.serviceIds.includes(sid)) &&
            (!user?.gender || e.gender === user.gender)
        )
      : [];

  const handleBooking = async () => {
    if (selectedServices.length === 0 || !selectedDate || !selectedSlot || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: selectedServiceIds,
          employeeId: selectedEmployee?.id || selectedSlot?.employeeId || availableEmployees[0]?.id || "",
          userId: user?.id || null,
          date: format(selectedDate, "yyyy-MM-dd"),
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
          name,
          email,
          phone,
          notes: notes || null,
          price: totalPrice,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        showToast(data.error || "Slot conflict. Please pick another.", "error");
        setStep(2);
        setSelectedSlot(null);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to create booking.", "error");
        return;
      }

      const data = await res.json();
      setBookingResult(data.booking);
      setStep(3);
    } catch (err) {
      console.error("Booking failed:", err);
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="section-padding bg-beige-50">
        <div className="section-container mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <div className="mx-auto mb-4 h-10 w-64 animate-pulse rounded bg-beige-200" />
            <div className="mx-auto h-5 w-48 animate-pulse rounded bg-beige-200" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-beige-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto max-w-3xl">
        <h1 className="mb-2 text-center font-serif text-4xl font-semibold text-beige-700 md:text-5xl">
          Book Your Appointment
        </h1>
        <p className="mb-12 text-center text-beige-600">
          Follow the steps below to schedule your visit
        </p>

        {/* Step indicator — 3 numbered pills */}
        <div className="mb-12 flex items-center justify-center">
          {stepLabels.map((label, i) => {
            const num = i + 1;
            const isActive = step === num;
            const isDone = step > num;
            return (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-300",
                      isDone
                        ? "border-beige-400 bg-beige-400 text-white"
                        : isActive
                        ? "border-beige-600 bg-beige-600 text-white"
                        : "border-beige-200 bg-white text-beige-400"
                    )}
                  >
                    {isDone ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      num
                    )}
                  </div>
                  <span className="mt-2 hidden text-xs text-beige-500 sm:block">{label}</span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 w-12 transition-colors duration-300 sm:w-20",
                      isDone ? "bg-beige-400" : "bg-beige-200"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {/* STEP 1: Service & Employee */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-serif text-xl font-semibold text-beige-700">
                    Select Services
                  </h2>
                  {selectedServices.length > 0 && (
                    <span className="rounded-full bg-beige-100 px-3 py-1 text-xs font-medium text-beige-600">
                      {selectedServices.length} selected · {formatDuration(totalDuration)} · {formatPrice(totalPrice)}
                    </span>
                  )}
                </div>
                <p className="mb-4 text-sm text-beige-500">Tap to select one or more services</p>
                <div className="mb-8 grid gap-3 sm:grid-cols-2">
                  {services.map((service) => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        onClick={() => toggleService(service)}
                        className={cn(
                          "relative flex flex-col items-start rounded-card border p-4 text-left transition-all duration-200",
                          isSelected
                            ? "border-beige-600 bg-beige-50 ring-2 ring-beige-200"
                            : "border-beige-200 bg-white hover:border-beige-300 hover:shadow-sm"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-beige-600">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                        <span className="text-xs font-medium text-beige-500">{service.category}</span>
                        <span className="mt-1 font-serif text-base font-semibold text-beige-700">{service.name}</span>
                        <span className="mt-1 text-sm text-beige-600">
                          {formatPrice(service.price)} · {formatDuration(service.durationMinutes)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedServices.length > 0 && (
                  <>
                    <h2 className="mb-4 font-serif text-xl font-semibold text-beige-700">
                      Choose your specialist
                    </h2>
                    {availableEmployees.length === 0 ? (
                      <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                        No specialists available for the selected services.
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          onClick={() => setSelectedEmployee(null)}
                          className={cn(
                            "flex items-center gap-3 rounded-card border p-4 text-left transition-all duration-200",
                            selectedEmployee === null
                              ? "border-beige-600 bg-beige-50 ring-2 ring-beige-200"
                              : "border-beige-200 bg-white hover:border-beige-300 hover:shadow-sm"
                          )}
                        >
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-beige-100">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-beige-500">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                          </div>
                          <div>
                            <span className="font-serif text-base font-semibold text-beige-700">Any Available</span>
                            <span className="block text-xs text-beige-500">First available specialist</span>
                          </div>
                        </button>

                        {availableEmployees.map((emp) => (
                          <button
                            key={emp.id}
                            onClick={() => setSelectedEmployee(emp)}
                            className={cn(
                              "flex items-center gap-3 rounded-card border p-4 text-left transition-all duration-200",
                              selectedEmployee?.id === emp.id
                                ? "border-beige-600 bg-beige-50 ring-2 ring-beige-200"
                                : "border-beige-200 bg-white hover:border-beige-300 hover:shadow-sm"
                            )}
                          >
                            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                              <Image src={emp.imageUrl} alt={emp.name} fill className="object-cover" sizes="48px" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-serif text-base font-semibold text-beige-700">{emp.name}</span>
                                {emp.gender && (
                                  <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize ${
                                    emp.gender === "male"
                                      ? "bg-blue-50 text-blue-600"
                                      : emp.gender === "female"
                                      ? "bg-amber-50 text-amber-600"
                                      : "bg-green-50 text-green-600"
                                  }`}>
                                    {emp.gender}
                                  </span>
                                )}
                              </div>
                              <span className="block text-xs text-beige-500">{emp.role}</span>
                              <span className="block text-xs text-beige-500">
                                {emp.rating}
                                <StarIcon size={12} className="mx-0.5" />
                                · {emp.reviewCount} reviews
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* STEP 2: Date & Time */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="mb-4 font-serif text-xl font-semibold text-beige-700">
                  Pick a Date
                </h2>

                {datesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
                    <span className="ml-3 text-sm text-beige-500">Loading available dates...</span>
                  </div>
                ) : (
                  <div className="mb-8 rounded-card border border-beige-200 bg-white p-4 shadow-card">
                    <DayPicker
                      mode="single"
                      selected={selectedDate ?? undefined}
                      onSelect={(date) => {
                        setSelectedDate(date ?? null);
                        setSelectedSlot(null);
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (date < today) return true;
                        const dateKey = format(date, "yyyy-MM-dd");
                        return !availableDates.includes(dateKey);
                      }}
                      modifiers={{
                        available: availableDates.map((d) => new Date(d + "T00:00:00")),
                        holiday: holidays.map((h) => new Date(h.date + "T00:00:00")),
                      }}
                      modifiersStyles={{
                        available: { backgroundColor: "var(--color-beige-100, #f5f0eb)", fontWeight: 600 },
                        holiday: { backgroundColor: "#fef2f2", color: "#dc2626", textDecoration: "line-through" },
                      }}
                      classNames={{
                        month_caption: "text-beige-700 font-serif font-semibold",
                        weekday: "text-beige-500 font-medium text-sm",
                        day: "text-beige-800",
                        day_button: "hover:bg-beige-100 rounded-lg w-9 h-9",
                        selected: "!bg-beige-600 !text-white hover:!bg-beige-700",
                        today: "!font-bold !text-beige-600",
                      }}
                    />
                    {holidays.length > 0 && (
                      <div className="mt-3 border-t border-beige-100 pt-3">
                        <p className="mb-2 text-xs font-medium text-beige-500">Upcoming Holidays</p>
                        <div className="flex flex-wrap gap-2">
                          {holidays
                            .filter((h) => new Date(h.date + "T00:00:00") >= new Date())
                            .slice(0, 6)
                            .map((h) => (
                              <span
                                key={h.id}
                                className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs text-red-600"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                                </svg>
                                {h.name} ({format(new Date(h.date + "T00:00:00"), "MMM d")})
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedDate && (
                  <>
                    <h2 className="mb-4 font-serif text-xl font-semibold text-beige-700">
                      Pick a Time
                    </h2>
                    <p className="mb-4 text-sm text-beige-500">
                      {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </p>
                    {slotsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-beige-300 border-t-beige-600" />
                        <span className="ml-3 text-sm text-beige-500">Loading available times...</span>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="rounded-lg border border-beige-200 bg-beige-50 p-6 text-center">
                        <p className="text-sm text-beige-500">No available time slots for this date. Please try another date.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {availableSlots.map((slot) => {
                          const isSelected =
                            selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                          const isBooked = slot.isBooked === true;
                          const waitlistCount = waitlistCounts[slot.start] || 0;
                          return (
                            <div key={slot.start} className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => {
                                  if (isBooked) {
                                    setWaitlistModal({ slot });
                                  } else {
                                    setSelectedSlot(slot);
                                  }
                                }}
                                disabled={false}
                                className={cn(
                                  "rounded-full border px-3 py-2 text-sm font-medium transition-all duration-200",
                                  isBooked
                                    ? "border-amber-300 bg-amber-50 text-amber-700 cursor-pointer hover:bg-amber-100"
                                    : isSelected
                                    ? "border-beige-600 bg-beige-600 text-white"
                                    : "border-beige-300 bg-white text-beige-700 hover:border-beige-400 hover:bg-beige-50"
                                )}
                              >
                                {displayTime(slot.start)} – {displayTime(slot.end)}
                              </button>
                              {isBooked && (
                                <span className="text-[10px] font-medium text-amber-600">
                                  {waitlistCount > 0 ? `${waitlistCount} on waitlist` : "Join waitlist"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* STEP 3: Confirm & Book */}
            {step === 3 && !bookingResult && (
              <motion.div
                key="step3-confirm"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
              >
                <div className="rounded-card border border-beige-200 bg-white p-6 shadow-card">
                  <h2 className="mb-2 font-serif text-lg font-semibold text-beige-700">
                    Grace Salon — Appointment Summary
                  </h2>
                  <div className="my-4 h-px bg-beige-200" />

                  <div className="space-y-3 text-sm">
                    {/* Services list */}
                    <div>
                      <span className="mb-1 block text-beige-500">
                        {selectedServices.length === 1 ? "Service" : "Services"}
                      </span>
                      <div className="space-y-1">
                        {selectedServices.map((s) => (
                          <div key={s.id} className="flex items-center justify-between">
                            <span className="text-beige-700">{s.name}</span>
                            <span className="text-beige-500">{formatDuration(s.durationMinutes)} · {formatPrice(s.price)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-beige-100 pt-1">
                        <span className="font-medium text-beige-700">Total</span>
                        <span className="font-medium text-beige-700">{formatDuration(totalDuration)} · {formatPrice(totalPrice)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-beige-500">Specialist</span>
                      <span className="font-medium text-beige-700">
                        {selectedEmployee?.name || "First available"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-beige-500">Date</span>
                      <span className="font-medium text-beige-700">
                        {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-beige-500">Time</span>
                      <span className="font-medium text-beige-700">
                        {selectedSlot ? `${displayTime(selectedSlot.start)} – ${displayTime(selectedSlot.end)}` : ""}
                      </span>
                    </div>

                    <div className="my-4 h-px bg-beige-200" />

                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">Notes (optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                        placeholder="Any special requests..."
                        rows={2}
                        className="w-full resize-none rounded-xl border border-beige-300 bg-white px-4 py-2.5 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200"
                      />
                      <p className="mt-1 text-right text-[10px] text-beige-400">{notes.length}/200</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-beige-700">Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full rounded-xl border border-beige-300 bg-white px-4 py-2.5 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-beige-700">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full rounded-xl border border-beige-300 bg-white px-4 py-2.5 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200"
                        />
                      </div>
                    </div>
                    {phone && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-beige-700">Phone</label>
                        <input
                          type="tel"
                          value={phone}
                          readOnly
                          className="w-full rounded-xl border border-beige-200 bg-beige-50 px-4 py-2.5 text-sm text-beige-500"
                        />
                        <p className="mt-1 text-xs text-beige-400">Auto-filled from your WhatsApp number</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Confirmation screen */}
            {step === 3 && bookingResult && (
              <motion.div
                key="step3-done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center">
                  <svg width="96" height="96" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="44" fill="none" stroke="#E8D5C4" strokeWidth="3" className="animate-circle-draw" style={{ strokeDasharray: "276", strokeDashoffset: "276" }} />
                    <polyline points="30,50 42,62 66,38" fill="none" stroke="#C97B5C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-checkmark-draw" />
                  </svg>
                </div>

                <h2 className="mb-2 font-serif text-2xl font-semibold text-beige-700">
                  Booking Confirmed!
                </h2>
                <p className="mb-8 text-beige-600">
                  Your appointment has been booked.
                </p>

                <div className="mx-auto max-w-md rounded-card border border-beige-200 bg-white p-6 text-left shadow-card">
                  <h3 className="mb-4 font-serif text-lg font-semibold text-beige-700">
                    Appointment Summary
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-beige-500">
                        {selectedServices.length === 1 ? "Service" : "Services"}
                      </span>
                      <span className="font-medium text-beige-700">
                        {selectedServices.map((s) => s.name).join(", ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-beige-500">Specialist</span>
                      <span className="font-medium text-beige-700">{selectedEmployee?.name || "First available"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-beige-500">Date</span>
                      <span className="font-medium text-beige-700">
                        {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-beige-500">Time</span>
                      <span className="font-medium text-beige-700">
                        {selectedSlot ? `${displayTime(selectedSlot.start)} – ${displayTime(selectedSlot.end)}` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-beige-200 pt-3">
                      <span className="text-beige-500">Total</span>
                      <span className="font-medium text-beige-700">{formatPrice(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-beige-500">Confirmation ID</span>
                      <span className="font-mono text-xs text-beige-600">{bookingResult.id}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <a href="/booking" className="btn-outline" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>
                    Book Another Appointment
                  </a>
                  <a href="/profile" className="btn-primary">
                    View My Profile
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Waitlist Modal */}
        <AnimatePresence>
          {waitlistModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setWaitlistModal(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="mb-2 font-serif text-xl font-semibold text-beige-700">
                  Slot Occupied
                </h3>
                <p className="mb-4 text-sm text-beige-600">
                  The {displayTime(waitlistModal.slot.start)} – {displayTime(waitlistModal.slot.end)} slot is currently booked.
                  {waitlistCounts[waitlistModal.slot.start] > 0 && (
                    <span className="mt-1 block text-amber-600">
                      {waitlistCounts[waitlistModal.slot.start]} {waitlistCounts[waitlistModal.slot.start] === 1 ? "person" : "people"} on waitlist
                    </span>
                  )}
                </p>
                <p className="mb-4 text-sm text-beige-500">
                  Join the waitlist and we&apos;ll notify you via WhatsApp if this slot opens up. You&apos;ll have 30 minutes to claim it.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setWaitlistModal(null)}
                    className="flex-1 rounded-lg border border-beige-300 px-4 py-2.5 text-sm font-medium text-beige-700 hover:bg-beige-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!user) {
                        showToast("Please log in to join the waitlist", "error");
                        return;
                      }
                      setJoiningWaitlist(true);
                      try {
                        const res = await fetch("/api/waitlist", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            employeeId: waitlistModal.slot.employeeId || selectedEmployee?.id,
                            slotStart: waitlistModal.slot.start,
                            slotEnd: waitlistModal.slot.end,
                            slotDate: selectedDate ? format(selectedDate, "yyyy-MM-dd") : null,
                            serviceId: selectedServiceIds[0] || null,
                          }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          showToast("Added to waitlist! We'll notify you if a slot opens.", "success");
                          setWaitlistModal(null);
                        } else {
                          showToast(data.error || "Failed to join waitlist", "error");
                        }
                      } catch {
                        showToast("Failed to join waitlist", "error");
                      } finally {
                        setJoiningWaitlist(false);
                      }
                    }}
                    disabled={joiningWaitlist}
                    className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {joiningWaitlist ? "Joining..." : "Join Waitlist"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        {!bookingResult && (
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => {
                if (step === 2) setStep(1);
                else if (step === 3) setStep(2);
              }}
              disabled={step === 1}
              className={cn("btn-outline", step === 1 && "pointer-events-none opacity-40")}
            >
              ← Back
            </button>
            <button
              onClick={() => {
                if (step === 1 && selectedServices.length > 0) setStep(2);
                else if (step === 2 && selectedDate && selectedSlot) setStep(3);
                else if (step === 3) handleBooking();
              }}
              disabled={
                (step === 1 && selectedServices.length === 0) ||
                (step === 2 && (!selectedDate || !selectedSlot)) ||
                (step === 3 && isSubmitting) ||
                (step === 3 && !name)
              }
              className={cn(
                "btn-primary",
                ((step === 1 && selectedServices.length === 0) ||
                  (step === 2 && (!selectedDate || !selectedSlot)) ||
                  (step === 3 && isSubmitting) ||
                  (step === 3 && !name)) &&
                  "pointer-events-none opacity-40"
              )}
            >
              {step === 3 ? (isSubmitting ? "Booking..." : "Confirm Booking →") : "Next →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { format } from "date-fns";
import { Service, Employee } from "@/lib/types";
import { formatPrice, formatDuration, cn } from "@/lib/utils";
import StarIcon from "@/components/ui/StarIcon";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";

interface TimeSlot {
  start: string;
  end: string;
  employeeId?: string;
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
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [datesLoading, setDatesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingResult, setBookingResult] = useState<{ id: string } | null>(null);

  // Auto-fill from auth
  useEffect(() => {
    if (user) {
      setName((prev) => prev || user.name);
      setEmail((prev) => prev || user.email);
    }
  }, [user]);

  // Fetch services and employees
  useEffect(() => {
    Promise.all([
      fetch("/api/services").then((res) => res.json()),
      fetch("/api/employees").then((res) => res.json()),
    ])
      .then(([servicesData, employeesData]) => {
        setServices(servicesData);
        setEmployees(Array.isArray(employeesData) ? employeesData : employeesData.employees || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch available dates when entering step 2
  useEffect(() => {
    if (step !== 2 || !selectedService) return;
    setDatesLoading(true);
    setSelectedDate(null);
    setSelectedSlot(null);

    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Build employeeId param — use specific employee or empty for "any"
    const empParam = selectedEmployee ? selectedEmployee.id : "";

    // If "Any", we need to check all employees. For simplicity, fetch for each and union.
    if (selectedEmployee) {
      fetch(
        `/api/availability/dates?employeeId=${empParam}&month=${monthStr}&serviceDuration=${selectedService.durationMinutes}`
      )
        .then((res) => res.json())
        .then((data) => setAvailableDates(data.dates || []))
        .catch(() => setAvailableDates([]))
        .finally(() => setDatesLoading(false));
    } else {
      // "Any" — fetch for all employees who offer this service
      const empIds = employees
        .filter((e) => e.serviceIds.includes(selectedService.id))
        .map((e) => e.id);

      Promise.all(
        empIds.map((eid) =>
          fetch(
            `/api/availability/dates?employeeId=${eid}&month=${monthStr}&serviceDuration=${selectedService.durationMinutes}`
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
  }, [step, selectedService, selectedEmployee, employees]);

  // Fetch available slots when date is selected
  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setAvailableSlots([]);
      return;
    }
    setSlotsLoading(true);
    setSelectedSlot(null);

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    if (selectedEmployee) {
      fetch(
        `/api/availability?employeeId=${selectedEmployee.id}&date=${dateStr}&serviceDuration=${selectedService.durationMinutes}`
      )
        .then((res) => res.json())
        .then((data) => setAvailableSlots(data.slots || []))
        .catch(() => setAvailableSlots([]))
        .finally(() => setSlotsLoading(false));
    } else {
      // "Any" — union slots from all employees who offer this service
      const empIds = employees
        .filter((e) => e.serviceIds.includes(selectedService.id))
        .map((e) => e.id);

      Promise.all(
        empIds.map((eid) =>
          fetch(
            `/api/availability?employeeId=${eid}&date=${dateStr}&serviceDuration=${selectedService.durationMinutes}`
          ).then((res) => res.json())
        )
      )
        .then((results) => {
          const allSlots = new Map<string, TimeSlot>();
          for (const r of results) {
            for (const s of r.slots || []) {
              // Key by start time; if multiple employees have the same slot,
              // prefer the first one found (deduplication)
              if (!allSlots.has(s.start)) {
                allSlots.set(s.start, { start: s.start, end: s.end, employeeId: s.employeeId });
              }
            }
          }
          setAvailableSlots(Array.from(allSlots.values()).sort((a, b) => a.start.localeCompare(b.start)));
        })
        .catch(() => setAvailableSlots([]))
        .finally(() => setSlotsLoading(false));
    }
  }, [selectedDate, selectedService, selectedEmployee, employees]);

  const availableEmployees = selectedService
    ? employees.filter((e) => e.serviceIds.includes(selectedService.id))
    : [];

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedSlot || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          employeeId: selectedEmployee?.id || selectedSlot?.employeeId || availableEmployees[0]?.id || "",
          userId: user?.id || null,
          date: selectedDate.toISOString(),
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
          name,
          email,
          phone,
          notes: notes || null,
          price: selectedService.price,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        showToast(data.error || "Slot conflict. Please pick another.", "error");
        setStep(2);
        setSelectedSlot(null);
        // Re-fetch slots for all employees ("Any" mode) or the specific employee
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        if (selectedEmployee) {
          const r = await fetch(
            `/api/availability?employeeId=${selectedEmployee.id}&date=${dateStr}&serviceDuration=${selectedService.durationMinutes}`
          );
          const d = await r.json();
          setAvailableSlots(d.slots || []);
        } else {
          // Re-fetch union for all employees
          const empIds = employees
            .filter((e) => e.serviceIds.includes(selectedService.id))
            .map((e) => e.id);
          const results = await Promise.all(
            empIds.map((eid) =>
              fetch(`/api/availability?employeeId=${eid}&date=${dateStr}&serviceDuration=${selectedService.durationMinutes}`).then((res) => res.json())
            )
          );
          const allSlots = new Map<string, TimeSlot>();
          for (const r of results) {
            for (const s of r.slots || []) {
              if (!allSlots.has(s.start)) {
                allSlots.set(s.start, { start: s.start, end: s.end, employeeId: s.employeeId });
              }
            }
          }
          setAvailableSlots(Array.from(allSlots.values()).sort((a, b) => a.start.localeCompare(b.start)));
        }
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

  const displayTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
  };

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
                <h2 className="mb-4 font-serif text-xl font-semibold text-beige-700">
                  Select a Service
                </h2>
                <div className="mb-8 grid gap-3 sm:grid-cols-2">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service);
                        setSelectedEmployee(null);
                        setSelectedDate(null);
                        setSelectedSlot(null);
                      }}
                      className={cn(
                        "flex flex-col items-start rounded-card border p-4 text-left transition-all duration-200",
                        selectedService?.id === service.id
                          ? "border-beige-600 bg-beige-50 ring-2 ring-beige-200"
                          : "border-beige-200 bg-white hover:border-beige-300 hover:shadow-sm"
                      )}
                    >
                      <span className="text-xs font-medium text-beige-500">{service.category}</span>
                      <span className="mt-1 font-serif text-base font-semibold text-beige-700">{service.name}</span>
                      <span className="mt-1 text-sm text-beige-600">
                        {formatPrice(service.price)} · {formatDuration(service.durationMinutes)}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedService && (
                  <>
                    <h2 className="mb-4 font-serif text-xl font-semibold text-beige-700">
                      Choose your specialist
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* "Any available" card */}
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
                            <span className="font-serif text-base font-semibold text-beige-700">{emp.name}</span>
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
                      }}
                      modifiersStyles={{
                        available: { backgroundColor: "var(--color-beige-100, #f5f0eb)", fontWeight: 600 },
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
                          return (
                            <button
                              key={slot.start}
                              onClick={() => setSelectedSlot(slot)}
                              className={cn(
                                "rounded-full border px-3 py-2 text-sm font-medium transition-all duration-200",
                                isSelected
                                  ? "border-beige-600 bg-beige-600 text-white"
                                  : "border-beige-300 bg-white text-beige-700 hover:border-beige-400 hover:bg-beige-50"
                              )}
                            >
                              {displayTime(slot.start)} – {displayTime(slot.end)}
                            </button>
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
                    Aurelia Salon & Spa — Appointment Summary
                  </h2>
                  <div className="my-4 h-px bg-beige-200" />

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-beige-500">Service</span>
                      <span className="font-medium text-beige-700">
                        {selectedService?.name} · {selectedService ? formatDuration(selectedService.durationMinutes) : ""} · {selectedService ? formatPrice(selectedService.price) : ""}
                      </span>
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
                    <div>
                      <label className="mb-1 block text-sm font-medium text-beige-700">Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full rounded-xl border border-beige-300 bg-white px-4 py-2.5 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200"
                      />
                    </div>
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
                    <circle cx="48" cy="48" r="44" fill="none" stroke="#C8A882" strokeWidth="3" className="animate-circle-draw" style={{ strokeDasharray: "276", strokeDashoffset: "276" }} />
                    <polyline points="30,50 42,62 66,38" fill="none" stroke="#8C6A48" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-checkmark-draw" />
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
                      <span className="text-beige-500">Service</span>
                      <span className="font-medium text-beige-700">{selectedService?.name}</span>
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

        {/* Navigation buttons */}
        {(!bookingResult) && (
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
                if (step === 1 && selectedService) setStep(2);
                else if (step === 2 && selectedDate && selectedSlot) setStep(3);
                else if (step === 3) handleBooking();
              }}
              disabled={
                (step === 1 && !selectedService) ||
                (step === 2 && (!selectedDate || !selectedSlot)) ||
                (step === 3 && isSubmitting) ||
                (step === 3 && (!name || !email || !phone))
              }
              className={cn(
                "btn-primary",
                ((step === 1 && !selectedService) ||
                  (step === 2 && (!selectedDate || !selectedSlot)) ||
                  (step === 3 && isSubmitting) ||
                  (step === 3 && (!name || !email || !phone))) &&
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

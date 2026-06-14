"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { format } from "date-fns";
import { BookingFormData, Service, Employee } from "@/lib/types";
import { formatPrice, formatDuration, cn } from "@/lib/utils";
import StarIcon from "@/components/ui/StarIcon";
import { useAuth } from "@/lib/auth-context";

const steps = ["Service & Specialist", "Date & Time", "Your Details", "Confirmation"];



export default function BookingPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    serviceId: "",
    employeeId: "",
    date: null,
    timeSlot: "",
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  // Auto-fill name and email from logged-in user
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name,
        email: prev.email || user.email,
      }));
    }
  }, [user]);

  useEffect(() => {
    Promise.all([
      fetch("/api/services").then((res) => res.json()),
      fetch("/api/employees").then((res) => res.json()),
    ]).then(([servicesData, employeesData]) => {
      setServices(servicesData);
      setEmployees(employeesData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Fetch available time slots when date, employee, or service changes
  useEffect(() => {
    if (!formData.date || !formData.employeeId || !formData.serviceId) {
      setAvailableSlots([]);
      return;
    }
    setSlotsLoading(true);
    setFormData((prev) => ({ ...prev, timeSlot: "" }));
    const dateStr = formData.date.toISOString().split("T")[0];
    fetch(`/api/available-slots?employeeId=${formData.employeeId}&date=${dateStr}&serviceId=${formData.serviceId}`)
      .then((res) => res.json())
      .then((data) => setAvailableSlots(data.slots || []))
      .catch(() => setAvailableSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [formData.date, formData.employeeId, formData.serviceId]);

  const selectedService = services.find((s) => s.id === formData.serviceId);
  const selectedEmployee = employees.find((e) => e.id === formData.employeeId);
  const availableEmployees = formData.serviceId
    ? employees.filter((e) => e.serviceIds.includes(formData.serviceId))
    : [];

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.serviceId && formData.employeeId;
      case 1:
        return formData.date && formData.timeSlot;
      case 2:
        return formData.name && formData.email && formData.phone;
      default:
        return true;
    }
  };

  const next = () => {
    if (canProceed() && currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!selectedService || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: formData.serviceId,
          employeeId: formData.employeeId,
          userId: user?.id || null,
          date: formData.date?.toISOString(),
          timeSlot: formData.timeSlot,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          notes: formData.notes || null,
          price: selectedService.price,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to create booking. Please try again.");
        return;
      }
      setCurrentStep(3);
    } catch (err) {
      console.error("Booking submission failed:", err);
      alert("Something went wrong. Please try again.");
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

        {/* Step Indicator */}
        <div className="mb-12 flex items-center justify-center">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-300",
                    i < currentStep
                      ? "border-beige-400 bg-beige-400 text-white"
                      : i === currentStep
                        ? "border-beige-600 bg-beige-600 text-white"
                        : "border-beige-200 bg-white text-beige-400"
                  )}
                >
                  {i < currentStep ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className="mt-2 hidden text-xs text-beige-500 sm:block">
                  {step}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-12 transition-colors duration-300 sm:w-20",
                    i < currentStep ? "bg-beige-400" : "bg-beige-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
              >
                {/* Service selection */}
                <h2 className="mb-4 font-serif text-xl font-semibold text-beige-700">
                  Select a Service
                </h2>
                <div className="mb-8 grid gap-3 sm:grid-cols-2">
                  {services.map((service) => (
                    <ServiceOption
                      key={service.id}
                      service={service}
                      selected={formData.serviceId === service.id}
                      onSelect={(id) =>
                        setFormData({ ...formData, serviceId: id, employeeId: "" })
                      }
                    />
                  ))}
                </div>

                {/* Specialist selection */}
                {formData.serviceId && (
                  <>
                    <h2 className="mb-4 font-serif text-xl font-semibold text-beige-700">
                      Choose a Specialist
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {availableEmployees.map((emp) => (
                        <SpecialistOption
                          key={emp.id}
                          employee={emp}
                          selected={formData.employeeId === emp.id}
                          onSelect={(id) =>
                            setFormData({ ...formData, employeeId: id })
                          }
                        />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="mb-4 font-serif text-xl font-semibold text-beige-700">
                  Pick a Date
                </h2>
                <div className="mb-8 rounded-card border border-beige-200 bg-white p-4 shadow-card">
                  <DayPicker
                    mode="single"
                    selected={formData.date ?? undefined}
                    onSelect={(date) =>
                      setFormData({ ...formData, date: date ?? null, timeSlot: "" })
                    }
                    disabled={{ before: new Date() }}
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

                {formData.date && (
                  <>
                    <h2 className="mb-4 font-serif text-xl font-semibold text-beige-700">
                      Pick a Time
                    </h2>
                    <p className="mb-4 text-sm text-beige-500">
                      {format(formData.date, "EEEE, MMMM d, yyyy")}
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
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() =>
                              setFormData({ ...formData, timeSlot: slot })
                            }
                            className={cn(
                              "rounded-full border px-3 py-2 text-sm font-medium transition-all duration-200",
                              formData.timeSlot === slot
                                ? "border-beige-600 bg-beige-600 text-white"
                                : "border-beige-300 bg-white text-beige-700 hover:border-beige-400 hover:bg-beige-50"
                            )}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="mb-6 font-serif text-xl font-semibold text-beige-700">
                  Your Details
                </h2>
                <div className="space-y-5">
                  <div>
                    <label htmlFor="name" className="mb-1 block text-sm font-medium text-beige-700">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-beige-300 bg-white px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-beige-700">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="your@email.com"
                      className="w-full rounded-xl border border-beige-300 bg-white px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="mb-1 block text-sm font-medium text-beige-700">
                      Phone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="(555) 123-4567"
                      className="w-full rounded-xl border border-beige-300 bg-white px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>
                  <div>
                    <label htmlFor="notes" className="mb-1 block text-sm font-medium text-beige-700">
                      Special Requests
                    </label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Any allergies, preferences, or special requests..."
                      rows={4}
                      className="w-full resize-none rounded-xl border border-beige-300 bg-white px-4 py-3 text-sm text-beige-800 placeholder:text-beige-400 focus:border-beige-500 focus:outline-none focus:ring-2 focus:ring-beige-200"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                {/* Animated checkmark */}
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center">
                  <svg width="96" height="96" viewBox="0 0 96 96">
                    <circle
                      cx="48"
                      cy="48"
                      r="44"
                      fill="none"
                      stroke="#C8A882"
                      strokeWidth="3"
                      className="animate-circle-draw"
                      style={{ strokeDasharray: "276", strokeDashoffset: "276" }}
                    />
                    <polyline
                      points="30,50 42,62 66,38"
                      fill="none"
                      stroke="#8C6A48"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-checkmark-draw"
                    />
                  </svg>
                </div>

                <h2 className="mb-2 font-serif text-2xl font-semibold text-beige-700">
                  Booking Confirmed!
                </h2>
                <p className="mb-8 text-beige-600">
                  We&apos;ll send a confirmation to {formData.email}
                </p>

                {/* Summary card */}
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
                      <span className="font-medium text-beige-700">{selectedEmployee?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-beige-500">Date</span>
                      <span className="font-medium text-beige-700">
                        {formData.date ? format(formData.date, "MMMM d, yyyy") : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-beige-500">Time</span>
                      <span className="font-medium text-beige-700">{formData.timeSlot}</span>
                    </div>
                    <div className="flex justify-between border-t border-beige-200 pt-3">
                      <span className="text-beige-500">Price</span>
                      <span className="font-semibold text-beige-700">
                        {selectedService ? formatPrice(selectedService.price) : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-beige-500">Duration</span>
                      <span className="font-medium text-beige-700">
                        {selectedService ? formatDuration(selectedService.durationMinutes) : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <button className="btn-outline">Add to Calendar</button>
                  <a href="/" className="btn-primary">
                    Back to Home
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        {currentStep < 3 && (
          <div className="mt-8 flex justify-between">
            <button
              onClick={prev}
              disabled={currentStep === 0}
              className={cn(
                "btn-outline",
                currentStep === 0 && "pointer-events-none opacity-40"
              )}
            >
              Back
            </button>
            <button
              onClick={currentStep === 2 ? handleSubmit : next}
              disabled={!canProceed() || (currentStep === 2 && isSubmitting)}
              className={cn(
                "btn-primary",
                (!canProceed() || (currentStep === 2 && isSubmitting)) && "pointer-events-none opacity-40"
              )}
            >
              {currentStep === 2 ? (isSubmitting ? "Submitting..." : "Confirm Booking") : "Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Sub-components --- */

function ServiceOption({
  service,
  selected,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(service.id)}
      className={cn(
        "flex flex-col items-start rounded-card border p-4 text-left transition-all duration-200",
        selected
          ? "border-beige-600 bg-beige-50 ring-2 ring-beige-200"
          : "border-beige-200 bg-white hover:border-beige-300 hover:shadow-sm"
      )}
    >
      <span className="text-xs font-medium text-beige-500">
        {service.category}
      </span>
      <span className="mt-1 font-serif text-base font-semibold text-beige-700">
        {service.name}
      </span>
      <span className="mt-1 text-sm text-beige-600">
        {formatPrice(service.price)} · {formatDuration(service.durationMinutes)}
      </span>
    </button>
  );
}

function SpecialistOption({
  employee,
  selected,
  onSelect,
}: {
  employee: Employee;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(employee.id)}
      className={cn(
        "flex items-center gap-3 rounded-card border p-4 text-left transition-all duration-200",
        selected
          ? "border-beige-600 bg-beige-50 ring-2 ring-beige-200"
          : "border-beige-200 bg-white hover:border-beige-300 hover:shadow-sm"
      )}
    >
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
        <Image
          src={employee.imageUrl}
          alt={employee.name}
          fill
          className="object-cover"
          sizes="48px"
        />
      </div>
      <div>
        <span className="font-serif text-base font-semibold text-beige-700">
          {employee.name}
        </span>
        <span className="block text-xs text-beige-500">{employee.role}</span>
        <span className="block text-xs text-beige-500">
          {employee.rating}
          <StarIcon size={12} className="mx-0.5" />
          · {employee.reviewCount} reviews
        </span>
      </div>
    </button>
  );
}

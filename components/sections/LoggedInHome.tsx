"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Scissors,
  Sparkles,
  Users,
  User,
  CalendarCheck,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Service, Employee } from "@/lib/types";
import { displayTime, cn } from "@/lib/utils";
import ServiceCard from "@/components/cards/ServiceCard";
import TeamCard from "@/components/cards/TeamCard";
import Skeleton from "@/components/ui/Skeleton";
import TestimonialsRow from "@/components/sections/TestimonialsRow";
import BookingCTA from "@/components/sections/BookingCTA";

/* ---------- types ---------- */

interface Booking {
  id: string;
  userId: string | null;
  service: { name: string; category: string };
  employee: { name: string };
  date: string;
  slotStart: string | null;
  slotEnd: string | null;
  status: string;
}

/* ---------- greeting helpers ---------- */

function getGreetingData(hour: number) {
  if (hour < 12) {
    return {
      greeting: "Good morning",
      subline: "Ready for a little self-care today?",
    };
  }
  if (hour < 17) {
    return {
      greeting: "Good afternoon",
      subline: "Take a break and treat yourself.",
    };
  }
  return {
    greeting: "Good evening",
    subline: "Wind down with an evening treatment.",
  };
}

function formatFullBookingDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ---------- status badge ---------- */

const statusStyles: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  completed: "bg-beige-200 text-beige-700",
  cancelled: "bg-red-100 text-red-700",
};

/* ---------- animation variants ---------- */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const cardStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardChild = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

/* ================================================================
   LoggedInHome
   ================================================================ */

export default function LoggedInHome() {
  const { user } = useAuth();

  /* --- greeting hour (client-only to avoid hydration mismatch) --- */
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    setHour(new Date().getHours());
  }, []);
  const greeting = hour !== null ? getGreetingData(hour) : { greeting: "Welcome", subline: "We're glad to see you." };

  /* --- upcoming booking --- */
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data) => {
        const all: Booking[] = data.bookings ?? data ?? [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = all
          .filter(
            (b) =>
              b.userId === user!.id &&
              (b.status === "confirmed" || b.status === "pending") &&
              new Date(b.date) >= today
          )
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setNextBooking(upcoming[0] ?? null);
        setBookingsLoading(false);
      })
      .catch(() => setBookingsLoading(false));
  }, [user]);

  /* --- recommended services --- */
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data: Service[]) => {
        setServices(data);
        setServicesLoading(false);
      })
      .catch(() => setServicesLoading(false));
  }, []);

  const recommendedServices = useMemo(() => {
    if (services.length === 0) return [];
    // Shuffle deterministically from the list
    const shuffled = [...services].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, [services]);

  /* --- featured team --- */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data: Employee[]) => {
        setEmployees(data.slice(0, 3));
        setEmployeesLoading(false);
      })
      .catch(() => setEmployeesLoading(false));
  }, []);

  /* --- quick action tiles --- */
  const quickActions = [
    { label: "Book a Service", href: "/booking", icon: Scissors },
    { label: "Browse Services", href: "/services", icon: Sparkles },
    { label: "Meet the Team", href: "/team", icon: Users },
    { label: "My Profile", href: "/profile", icon: User },
  ];

  return (
    <>
      {/* ===== 1. Personalised Greeting Hero ===== */}
      <section className="relative flex min-h-[70vh] items-center overflow-hidden bg-beige-50 px-4 py-20 md:px-8 lg:px-16">
        {/* Soft gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(200,168,130,0.15),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(140,106,72,0.08),transparent_60%)]" />

        <div className="section-container relative z-10 mx-auto max-w-3xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-serif text-lg tracking-wide text-beige-500"
          >
            {greeting.greeting},
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-2 font-serif text-5xl font-semibold leading-tight text-beige-700 md:text-6xl lg:text-7xl"
          >
            {user?.name ?? "there"}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg leading-relaxed text-beige-800"
          >
            {greeting.subline}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-8 flex justify-center"
          >
            <Link href="/booking" className="btn-primary gap-2 px-8 py-3.5 text-base">
              <CalendarCheck className="h-5 w-5" />
              Book a Treatment
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ===== 2. Upcoming Booking ===== */}
      <section className="section-padding bg-beige-50">
        <div className="section-container mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mb-8 font-serif text-3xl font-semibold text-beige-700 md:text-4xl"
          >
            Your Next Appointment
          </motion.h2>

          {bookingsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : nextBooking ? (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
              className="rounded-card border border-beige-200 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-beige-300 hover:shadow-card-hover md:p-8"
            >
<motion.div variants={cardStagger} initial="hidden" animate="visible" className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <motion.div variants={cardChild} className="flex items-center gap-3">
                    <h3 className="font-serif text-2xl font-semibold text-beige-700">
                      {nextBooking.service.name}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-3 py-0.5 text-xs font-medium capitalize",
                        statusStyles[nextBooking.status] ?? "bg-beige-100 text-beige-600"
                      )}
                    >
                      {nextBooking.status}
                    </span>
                  </motion.div>

                  <motion.p variants={cardChild} className="text-beige-600">
                    with <span className="font-medium text-beige-700">{nextBooking.employee.name}</span>
                  </motion.p>

                  <motion.div variants={cardChild} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-beige-500">
                    <span>{formatFullBookingDate(nextBooking.date)}</span>
                    {nextBooking.slotStart && (
                      <>
                        <span className="text-beige-300">|</span>
                        <span>
                          {displayTime(nextBooking.slotStart)}
                          {nextBooking.slotEnd && ` – ${displayTime(nextBooking.slotEnd)}`}
                        </span>
                      </>
                    )}
                  </motion.div>
                </div>

                <motion.div variants={cardChild}>
                  <Link
                    href="/booking"
                    className="btn-outline shrink-0 gap-2 self-start"
                  >
                    Book Again
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
              className="rounded-card border border-beige-200 bg-white p-8 text-center shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-beige-300 hover:shadow-card-hover"
            >
              <p className="text-lg text-beige-600">
                No upcoming appointments. Ready to book?
              </p>
              <Link
                href="/booking"
                className="btn-primary mt-4 inline-flex gap-2"
              >
                <CalendarCheck className="h-5 w-5" />
                Book Now
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* ===== 3. Quick Actions ===== */}
      <section className="section-padding bg-beige-100">
        <div className="section-container mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mb-8 font-serif text-3xl font-semibold text-beige-700 md:text-4xl"
          >
            Quick Actions
          </motion.h2>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <motion.div key={action.href} variants={fadeUp}>
                  <Link
                    href={action.href}
                    className="group flex flex-col items-center gap-3 rounded-card border border-beige-200 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-beige-100 text-beige-600 transition-colors duration-300 group-hover:bg-beige-600 group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium text-beige-700">
                      {action.label}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ===== 4. Recommended Services ===== */}
      <section className="section-padding bg-beige-50">
        <div className="section-container mx-auto">
          <div className="mb-8 flex items-end justify-between">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="font-serif text-3xl font-semibold text-beige-700 md:text-4xl"
            >
              Treatments You Might Love
            </motion.h2>
            <Link
              href="/services"
              className="hidden items-center gap-1 text-sm font-medium text-beige-600 transition-colors hover:text-beige-400 sm:inline-flex"
            >
              See all treatments
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {servicesLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recommendedServices.map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <ServiceCard service={service} />
                </motion.div>
              ))}
            </div>
          )}

          <Link
            href="/services"
            className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-beige-600 transition-colors hover:text-beige-400 sm:hidden"
          >
            See all treatments
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ===== 5. Featured Team ===== */}
      <section className="section-padding bg-beige-50">
        <div className="section-container mx-auto">
          <div className="mb-8 flex items-end justify-between">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="font-serif text-3xl font-semibold text-beige-700 md:text-4xl"
            >
              Meet Your Stylists
            </motion.h2>
            <Link
              href="/team"
              className="hidden items-center gap-1 text-sm font-medium text-beige-600 transition-colors hover:text-beige-400 sm:inline-flex"
            >
              See the full team
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {employeesLoading ? (
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <Skeleton className="h-80 w-full" />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {employees.map((employee) => (
                <motion.div key={employee.id} variants={fadeUp}>
                  <TeamCard employee={employee} />
                </motion.div>
              ))}
            </motion.div>
          )}

          <Link
            href="/team"
            className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-beige-600 transition-colors hover:text-beige-400 sm:hidden"
          >
            See the full team
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ===== 6. Testimonials + CTA ===== */}
      <TestimonialsRow />
      <BookingCTA />
    </>
  );
}

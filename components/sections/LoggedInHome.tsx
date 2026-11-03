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
  Gift,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Service, Employee } from "@/lib/types";
import { displayTime, cn, formatServiceNames, getBookingServices } from "@/lib/utils";
import ServiceCard from "@/components/cards/ServiceCard";
import { groupServicesIntoTreatments, isTreatmentGroup } from "@/lib/service-legacy-map";
import TeamCard from "@/components/cards/TeamCard";
import Skeleton from "@/components/ui/Skeleton";
import BookingCTA from "@/components/sections/BookingCTA";
import DashboardBackgroundControl from "@/components/ui/DashboardBackgroundControl";
import HeroCarousel from "@/components/ui/HeroCarousel";

/**
 * Shown until (or unless) an admin uploads their own background — the same
 * picture the public hero opens with, so the dashboard fades in the same way.
 */
const DEFAULT_BACKGROUND = "/images/hero-beauty.png";

/* ---------- types ---------- */

interface Booking {
  id: string;
  userId: string | null;
  service: { name: string; category: string };
  bookingServices?: { service: { name: string; category: string } }[];
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
  const { user, refreshSession, isAdmin } = useAuth();

  /* --- background image chosen by an admin (falls back to the default) --- */
  const [customBackground, setCustomBackground] = useState(false);
  const [backgroundVersion, setBackgroundVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard-background")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setCustomBackground(Boolean(data.custom));
        setBackgroundVersion(data.version ?? null);
      })
      .catch(() => {
        /* keep the default picture */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The version is part of the URL so a replaced image is never served from the
  // immutable cache entry of the one before it.
  const backgroundSrc =
    customBackground && backgroundVersion
      ? `/dashboard-background/image?v=${backgroundVersion}`
      : DEFAULT_BACKGROUND;

  /* --- greeting hour (client-only to avoid hydration mismatch) --- */
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    setHour(new Date().getHours());
  }, []);
  const greeting = hour !== null ? getGreetingData(hour) : { greeting: "Welcome", subline: "We're glad to see you." };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "—";

  const loyaltyPoints = user?.loyaltyPoints ?? 0;

  /* --- refresh auth context on mount to get fresh loyalty points --- */
  useEffect(() => {
    refreshSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const grouped = groupServicesIntoTreatments(services);
    const shuffled = [...grouped].sort(() => 0.5 - Math.random());
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
      {/* Same geometry as the marketing hero (HeroSection): `-mt-24` cancels the
          96px reserved for the fixed header and `min-h-[calc(100vh+6rem)]` grows
          the section back by the same amount. That is what makes the picture
          span a right-hand panel of the same proportions as the home hero
          (50% wide, full viewport height) instead of being smeared across the
          whole viewport, which cropped it down to a zoomed-in face. The extra
          top padding keeps the greeting itself exactly where it was. */}
      <section
        className="flex flex-col w-full h-[calc(100dvh-88px)] min-h-[calc(100dvh-88px)] overflow-hidden md:relative md:h-auto md:flex-row md:items-center md:min-h-[calc(100vh-88px)] md:px-8 md:pb-20 md:pt-16 lg:px-16"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        {/* ── Text Block ── */}
        <div
          className="w-full shrink-0 px-5 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-6 max-[360px]:px-4 max-[360px]:py-4 md:bg-transparent md:p-0 md:relative md:z-10 md:max-w-3xl md:text-left"
          style={{ backgroundColor: "var(--bg-primary)" }}
        >
          {/* Eyebrow: time-based greeting */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-2.5 sm:mb-4 flex items-center gap-2.5 sm:gap-3"
          >
            <span
              className="h-0.5 w-8 rounded-full md:w-10"
              style={{ backgroundColor: "var(--accent-primary)" }}
            />
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.24em] font-sans md:font-serif md:text-sm md:tracking-[0.25em]"
              style={{ color: "var(--accent-primary)" }}
            >
              <span className="md:hidden">{greeting.greeting.toUpperCase()}</span>
              <span className="hidden md:inline">{greeting.greeting}</span>
            </span>
          </motion.div>

          {/* Heading — Single h1, Cormorant medium */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-serif text-[clamp(1.85rem,7.5vw,2.5rem)] font-medium leading-[1.1] break-words sm:text-5xl md:text-6xl lg:text-7xl md:font-semibold md:leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {user?.name ?? "there"}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-2 sm:mt-4 max-w-md text-xs sm:text-base md:text-lg leading-relaxed font-sans md:max-w-xl"
            style={{ color: "var(--text-muted)" }}
          >
            {greeting.subline}
          </motion.p>

          {/* Stats Row (<dl>, 2 cols equal width) */}
          <motion.dl
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="mt-4 sm:mt-6 border-t pt-3 sm:pt-4 grid grid-cols-2 gap-4 max-[360px]:gap-3 md:border-none md:pt-0 md:mt-8 md:flex md:flex-wrap md:gap-x-12 md:gap-y-4"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div className="flex flex-col">
              <dt
                className="text-[11px] font-medium uppercase tracking-[0.16em] font-sans md:text-xs md:tracking-[0.15em]"
                style={{ color: "var(--text-muted)" }}
              >
                MEMBER SINCE
              </dt>
              <dd
                className="mt-1 font-serif text-[18px] sm:text-[20px] font-medium md:text-xl"
                style={{ color: "var(--text-primary)" }}
              >
                {memberSince}
              </dd>
            </div>
            <div className="flex flex-col">
              <dt
                className="text-[11px] font-medium uppercase tracking-[0.16em] font-sans md:text-xs md:tracking-[0.15em]"
                style={{ color: "var(--text-muted)" }}
              >
                LOYALTY POINTS
              </dt>
              <dd
                className="mt-1 font-serif text-[18px] sm:text-[20px] font-medium md:text-xl"
                style={{ color: "var(--text-primary)" }}
              >
                {loyaltyPoints}
                <span
                  className="ml-1 text-sm font-sans font-normal"
                  style={{ color: "var(--text-muted)" }}
                >
                  pts
                </span>
              </dd>
            </div>
          </motion.dl>

          {/* Buttons Row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.36 }}
            className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3 max-[360px]:flex-col max-[360px]:w-full md:mt-10 md:flex-nowrap md:gap-4 md:w-auto"
          >
            <Link
              href="/booking"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 sm:px-8 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] max-[360px]:w-full md:btn-primary md:gap-2 md:px-8 md:py-3.5 md:text-base"
              style={{ backgroundColor: "var(--accent-primary)" }}
            >
              <CalendarCheck className="h-4 w-4 md:h-5 md:w-5" />
              Book a Treatment
            </Link>
            <Link
              href="/account/loyalty?tab=rewards"
              className="inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] max-[360px]:w-full md:btn-outline md:gap-2 md:px-6 md:py-3.5 md:text-base"
              style={{
                color: "var(--text-primary)",
                borderColor: "var(--border-color)",
                backgroundColor: "transparent",
              }}
            >
              <Gift className="h-4 w-4 md:h-5 md:w-5" />
              View Rewards
            </Link>
          </motion.div>
        </div>

        {/* ── Photo Carousel Container (Below text on mobile, right panel on desktop) ── */}
        <motion.div
          key={backgroundSrc}
          className="relative w-full flex-1 min-h-0 overflow-hidden md:aspect-auto md:max-h-none md:absolute md:inset-y-0 md:right-0 md:w-[45%] lg:w-[50%]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Gradient overlay on top edge — blends into ivory on mobile (matching public hero) */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 sm:h-24 md:hidden"
            style={{
              background:
                "linear-gradient(to bottom, var(--bg-primary) 0%, var(--bg-primary) 15%, rgba(245,241,234,0.8) 40%, rgba(245,241,234,0.3) 70%, transparent 100%)",
            }}
          />

          {/* Left edge blends into ivory on desktop */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden w-32 md:block md:w-48 lg:w-64"
            style={{
              background:
                "linear-gradient(to right, var(--bg-primary) 0%, var(--bg-primary) 15%, rgba(245,241,234,0.8) 40%, rgba(245,241,234,0.3) 70%, transparent 100%)",
            }}
          />

          <HeroCarousel fallbackSrc={backgroundSrc} priority={true} />

          {/* Admin Background Control */}
          {isAdmin && (
            <DashboardBackgroundControl
              custom={customBackground}
              version={backgroundVersion}
              onChanged={({ custom, version }) => {
                setCustomBackground(custom);
                setBackgroundVersion(version);
              }}
            />
          )}
        </motion.div>

        {/* Desktop-only soft radial gradient overlays */}
        <div className="pointer-events-none absolute inset-0 hidden md:block bg-[radial-gradient(ellipse_at_top_right,_rgba(200,168,130,0.15),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 hidden md:block bg-[radial-gradient(ellipse_at_bottom_left,_rgba(140,106,72,0.08),transparent_60%)]" />
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
                  <motion.div variants={cardChild} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <h3 className="font-serif text-2xl font-semibold text-beige-700">
                        {formatServiceNames(nextBooking)}
                      </h3>
                      <span
                        className={cn(
                          "rounded-full px-3 py-0.5 text-xs font-medium capitalize",
                          statusStyles[nextBooking.status] ?? "bg-beige-100 text-beige-600"
                        )}
                      >
                        {nextBooking.status}
                      </span>
                    </div>
                    {getBookingServices(nextBooking).length > 1 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {getBookingServices(nextBooking).map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-block rounded-md bg-beige-100 px-2 py-0.5 text-xs font-medium text-beige-700"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
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
                Book appointment
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
              {recommendedServices.map((service, i) => (
                <motion.div
                  key={isTreatmentGroup(service) ? service.groupKey : service.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="h-full flex flex-col"
                >
                  <ServiceCard item={service} />
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

      {/* ===== 6. Booking CTA ===== */}
      <BookingCTA />
    </>
  );
}

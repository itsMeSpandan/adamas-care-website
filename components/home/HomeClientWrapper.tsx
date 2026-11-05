"use client";

import { useAuth } from "@/lib/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import HeroSection from "@/components/sections/HeroSection";
import WhyUsSection from "@/components/sections/WhyUsSection";
import ServicesGrid from "@/components/sections/ServicesGrid";
import TeamGrid from "@/components/sections/TeamGrid";
import TestimonialsRow from "@/components/sections/TestimonialsRow";
import BookingCTA from "@/components/sections/BookingCTA";
import LoggedInHome from "@/components/sections/LoggedInHome";
import { Service, Employee, Testimonial } from "@/lib/types";

interface HomeClientWrapperProps {
  initialServices: Service[];
  initialEmployees: Employee[];
  initialTestimonials: Testimonial[];
}

function PublicHomePage({
  initialServices,
  initialEmployees,
  initialTestimonials,
}: HomeClientWrapperProps) {
  return (
    <>
      <HeroSection />
      <WhyUsSection />
      <ServicesGrid featured initialServices={initialServices} />
      <TeamGrid limit={4} initialEmployees={initialEmployees} />
      <TestimonialsRow initialTestimonials={initialTestimonials} />
      <BookingCTA />
    </>
  );
}

const pageVariants = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25 } },
};

export default function HomeClientWrapper({
  initialServices,
  initialEmployees,
  initialTestimonials,
}: HomeClientWrapperProps) {
  const { isAuthenticated } = useAuth();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={isAuthenticated ? "logged-in" : "public"}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {isAuthenticated ? (
          <LoggedInHome />
        ) : (
          <PublicHomePage
            initialServices={initialServices}
            initialEmployees={initialEmployees}
            initialTestimonials={initialTestimonials}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

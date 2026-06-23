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

function PublicHomePage() {
  return (
    <>
      <HeroSection />
      <WhyUsSection />
      <ServicesGrid featured />
      <TeamGrid limit={3} />
      <TestimonialsRow />
      <BookingCTA />
    </>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25 } },
};

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isAuthenticated ? "logged-in" : "public"}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {isAuthenticated ? <LoggedInHome /> : <PublicHomePage />}
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import { useAuth } from "@/lib/auth-context";
import HeroSection from "@/components/sections/HeroSection";
import WhyUsSection from "@/components/sections/WhyUsSection";
import ServicesGrid from "@/components/sections/ServicesGrid";
import TeamGrid from "@/components/sections/TeamGrid";
import TestimonialsRow from "@/components/sections/TestimonialsRow";
import BookingCTA from "@/components/sections/BookingCTA";
import LoggedInHome from "@/components/sections/LoggedInHome";

export default function HomeShell() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <LoggedInHome />;
  }

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
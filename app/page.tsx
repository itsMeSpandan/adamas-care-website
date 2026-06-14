import HeroSection from "@/components/sections/HeroSection";
import WhyUsSection from "@/components/sections/WhyUsSection";
import ServicesGrid from "@/components/sections/ServicesGrid";
import TeamGrid from "@/components/sections/TeamGrid";
import TestimonialsRow from "@/components/sections/TestimonialsRow";
import BookingCTA from "@/components/sections/BookingCTA";

export default function Home() {
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

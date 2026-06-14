import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { getEmployees } from "@/lib/queries";
import TeamCard from "@/components/cards/TeamCard";
import BookingCTA from "@/components/sections/BookingCTA";

export const metadata: Metadata = {
  title: `Our Team | ${BRAND.name}`,
  description:
    "Meet our talented team of certified beauty professionals, from expert hairstylists to master aestheticians.",
};

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const employees = await getEmployees();

  return (
    <>
      <section className="section-padding bg-beige-50">
        <div className="section-container mx-auto">
          <h1 className="mb-4 text-center font-serif text-4xl font-semibold text-beige-700 md:text-5xl">
            Our Team
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-center text-beige-800">              Every member of the {BRAND.name} team is a passionate professional
            dedicated to helping you look and feel your absolute best. With
            specialized training and years of experience, our experts deliver
            exceptional results every time.
          </p>

          {/* Masonry-style grid */}
          <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
            {employees.map((employee) => (
              <TeamCard key={employee.id} employee={employee} />
            ))}
          </div>
        </div>
      </section>
      <BookingCTA />
    </>
  );
}

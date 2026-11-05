import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { getEmployees } from "@/lib/queries";
import TeamCard from "@/components/cards/TeamCard";
import BookingCTA from "@/components/sections/BookingCTA";
import { Employee } from "@/lib/types";

export const metadata: Metadata = {
  title: "Our Team",
  description:
    "Meet our talented team of certified beauty professionals, from expert hairstylists to master aestheticians.",
};

export const revalidate = 300;

export default async function TeamPage() {
  let employees: Employee[] = [];
  try {
    employees = await getEmployees();
  } catch (error) {
    console.error("Failed to load employees on server:", error);
  }

  return (
    <>
      <section className="section-padding bg-beige-50">
        <div className="section-container mx-auto">
          <h1 className="mb-4 text-center font-serif text-4xl font-semibold text-beige-700 md:text-5xl">
            Our Team
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-center text-beige-800">
            Every member of the {BRAND.name} team is a passionate professional
            dedicated to helping you look and feel your absolute best. With
            specialized training and years of experience, our experts deliver
            exceptional results every time.
          </p>

          {/* Team Grid */}
          <h2 className="sr-only">Our Specialists</h2>
          <div
            className={`grid gap-6 ${
              employees.length <= 3
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
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

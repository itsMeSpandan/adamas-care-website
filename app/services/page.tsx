import type { Metadata } from "next";
import { getServices } from "@/lib/queries";
import ServiceCard from "@/components/cards/ServiceCard";
import { groupServicesIntoTreatments, isTreatmentGroup } from "@/lib/service-legacy-map";
import { Service } from "@/lib/types";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Explore our full range of massages and body treatments, with prices and durations from our salon menu.",
};

export const revalidate = 300;

export default async function ServicesPage() {
  let services: Service[] = [];
  try {
    services = await getServices();
  } catch (error) {
    console.error("Failed to load services on server:", error);
  }
  const groupedTreatments = groupServicesIntoTreatments(services);

  return (
    <section className="section-padding bg-beige-50">
      <div className="section-container mx-auto">
        <h1 className="mb-4 text-center font-serif text-4xl font-semibold text-beige-700 md:text-5xl">
          Our Services
        </h1>
        <h2 className="sr-only">Treatments and Therapies</h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-beige-800">
          From luxurious hair treatments to rejuvenating facials, we offer a
          comprehensive range of beauty services designed to pamper and perfect.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groupedTreatments.map((item) => (
            <ServiceCard
              key={isTreatmentGroup(item) ? item.groupKey : item.id}
              item={item}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

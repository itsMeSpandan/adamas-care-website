import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { getServices } from "@/lib/queries";
import ServiceCard from "@/components/cards/ServiceCard";

export const metadata: Metadata = {
  title: `Services | ${BRAND.name}`,
  description:
    "Explore our full range of premium hair, skin, nail, body, and bridal services.",
};

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <section className="section-padding bg-beige-50">
      <div className="section-container mx-auto">
        <h1 className="mb-4 text-center font-serif text-4xl font-semibold text-beige-700 md:text-5xl">
          Our Services
        </h1>
        <p className="mx-auto mb-12 max-w-2xl text-center text-beige-800">
          From luxurious hair treatments to rejuvenating facials, we offer a
          comprehensive range of beauty services designed to pamper and perfect.
        </p>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}

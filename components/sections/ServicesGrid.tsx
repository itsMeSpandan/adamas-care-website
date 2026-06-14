"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Service, ServiceCategory } from "@/lib/types";
import ServiceCard from "@/components/cards/ServiceCard";

const categories: (ServiceCategory | "All")[] = [
  "All",
  "Hair",
  "Skin",
  "Nails",
  "Body",
  "Bridal",
];

export default function ServicesGrid({ featured = false }: { featured?: boolean }) {
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | "All">("All");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        setServices(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const displayedServices = services.filter((s) => {
    const matchesCategory = activeCategory === "All" || s.category === activeCategory;
    return featured ? s.featured && matchesCategory : matchesCategory;
  });

  if (loading) {
    return (
      <section className="section-padding bg-beige-100">
        <div className="section-container mx-auto">
          <div className="mb-8 text-center font-serif text-3xl font-semibold text-beige-700 md:text-4xl">
            {featured ? "Our Treatments" : "All Services"}
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-card bg-beige-200" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding bg-beige-100">
      <div className="section-container mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center font-serif text-3xl font-semibold text-beige-700 md:text-4xl"
        >
          {featured ? "Our Treatments" : "All Services"}
        </motion.h2>

        {/* Filter chips */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10 flex flex-wrap justify-center gap-2"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-beige-600 text-white"
                  : "border border-beige-300 bg-white text-beige-700 hover:bg-beige-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Grid */}
        <motion.div
          layout
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {displayedServices.map((service, i) => (
            <motion.div
              key={service.id}
              layout
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <ServiceCard service={service} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

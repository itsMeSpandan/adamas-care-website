"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Employee } from "@/lib/types";
import TeamCard from "@/components/cards/TeamCard";

export default function TeamGrid({ limit }: { limit?: number }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => {
        setEmployees(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const displayed = limit ? employees.slice(0, limit) : employees;

  if (loading) {
    return (
      <section className="section-padding bg-beige-50">
        <div className="section-container mx-auto">
          <div className="mb-12 text-center font-serif text-3xl font-semibold text-beige-700 md:text-4xl">
            Meet the Specialists
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-card bg-beige-200" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding bg-beige-50">
      <div className="section-container mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center font-serif text-3xl font-semibold text-beige-700 md:text-4xl"
        >
          Meet the Specialists
        </motion.h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((employee, i) => (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <TeamCard employee={employee} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

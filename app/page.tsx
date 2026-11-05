import { getServices, getEmployees, getTestimonials } from "@/lib/queries";
import HomeClientWrapper from "@/components/home/HomeClientWrapper";
import { Service, Employee, Testimonial } from "@/lib/types";

export const revalidate = 300;

export default async function Home() {
  let services: Service[] = [];
  let employees: Employee[] = [];
  let testimonials: Testimonial[] = [];

  try {
    [services, employees, testimonials] = await Promise.all([
      getServices(),
      getEmployees(),
      getTestimonials(),
    ]);
  } catch (error) {
    console.error("Failed to prefetch homepage data on server:", error);
  }

  return (
    <HomeClientWrapper
      initialServices={services}
      initialEmployees={employees}
      initialTestimonials={testimonials}
    />
  );
}

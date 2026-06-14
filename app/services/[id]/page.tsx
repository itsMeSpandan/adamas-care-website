import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getServiceById, getEmployees } from "@/lib/queries";
import { formatPrice, formatDuration } from "@/lib/utils";
import StarIcon from "@/components/ui/StarIcon";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const service = await getServiceById(id);
  if (!service) return { title: "Service Not Found" };
  return {
    title: `${service.name} | ${BRAND.name}`,
    description: service.description,
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { id } = await params;
  const service = await getServiceById(id);
  if (!service) notFound();

  const allEmployees = await getEmployees();
  const specialists = service.employeeIds
    .map((eid) => allEmployees.find((e) => e.id === eid))
    .filter(Boolean);

  return (
    <div className="bg-beige-50">
      {/* Breadcrumb */}
      <div className="section-container mx-auto px-4 pt-8 md:px-8">
        <nav className="flex items-center gap-2 text-sm text-beige-500">
          <Link href="/" className="transition-colors hover:text-beige-700">
            Home
          </Link>
          <span>/</span>
          <Link
            href="/services"
            className="transition-colors hover:text-beige-700"
          >
            Services
          </Link>
          <span>/</span>
          <span className="text-beige-700">{service.name}</span>
        </nav>
      </div>

      {/* Two-column layout */}
      <div className="section-container mx-auto grid gap-12 px-4 py-12 md:px-8 lg:grid-cols-2">
        {/* Left: image */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-card">
          <Image
            src={service.imageUrl}
            alt={service.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>

        {/* Right: details */}
        <div>
          <span className="inline-block rounded-full bg-beige-100 px-3 py-1 text-xs font-medium text-beige-600">
            {service.category}
          </span>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-beige-700 md:text-4xl lg:text-5xl">
            {service.name}
          </h1>

          <div className="mt-4 flex items-center gap-4">
            <span className="text-2xl font-semibold text-beige-600">
              {formatPrice(service.price)}
            </span>
            <span className="text-beige-300">|</span>
            <span className="text-beige-600">
              {formatDuration(service.durationMinutes)}
            </span>
          </div>

          <p className="mt-6 leading-relaxed text-beige-800">
            {service.longDescription}
          </p>

          {/* Specialists */}
          <div className="mt-8">
            <h3 className="mb-4 font-serif text-lg font-semibold text-beige-700">
              Available with our specialists
            </h3>
            <div className="flex flex-wrap gap-4">
              {specialists.map(
                (spec) =>
                  spec && (
                    <Link
                      key={spec.id}
                      href={`/team/${spec.id}`}
                      className="flex items-center gap-3 rounded-card border border-beige-200 bg-white px-4 py-3 shadow-card transition-all duration-200 hover:shadow-card-hover"
                    >
                      <div className="relative h-10 w-10 overflow-hidden rounded-full">
                        <Image
                          src={spec.imageUrl}
                          alt={spec.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-beige-700">
                          {spec.name}
                        </p>
                        <p className="flex items-center text-xs text-beige-500">
                          {spec.rating}
                          <StarIcon size={12} className="ml-0.5" />
                        </p>
                      </div>
                    </Link>
                  )
              )}
            </div>
          </div>

          {/* Book button */}
          <div className="mt-10 sticky top-24">
            <Link href="/booking" className="btn-primary w-full py-4 text-base">
              Book this service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

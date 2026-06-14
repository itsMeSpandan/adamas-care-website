import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getEmployeeById, getServices } from "@/lib/queries";
import { formatDuration } from "@/lib/utils";
import StarIcon from "@/components/ui/StarIcon";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee) return { title: "Stylist Not Found" };
  return {
    title: `${employee.name} | ${BRAND.name}`,
    description: employee.bio,
  };
}

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  const allServices = await getServices();
  const employeeServices = employee.serviceIds
    .map((sid) => allServices.find((s) => s.id === sid))
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
            href="/team"
            className="transition-colors hover:text-beige-700"
          >
            Our Team
          </Link>
          <span>/</span>
          <span className="text-beige-700">{employee.name}</span>
        </nav>
      </div>

      {/* Two-column layout */}
      <div className="section-container mx-auto grid gap-12 px-4 py-12 md:px-8 lg:grid-cols-2">
        {/* Left: portrait */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-card">
          <Image
            src={employee.imageUrl}
            alt={employee.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>

        {/* Right: details */}
        <div>
          <h1 className="font-serif text-3xl font-semibold text-beige-700 md:text-4xl lg:text-5xl">
            {employee.name}
          </h1>
          <p className="mt-1 text-lg text-beige-500">{employee.role}</p>

          {/* Rating */}
          <div className="mt-4 flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} filled={i < Math.round(employee.rating)} size={16} />
              ))}
            </div>
            <span className="text-sm text-beige-500">
              {employee.rating} ({employee.reviewCount} reviews)
            </span>
          </div>

          {/* Experience */}
          <p className="mt-2 text-sm text-beige-600">
            {employee.yearsExperience} years of experience
          </p>

          {/* Bio */}
          <p className="mt-6 leading-relaxed text-beige-800">
            {employee.bio}
          </p>

          {/* Services */}
          <div className="mt-8">
            <h3 className="mb-3 font-serif text-lg font-semibold text-beige-700">
              Services by {employee.name.split(" ")[0]}
            </h3>
            <div className="flex flex-wrap gap-2">
              {employeeServices.map(
                (svc) =>
                  svc && (
                    <Link
                      key={svc.id}
                      href={`/services/${svc.id}`}
                      className="rounded-full border border-beige-300 bg-beige-50 px-4 py-2 text-sm text-beige-700 transition-colors hover:bg-beige-100"
                    >
                      {svc.name} · {formatDuration(svc.durationMinutes)}
                    </Link>
                  )
              )}
            </div>
          </div>

          {/* Instagram */}
          {employee.instagramHandle && (
            <div className="mt-6">
              <a
                href={`https://instagram.com/${employee.instagramHandle.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-beige-500 transition-colors hover:text-beige-700"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
                {employee.instagramHandle}
              </a>
            </div>
          )}

          {/* CTA */}
          <div className="mt-10">
            <Link
              href="/booking"
              className="btn-primary w-full py-4 text-base"
            >
              Book with {employee.name.split(" ")[0]}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

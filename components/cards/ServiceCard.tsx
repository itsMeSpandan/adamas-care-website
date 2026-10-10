import Image from "next/image";
import Link from "next/link";
import { Service } from "@/lib/types";
import { formatPrice, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { audienceLabel } from "@/lib/service-audience";

const categoryColors: Record<string, string> = {
  "Classic Combos": "bg-indigo-50 text-indigo-800",
  "Fab Facials": "bg-rose-50 text-rose-800",
  "Grooming Him": "bg-sky-50 text-sky-800",
  "Styling Her": "bg-fuchsia-50 text-fuchsia-800",
  Bleach: "bg-yellow-50 text-yellow-800",
  Waxing: "bg-violet-50 text-violet-800",
  Threading: "bg-teal-50 text-teal-800",
  "Hands & Feet": "bg-orange-50 text-orange-800",
  "Relaxing Spa": "bg-emerald-50 text-emerald-800",
  "Mini Massage": "bg-amber-50 text-amber-800",
};

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Link
      href={`/services/${service.id}`}
      className="group block overflow-hidden rounded-card border border-beige-200 bg-white shadow-card transition-all duration-300 hover:scale-[1.02] hover:shadow-card-hover"
    >
      {/* Image */}
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={service.imageUrl}
          alt={service.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <span
          className={cn(
            "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-medium",
            categoryColors[service.category] ?? "bg-beige-100 text-beige-700"
          )}
        >
          {service.category}
        </span>
        {service.audience !== "unisex" && (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-beige-700 backdrop-blur">
            {audienceLabel(service.audience)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-serif text-xl font-semibold text-beige-700">
          {service.name}
        </h3>
        <p className="mt-1 text-sm text-beige-800 line-clamp-2">
          {service.description}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-beige-600">
            <span className="font-medium">{formatPrice(service.price)}</span>
            <span className="text-beige-300">|</span>
            <span>{formatDuration(service.durationMinutes)}</span>
          </div>
          <span className="text-sm font-medium text-beige-600 transition-colors group-hover:text-beige-400">
            Book
          </span>
        </div>
      </div>
    </Link>
  );
}

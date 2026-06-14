import Image from "next/image";
import Link from "next/link";
import { Service } from "@/lib/types";
import { formatPrice, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

const categoryColors: Record<string, string> = {
  Hair: "bg-amber-100 text-amber-800",
  Skin: "bg-rose-100 text-rose-800",
  Nails: "bg-pink-100 text-pink-800",
  Body: "bg-emerald-100 text-emerald-800",
  Bridal: "bg-purple-100 text-purple-800",
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

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Service, TreatmentGroup } from "@/lib/types";
import { formatPrice, formatDuration, cn } from "@/lib/utils";
import { audienceLabel } from "@/lib/service-audience";
import { isTreatmentGroup } from "@/lib/service-legacy-map";
import { useAuth } from "@/lib/auth-context";

export const SERVICE_THUMBNAIL_IMAGE = "/images/service-illustration.jpg";

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
  service?: Service;
  item?: Service | TreatmentGroup;
}

export default function ServiceCard({ service, item }: ServiceCardProps) {
  const target = item || service;
  if (!target) return null;

  if (isTreatmentGroup(target)) {
    return <TreatmentGroupCard group={target} />;
  }

  return <SingleServiceCard service={target} />;
}

function TreatmentGroupCard({ group }: { group: TreatmentGroup }) {
  const { isAuthenticated } = useAuth();
  const [selectedVariantId, setSelectedVariantId] = useState(group.variants[0]?.id || "");
  const activeVariant = group.variants.find((v) => v.id === selectedVariantId) || group.variants[0];
  const bookHref = isAuthenticated
    ? `/booking?service=${activeVariant.id}`
    : `/login?redirect=${encodeURIComponent(`/booking?service=${activeVariant.id}`)}`;

  return (
    <div className="group flex h-full flex-col justify-between overflow-hidden rounded-card border border-beige-200 bg-white shadow-card transition-all duration-300 hover:scale-[1.01] hover:shadow-card-hover">
      <div className="flex flex-col flex-1">
        {/* Image & Badges */}
        <Link href={`/services/${activeVariant.id}`} className="block relative aspect-video overflow-hidden shrink-0">
          <Image
            src={group.imageUrl || SERVICE_THUMBNAIL_IMAGE}
            alt={group.groupName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-medium",
              categoryColors[group.category] ?? "bg-beige-100 text-beige-700"
            )}
          >
            {group.category}
          </span>
          {group.audience !== "unisex" ? (
            <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-beige-700 backdrop-blur">
              {audienceLabel(group.audience)}
            </span>
          ) : group.variants.length > 1 ? (
            <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-beige-700 backdrop-blur">
              {group.variants.length} options
            </span>
          ) : null}
        </Link>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <Link href={`/services/${activeVariant.id}`} className="block">
            <h3
              className="font-serif text-xl font-semibold text-beige-700 hover:text-beige-900 transition-colors line-clamp-1 min-h-[28px]"
              title={group.groupName}
            >
              {group.groupName}
            </h3>
            <p className="mt-2 text-sm text-beige-800 line-clamp-2 min-h-[40px]">
              {group.description}
            </p>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 pt-0 mt-auto shrink-0">
        <div className="flex items-center justify-between border-t border-beige-100 pt-3 min-h-[48px]">
          <div className="flex items-center gap-2 text-sm text-[#6B5C50]">
            <span className="font-semibold text-beige-700">{formatPrice(activeVariant.price)}</span>
            <span className="text-beige-300">|</span>
            {group.variants.length > 1 ? (
              <div className="relative inline-flex items-center">
                <select
                  value={activeVariant.id}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  aria-label={`Select duration for ${group.groupName}`}
                  className="appearance-none rounded-full border border-beige-300 bg-beige-50/80 py-1 pl-2.5 pr-6 text-xs font-medium text-beige-700 hover:bg-beige-100 focus:outline-none focus:border-beige-500 cursor-pointer transition-colors"
                >
                  {group.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.variantLabel || `${v.durationMinutes} min`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 h-3.5 w-3.5 text-beige-500" />
              </div>
            ) : (
              <span>{formatDuration(activeVariant.durationMinutes)}</span>
            )}
          </div>
          <Link
            href={bookHref}
            aria-label={`Book ${group.groupName}`}
            className="rounded-full bg-[#A8483A] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#8F3B30]"
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  );
}

function SingleServiceCard({ service }: { service: Service }) {
  const { isAuthenticated } = useAuth();
  const bookHref = isAuthenticated
    ? `/booking?service=${service.id}`
    : `/login?redirect=${encodeURIComponent(`/booking?service=${service.id}`)}`;

  return (
    <div className="group flex h-full flex-col justify-between overflow-hidden rounded-card border border-beige-200 bg-white shadow-card transition-all duration-300 hover:scale-[1.01] hover:shadow-card-hover">
      <div className="flex flex-col flex-1">
        {/* Image */}
        <Link href={`/services/${service.id}`} className="block relative aspect-video overflow-hidden shrink-0">
          <Image
            src={service.imageUrl || SERVICE_THUMBNAIL_IMAGE}
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
        </Link>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <Link href={`/services/${service.id}`} className="block">
            <h3
              className="font-serif text-xl font-semibold text-beige-700 hover:text-beige-900 transition-colors line-clamp-1 min-h-[28px]"
              title={service.name}
            >
              {service.name}
            </h3>
            <p className="mt-2 text-sm text-beige-800 line-clamp-2 min-h-[40px]">
              {service.description}
            </p>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 pt-0 mt-auto shrink-0">
        <div className="flex items-center justify-between border-t border-beige-100 pt-3 min-h-[48px]">
          <div className="flex items-center gap-2 text-sm text-[#6B5C50]">
            <span className="font-semibold text-beige-700">{formatPrice(service.price)}</span>
            <span className="text-beige-300">|</span>
            <span>{formatDuration(service.durationMinutes)}</span>
          </div>
          <Link
            href={bookHref}
            aria-label={`Book ${service.name}`}
            className="rounded-full bg-[#A8483A] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#8F3B30]"
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  );
}

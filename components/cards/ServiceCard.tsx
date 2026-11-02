"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Service, TreatmentGroup } from "@/lib/types";
import { formatPrice, formatDuration, cn } from "@/lib/utils";
import { audienceLabel } from "@/lib/service-audience";
import { isTreatmentGroup } from "@/lib/service-legacy-map";

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
  const [selectedVariantId, setSelectedVariantId] = useState(group.variants[0]?.id || "");
  const activeVariant = group.variants.find((v) => v.id === selectedVariantId) || group.variants[0];

  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-card border border-beige-200 bg-white shadow-card transition-all duration-300 hover:scale-[1.01] hover:shadow-card-hover">
      <div>
        {/* Image & Header */}
        <Link href={`/services/${activeVariant.id}`} className="block relative aspect-video overflow-hidden">
          <Image
            src={SERVICE_THUMBNAIL_IMAGE}
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
          {group.audience !== "unisex" && (
            <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-beige-700 backdrop-blur">
              {audienceLabel(group.audience)}
            </span>
          )}
        </Link>

        {/* Content */}
        <div className="p-5">
          <Link href={`/services/${activeVariant.id}`} className="block">
            <h3 className="font-serif text-xl font-semibold text-beige-700 hover:text-beige-900 transition-colors">
              {group.groupName}
            </h3>
            <p className="mt-1 text-sm text-beige-800 line-clamp-2">
              {group.description}
            </p>
          </Link>

          {/* Variant Selector */}
          <div className="mt-3 pt-3 border-t border-beige-100">
            {group.variants.length <= 3 ? (
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Duration options for ${group.groupName}`}>
                {group.variants.map((v) => {
                  const isSelected = v.id === activeVariant.id;
                  const label =
                    v.groupType === "hair_length" && v.variantLabel
                      ? `${v.variantLabel.replace(/ hair$/i, "")} · ${formatPrice(v.price)}`
                      : `${v.durationMinutes} min · ${formatPrice(v.price)}`;

                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-all min-h-[36px]",
                        isSelected
                          ? "bg-beige-600 text-white shadow-xs"
                          : "border border-beige-300 bg-white text-beige-700 hover:bg-beige-100"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <label htmlFor={`select-${group.groupKey}`} className="sr-only">
                  Choose option for {group.groupName}
                </label>
                <select
                  id={`select-${group.groupKey}`}
                  value={activeVariant.id}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full rounded-lg border border-beige-300 bg-beige-50 px-3 py-2 text-xs font-medium text-beige-700 outline-none focus:border-beige-500 min-h-[40px]"
                >
                  {group.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.variantLabel || `${v.durationMinutes} min`} — {formatPrice(v.price)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 pt-0">
        <div className="flex items-center justify-between border-t border-beige-100 pt-3">
          <div className="flex items-center gap-2 text-sm text-beige-600">
            <span className="font-semibold text-beige-700">{formatPrice(activeVariant.price)}</span>
            <span className="text-beige-300">|</span>
            <span>{formatDuration(activeVariant.durationMinutes)}</span>
          </div>
          <Link
            href={`/booking?service=${activeVariant.id}`}
            className="rounded-full bg-beige-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-beige-700"
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  );
}

function SingleServiceCard({ service }: { service: Service }) {
  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-card border border-beige-200 bg-white shadow-card transition-all duration-300 hover:scale-[1.01] hover:shadow-card-hover">
      <div>
        {/* Image */}
        <Link href={`/services/${service.id}`} className="block relative aspect-video overflow-hidden">
          <Image
            src={SERVICE_THUMBNAIL_IMAGE}
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
        <div className="p-5">
          <Link href={`/services/${service.id}`} className="block">
            <h3 className="font-serif text-xl font-semibold text-beige-700 hover:text-beige-900 transition-colors">
              {service.name}
            </h3>
            {(service.category === "Classic Combos" || service.name.toLowerCase().includes("combo") || service.description?.includes("+")) && service.description ? (
              <div className="mt-2.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-beige-500 block mb-1">
                  Included services:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {service.description
                    .split("+")
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-md bg-beige-100/90 px-2 py-0.5 text-xs text-beige-700 font-medium border border-beige-200/60"
                      >
                        ✓ {item}
                      </span>
                    ))}
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-beige-800 line-clamp-2">
                {service.description}
              </p>
            )}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 pt-0">
        <div className="mt-4 flex items-center justify-between border-t border-beige-100 pt-3">
          <div className="flex items-center gap-3 text-sm text-beige-600">
            <span className="font-medium text-beige-700">{formatPrice(service.price)}</span>
            <span className="text-beige-300">|</span>
            <span>{formatDuration(service.durationMinutes)}</span>
          </div>
          <Link
            href={`/booking?service=${service.id}`}
            className="rounded-full bg-beige-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-beige-700"
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Employee } from "@/lib/types";
import StarIcon from "@/components/ui/StarIcon";

interface TeamCardProps {
  employee: Employee;
}

export default function TeamCard({ employee }: TeamCardProps) {
  return (
    <Link
      href={`/team/${employee.id}`}
      className="group block"
    >
      {/* Image — full bleed, no border or shadow */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
        <Image
          src={employee.imageUrl}
          alt={employee.name}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Gradient overlay at bottom for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Text overlaid on image */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="font-serif text-xl font-semibold text-white drop-shadow-sm">
            {employee.name}
          </h3>
          <p className="mt-0.5 text-sm text-white/80">{employee.role}</p>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon key={i} filled={i < Math.round(employee.rating)} />
            ))}
            <span className="ml-1 text-xs text-white/70">
              {employee.rating} ({employee.reviewCount})
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

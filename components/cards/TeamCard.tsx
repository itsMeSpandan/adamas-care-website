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
      className="group relative block overflow-hidden rounded-card border border-beige-200 bg-white shadow-card transition-all duration-300 hover:shadow-card-hover"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={employee.imageUrl}
          alt={employee.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-beige-600/0 transition-all duration-300 group-hover:bg-beige-600/80">
          <span className="translate-y-4 text-sm font-medium text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            View Profile
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-serif text-xl font-semibold text-beige-700">
          {employee.name}
        </h3>
        <p className="mt-0.5 text-sm text-beige-500">{employee.role}</p>
        {/* Star rating */}
        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon key={i} filled={i < Math.round(employee.rating)} />
          ))}
          <span className="ml-1 text-xs text-beige-500">
            {employee.rating} ({employee.reviewCount})
          </span>
        </div>
      </div>
    </Link>
  );
}

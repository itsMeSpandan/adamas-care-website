import Skeleton from "@/components/ui/Skeleton";

export default function TeamDetailLoading() {
  return (
    <div className="bg-beige-50">
      {/* Breadcrumb */}
      <div className="section-container mx-auto px-4 pt-8 md:px-8">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-2" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-2" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="section-container mx-auto grid gap-12 px-4 py-12 md:px-8 lg:grid-cols-2">
        {/* Left: portrait */}
        <Skeleton className="aspect-[3/4] w-full rounded-card" />

        {/* Right: details */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-1/2" />

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-4 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-4 w-28" />
          </div>

          <Skeleton className="h-4 w-32" />

          {/* Bio */}
          <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Services */}
          <div className="pt-4">
            <Skeleton className="mb-3 h-5 w-40" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-36 rounded-full" />
              ))}
            </div>
          </div>

          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-4 h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

import Skeleton from "@/components/ui/Skeleton";

export default function ServiceDetailLoading() {
  return (
    <div className="bg-beige-50">
      {/* Breadcrumb */}
      <div className="section-container mx-auto px-4 pt-8 md:px-8">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-2" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="section-container mx-auto grid gap-12 px-4 py-12 md:px-8 lg:grid-cols-2">
        {/* Left: image */}
        <Skeleton className="aspect-[4/3] w-full rounded-card" />

        {/* Right: details */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-10 w-3/4" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-1" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Specialists */}
          <div className="pt-4">
            <Skeleton className="mb-4 h-5 w-52" />
            <div className="flex flex-wrap gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-48 rounded-card" />
              ))}
            </div>
          </div>

          <Skeleton className="mt-6 h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

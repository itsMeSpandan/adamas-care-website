import Skeleton from "@/components/ui/Skeleton";

export default function ServicesLoading() {
  return (
    <div className="section-padding bg-beige-100">
      <div className="section-container mx-auto">
        {/* Title */}
        <Skeleton className="mx-auto mb-8 h-10 w-64" />

        {/* Filter chips */}
        <div className="mb-10 flex justify-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full" />
          ))}
        </div>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-card border border-beige-200 bg-white shadow-card"
            >
              <Skeleton className="aspect-video w-full" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

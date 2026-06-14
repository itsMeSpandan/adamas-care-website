import Skeleton from "@/components/ui/Skeleton";

export default function TeamLoading() {
  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto">
        {/* Title */}
        <Skeleton className="mx-auto mb-4 h-10 w-48" />
        {/* Subtitle */}
        <Skeleton className="mx-auto mb-12 h-5 w-96 max-w-full" />

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-card border border-beige-200 bg-white shadow-card"
            >
              <Skeleton className="aspect-square w-full" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex items-center gap-1 pt-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-3.5 w-3.5 rounded-full" />
                  ))}
                  <Skeleton className="ml-1 h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

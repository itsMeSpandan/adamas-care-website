import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto space-y-12">
        {/* Hero skeleton */}
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <div className="flex gap-4 pt-4">
              <Skeleton className="h-12 w-32 rounded-xl" />
              <Skeleton className="h-12 w-32 rounded-xl" />
            </div>
          </div>
          <div className="hidden lg:block">
            <Skeleton className="h-[560px] w-full rounded-2xl" />
          </div>
        </div>

        {/* Cards skeleton */}
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

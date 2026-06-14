import Skeleton from "@/components/ui/Skeleton";

export default function BookingLoading() {
  return (
    <div className="section-padding bg-beige-50">
      <div className="section-container mx-auto max-w-3xl">
        {/* Title */}
        <Skeleton className="mx-auto mb-2 h-10 w-72" />
        <Skeleton className="mx-auto mb-12 h-5 w-64" />

        {/* Step indicator */}
        <div className="mb-12 flex items-center justify-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <Skeleton className="h-10 w-10 rounded-full" />
              {i < 3 && <Skeleton className="mx-2 h-0.5 w-16" />}
            </div>
          ))}
        </div>

        {/* Form area */}
        <div className="min-h-[400px] space-y-6">
          <Skeleton className="h-6 w-48" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-card" />
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex justify-between">
          <Skeleton className="h-11 w-24 rounded-xl" />
          <Skeleton className="h-11 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

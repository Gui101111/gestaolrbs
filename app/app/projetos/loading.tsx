import { Skeleton } from "@/components/ui/skeleton";
import { VideoCardSkeleton } from "@/components/projects/video-card";

export default function Loading() {
  return (
    <div className="space-y-6 pt-2" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-5 w-40 rounded-lg" />
      <Skeleton className="h-10 w-56 rounded-xl" />
      <Skeleton className="h-11 w-full rounded-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-[20px]" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { VideoCardSkeleton } from "@/components/projects/video-card";

export default function Loading() {
  return (
    <div className="space-y-10 pt-8" aria-busy="true" aria-label="Carregando">
      <Skeleton className="mx-auto h-14 w-2/3 max-w-xl rounded-2xl" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-[20px]" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

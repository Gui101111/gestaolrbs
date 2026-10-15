import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCardSkeleton } from "@/components/projects/project-card";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <Skeleton className="h-20 w-72 rounded-2xl" />
      <Skeleton className="h-11 w-full max-w-xl rounded-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

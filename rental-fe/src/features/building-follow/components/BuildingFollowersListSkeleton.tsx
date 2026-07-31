import { cn } from "@/lib/utils"

type BuildingFollowersListSkeletonProps = {
  count?: number
  className?: string
}

export function BuildingFollowersListSkeleton({
  count = 4,
  className,
}: BuildingFollowersListSkeletonProps) {
  return (
    <section
      className={cn("min-w-0", className)}
      aria-busy="true"
      aria-label="Loading building followers"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 px-4 py-3 sm:px-5"
        >
          <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-36 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </section>
  )
}

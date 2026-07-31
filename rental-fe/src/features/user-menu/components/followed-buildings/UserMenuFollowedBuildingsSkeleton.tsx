import { cn } from "@/lib/utils"

type UserMenuFollowedBuildingsSkeletonProps = {
  className?: string
  count?: number
}

export function UserMenuFollowedBuildingsSkeleton({
  className,
  count = 3,
}: UserMenuFollowedBuildingsSkeletonProps) {
  const safeCount =
    Number.isFinite(count) && count > 0 ? Math.min(Math.floor(count), 6) : 3

  return (
    <div
      className={cn("space-y-3", className)}
      role="status"
      aria-label="Loading followed buildings"
    >
      {Array.from({ length: safeCount }, (_, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
          <div className="min-w-0 flex-1 space-y-2 py-0.5">
            <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-44 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

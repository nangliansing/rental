import { cn } from "@/lib/utils"

import { BUILDING_FOLLOWERS_PREVIEW_ROW_CLASS } from "../utils/buildingFollowersPreviewLayout"

type BuildingFollowersPreviewSkeletonProps = {
  className?: string
}

export function BuildingFollowersPreviewSkeleton({
  className,
}: BuildingFollowersPreviewSkeletonProps) {
  return (
    <div
      className={cn(BUILDING_FOLLOWERS_PREVIEW_ROW_CLASS, className)}
      aria-busy="true"
      aria-label="Loading building followers preview"
    >
      <div className="flex shrink-0 items-center">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className={cn(
              "h-6 w-6 animate-pulse rounded-full bg-slate-200 ring-2 ring-white",
              index > 0 && "-ml-1.5",
            )}
          />
        ))}
      </div>
      <div className="h-4 min-w-0 flex-1 max-w-[11rem] animate-pulse rounded bg-slate-200" />
    </div>
  )
}

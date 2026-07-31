import type { RefObject } from "react"

import { InfiniteScrollSentinel } from "@/shared/components/feedback/InfiniteScrollSentinel"

import { useUserMenuFollowedBuildings } from "../../hooks/useUserMenuFollowedBuildings"
import { normalizeUserMenuUserId } from "../../utils/userMenuDisplay"
import { UserMenuFollowedBuildingRow } from "./UserMenuFollowedBuildingRow"
import { UserMenuFollowedBuildingsEmpty } from "./UserMenuFollowedBuildingsEmpty"
import { UserMenuFollowedBuildingsError } from "./UserMenuFollowedBuildingsError"
import { UserMenuFollowedBuildingsSkeleton } from "./UserMenuFollowedBuildingsSkeleton"
import { UserMenuSectionHeading } from "./UserMenuSectionHeading"

type UserMenuFollowedBuildingsSectionProps = {
  userId?: string | null
  enabled?: boolean
  rootRef?: RefObject<HTMLDivElement | null>
  onNavigate?: () => void
}

export function UserMenuFollowedBuildingsSection({
  userId,
  enabled = true,
  rootRef,
  onNavigate,
}: UserMenuFollowedBuildingsSectionProps) {
  const normalizedUserId = normalizeUserMenuUserId(userId)
  const {
    followedBuildings,
    totalFollowedBuildings,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchNextPageError,
    isFetchingNextPage,
    isLoading,
    isQueryEnabled,
    refetch,
  } = useUserMenuFollowedBuildings({
    userId: normalizedUserId,
    enabled,
  })

  if (!isQueryEnabled) {
    return null
  }

  return (
    <section aria-label="Followed buildings" className="px-5 py-4">
      <UserMenuSectionHeading
        title="Followed buildings"
        total={totalFollowedBuildings}
      />

      {isLoading ? (
        <UserMenuFollowedBuildingsSkeleton className="mt-3" />
      ) : isError ? (
        <UserMenuFollowedBuildingsError onRetry={() => void refetch()} />
      ) : followedBuildings.length === 0 ? (
        <UserMenuFollowedBuildingsEmpty />
      ) : (
        <div className="mt-2 divide-y divide-slate-100">
          {followedBuildings.map((follow) => (
            <UserMenuFollowedBuildingRow
              key={follow._id}
              follow={follow}
              onNavigate={onNavigate}
            />
          ))}

          <InfiniteScrollSentinel
            rootRef={rootRef}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isFetchNextPageError={isFetchNextPageError}
            errorMessage="Could not load more followed buildings."
            onFetchNextPage={() => void fetchNextPage()}
            endMessage={
              totalFollowedBuildings > 0
                ? `${totalFollowedBuildings} followed building${totalFollowedBuildings === 1 ? "" : "s"}`
                : undefined
            }
          />
        </div>
      )}
    </section>
  )
}

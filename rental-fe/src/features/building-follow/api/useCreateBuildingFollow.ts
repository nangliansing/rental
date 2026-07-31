import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"

import { createBuildingFollow } from "./createBuildingFollow"
import { isBuildingAlreadyFollowedError } from "./deleteBuildingFollow"
import {
  BUILDING_FOLLOW_WRITE_SCOPE_ID,
  buildingFollowRefetchQueryKeys,
  patchBuildingFollowingStateInCache,
  relatedBuildingFollowQueryKeys,
} from "../utils/buildingFollowCache"

export type CreateBuildingFollowVariables = {
  buildingId: string
  signal?: AbortSignal
}

async function createBuildingFollowIdempotently({
  buildingId,
  signal,
}: CreateBuildingFollowVariables) {
  try {
    return await createBuildingFollow({ buildingId, signal })
  } catch (error) {
    if (!isBuildingAlreadyFollowedError(error)) throw error
    return null
  }
}

export function useCreateBuildingFollow() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof createBuildingFollowIdempotently>>,
    Error,
    CreateBuildingFollowVariables
  >({
    queryClient,
    scopeKey: () => BUILDING_FOLLOW_WRITE_SCOPE_ID,
    getPlan: () => ({
      cancel: relatedBuildingFollowQueryKeys,
      snapshot: relatedBuildingFollowQueryKeys,
      invalidate: buildingFollowRefetchQueryKeys,
    }),
    apply: ({ queryClient: client, variables: { buildingId } }) => {
      patchBuildingFollowingStateInCache({
        queryClient: client,
        buildingId,
        isFollowing: true,
      })
    },
    reconcile: ({ queryClient: client, variables: { buildingId } }) => {
      patchBuildingFollowingStateInCache({
        queryClient: client,
        buildingId,
        isFollowing: true,
      })
    },
    shouldInvalidate: ({ error }) => error === null,
  })

  return useMutation({
    scope: { id: BUILDING_FOLLOW_WRITE_SCOPE_ID },
    mutationFn: createBuildingFollowIdempotently,
    ...transaction,
  })
}

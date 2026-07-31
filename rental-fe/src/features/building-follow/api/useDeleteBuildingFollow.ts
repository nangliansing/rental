import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"

import {
  deleteBuildingFollow,
  isBuildingFollowNotFoundError,
} from "./deleteBuildingFollow"
import {
  applyDeletedBuildingFollowToCache,
  BUILDING_FOLLOW_WRITE_SCOPE_ID,
  relatedBuildingFollowQueryKeys,
} from "../utils/buildingFollowCache"

export type DeleteBuildingFollowVariables = {
  buildingId: string
  signal?: AbortSignal
}

async function deleteBuildingFollowIdempotently({
  buildingId,
  signal,
}: DeleteBuildingFollowVariables) {
  try {
    return await deleteBuildingFollow({ buildingId, signal })
  } catch (error) {
    if (!isBuildingFollowNotFoundError(error)) throw error
    return null
  }
}

export function useDeleteBuildingFollow() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof deleteBuildingFollowIdempotently>>,
    Error,
    DeleteBuildingFollowVariables
  >({
    queryClient,
    scopeKey: () => BUILDING_FOLLOW_WRITE_SCOPE_ID,
    getPlan: () => ({
      cancel: relatedBuildingFollowQueryKeys,
      snapshot: relatedBuildingFollowQueryKeys,
    }),
    apply: ({ queryClient: client, variables: { buildingId } }) => {
      applyDeletedBuildingFollowToCache(client, buildingId)
    },
    reconcile: ({ queryClient: client, variables: { buildingId } }) => {
      applyDeletedBuildingFollowToCache(client, buildingId)
    },
    shouldInvalidate: () => false,
  })

  return useMutation({
    scope: { id: BUILDING_FOLLOW_WRITE_SCOPE_ID },
    mutationFn: deleteBuildingFollowIdempotently,
    ...transaction,
  })
}

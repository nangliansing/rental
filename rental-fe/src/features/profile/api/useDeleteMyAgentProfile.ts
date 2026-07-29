import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"

import type { AgentProfile } from "./createAgentProfile"
import {
  deleteMyAgentProfile,
  isMyAgentProfileNotFoundError,
} from "./deleteMyAgentProfile"
import {
  deletedProfileCollectionsToRefresh,
  deletedProfileQueryKeys,
  PROFILE_WRITE_SCOPE_ID,
  removeDeletedProfileQueries,
  updateAgentProfileProjections,
} from "./profileMutationCache"

async function deleteMyAgentProfileIdempotently() {
  try {
    return await deleteMyAgentProfile()
  } catch (error) {
    if (!isMyAgentProfileNotFoundError(error)) throw error
    return null
  }
}

export function useDeleteMyAgentProfile() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof deleteMyAgentProfileIdempotently>>,
    Error,
    void,
    { profileId: string | null }
  >({
    queryClient,
    scopeKey: () => PROFILE_WRITE_SCOPE_ID,
    getPlan: () => ({
      cancel: deletedProfileQueryKeys,
      snapshot: deletedProfileQueryKeys,
      invalidate: deletedProfileCollectionsToRefresh,
    }),
    apply: ({ queryClient: client }) => {
      const profile = client.getQueryData<AgentProfile>(
        queryKeys.profiles.me,
      )
      const profileId = profile?._id ?? null

      if (profileId) {
        updateAgentProfileProjections(
          client,
          profileId,
          { isDeleted: true, isOnline: false, isVerified: false },
          deletedProfileQueryKeys,
        )
      }

      return { profileId }
    },
    reconcile: ({ queryClient: client }) => {
      removeDeletedProfileQueries(client)
    },
    shouldInvalidate: ({ error }) => error === null,
  })

  return useMutation({
    scope: { id: PROFILE_WRITE_SCOPE_ID },
    mutationFn: deleteMyAgentProfileIdempotently,
    ...transaction,
  })
}

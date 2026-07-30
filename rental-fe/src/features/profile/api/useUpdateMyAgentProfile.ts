import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api-client"
import { createOptimisticTransaction } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"

import type { AgentProfile } from "./createAgentProfile"
import {
  cacheMyAgentProfile,
  PROFILE_WRITE_SCOPE_ID,
  profileProjectionQueryKeys,
  updateAgentProfileProjections,
} from "./profileMutationCache"
import { updateMyAgentProfile } from "./updateMyAgentProfile"

export function useUpdateMyAgentProfile() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof updateMyAgentProfile>>,
    Error,
    Parameters<typeof updateMyAgentProfile>[0],
    { profileId: string | null }
  >({
    queryClient,
    scopeKey: () => PROFILE_WRITE_SCOPE_ID,
    getPlan: () => ({
      cancel: profileProjectionQueryKeys,
      snapshot: profileProjectionQueryKeys,
    }),
    apply: ({ queryClient: client, variables }) => {
      const currentProfile = client.getQueryData<AgentProfile>(
        queryKeys.profiles.me,
      )
      const profileId = currentProfile?._id ?? null

      if (profileId) {
        updateAgentProfileProjections(client, profileId, variables)
      }

      return { profileId }
    },
    reconcile: ({ queryClient: client, data }) => {
      updateAgentProfileProjections(client, data._id, data)
      cacheMyAgentProfile(client, data)
    },
    shouldInvalidate: () => false,
  })

  return useMutation({
    scope: { id: PROFILE_WRITE_SCOPE_ID },
    mutationFn: (values) => {
      const currentProfile = queryClient.getQueryData<AgentProfile>(
        queryKeys.profiles.me,
      )
      if (!currentProfile || currentProfile.isDeleted) {
        throw new ApiError(
          "The profile is no longer available to update.",
          409,
          "AGENT_PROFILE_UNAVAILABLE",
        )
      }
      return updateMyAgentProfile(values)
    },
    ...transaction,
  })
}

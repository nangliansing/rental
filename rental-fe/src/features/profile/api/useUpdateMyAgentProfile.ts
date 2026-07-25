import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import type { AgentProfile } from "./createAgentProfile"
import {
  cacheMyAgentProfile,
  cancelProfileProjectionQueries,
  captureProfileProjectionQueries,
  restoreProfileProjectionQueries,
  updateAgentProfileProjections,
} from "./profileMutationCache"
import { updateMyAgentProfile } from "./updateMyAgentProfile"

export function useUpdateMyAgentProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "update-my-agent-profile" },
    mutationFn: updateMyAgentProfile,
    onMutate: async (values) => {
      await cancelProfileProjectionQueries(queryClient)
      const snapshots = captureProfileProjectionQueries(queryClient)
      const currentProfile = queryClient.getQueryData<AgentProfile>(
        queryKeys.profiles.me,
      )

      if (currentProfile?._id) {
        updateAgentProfileProjections(
          queryClient,
          currentProfile._id,
          values,
        )
      }

      return { snapshots }
    },
    onError: (_error, _values, context) => {
      if (!context) return
      restoreProfileProjectionQueries(queryClient, context.snapshots)
    },
    onSuccess: (profile) => {
      updateAgentProfileProjections(queryClient, profile._id, profile)
      cacheMyAgentProfile(queryClient, profile)
    },
  })
}

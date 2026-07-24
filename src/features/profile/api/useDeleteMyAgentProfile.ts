import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import type { AgentProfile } from "./createAgentProfile"
import { deleteMyAgentProfile } from "./deleteMyAgentProfile"
import {
  cancelProfileProjectionQueries,
  captureProfileProjectionQueries,
  deletedProfileQueryKeys,
  reconcileDeletedProfileQueries,
  restoreProfileProjectionQueries,
  updateAgentProfileProjections,
} from "./profileMutationCache"

export function useDeleteMyAgentProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "delete-my-agent-profile" },
    mutationFn: deleteMyAgentProfile,
    onMutate: async () => {
      await cancelProfileProjectionQueries(queryClient, deletedProfileQueryKeys)
      const snapshots = captureProfileProjectionQueries(
        queryClient,
        deletedProfileQueryKeys,
      )
      const profile = queryClient.getQueryData<AgentProfile>(
        queryKeys.profiles.me,
      )

      if (profile?._id) {
        updateAgentProfileProjections(
          queryClient,
          profile._id,
          { isDeleted: true, isOnline: false, isVerified: false },
          deletedProfileQueryKeys,
        )
      }

      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      if (!context) return
      restoreProfileProjectionQueries(queryClient, context.snapshots)
    },
    onSuccess: async () => {
      await reconcileDeletedProfileQueries(queryClient)
    },
  })
}

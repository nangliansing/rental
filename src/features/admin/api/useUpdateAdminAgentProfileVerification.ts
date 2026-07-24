import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  cancelProfileProjectionQueries,
  captureProfileProjectionQueries,
  restoreProfileProjectionQueries,
  updateAgentProfileProjections,
} from "@/features/profile/api/profileMutationCache"

import {
  updateAdminAgentProfileVerification,
  type UpdateAdminAgentProfileVerificationInput,
} from "./updateAdminAgentProfileVerification"

export function useUpdateAdminAgentProfileVerification() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "update-admin-agent-profile-verification" },
    mutationFn: (input: UpdateAdminAgentProfileVerificationInput) =>
      updateAdminAgentProfileVerification(input),
    onMutate: async (input) => {
      await cancelProfileProjectionQueries(queryClient)
      const snapshots = captureProfileProjectionQueries(queryClient)
      const agentProfileId = input.agentProfileId.trim()

      updateAgentProfileProjections(queryClient, agentProfileId, {
        isVerified: input.isVerified,
      })

      return { agentProfileId, snapshots }
    },
    onError: (_error, _input, context) => {
      if (!context) return
      restoreProfileProjectionQueries(queryClient, context.snapshots)
    },
    onSuccess: (profile, _input, context) => {
      updateAgentProfileProjections(
        queryClient,
        context?.agentProfileId ?? profile._id,
        profile,
      )
    },
  })
}

import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  profileProjectionQueryKeys,
  updateAgentProfileProjections,
} from "@/features/profile/api/profileMutationCache"
import { createOptimisticTransaction } from "@/lib/optimistic-transaction"
import type { AgentProfile } from "@/features/profile/api/createAgentProfile"

import {
  updateAdminAgentProfileVerification,
  type UpdateAdminAgentProfileVerificationInput,
} from "./updateAdminAgentProfileVerification"

export function useUpdateAdminAgentProfileVerification() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    AgentProfile,
    Error,
    UpdateAdminAgentProfileVerificationInput,
    { agentProfileId: string }
  >({
    queryClient,
    scopeKey: input =>
      `profile:verification:${input.agentProfileId.trim()}`,
    getPlan: () => ({
      cancel: profileProjectionQueryKeys,
      snapshot: profileProjectionQueryKeys,
    }),
    apply: ({ queryClient: client, variables }) => {
      const agentProfileId = variables.agentProfileId.trim()
      updateAgentProfileProjections(client, agentProfileId, {
        isVerified: variables.isVerified,
      })
      return { agentProfileId }
    },
    reconcile: ({ queryClient: client, optimisticContext, data }) => {
      updateAgentProfileProjections(
        client,
        optimisticContext.agentProfileId || data._id,
        data,
      )
    },
    shouldInvalidate: () => false,
  })

  return useMutation({
    scope: { id: "update-admin-agent-profile-verification" },
    mutationFn: (input: UpdateAdminAgentProfileVerificationInput) =>
      updateAdminAgentProfileVerification(input),
    ...transaction,
  })
}

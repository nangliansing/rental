import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import { createAgentProfile } from "./createAgentProfile"
import { cacheMyAgentProfile } from "./profileMutationCache"

export function useCreateAgentProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "create-agent-profile" },
    mutationFn: createAgentProfile,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profiles.me })
    },
    onSuccess: (profile) => {
      cacheMyAgentProfile(queryClient, profile)
    },
  })
}

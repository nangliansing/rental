import { useQuery } from "@tanstack/react-query"

import { profileQueryKeys } from "@/features/profile/api"
import { getListerProfileById } from "./getListerProfileById"

export const listerProfileQueryKey = (agentProfileId: string) =>
  profileQueryKeys.detail(agentProfileId)

type UseListerProfileByIdInput = {
  agentProfileId?: string
  enabled?: boolean
}

export function useListerProfileById({
  agentProfileId,
  enabled = true,
}: UseListerProfileByIdInput) {
  return useQuery({
    queryKey: listerProfileQueryKey(agentProfileId ?? ""),
    enabled: enabled && Boolean(agentProfileId),
    queryFn: () => getListerProfileById(agentProfileId!),
  })
}

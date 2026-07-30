import { queryOptions, useQuery } from "@tanstack/react-query"

import { profileQueryKeys } from "@/features/profile/api"
import { getListerProfileById } from "./getListerProfileById"

export const listerProfileQueryKey = (agentProfileId: string) =>
  profileQueryKeys.detail(agentProfileId)

export const listerProfileQueryOptions = (
  agentProfileId?: string,
  enabled = true,
) =>
  queryOptions({
    queryKey: listerProfileQueryKey(agentProfileId ?? ""),
    enabled: enabled && Boolean(agentProfileId?.trim()),
    queryFn: ({ signal }) =>
      getListerProfileById(agentProfileId ?? "", signal),
  })

type UseListerProfileByIdInput = {
  agentProfileId?: string
  enabled?: boolean
}

export function useListerProfileById({
  agentProfileId,
  enabled = true,
}: UseListerProfileByIdInput) {
  return useQuery(listerProfileQueryOptions(agentProfileId, enabled))
}

import { queryOptions, useQuery } from "@tanstack/react-query"

import { ApiError } from "@/lib/api-client"
import { getMyAgentProfile } from "./getMyAgentProfile"
import { profileQueryKeys } from "./profileQueryKeys"

export const MY_AGENT_PROFILE_QUERY_KEY = profileQueryKeys.me

export const myAgentProfileQueryOptions = (enabled = true) =>
  queryOptions({
    queryKey: MY_AGENT_PROFILE_QUERY_KEY,
    queryFn: ({ signal }) => getMyAgentProfile(signal),
    enabled,
    retry: false,
  })

export function useMyAgentProfile({ enabled = true }: { enabled?: boolean } = {}) {
  const query = useQuery(myAgentProfileQueryOptions(enabled))

  const isMissing =
    query.error instanceof ApiError &&
    query.error.code === "AGENT_PROFILE_NOT_FOUND"

  return {
    ...query,
    isMissing,
    canCreateListing: Boolean(query.data) && !isMissing,
  }
}

import { queryOptions, useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

import { getOwnerSavedSearchById } from "./getOwnerSavedSearchById"

export const ownerSavedSearchQueryKey = (
  savedSearchId: string | undefined,
) => queryKeys.savedSearches.ownerDetail(savedSearchId)

export const ownerSavedSearchQueryOptions = (
  savedSearchId?: string,
  enabled = true,
) =>
  queryOptions({
    queryKey: ownerSavedSearchQueryKey(savedSearchId),
    enabled: enabled && Boolean(savedSearchId?.trim()),
    queryFn: ({ signal }) =>
      getOwnerSavedSearchById(savedSearchId ?? "", signal),
  })

type UseOwnerSavedSearchByIdInput = {
  savedSearchId?: string
  enabled?: boolean
}

export function useOwnerSavedSearchById({
  savedSearchId,
  enabled = true,
}: UseOwnerSavedSearchByIdInput) {
  return useQuery(ownerSavedSearchQueryOptions(savedSearchId, enabled))
}

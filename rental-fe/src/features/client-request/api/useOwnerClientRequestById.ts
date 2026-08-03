import { queryOptions, useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

import { getOwnerClientRequestById } from "./getOwnerClientRequestById"

export const ownerClientRequestQueryKey = (
  clientRequestId: string | undefined,
) => queryKeys.clientRequests.ownerDetail(clientRequestId)

export const ownerClientRequestQueryOptions = (
  clientRequestId?: string,
  enabled = true,
) =>
  queryOptions({
    queryKey: ownerClientRequestQueryKey(clientRequestId),
    enabled: enabled && Boolean(clientRequestId?.trim()),
    queryFn: ({ signal }) =>
      getOwnerClientRequestById(clientRequestId ?? "", signal),
  })

type UseOwnerClientRequestByIdInput = {
  clientRequestId?: string
  enabled?: boolean
}

export function useOwnerClientRequestById({
  clientRequestId,
  enabled = true,
}: UseOwnerClientRequestByIdInput) {
  return useQuery(ownerClientRequestQueryOptions(clientRequestId, enabled))
}

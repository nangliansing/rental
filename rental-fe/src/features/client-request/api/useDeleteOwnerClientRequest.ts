import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"

import {
  OWNER_CLIENT_REQUEST_WRITE_SCOPE_ID,
  createOptimisticDeletedClientRequest,
  findOwnerClientRequest,
  ownerClientRequestCachePlan,
  readOwnerClientRequestCache,
  removeOwnerClientRequestFromLists,
  softDeleteOwnerClientRequestCache,
} from "./clientRequestMutationCache"
import type { ClientRequest } from "./clientRequestParsers"
import {
  deleteOwnerClientRequest,
  isOwnerClientRequestNotFoundError,
  type DeleteOwnerClientRequestInput,
  type DeletedOwnerClientRequest,
} from "./deleteOwnerClientRequest"

type OptimisticContext = {
  clientRequestId: string
}

function normalizeClientRequestId(
  input: DeleteOwnerClientRequestInput,
): string {
  return input.clientRequestId.trim()
}

async function deleteOwnerClientRequestIdempotently(
  input: DeleteOwnerClientRequestInput,
): Promise<DeletedOwnerClientRequest | null> {
  try {
    return await deleteOwnerClientRequest(input)
  } catch (error) {
    if (!isOwnerClientRequestNotFoundError(error)) throw error
    return null
  }
}

export function useDeleteOwnerClientRequest() {
  const queryClient = useQueryClient()

  const transaction = createOptimisticTransaction<
    DeletedOwnerClientRequest | null,
    Error,
    DeleteOwnerClientRequestInput,
    OptimisticContext
  >({
    queryClient,
    getPlan: variables =>
      ownerClientRequestCachePlan(normalizeClientRequestId(variables)),
    scopeKey: variables =>
      `owner-client-request:delete:${normalizeClientRequestId(variables)}`,
    apply: ({ variables }) => {
      const clientRequestId = normalizeClientRequestId(variables)
      const cache = readOwnerClientRequestCache(queryClient, clientRequestId)
      const current = findOwnerClientRequest(
        cache.detailData,
        cache.listData,
        clientRequestId,
      )

      removeOwnerClientRequestFromLists(queryClient, clientRequestId)

      if (current) {
        queryClient.setQueryData(
          cache.detailKey,
          createOptimisticDeletedClientRequest(current),
        )
      }

      return { clientRequestId }
    },
    reconcile: ({ data, optimisticContext }) => {
      const { clientRequestId } = optimisticContext

      if (data) {
        softDeleteOwnerClientRequestCache(queryClient, clientRequestId, data)
        return
      }

      // Idempotent 404: keep lists clean; preserve an already-deleted detail mark.
      removeOwnerClientRequestFromLists(queryClient, clientRequestId)
      const detailKey = queryKeys.clientRequests.ownerDetail(clientRequestId)
      const detail = queryClient.getQueryData<ClientRequest>(detailKey)
      if (detail && detail.isDeleted !== true) {
        queryClient.setQueryData(
          detailKey,
          createOptimisticDeletedClientRequest(detail),
        )
      }
    },
    shouldInvalidate: ({ error }) => error === null,
  })

  return useMutation({
    scope: { id: OWNER_CLIENT_REQUEST_WRITE_SCOPE_ID },
    mutationFn: deleteOwnerClientRequestIdempotently,
    ...transaction,
  })
}

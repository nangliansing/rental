import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"

import {
  OWNER_CLIENT_REQUEST_WRITE_SCOPE_ID,
  createOptimisticClosedClientRequest,
  findOwnerClientRequest,
  ownerClientRequestCachePlan,
  readOwnerClientRequestCache,
  updateOwnerClientRequestCache,
} from "./clientRequestMutationCache"
import {
  updateOwnerClientRequestStatus,
  type UpdateOwnerClientRequestStatusInput,
} from "./updateOwnerClientRequestStatus"
import type { ClientRequest } from "./clientRequestParsers"

type OptimisticContext = {
  clientRequestId: string
}

function normalizeClientRequestId(
  input: UpdateOwnerClientRequestStatusInput,
): string {
  return input.clientRequestId.trim()
}

export function useUpdateOwnerClientRequestStatus() {
  const queryClient = useQueryClient()

  const transaction = createOptimisticTransaction<
    ClientRequest,
    Error,
    UpdateOwnerClientRequestStatusInput,
    OptimisticContext
  >({
    queryClient,
    getPlan: variables =>
      ownerClientRequestCachePlan(normalizeClientRequestId(variables)),
    scopeKey: variables =>
      `owner-client-request:status:${normalizeClientRequestId(variables)}`,
    apply: ({ variables }) => {
      const clientRequestId = normalizeClientRequestId(variables)
      const cache = readOwnerClientRequestCache(queryClient, clientRequestId)
      const current = findOwnerClientRequest(
        cache.detailData,
        cache.listData,
        clientRequestId,
      )

      if (current) {
        updateOwnerClientRequestCache(
          queryClient,
          cache,
          createOptimisticClosedClientRequest(current),
        )
      }

      return { clientRequestId }
    },
    reconcile: ({ data, optimisticContext }) => {
      updateOwnerClientRequestCache(
        queryClient,
        readOwnerClientRequestCache(
          queryClient,
          optimisticContext.clientRequestId,
        ),
        data,
      )
    },
    shouldInvalidate: ({ error }) => error === null,
  })

  return useMutation({
    scope: { id: OWNER_CLIENT_REQUEST_WRITE_SCOPE_ID },
    mutationFn: updateOwnerClientRequestStatus,
    ...transaction,
  })
}

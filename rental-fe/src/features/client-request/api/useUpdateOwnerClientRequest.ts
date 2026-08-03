import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"

import {
  OWNER_CLIENT_REQUEST_WRITE_SCOPE_ID,
  createOptimisticUpdatedClientRequest,
  findOwnerClientRequest,
  ownerClientRequestCachePlan,
  readOwnerClientRequestCache,
  updateOwnerClientRequestCache,
} from "./clientRequestMutationCache"
import type { ClientRequest } from "./clientRequestParsers"
import {
  updateOwnerClientRequest,
  type UpdateOwnerClientRequestInput,
} from "./updateOwnerClientRequest"

type OptimisticContext = {
  clientRequestId: string
}

function normalizeClientRequestId(
  input: UpdateOwnerClientRequestInput,
): string {
  return input.clientRequestId.trim()
}

export function useUpdateOwnerClientRequest() {
  const queryClient = useQueryClient()

  const transaction = createOptimisticTransaction<
    ClientRequest,
    Error,
    UpdateOwnerClientRequestInput,
    OptimisticContext
  >({
    queryClient,
    getPlan: variables =>
      ownerClientRequestCachePlan(normalizeClientRequestId(variables)),
    scopeKey: variables =>
      `owner-client-request:update:${normalizeClientRequestId(variables)}`,
    apply: ({ variables }) => {
      const clientRequestId = normalizeClientRequestId(variables)
      const cache = readOwnerClientRequestCache(queryClient, clientRequestId)
      const current = findOwnerClientRequest(
        cache.detailData,
        cache.listData,
        clientRequestId,
      )

      if (current) {
        const { clientRequestId: _id, ...patch } = variables
        updateOwnerClientRequestCache(
          queryClient,
          cache,
          createOptimisticUpdatedClientRequest(current, patch),
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
    mutationFn: updateOwnerClientRequest,
    ...transaction,
  })
}

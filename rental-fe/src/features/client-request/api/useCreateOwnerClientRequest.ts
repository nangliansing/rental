import { useMutation } from "@tanstack/react-query"

import {
  createOwnerClientRequest,
  type CreateOwnerClientRequestInput,
} from "./createOwnerClientRequest"
import type { ClientRequest } from "./clientRequestParsers"

export const CREATE_OWNER_CLIENT_REQUEST_SCOPE_ID =
  "create-owner-client-request"

/**
 * Creates an owner client request.
 *
 * Intentionally leaves React Query cache alone — no setQueryData,
 * invalidateQueries, or cancelQueries. Callers own any follow-up refetch
 * or navigation after success.
 */
export function useCreateOwnerClientRequest() {
  return useMutation<ClientRequest, Error, CreateOwnerClientRequestInput>({
    scope: { id: CREATE_OWNER_CLIENT_REQUEST_SCOPE_ID },
    mutationFn: createOwnerClientRequest,
  })
}

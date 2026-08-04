import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseGetOwnerClientRequestByIdResponse,
  type ClientRequest,
} from "./clientRequestParsers"

export async function getOwnerClientRequestById(
  clientRequestId: string,
  signal?: AbortSignal,
): Promise<ClientRequest> {
  const normalizedClientRequestId = clientRequestId.trim()

  if (!normalizedClientRequestId) {
    throw new ApiError(
      "Client request id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.get<unknown>(
    `/client-requests/${encodeURIComponent(normalizedClientRequestId)}`,
    { signal },
  )

  return parseGetOwnerClientRequestByIdResponse(response.data).data
}

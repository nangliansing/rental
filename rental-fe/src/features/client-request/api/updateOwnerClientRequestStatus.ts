import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseGetOwnerClientRequestByIdResponse,
  type ClientRequest,
} from "./clientRequestParsers"

export type UpdateOwnerClientRequestStatusInput = {
  clientRequestId: string
  /** Only Closed is accepted by the owner status endpoint. */
  status: "Closed"
}

export async function updateOwnerClientRequestStatus({
  clientRequestId,
  status,
}: UpdateOwnerClientRequestStatusInput): Promise<ClientRequest> {
  const normalizedClientRequestId = clientRequestId.trim()

  if (!normalizedClientRequestId) {
    throw new ApiError(
      "Client request id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  if (status !== "Closed") {
    throw new ApiError(
      "status must be Closed.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.patch<unknown>(
    `/client-requests/${encodeURIComponent(normalizedClientRequestId)}/status`,
    { status: "Closed" },
  )

  return parseGetOwnerClientRequestByIdResponse(response.data).data
}

import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseGetOwnerClientRequestByIdResponse,
  type ClientRequest,
} from "./clientRequestParsers"

export type DeletedOwnerClientRequest = ClientRequest & {
  isDeleted: true
  deletedAt: string
}

export type DeleteOwnerClientRequestInput = {
  clientRequestId: string
}

export type DeleteOwnerClientRequestResponse = {
  success: true
  data: DeletedOwnerClientRequest
}

const INVALID_DELETE_OWNER_CLIENT_REQUEST_RESPONSE =
  "INVALID_CLIENT_REQUEST_RESPONSE"

const invalidResponse = () =>
  new ApiError(
    "Could not confirm that the client request was deleted.",
    500,
    INVALID_DELETE_OWNER_CLIENT_REQUEST_RESPONSE,
  )

export function isOwnerClientRequestNotFoundError(error: unknown) {
  return (
    error instanceof ApiError && error.code === "CLIENT_REQUEST_NOT_FOUND"
  )
}

export const parseDeleteOwnerClientRequestResponse = (
  value: unknown,
): DeleteOwnerClientRequestResponse => {
  let clientRequest: ClientRequest

  try {
    clientRequest = parseGetOwnerClientRequestByIdResponse(value).data
  } catch {
    throw invalidResponse()
  }

  if (clientRequest.isDeleted !== true || !clientRequest.deletedAt) {
    throw invalidResponse()
  }

  return {
    success: true,
    data: {
      ...clientRequest,
      isDeleted: true,
      deletedAt: clientRequest.deletedAt,
    },
  }
}

export async function deleteOwnerClientRequest({
  clientRequestId,
}: DeleteOwnerClientRequestInput): Promise<DeletedOwnerClientRequest> {
  const normalizedClientRequestId = clientRequestId.trim()

  if (!normalizedClientRequestId) {
    throw new ApiError(
      "Client request id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.delete<unknown>(
    `/client-requests/${encodeURIComponent(normalizedClientRequestId)}`,
  )

  return parseDeleteOwnerClientRequestResponse(response.data).data
}
